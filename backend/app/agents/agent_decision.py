"""
Agent Decision System for Multi-Agent Medical Chatbot

This module handles the orchestration of different agents using LangGraph.
It dynamically routes user queries to the appropriate agent based on content and context.
"""

import json
import threading
from typing import Dict, List, Optional, Any, Literal, TypedDict, Union, Annotated
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.runnables import RunnablePassthrough
from langgraph.graph import MessagesState, StateGraph, END
import os
from dotenv import load_dotenv
from app.agents.rag_agent import MedicalRAG
from app.agents.web_search_processor_agent import WebSearchProcessorAgent
from app.agents.image_analysis_agent import ImageAnalysisAgent
from app.agents.guardrails.local_guardrails import LocalGuardrails

from langgraph.checkpoint.memory import MemorySaver

import cv2
import numpy as np

from app.agents.config import Config

load_dotenv()

# Load configuration
config = Config()

# Initialize shared memory saver (used by graph singleton)
memory = MemorySaver()

# ── Graph Singleton ────────────────────────────────────────────────────────────
# The LangGraph agent graph is expensive to compile. Create it once at module
# level and reuse across all requests. Thread-safe via a lock.
_graph = None
_graph_lock = threading.Lock()


def get_agent_graph():
    """Return the compiled agent graph, building it on first call (singleton)."""
    global _graph
    if _graph is None:
        with _graph_lock:
            if _graph is None:  # double-checked locking
                _graph = create_agent_graph()
    return _graph


# Agent that takes the decision of routing the request further to correct task specific agent
class AgentConfig:
    """Configuration settings for the agent decision system."""
    
    # Decision model
    DECISION_MODEL = "gpt-4o"
    
    # Vision model for image analysis
    VISION_MODEL = "gpt-4o"
    
    # Confidence threshold for responses
    CONFIDENCE_THRESHOLD = 0.85
    
    # System instructions for the decision agent
    DECISION_SYSTEM_PROMPT = """You are an intelligent medical triage system that routes user queries to 
    the appropriate specialized agent. Your job is to analyze the user's request and determine which agent 
    is best suited to handle it based on the query content, presence of images, and conversation context.

    Available agents:
    1. CONVERSATION_AGENT - For general chat, greetings, non-medical questions, and medical questions not covered by other agents.
    2. RAG_AGENT - For specific medical knowledge questions answerable from established medical literature. Covers: brain tumors, brain MRI, COVID-19 chest X-ray diagnostics.
    3. WEB_SEARCH_PROCESSOR_AGENT - For questions about recent medical developments, current outbreaks, or time-sensitive medical information.
    4. BRAIN_TUMOR_AGENT - For analysis of brain MRI images to detect and segment tumors.
    5. CHEST_XRAY_AGENT - For analysis of chest X-ray images to detect COVID-19 or abnormalities.
    6. SKIN_LESION_AGENT - For analysis of skin lesion images to classify them as benign or malignant.
    7. SYMPTOM_CHECKER_AGENT - For structured symptom assessment when user describes symptoms (e.g., "I have chest pain", "my head hurts with fever", "I feel nauseous and dizzy"). Use whenever the user is describing symptoms they are experiencing.
    8. DRUG_INTERACTION_AGENT - For questions about drug interactions, medication safety, or when the user mentions multiple drugs and asks if they are safe to combine.

    Make your decision based on these guidelines:
    - If the user has not uploaded any image, never route to vision agents.
    - If the user uploads a medical image, route to the correct medical vision agent based on image type.
    - If the user describes symptoms they are experiencing → SYMPTOM_CHECKER_AGENT.
    - If the user asks about drug interactions or medication combinations → DRUG_INTERACTION_AGENT.
    - If the user asks about recent medical developments or current health situations → WEB_SEARCH_PROCESSOR_AGENT.
    - If the user asks specific medical knowledge questions covered in the knowledge base → RAG_AGENT.
    - For general conversation, greetings, or non-medical questions → CONVERSATION_AGENT.

    You must provide your answer in JSON format with the following structure:
    {{
    "agent": "AGENT_NAME",
    "reasoning": "Your step-by-step reasoning for selecting this agent",
    "confidence": 0.95
    }}
    """

    image_analyzer = ImageAnalysisAgent(config=config)


class AgentState(MessagesState):
    """State maintained across the workflow."""
    agent_name: Optional[str]  # Current active agent
    current_input: Optional[Union[str, Dict]]  # Input to be processed
    has_image: bool  # Whether the current input contains an image
    image_type: Optional[str]  # Type of medical image if present
    output: Optional[str]  # Final output to user
    needs_human_validation: bool  # Whether human validation is required
    retrieval_confidence: float  # Confidence in retrieval (for RAG agent)
    bypass_routing: bool  # Flag to bypass agent routing for guardrails
    insufficient_info: bool  # Flag indicating RAG response has insufficient information
    patient_context: Optional[str]  # Patient health profile for personalized responses


class AgentDecision(TypedDict):
    """Output structure for the decision agent."""
    agent: str
    reasoning: str
    confidence: float


def create_agent_graph():
    """Create and configure the LangGraph for agent orchestration."""

    # Initialize guardrails with Groq (avoids Gemini quota issues for text-only checks)
    guardrails = LocalGuardrails(config.agent_decision.llm)

    # LLM
    decision_model = config.agent_decision.llm
    
    # Initialize the output parser
    json_parser = JsonOutputParser(pydantic_object=AgentDecision)
    
    # Create the decision prompt
    decision_prompt = ChatPromptTemplate.from_messages([
        ("system", AgentConfig.DECISION_SYSTEM_PROMPT),
        ("human", "{input}")
    ])
    
    # Create the decision chain
    decision_chain = decision_prompt | decision_model | json_parser
    
    # Define graph state transformations
    def analyze_input(state: AgentState) -> AgentState:
        """Analyze the input to detect images and determine input type."""
        current_input = state["current_input"]
        has_image = False
        image_type = None
        
        # Get the text from the input
        input_text = ""
        if isinstance(current_input, str):
            input_text = current_input
        elif isinstance(current_input, dict):
            input_text = current_input.get("text", "")
        
        # Check input through guardrails if text is present
        if input_text:
            try:
                is_allowed, message = guardrails.check_input(input_text)
                if not is_allowed:
                    # If input is blocked, return early with guardrail message
                    print(f"Selected agent: INPUT GUARDRAILS, Message: ", message)
                    return {
                        **state,
                        "messages": message,
                        "agent_name": "INPUT_GUARDRAILS",
                        "has_image": False,
                        "image_type": None,
                        "bypass_routing": True  # flag to end flow
                    }
            except Exception as e:
                # If guardrails fail (e.g., API quota), allow input through with a warning
                print(f"[Warning] Guardrails check failed (allowing input through): {e}")
        
        # Original image processing code
        if isinstance(current_input, dict) and "image" in current_input:
            has_image = True
            image_path = current_input.get("image", None)
            try:
                image_type_response = AgentConfig.image_analyzer.analyze_image(image_path)
                image_type = image_type_response['image_type']
                print("ANALYZED IMAGE TYPE: ", image_type)
            except Exception as e:
                print(f"[Warning] Image classification failed (defaulting to OTHER): {e}")
                image_type = "OTHER"
        
        return {
            **state,
            "has_image": has_image,
            "image_type": image_type,
            "bypass_routing": False  # Explicitly set to False for normal flow
        }
    
    def check_if_bypassing(state: AgentState) -> str:
        """Check if we should bypass normal routing due to guardrails."""
        if state.get("bypass_routing", False):
            return "apply_guardrails"
        return "route_to_agent"
    
    def route_to_agent(state: AgentState) -> Dict:
        """Make decision about which agent should handle the query."""
        messages = state["messages"]
        current_input = state["current_input"]
        has_image = state["has_image"]
        image_type = state["image_type"]
        
        # Direct routing for classified medical images (bypass LLM decision)
        # This prevents the LLM from incorrectly routing image analysis requests
        if has_image and image_type:
            image_type_upper = image_type.upper()
            image_route_map = {
                "BRAIN MRI SCAN": "BRAIN_TUMOR_AGENT",
                "BRAIN MRI": "BRAIN_TUMOR_AGENT",
                "CHEST X-RAY": "CHEST_XRAY_AGENT",
                "CHEST XRAY": "CHEST_XRAY_AGENT",
                "SKIN LESION": "SKIN_LESION_AGENT",
            }
            for key, agent in image_route_map.items():
                if key in image_type_upper:
                    print(f"Direct image routing: {image_type} -> {agent}")
                    return {
                        "agent_state": {**state, "agent_name": agent},
                        "next": agent
                    }
        
        # Prepare input for decision model
        input_text = ""
        if isinstance(current_input, str):
            input_text = current_input
        elif isinstance(current_input, dict):
            input_text = current_input.get("text", "")
        
        # Create context from recent conversation history (last 3 messages)
        recent_context = ""
        for msg in messages[-6:]:  # Get last 3 exchanges (6 messages)  # Not provided control from config
            if isinstance(msg, HumanMessage):
                recent_context += f"User: {msg.content}\n"
            elif isinstance(msg, AIMessage):
                recent_context += f"Assistant: {msg.content}\n"
        
        # Combine everything for the decision input
        decision_input = f"""
        User query: {input_text}

        Recent conversation context:
        {recent_context}

        Has image: {has_image}
        Image type: {image_type if has_image else 'None'}

        Based on this information, which agent should handle this query?
        """
        
        try:
            # Make the decision
            decision = decision_chain.invoke({"input": decision_input})

            # Decided agent
            print(f"Decision: {decision['agent']}")
            
            # Update state with decision
            updated_state = {
                **state,
                "agent_name": decision["agent"],
            }
            
            # Route based on agent name and confidence
            if decision["confidence"] < AgentConfig.CONFIDENCE_THRESHOLD:
                return {"agent_state": updated_state, "next": "needs_validation"}
            
            return {"agent_state": updated_state, "next": decision["agent"]}
        except Exception as e:
            print(f"Error in route_to_agent decision: {e}")
            # Fallback to conversation agent on any decision error
            return {
                "agent_state": {**state, "agent_name": "CONVERSATION_AGENT"},
                "next": "CONVERSATION_AGENT"
            }

    # Define agent execution functions (these will be implemented in their respective modules)
    def run_conversation_agent(state: AgentState) -> AgentState:
        """Handle general conversation."""

        print(f"Selected agent: CONVERSATION_AGENT")

        messages = state["messages"]
        current_input = state["current_input"]
        
        # Prepare input for decision model
        input_text = ""
        if isinstance(current_input, str):
            input_text = current_input
        elif isinstance(current_input, dict):
            input_text = current_input.get("text", "")
        
        # Create context from recent conversation history
        recent_context = ""
        for msg in messages:#[-20:]:  # Get last 10 exchanges (20 messages)  # currently considering complete history - limit control from config
            if isinstance(msg, HumanMessage):
                # print("######### DEBUG 1:", msg)
                recent_context += f"User: {msg.content}\n"
            elif isinstance(msg, AIMessage):
                # print("######### DEBUG 2:", msg)
                recent_context += f"Assistant: {msg.content}\n"
        
        # Build patient context section
        patient_section = ""
        patient_ctx = state.get("patient_context", "")
        if patient_ctx:
            patient_section = f"\n\n### Patient Health Profile (use to personalize your response):\n{patient_ctx}"
        
        # Combine everything for the decision input
        conversation_prompt = f"""User query: {input_text}

        Recent conversation context: {recent_context}
{patient_section}

        You are an AI-powered Medical Conversation Assistant. Your goal is to facilitate smooth and informative conversations with users, handling both casual and medical-related queries. You must respond naturally while ensuring medical accuracy and clarity.

        ### Role & Capabilities
        - Engage in **general conversation** while maintaining professionalism.
        - Answer **medical questions** using verified knowledge.
        - Handle **follow-up questions** while keeping track of conversation context.
        - If the patient's health profile is available, personalize your advice (e.g., considering their allergies, chronic conditions, current medications).
        - Redirect **medical images** to the appropriate AI analysis agent.

        ### Guidelines for Responding:
        1. **General Conversations:** Respond in a friendly, engaging manner. Keep responses concise.
        2. **Medical Questions:** Provide medically accurate, clear, and factual responses. If the patient has known conditions, factor those in.
        3. **Follow-Up & Clarifications:** Maintain conversation history. Ask follow-up questions if unclear.
        4. **Handling Medical Image Analysis:** Do not analyze images yourself. Ask the user to upload the image.
        5. **Uncertainty & Ethical Considerations:** Never assume. Recommend consulting a licensed healthcare professional for serious concerns. Avoid providing diagnoses or prescriptions.

        ### Response Format:
        - Conversational yet professional tone.
        - Use bullet points or numbered lists for clarity.
        - If a user asks for a diagnosis, remind them to seek medical consultation.
        - Always add a brief disclaimer for medical advice: "*This is AI-generated guidance, not a substitute for professional medical advice.*"

        Conversational LLM Response:"""

        # print("Conversation Prompt:", conversation_prompt)

        response = config.conversation.llm.invoke(conversation_prompt)

        # print("Conversation respone:", response)

        # response = AIMessage(content="This would be handled by the conversation agent.")

        return {
            **state,
            "output": response,
            "agent_name": "CONVERSATION_AGENT"
        }
    
    def run_rag_agent(state: AgentState) -> AgentState:
        """Handle medical knowledge queries using RAG."""
        # Initialize the RAG agent

        print(f"Selected agent: RAG_AGENT")

        rag_agent = MedicalRAG(config)
        
        messages = state["messages"]
        query = state["current_input"]
        rag_context_limit = config.rag.context_limit

        recent_context = ""
        for msg in messages[-rag_context_limit:]:# limit controlled from config
            if isinstance(msg, HumanMessage):
                # print("######### DEBUG 1:", msg)
                recent_context += f"User: {msg.content}\n"
            elif isinstance(msg, AIMessage):
                # print("######### DEBUG 2:", msg)
                recent_context += f"Assistant: {msg.content}\n"

        response = rag_agent.process_query(query, chat_history=recent_context)
        retrieval_confidence = response.get("confidence", 0.0)  # Default to 0.0 if not provided

        print(f"Retrieval Confidence: {retrieval_confidence}")
        print(f"Sources: {len(response['sources'])}")

        # Check if response indicates insufficient information
        insufficient_info = False
        response_content = response["response"]
        
        # Extract the content properly based on type
        if hasattr(response_content, 'content'):
            # If it's an AIMessage or similar object with a content attribute
            response_text = response_content.content
        elif isinstance(response_content, dict) and "content" in response_content:
            response_text = response_content["content"]
        else:
            # If it's already a string
            response_text = str(response_content)
            
        print(f"Response text type: {type(response_text)}")
        print(f"Response text preview: {response_text[:100]}...")  # pyre-ignore
        
        if isinstance(response_text, str) and (
            "I don't have enough information to answer this question based on the provided context" in response_text or 
            "I don't have enough information" in response_text or 
            "don't have enough information" in response_text.lower() or
            "not enough information" in response_text.lower() or
            "insufficient information" in response_text.lower() or
            "cannot answer" in response_text.lower() or
            "unable to answer" in response_text.lower()
            ):
            
            print("RAG response indicates insufficient information")
            print(f"Response text that triggered insufficient_info: {response_text[:100]}...")
            insufficient_info = True

        print(f"Insufficient info flag set to: {insufficient_info}")

        # Store RAG output ONLY if confidence is high
        if retrieval_confidence >= config.rag.min_retrieval_confidence:
            # response_output = response["response"]
            response_output = AIMessage(content=response_text)
        else:
            response_output = AIMessage(content="")
        
        return {
            **state,
            "output": response_output,
            "needs_human_validation": False,  # Assuming no validation needed for RAG responses
            "retrieval_confidence": retrieval_confidence,
            "agent_name": "RAG_AGENT",
            "insufficient_info": insufficient_info
        }

    # Web Search Processor Node
    def run_web_search_processor_agent(state: AgentState) -> AgentState:
        """Handles web search results, processes them with LLM, and generates a refined response."""

        print(f"Selected agent: WEB_SEARCH_PROCESSOR_AGENT")
        print("[WEB_SEARCH_PROCESSOR_AGENT] Processing Web Search Results...")
        
        messages = state["messages"]
        web_search_context_limit = config.web_search.context_limit

        recent_context = ""
        for msg in messages[-web_search_context_limit:]: # limit controlled from config
            if isinstance(msg, HumanMessage):
                # print("######### DEBUG 1:", msg)
                recent_context += f"User: {msg.content}\n"
            elif isinstance(msg, AIMessage):
                # print("######### DEBUG 2:", msg)
                recent_context += f"Assistant: {msg.content}\n"

        web_search_processor = WebSearchProcessorAgent(config)

        processed_response = web_search_processor.process_web_search_results(query=state["current_input"], chat_history=recent_context)

        # print("######### DEBUG WEB SEARCH:", processed_response)
        
        if state['agent_name'] != None:
            involved_agents = f"{state['agent_name']}, WEB_SEARCH_PROCESSOR_AGENT"
        else:
            involved_agents = "WEB_SEARCH_PROCESSOR_AGENT"

        # Overwrite any previous output with the processed Web Search response
        return {
            **state,
            # "output": "This would be handled by the web search agent, finding the latest information.",
            "output": processed_response,
            "agent_name": involved_agents
        }

    # Define Routing Logic
    def confidence_based_routing(state: AgentState) -> str:
        """Route based on RAG confidence score and response content."""
        # Debug prints
        print(f"Routing check - Retrieval confidence: {state.get('retrieval_confidence', 0.0)}")
        print(f"Routing check - Insufficient info flag: {state.get('insufficient_info', False)}")
        
        # Redirect if confidence is low or if response indicates insufficient info
        if (state.get("retrieval_confidence", 0.0) < config.rag.min_retrieval_confidence or 
            state.get("insufficient_info", False)):
            print("Re-routed to Web Search Agent due to low confidence or insufficient information...")
            return "WEB_SEARCH_PROCESSOR_AGENT"  # Correct format
        return "check_validation"  # No transition needed if confidence is high and info is sufficient
    
    def run_brain_tumor_agent(state: AgentState) -> AgentState:
        """Handle brain MRI image analysis using HuggingFace ViT model."""

        print(f"Selected agent: BRAIN_TUMOR_AGENT")

        current_input = state["current_input"]
        image_path = current_input.get("image", None) if isinstance(current_input, dict) else None

        try:
            result = AgentConfig.image_analyzer.classify_brain_tumor(image_path)
            response = AIMessage(content=result)
        except Exception as e:
            print(f"Brain tumor analysis error: {e}")
            response = AIMessage(content=f"Error analyzing brain MRI image: {str(e)}")

        return {
            **state,
            "output": response,
            "needs_human_validation": True,  # Medical diagnosis always needs validation
            "agent_name": "BRAIN_TUMOR_AGENT"
        }
    
    def run_chest_xray_agent(state: AgentState) -> AgentState:
        """Handle chest X-ray image analysis."""

        current_input = state["current_input"]
        image_path = current_input.get("image", None)

        print(f"Selected agent: CHEST_XRAY_AGENT")

        # classify chest x-ray into covid or normal
        result = AgentConfig.image_analyzer.classify_chest_xray(image_path)

        if result and isinstance(result, dict):
            predicted_class = result.get("class")
            confidence = result.get("confidence", 0.0)
            
            if predicted_class == "covid19":
                response = AIMessage(content=f"The analysis of the uploaded chest X-ray image indicates a **POSITIVE** result for **COVID-19**.\n\n**Confidence Score:** {confidence}%")
            elif predicted_class == "normal":
                response = AIMessage(content=f"The analysis of the uploaded chest X-ray image indicates a **NEGATIVE** result for **COVID-19**, i.e., **NORMAL**.\n\n**Confidence Score:** {confidence}%")
            else:
                response = AIMessage(content="The uploaded image is not clear enough to make a diagnosis / the image is not a medical image.")
        else:
            response = AIMessage(content="Error computing the classification. Please try again.")

        return {
            **state,
            "output": response,
            "needs_human_validation": True,  # Medical diagnosis always needs validation
            "agent_name": "CHEST_XRAY_AGENT"
        }
    
    def run_skin_lesion_agent(state: AgentState) -> AgentState:
        """Handle skin lesion image analysis."""

        current_input = state["current_input"]
        image_path = current_input.get("image", None)

        print(f"Selected agent: SKIN_LESION_AGENT")

        # perform skin segmentation
        result = AgentConfig.image_analyzer.segment_skin_lesion(image_path)

        if result and result.get("success"):
            confidence = result.get("confidence", 0.0)
            response = AIMessage(content=f"Following is the analyzed **segmented** output of the uploaded skin lesion image:\n\n**Segmentation Confidence:** {confidence}%")
        else:
            response = AIMessage(content="The uploaded image is not clear enough to make a diagnosis / the image is not a medical image.")

        return {
            **state,
            "output": response,
            "needs_human_validation": True,  # Medical diagnosis always needs validation
            "agent_name": "SKIN_LESION_AGENT"
        }
    
    def handle_human_validation(state: AgentState) -> Dict:
        """Prepare for human validation if needed."""
        if state.get("needs_human_validation", False):
            return {"agent_state": state, "next": "human_validation", "agent": "HUMAN_VALIDATION"}
        return {"agent_state": state, "next": END}
    
    def perform_human_validation(state: AgentState) -> AgentState:
        """Handle human validation process."""
        print(f"Selected agent: HUMAN_VALIDATION")

        # Append validation request to the existing output
        validation_prompt = f"{state['output'].content}\n\n**Human Validation Required:**\n- If you're a healthcare professional: Please validate the output. Select **Yes** or **No**. If No, provide comments.\n- If you're a patient: Simply click Yes to confirm."

        # Create an AI message with the validation prompt
        validation_message = AIMessage(content=validation_prompt)

        return {
            **state,
            "output": validation_message,
            "agent_name": f"{state['agent_name']}, HUMAN_VALIDATION"
        }

    # Check output through guardrails
    def apply_output_guardrails(state: AgentState) -> AgentState:
        """Apply output guardrails to the generated response."""
        output = state["output"]
        current_input = state["current_input"]
        agent_name = state.get("agent_name", "")

        # Skip output guardrails for vision agents — their responses come from
        # specialized ML models with built-in disclaimers and confidence scores.
        # The text-only guardrail LLM has no image context and incorrectly
        # rewrites valid analysis results into generic "I can't view images" text.
        vision_agents = ["BRAIN_TUMOR_AGENT", "CHEST_XRAY_AGENT", "SKIN_LESION_AGENT"]
        if any(va in (agent_name or "") for va in vision_agents):
            sanitized_message = output if isinstance(output, AIMessage) else AIMessage(content=str(output))
            return {
                **state,
                "messages": sanitized_message,
                "output": sanitized_message
            }

        # Check if output is valid
        if not output or not isinstance(output, (str, AIMessage)):
            return state

        output_text = output if isinstance(output, str) else output.content
        
        # If the last message was a human validation message
        if "Human Validation Required" in output_text:
            # Check if the current input is a human validation response
            validation_input = ""
            if isinstance(current_input, str):
                validation_input = current_input
            elif isinstance(current_input, dict):
                validation_input = current_input.get("text", "")
            
            # If validation input exists
            if validation_input.lower().startswith(('yes', 'no')):
                # Add the validation result to the conversation history
                validation_response = HumanMessage(content=f"Validation Result: {validation_input}")
                
                # If validation is 'No', modify the output
                if validation_input.lower().startswith('no'):
                    fallback_message = AIMessage(content="The previous medical analysis requires further review. A healthcare professional has flagged potential inaccuracies.")
                    return {
                        **state,
                        "messages": [validation_response, fallback_message],
                        "output": fallback_message
                    }
                
                return {
                    **state,
                    "messages": validation_response
                }
        
        # Get the original input text
        input_text = ""
        if isinstance(current_input, str):
            input_text = current_input
        elif isinstance(current_input, dict):
            input_text = current_input.get("text", "")
        
        # Apply output sanitization
        sanitized_output = guardrails.check_output(output_text, input_text)
        # sanitized_output = output_text
        
        # For non-validation cases, add the sanitized output to messages
        sanitized_message = AIMessage(content=sanitized_output) if isinstance(output, AIMessage) else sanitized_output
        
        return {
            **state,
            "messages": sanitized_message,
            "output": sanitized_message
        }

    
    # ── New Agents ──────────────────────────────────────────────────────────────

    def run_symptom_checker_agent(state: AgentState) -> AgentState:
        """Structured symptom assessment agent."""
        print(f"Selected agent: SYMPTOM_CHECKER_AGENT")

        current_input = state["current_input"]
        input_text = current_input if isinstance(current_input, str) else current_input.get("text", "")

        patient_ctx = state.get("patient_context", "")
        patient_section = f"\nPatient health profile:\n{patient_ctx}" if patient_ctx else ""

        symptom_prompt = f"""You are a Medical Symptom Assessment Agent. Analyze the user's reported symptoms and provide a structured clinical assessment.

User's message: {input_text}
{patient_section}

### Your task:
1. **Identify** all symptoms mentioned by the user.
2. **Assess** severity (mild / moderate / severe) based on descriptions.
3. **List** the top 3–5 possible conditions (differential diagnosis) ranked by likelihood.
4. **Recommend** next steps (self-care, doctor visit, or emergency).

### Output format:
**Symptoms Identified:**
- [Symptom 1] — severity
- [Symptom 2] — severity

**Possible Conditions (ranked by likelihood):**
1. [Condition] — [confidence %] — brief explanation
2. …

**Recommended Next Steps:**
- [action]

**Urgency Level:** [Low / Medium / High / Emergency]

⚠️ *This is an AI-generated preliminary assessment, NOT a medical diagnosis. Please consult a qualified healthcare professional.*
"""

        response = config.conversation.llm.invoke(symptom_prompt)

        return {
            **state,
            "output": response,
            "needs_human_validation": True,
            "agent_name": "SYMPTOM_CHECKER_AGENT"
        }

    def run_drug_interaction_agent(state: AgentState) -> AgentState:
        """Drug interaction checking agent."""
        print(f"Selected agent: DRUG_INTERACTION_AGENT")

        current_input = state["current_input"]
        input_text = current_input if isinstance(current_input, str) else current_input.get("text", "")

        patient_ctx = state.get("patient_context", "")
        patient_section = f"\nPatient's current medications from health profile:\n{patient_ctx}" if patient_ctx else ""

        drug_prompt = f"""You are a Drug Interaction Checker Agent. Analyze the medications or drugs mentioned by the user and check for potential interactions.

User's question: {input_text}
{patient_section}

### Your task:
1. **Identify** all drugs/medications mentioned in the user's query AND in the patient's health profile (if available).
2. **Check** for known interactions between any combination of these drugs.
3. **Classify** each interaction by severity: Mild / Moderate / Severe / Contraindicated.
4. **Explain** what the interaction does and its clinical significance.
5. **Recommend** actions (monitoring, dose adjustment, alternative, or consult a doctor).

### Output format:
**Medications Identified:**
- [Drug 1] (from: user query / health profile)
- [Drug 2]

**Interaction Analysis:**
| Drug Pair | Severity | Effect | Recommendation |
|-----------|----------|--------|----------------|
| Drug A + Drug B | Moderate | [effect] | [action] |

**Summary & Advice:**
- [overall recommendation]

⚠️ *This is an AI-generated analysis for informational purposes only. Always verify drug interactions with a pharmacist or physician before making medication changes.*
"""

        response = config.conversation.llm.invoke(drug_prompt)

        return {
            **state,
            "output": response,
            "needs_human_validation": True,
            "agent_name": "DRUG_INTERACTION_AGENT"
        }

    # ── Create the workflow graph ─────────────────────────────────────────────
    workflow = StateGraph(AgentState)
    
    # Add nodes for each step
    workflow.add_node("analyze_input", analyze_input)
    workflow.add_node("route_to_agent", route_to_agent)
    workflow.add_node("CONVERSATION_AGENT", run_conversation_agent)
    workflow.add_node("RAG_AGENT", run_rag_agent)
    workflow.add_node("WEB_SEARCH_PROCESSOR_AGENT", run_web_search_processor_agent)
    workflow.add_node("BRAIN_TUMOR_AGENT", run_brain_tumor_agent)
    workflow.add_node("CHEST_XRAY_AGENT", run_chest_xray_agent)
    workflow.add_node("SKIN_LESION_AGENT", run_skin_lesion_agent)
    workflow.add_node("SYMPTOM_CHECKER_AGENT", run_symptom_checker_agent)
    workflow.add_node("DRUG_INTERACTION_AGENT", run_drug_interaction_agent)
    workflow.add_node("check_validation", handle_human_validation)
    workflow.add_node("human_validation", perform_human_validation)
    workflow.add_node("apply_guardrails", apply_output_guardrails)
    
    # Define the edges (workflow connections)
    workflow.set_entry_point("analyze_input")
    workflow.add_conditional_edges(
        "analyze_input",
        check_if_bypassing,
        {
            "apply_guardrails": "apply_guardrails",
            "route_to_agent": "route_to_agent"
        }
    )
    
    # Connect decision router to agents
    workflow.add_conditional_edges(
        "route_to_agent",
        lambda x: x["next"],
        {
            "CONVERSATION_AGENT": "CONVERSATION_AGENT",
            "RAG_AGENT": "RAG_AGENT",
            "WEB_SEARCH_PROCESSOR_AGENT": "WEB_SEARCH_PROCESSOR_AGENT",
            "BRAIN_TUMOR_AGENT": "BRAIN_TUMOR_AGENT",
            "CHEST_XRAY_AGENT": "CHEST_XRAY_AGENT",
            "SKIN_LESION_AGENT": "SKIN_LESION_AGENT",
            "SYMPTOM_CHECKER_AGENT": "SYMPTOM_CHECKER_AGENT",
            "DRUG_INTERACTION_AGENT": "DRUG_INTERACTION_AGENT",
            "needs_validation": "RAG_AGENT"
        }
    )
    
    # Connect agent outputs to validation check
    workflow.add_edge("CONVERSATION_AGENT", "check_validation")
    workflow.add_edge("WEB_SEARCH_PROCESSOR_AGENT", "check_validation")
    workflow.add_conditional_edges("RAG_AGENT", confidence_based_routing)
    workflow.add_edge("BRAIN_TUMOR_AGENT", "check_validation")
    workflow.add_edge("CHEST_XRAY_AGENT", "check_validation")
    workflow.add_edge("SKIN_LESION_AGENT", "check_validation")
    workflow.add_edge("SYMPTOM_CHECKER_AGENT", "check_validation")
    workflow.add_edge("DRUG_INTERACTION_AGENT", "check_validation")

    workflow.add_edge("human_validation", "apply_guardrails")
    workflow.add_edge("apply_guardrails", END)
    
    workflow.add_conditional_edges(
        "check_validation",
        lambda x: x["next"],
        {
            "human_validation": "human_validation",
            END: "apply_guardrails"
        }
    )
    
    # Compile the graph
    return workflow.compile(checkpointer=memory)


def init_agent_state(patient_context: str = "") -> AgentState:
    """Initialize the agent state with default values."""
    return {
        "messages": [],
        "agent_name": None,
        "current_input": None,
        "has_image": False,
        "image_type": None,
        "output": None,
        "needs_human_validation": False,
        "retrieval_confidence": 0.0,
        "bypass_routing": False,
        "insufficient_info": False,
        "patient_context": patient_context
    }


def process_query(
    query: Union[str, Dict],
    user_id: str = "default",
    patient_context: str = "",
) -> str:
    """
    Process a user query through the agent decision system.
    
    Args:
        query: User input (text string or dict with text and image)
        user_id: Unique user identifier used as LangGraph thread_id for memory isolation
        patient_context: Patient health profile string for personalized responses
        
    Returns:
        Response dict from the appropriate agent
    """
    # Use the singleton graph (compiled once, reused)
    graph = get_agent_graph()

    # Per-user thread config for memory isolation
    thread_config = {"configurable": {"thread_id": user_id}}
    
    # Initialize state
    state = init_agent_state(patient_context=patient_context)
    
    # Add the current query
    state["current_input"] = query

    # To handle image upload case
    if isinstance(query, dict):
        query = query.get("text", "") + ", user uploaded an image for diagnosis."
    
    state["messages"] = [HumanMessage(content=query)]

    result = graph.invoke(state, thread_config)

    # Keep history to reasonable size
    if len(result["messages"]) > config.max_conversation_history:
        result["messages"] = result["messages"][-config.max_conversation_history:]

    # Visualize conversation history in console
    for m in result["messages"]:
        m.pretty_print()
    
    return result