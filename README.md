<p align="center">
  <img src="https://img.shields.io/badge/MedSage-AI%20Clinical%20Assistant-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bS0yIDE1bC01LTUgMS40MS0xLjQxTDEwIDEuMTdsNy41OS03LjU5TDE5IDkuNTlsLTkgOXoiLz48L3N2Zz4=&labelColor=0f172a" alt="MedSage Badge" />
</p>

<h1 align="center">🩺 MedSage — AI Clinical Assistant</h1>

<p align="center">
  <strong>An intelligent, multi-agent healthcare platform that combines real-time voice consultations, medical imaging diagnostics, and context-aware knowledge retrieval into a single, unified experience.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_15-black?style=flat-square&logo=next.js" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/LangGraph-FF6F00?style=flat-square&logo=langchain&logoColor=white" />
  <img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=flat-square&logo=pytorch&logoColor=white" />
  <img src="https://img.shields.io/badge/TensorFlow-FF6F00?style=flat-square&logo=tensorflow&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
</p>

---

## 🏛️ Architecture Overview

MedSage follows a modern, decoupled architecture with two primary subsystems:

| Layer | Stack | Purpose |
|-------|-------|---------|
| **Frontend** | Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 | Patient & Doctor portals with real-time interactivity |
| **Backend** | FastAPI · Python · LangGraph · SQLModel · Alembic | Multi-agent AI orchestration, diagnostics & data management |
| **ML Inference** | Hugging Face Spaces (PyTorch & TensorFlow) | Scalable, GPU-accelerated medical image analysis |
| **Database** | PostgreSQL · Qdrant · FAISS | Structured data, vector embeddings & semantic search |
| **Auth** | Clerk | Secure role-based authentication (Patient / Doctor) |

---

## ✨ Features

### 🤖 Multi-Agent AI System (LangGraph)

The core intelligence is powered by a **LangGraph state machine** that dynamically routes queries to specialized agents:

| Agent | Function |
|-------|----------|
| **Conversation Agent** | General medical Q&A with empathetic, context-aware responses |
| **RAG Agent** | Retrieval-Augmented Generation over clinical guidelines (FAISS/Qdrant) |
| **Web Search Agent** | Real-time medical information for recent developments & outbreaks |
| **Brain Tumor Agent** | MRI scan analysis for tumor detection using PyTorch ViT models |
| **Chest X-Ray Agent** | COVID-19 detection from chest radiographs via TensorFlow |
| **Skin Lesion Agent** | Dermatological image segmentation and classification |
| **Symptom Checker Agent** | Structured symptom assessment with severity grading & differential diagnosis |
| **Drug Interaction Agent** | Medication safety analysis with interaction severity classification |

**Key orchestration features:**
- 🛡️ **Input & Output Guardrails** — Content safety filtering on both user inputs and AI responses
- 🔄 **Confidence-Based Routing** — Low-confidence RAG answers automatically escalate to web search
- ✅ **Human Validation Loop** — Medical diagnoses are flagged for healthcare professional review
- 🧠 **Patient Context Injection** — Responses are personalized using the patient's health profile, allergies, and current medications

---

### 🎤 Voice & Text Consultations

A natural, turn-taking voice interface that simulates a real telehealth experience:

- **Real-Time Speech-to-Text** — Captures patient audio with silence-based turn detection
- **Generative AI Responses** — Processed through LLMs (Gemini, OpenRouter) for empathetic, medically-grounded answers
- **Text-to-Speech Synthesis** — Natural voice responses with ElevenLabs/Murf AI and browser-level fallback
- **Vapi AI Integration** — Alternative voice consultation pipeline via Vapi Web SDK
- **Full Conversation History** — All consultations are persisted and retrievable

---

### 🧠 Brain Tumor Detection

- Upload **brain MRI scans** directly from the dashboard
- PyTorch Vision Transformer (ViT) model classifies tumor presence
- Deployed on **Hugging Face Spaces** for GPU-accelerated inference
- Returns confidence scores with LLM-generated clinical narrative
- Flags results for human validation by healthcare professionals

---

### 🫁 Chest X-Ray Analysis

- Upload **chest X-ray images** for automated COVID-19 screening
- TensorFlow-based classification model (COVID-19 vs. Normal)
- Returns prediction class with percentage confidence score
- Deployed on **Hugging Face Spaces** (TensorFlow runtime)
- Includes professional review workflow for diagnostic results

---

### 📄 Medical Report Analysis (RAG Pipeline)

- Upload **PDF lab reports** and medical documents
- Automatic text extraction via `pdfplumber` with semantic chunking
- Dense vector embeddings generated using `sentence-transformers`
- Stored in FAISS/Qdrant vector databases for instant retrieval
- Ask natural-language questions about your reports — the AI retrieves relevant chunks and generates clear, actionable summaries

---

### 🔍 Symptom Checker

- Describe symptoms in natural language (e.g., *"I have chest pain and shortness of breath"*)
- AI identifies and categorizes all reported symptoms with severity grading
- Provides **top 3–5 differential diagnoses** ranked by likelihood with confidence percentages
- Recommends next steps: self-care, doctor visit, or emergency
- Assigns an **urgency level** (Low / Medium / High / Emergency)
- Considers patient's existing health profile for personalized assessment

---

### 💊 Drug Interaction Checker

- Query potential interactions between medications (e.g., *"Can I take ibuprofen with warfarin?"*)
- Cross-references drugs from user query **and** patient health profile
- Classifies interactions by severity: Mild / Moderate / Severe / Contraindicated
- Provides clinical significance explanation and recommended actions
- Outputs structured interaction tables for clarity

---

### 📅 Doctor Appointment & Video Consultation

A complete scheduling and telemedicine system:

- **Doctor Registration Portal** — Secure onboarding with medical credential verification
- **Availability Management** — Doctors configure recurring availability slots
- **Smart Slot Generation** — Conflict resolution prevents double-booking
- **Patient Booking Flow** — Browse available doctors, select slots, and book appointments
- **Integrated Video Calls** — Jitsi Meet-powered video consultations launch directly from active appointments
- **Appointment History** — Full record of past and upcoming consultations

---

### 👤 Patient Health Profile & Onboarding

- **Guided Onboarding** — Multi-step registration capturing demographics, vitals, medical history, allergies, and current medications
- **Health Dashboard** — Central hub displaying health metrics, recent consultations, and AI insights
- **Profile-Aware AI** — All health profile data feeds into the AI context window for truly personalized medical guidance
- **Role-Based Access** — Distinct workflows and features for patients vs. doctors

---

### 💉 Medication Tracker

- Track active prescriptions with dosage schedules
- Medication adherence monitoring
- Integrates with the Drug Interaction Agent for safety checks against current medications

---

### 🌐 Real-Time Web Search

- When the RAG knowledge base lacks sufficient information, queries automatically escalate to web search
- Retrieves **current medical developments**, outbreak information, and time-sensitive health data
- Results are processed through an LLM to generate structured, medically-grounded responses
- Seamless fallback — users don't need to know which agent is responding

---

## 🛠️ Technology Stack

### Frontend
| Category | Technologies |
|----------|-------------|
| Framework | Next.js 15 (React 19) · Turbopack |
| Language | TypeScript |
| Styling | Tailwind CSS v4 · Radix UI · Framer Motion |
| State | Zustand · React Context |
| Real-Time | Socket.io · Vapi AI Web SDK |
| Charts | Recharts |
| Auth | Clerk |

### Backend & AI
| Category | Technologies |
|----------|-------------|
| Framework | FastAPI · Uvicorn |
| Database | PostgreSQL · SQLModel · Alembic · asyncpg |
| LLM Orchestration | LangChain · LangGraph |
| Vector DBs | Qdrant · FAISS |
| Computer Vision | PyTorch · TensorFlow · OpenCV · torchvision |
| Document Processing | pdfplumber · PyPDF2 |
| ML Deployment | Hugging Face Spaces |

### AI Models & Services
| Category | Services |
|----------|----------|
| LLMs | Google Gemini · OpenAI · OpenRouter · Groq |
| Speech | AssemblyAI · ElevenLabs · Murf AI |
| Vision | ViT (Brain Tumor) · Custom CNN (X-Ray) · Segmentation (Skin) |

---

## 🔄 System Flow

### Multi-Agent Query Pipeline

```
User Input
    │
    ├─── Input Guardrails ──── [blocked] ──→ Safety Response
    │
    ▼
Analyze Input (image detection)
    │
    ├─── Has Image ──→ Image Type Classification
    │                      ├── Brain MRI    → Brain Tumor Agent
    │                      ├── Chest X-Ray  → X-Ray Agent
    │                      └── Skin Lesion  → Skin Lesion Agent
    │
    └─── Text Only ──→ LLM Decision Router
                           ├── Symptoms described    → Symptom Checker
                           ├── Drug query            → Drug Interaction Agent
                           ├── Medical knowledge     → RAG Agent
                           │                            └── Low confidence? → Web Search Agent
                           ├── Recent developments   → Web Search Agent
                           └── General chat          → Conversation Agent
                                                          │
                                                          ▼
                                                    Output Guardrails
                                                          │
                                                          ▼
                                                    Response to User
```

### Diagnostic Image Flow

1. **Upload** — Doctor uploads MRI/X-ray via drag-and-drop
2. **Preprocess** — OpenCV normalizes contrast and resizes for tensor compatibility
3. **Inference** — PyTorch/TensorFlow models run on Hugging Face Spaces (GPU)
4. **Report** — Confidence score + LLM-generated clinical narrative returned to dashboard
5. **Validation** — Results flagged for healthcare professional review

### Document RAG Pipeline

1. **Ingest** — PDF uploaded via frontend
2. **Chunk** — Semantic overlapping text splitting via LangChain
3. **Embed** — Dense vectors via `sentence-transformers`
4. **Store** — Indexed in FAISS/Qdrant
5. **Query** — Natural language questions retrieve k-nearest chunks, shaped into LLM response

---

## 🚀 Future Scope

- **EHR/FHIR Integration** — Synchronize with live Electronic Health Records for real-time patient vitals
- **Expanded Pathology Models** — Retinal scan analysis, dermatology imaging, and additional specialties
- **Multi-Modal RAG** — Store and retrieve annotated medical images alongside textual data
- **Federated Learning** — Privacy-preserving model improvements across institutions
- **Mobile Application** — Native iOS/Android companion app

---

<p align="center">
  <sub>Built with ❤️ for better healthcare through AI</sub>
</p>
