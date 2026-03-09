"""
Configuration file for the Multi-Agent Medical Assistant
Adapted for integration with main backend - uses shared env vars
"""

import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq

# Load environment variables from .env file
load_dotenv()

# Key Configuration - uses shared .env vars from main backend
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

class AgentDecisionConfig:
    def __init__(self):
        # Groq is faster and has better free limits for routing
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=GROQ_API_KEY,
            temperature=0.1
        )

class ConversationConfig:
    def __init__(self):
        # Llama 3 is excellent for chat
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=GROQ_API_KEY,
            temperature=0.7
        )

class WebSearchConfig:
    def __init__(self):
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=GROQ_API_KEY,
            temperature=0.3
        )
        self.context_limit = 20  # include last 20 messages (10 Q&A pairs) in history

class RAGConfig:
    def __init__(self):
        """Initialize RAG configuration."""
        # Get base path for data relative to this file's parent
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Local configuration
        self.vector_db_type = "qdrant"
        self.embedding_dim = 384  # all-MiniLM-L6-v2 dimension
        self.distance_metric = "Cosine"
        self.use_local = True
        self.vector_local_path = os.path.join(base_path, "data/qdrant_db")
        self.doc_local_path = os.path.join(base_path, "data/docs_db")
        self.parsed_content_dir = os.path.join(base_path, "data/parsed_docs")
        self.retrieval_top_k = 5
        self.min_retrieval_confidence = 0.5
        
        self.collection_name = "medical_assistance_rag"
        self.chunk_size = 512
        self.chunk_overlap = 50
        
        # Initialize HuggingFace Embeddings
        self.embedding_model = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2"
        )
        
        # Use Gemini for RAG tasks to handle large contexts and avoid Groq rate limits
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=GOOGLE_API_KEY,
            temperature=0.3
        )
        self.summarizer_model = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=GOOGLE_API_KEY,
            temperature=0.5
        )
        self.chunker_model = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=GOOGLE_API_KEY,
            temperature=0.0
        )
        self.response_generator_model = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=GOOGLE_API_KEY,
            temperature=0.3
        )
        self.top_k = 5
        self.vector_search_type = 'similarity'  # or 'mmr'

        self.huggingface_token = os.getenv("HUGGINGFACE_TOKEN")

        self.reranker_model = "cross-encoder/ms-marco-TinyBERT-L-6"
        self.reranker_top_k = 3

        self.max_context_length = 8192

        self.include_sources = True
        self.min_retrieval_confidence = 0.40
        self.context_limit = 20

class MedicalCVConfig:
    def __init__(self):
        # Get base path for models relative to this file
        base_path = os.path.dirname(os.path.abspath(__file__))
        
        self.brain_tumor_model_path = os.path.join(base_path, "image_analysis_agent/brain_tumor_agent/models/brain_tumor_segmentation.pth")
        self.chest_xray_model_path = os.path.join(base_path, "image_analysis_agent/chest_xray_agent/models/covid_chest_xray_model.pth")
        self.skin_lesion_model_path = os.path.join(base_path, "image_analysis_agent/skin_lesion_agent/models/checkpointN25_.pth.tar")
        self.skin_lesion_segmentation_output_path = os.path.join(
            os.path.dirname(os.path.dirname(base_path)), 
            "uploads/skin_lesion_output/segmentation_plot.png"
        )
        
        # Keep Gemini for Vision Tasks
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=GOOGLE_API_KEY,
            temperature=0.1
        )

class SpeechConfig:
    def __init__(self):
        self.eleven_labs_api_key = os.getenv("ELEVEN_LABS_API_KEY")
        self.eleven_labs_voice_id = "21m00Tcm4TlvDq8ikWAM"  # Default voice ID (Rachel)

class ValidationConfig:
    def __init__(self):
        self.require_validation = {
            "CONVERSATION_AGENT": False,
            "RAG_AGENT": False,
            "WEB_SEARCH_AGENT": False,
            "BRAIN_TUMOR_AGENT": True,
            "CHEST_XRAY_AGENT": True,
            "SKIN_LESION_AGENT": True
        }
        self.validation_timeout = 300
        self.default_action = "reject"

class APIConfig:
    def __init__(self):
        self.host = "0.0.0.0"
        self.port = 8000
        self.debug = True
        self.rate_limit = 10
        self.max_image_upload_size = 5  # max upload size in MB

class UIConfig:
    def __init__(self):
        self.theme = "light"
        self.enable_speech = True
        self.enable_image_upload = True

class Config:
    def __init__(self):
        self.agent_decision = AgentDecisionConfig()
        self.conversation = ConversationConfig()
        self.rag = RAGConfig()
        self.medical_cv = MedicalCVConfig()
        self.web_search = WebSearchConfig()
        self.api = APIConfig()
        self.speech = SpeechConfig()
        self.validation = ValidationConfig()
        self.ui = UIConfig()
        self.eleven_labs_api_key = os.getenv("ELEVEN_LABS_API_KEY")
        self.tavily_api_key = os.getenv("TAVILY_API_KEY")
        self.max_conversation_history = 20
