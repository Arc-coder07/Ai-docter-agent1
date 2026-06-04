# MedSage: Advanced AI Clinical Assistant

MedSage (AI Doctor Agent) is a comprehensive, AI-powered healthcare platform designed to assist both patients and healthcare professionals. The system acts as an intelligent medical assistant capable of facilitating real-time voice consultations, automated diagnostic analysis of medical imaging, report processing, and context-aware medical knowledge retrieval. The architecture gracefully combines Next.js for a robust, responsive frontend with a powerful Python (FastAPI) backend that leverages Large Language Models (LLMs), Computer Vision, and multi-agent coordination.

---

## 🏛️ Core Architecture

The platform follows a modern, decoupled architecture consisting of two primary subsystems:

1. **Frontend Patient & Doctor Portals (Next.js)**
   A dynamic user interface built with Next.js, React, and Tailwind CSS. It supports discrete workflows for both patients (seeking consultation and tracking health metrics) and doctors (managing patients, utilizing AI diagnostic tools, and reviewing reports).
2. **Multi-Agent AI Core & Diagnostic Engine (FastAPI)**
   A highly specialized Python backend responsible for orchestrating multiple AI agents, processing unstructured medical data (PDF reports), and analyzing medical imaging (X-rays, MRI scans) using state-of-the-art machine learning models.

---

## ✨ Key Features & Modules

### 1. Interactive Voice & Text Consultations
A natural turn-taking voice interface that simulates a real telehealth consulting experience.
* **Speech-to-Text & Processing**: Captures real-time patient audio using AssemblyAI WebSockets. Silence detection indicates the end of a user's turn.
* **Generative Inference**: Processes transcribed text through localized LLMs or APIs (Gemini, OpenRouter) to provide empathetic, context-aware responses.
* **Text-to-Speech (TTS)**: Leverages ElevenLabs and Murf AI to synthesize natural-sounding AI voice responses, complete with browser-level fallback mechanisms.

### 2. Multi-Agent System & Context-Aware Q&A
An advanced multi-agent orchestrator utilizing LangChain and LangGraph to delegate medical queries dynamically. 
* **RAG (Retrieval-Augmented Generation)**: Patient queries are cross-referenced with vector embeddings (using Qdrant and FAISS) stored over authoritative clinical guidelines, ensuring grounded and accurate insights.
* **Medical Report Analysis**: Users can upload complex PDF lab reports. The system extracts text using `pdfplumber`, chunks the data, generates semantic embeddings, and provides understandable summaries and actionable insights.

### 3. Medical Imaging Diagnostics
Integrated computer vision pipelines designed to act as a second opinion for radiologists and general practitioners.
* **Chest X-Ray Pneumonia Detection**: Utilizes TensorFlow and Hugging Face Transformers to classify radiograph images, identifying potential pneumonia infiltrates.
* **Brain Tumor Analysis**: A PyTorch-based pipeline that processes MRI scans using OpenCV and Pillow to detect anomalous masses and segment probable brain tumors.

### 4. Doctor Appointment & Consultation Booking
A fully-featured scheduling and video consultation system for patients and doctors.
* **Doctor Availability Management**: Secure portal for doctors to set automated availability slots.
* **Patient Booking System**: Intelligent slot generation resolving conflicts to prevent double-booking.
* **Integrated Video Calls**: Deeply embedded open-source video conferencing (via Jitsi Meet) launching instantly from active appointments.

### 5. Patient Health & Medication Management
Holistic tracking of patient well-being and medication adherence.
* **Health Profiles & Symptom Checker**: Detailed user demographics, vitals tracking, and a dynamic symptom checker module feeding contextual data to the generative AI.
* **Medication Tracker**: Localized tracking for active prescriptions, integrating reminders, dosage times, and potential automated refill linking.

### 6. Patient Onboarding & Role Management
A comprehensive sign-up flow tailored to the user's role:
* **Patients**: Provide initial health metrics, history, and medication details which are fed into the assistant’s context window for personalized advice.
* **Doctors**: A secure secondary portal validating medical credentials to unlock advanced diagnostic tools and patient management features.

---

## 🛠️ Technology Stack

The MedSage ecosystem incorporates a diverse array of modern libraries and frameworks spanning web development, deep learning, and vector databases.

### Frontend Technologies
* **Framework**: Next.js 15 (React 19), Server Components, Turbopack
* **Language**: TypeScript
* **Styling**: Tailwind CSS v4, Tailwind Animate, Radix UI primitives
* **State Management**: Zustand, React Context
* **Real-time Communication**: Socket.io-client, Vapi AI Web
* **Data Visualization**: Recharts, Framer Motion

### Backend & AI Frameworks
* **Framework**: FastAPI, Uvicorn
* **Database & ORM**: PostgreSQL, SQLModel, Alembic, asyncpg
* **LLM Orchestration**: LangChain, LangGraph, LlamaIndex
* **Vector Databases**: Qdrant, FAISS (Local)
* **Computer Vision**: PyTorch, torchvision, TensorFlow, OpenCV, python-multipart
* **Document Processing**: pdfplumber, PyPDF2
* **Audio Processing**: pydub

### AI Models & Third-Party APIs
* **Large Language Models**: Google Gemini (via `google-genai`), OpenAI API, OpenRouter, Groq
* **Speech & Voice**: AssemblyAI, ElevenLabs, Murf AI
* **Authentication**: Clerk (`@clerk/nextjs`)

---

## 🔄 System Flow Summaries

### Voice Conversation Pipeline
1. **Audio Capture**: Browser Web Audio API securely streams microphone data.
2. **Transcription**: AssemblyAI processes chunks into text in real-time.
3. **Inference Engine**: Transcriptions passed to the FastAPI `/api/v1/chat` endpoint where the Multi-Agent framework queries patient history and formulates a response.
4. **Vocalization**: The generated text is passed to the TTS service (ElevenLabs/Murf AI), returning an audio stream that is seamlessly played for the user while muting the microphone to avoid feedback loops.

### Diagnostic Image Flow
1. **Image Upload**: Doctor uploads an MRI/X-ray via drag-and-drop Next.js components.
2. **Preprocessing**: Image sent to the `/api/v1/brain_tumor` or `/api/v1/xray` Python endpoint. OpenCV normalizes contrast and resizes the image for tensor compatibility.
3. **Prediction**: PyTorch/TensorFlow models run localized inference against the structured medical dataset.
4. **Report Generation**: A confident metric score paired with qualitative LLM-generated analysis is relayed back to the front-end dashboard.

### Document RAG Pipeline
1. **Ingestion**: PDF report sent via frontend portal.
2. **Chunking**: Text split into semantic overlapping chunks using `langchain-text-splitters`.
3. **Embedding**: `sentence-transformers` creates dense vector representations.
4. **Querying**: User asks a question about their report; the query is embedded, and k-nearest chunks are retrieved from the FAISS/Qdrant vector store to shape the LLM's response.

---

## 🚀 Future Scope

* **Real-Time Clinical Resources**: Integration with live Electronic Health Records (EHR/FHIR) to synchronize patient vitals directly.
* **Expanded Pathologies**: Extending computer vision models to assess additional specialties, such as retinal scans or dermatology imaging.
* **Advanced Multi-Modal RAG**: Storing and retrieving visually rich documents (like annotated scans) alongside textual data for comprehensive generative responses.
