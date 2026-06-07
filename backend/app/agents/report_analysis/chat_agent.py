"""
Chat Agent for Blood Report Follow-up Questions
Uses RAG (Retrieval-Augmented Generation) with FAISS vector store.
"""
import os
from typing import List, Dict, Optional
from groq import Groq
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS

from .prompts import CHAT_SYSTEM_PROMPT


class ReportChatAgent:
    """
    Chat agent for answering follow-up questions about blood reports.
    Uses FAISS for vector similarity search and Groq for response generation.
    """

    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004", 
            google_api_key=api_key
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        api_key = os.getenv("GROQ_API_KEY")
        self.client = Groq(api_key=api_key) if api_key else None
        self.model_name = "llama-3.3-70b-versatile"
        
        # Cache for vector stores by report_id
        self._vector_stores: Dict[str, FAISS] = {}

    def initialize_vector_store(self, report_id: str, text_content: str) -> FAISS:
        """
        Create or retrieve vector store for a report.
        
        Args:
            report_id: Unique identifier for the report
            text_content: Report text to index
            
        Returns:
            FAISS vector store
        """
        # Check cache first
        if report_id in self._vector_stores:
            return self._vector_stores[report_id]
        
        if not text_content or text_content.strip() == "":
            text_content = "No report context available."

        texts = self.text_splitter.split_text(text_content)
        if not texts:
            texts = [text_content]

        vectorstore = FAISS.from_texts(texts, self.embeddings)
        
        # Cache the vector store
        self._vector_stores[report_id] = vectorstore
        
        return vectorstore

    def get_response(
        self,
        query: str,
        report_id: str,
        report_text: str,
        chat_history: Optional[List[Dict]] = None
    ) -> str:
        """
        Get response to a follow-up question about a report.
        
        Args:
            query: User's question
            report_id: Report identifier
            report_text: Full report text (for RAG context)
            chat_history: Previous chat messages
            
        Returns:
            AI response string
        """
        if not self.client:
            return "Error: GROQ_API_KEY not configured. Please add it to your environment."

        if chat_history is None:
            chat_history = []

        # Get or create vector store
        vectorstore = self.initialize_vector_store(report_id, report_text)

        # Contextualize query if there's chat history
        contextualized_query = self._contextualize_query(query, chat_history)

        # Retrieve relevant context
        context = self._retrieve_context(vectorstore, contextualized_query)

        # Build messages for Groq API
        messages = self._build_messages(query, context, chat_history)

        # Generate response
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.7,
                max_tokens=500
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error generating response: {str(e)}"

    def _contextualize_query(self, query: str, chat_history: List[Dict]) -> str:
        """Reformulate query considering chat history."""
        if not chat_history or not self.client:
            return query

        # Build context from recent chat history
        recent_history = chat_history[-4:]  # Last 2 exchanges
        history_text = "\n".join([
            f"{'User' if msg.get('role') == 'user' else 'Assistant'}: {msg.get('content', '')}"
            for msg in recent_history
        ])

        contextualize_prompt = f"""Given a chat history and the latest user question, formulate a standalone question which can be understood without the chat history. Do NOT answer the question, just reformulate it if needed and otherwise return it as is.

Chat History:
{history_text}

Latest User Question: {query}

Standalone Question:"""

        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You reformulate questions to be standalone."},
                    {"role": "user", "content": contextualize_prompt}
                ],
                temperature=0.1,
                max_tokens=200
            )
            return response.choices[0].message.content.strip()
        except Exception:
            return query

    def _retrieve_context(self, vectorstore: FAISS, query: str) -> str:
        """Retrieve relevant document chunks."""
        try:
            retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
            docs = retriever.invoke(query)
            context = "\n\n".join([doc.page_content for doc in docs])

            if context.strip() == "No report context available.":
                return ""
            return context
        except Exception:
            return ""

    def _build_messages(
        self,
        query: str,
        context: str,
        chat_history: List[Dict]
    ) -> List[Dict]:
        """Build message list for Groq API."""
        messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]

        # Add recent chat history
        if chat_history:
            for msg in chat_history[-6:]:  # Last 3 exchanges
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })

        # Add context and current query
        if context and context.strip():
            user_message = f"Context:\n{context}\n\nQuestion: {query}"
        else:
            user_message = f"Question: {query}\n\nNote: No specific report context available. Please answer based on the chat history."

        messages.append({"role": "user", "content": user_message})

        return messages

    def clear_cache(self, report_id: Optional[str] = None):
        """Clear vector store cache."""
        if report_id:
            self._vector_stores.pop(report_id, None)
        else:
            self._vector_stores.clear()
