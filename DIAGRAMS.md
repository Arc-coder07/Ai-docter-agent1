# AI Doctor Agent - System Diagrams

This document contains visual diagrams mapping out the architecture, user flows, database schemas, and data pipelines of the AI Doctor Agent project.

These diagrams are rendered using [Mermaid](https://mermaid.js.org/). Many markdown viewers (including GitHub) natively support viewing these diagrams.

## 1. System Architecture Diagram
![System Architecture Diagram](./assets/architecture_diagram.png)

This diagram shows the high-level infrastructure components and external service integrations, including all active features and planned modules (e.g., Brain Tumor analysis).

```mermaid
graph TD
    %% Define components
    User[User / Client Interface] --> NextJS[Frontend: Next.js]
    NextJS -- HTTPS / API Requests --> FastAPI[Backend: FastAPI]
    
    %% Backend Modules
    subgraph "Backend System"
        FastAPI --> AuthMiddleware[Clerk Auth Validation]
        FastAPI --> AgentRouter[AI Agents Orchestrator]
        FastAPI --> DBConnectors[SQLModel ORM]
    end
    
    %% External Services
    AuthMiddleware --> Clerk[(Clerk Authentication)]
    AgentRouter --> LLM[OpenAI / Gemini / Groq LLMs]
    AgentRouter --> VisionModel[TensorFlow X-Ray Models]
    DBConnectors --> SupabaseDB[(Supabase PostgreSQL)]
    FastAPI --> SupabaseStorage[(Supabase Storage: Media/PDF)]
```

---

## 2. User Flow Diagram
This state diagram represents the primary journey a patient takes through the application from login to using the various AI services.

```mermaid
stateDiagram-v2
    [*] --> Homepage
    Homepage --> Login : Unauthenticated
    Login --> Dashboard : Clerk Auth Success
    Homepage --> Dashboard : Authenticated
    
    state Dashboard {
        [*] --> SelectService
        SelectService --> VoiceConsultation
        SelectService --> XRayAnalysis
        SelectService --> HealthReportAnalysis
        
        VoiceConsultation --> ChatInterface : Real-time Voice/Text AI
        XRayAnalysis --> UploadXRay : Upload Chest X-Ray Image
        HealthReportAnalysis --> UploadPDF : Upload Blood/Health Report PDF
        
        UploadXRay --> AIAnalysis1 : Predict Pneumonia
        UploadPDF --> AIAnalysis2 : Extract & Analyze Data
        
        AIAnalysis1 --> ViewResults
        AIAnalysis2 --> ChatWithReport : Follow-up Questions
        ChatInterface --> SaveHistory
    }
    
    Dashboard --> Appointments : View/Book Real Doctor
    Dashboard --> History : View Past AI Sessions
```

---

## 3. Entity-Relationship (ER) Diagram
This displays the relational database schema implemented using `SQLModel` connected to Supabase PostgreSQL.

```mermaid
erDiagram
    USERS ||--o{ CHAT_SESSIONS : "creates"
    USERS ||--o{ MEDICAL_REPORTS : "uploads"
    USERS ||--o{ HEALTH_REPORTS : "uploads"
    USERS ||--o{ XRAY_SCANS : "uploads"
    USERS ||--o{ APPOINTMENTS : "books"
    
    CHAT_SESSIONS ||--o{ CHAT_MESSAGES : "contains"
    CHAT_SESSIONS ||--o{ MEDICAL_REPORTS : "references"
    
    HEALTH_REPORTS ||--o{ HEALTH_REPORT_MESSAGES : "has follow-up Q&A"
    
    DOCTORS ||--o{ APPOINTMENTS : "has scheduled"
    
    USERS {
        uuid id PK
        string clerk_id UK
        string email UK
        string name
        datetime created_at
    }
    
    CHAT_SESSIONS {
        uuid id PK
        uuid user_id FK
        string title
        string conversation_type
        string agent_used
        string summary
    }
    
    CHAT_MESSAGES {
        uuid id PK
        uuid session_id FK
        string role
        string content
    }
    
    XRAY_SCANS {
        uuid id PK
        uuid user_id FK
        string file_path
        string diagnosis
        float confidence
        string recommendation
    }
    
    HEALTH_REPORTS {
        uuid id PK
        uuid user_id FK
        string file_name
        string report_text
        string analysis
    }
    
    DOCTORS {
        uuid id PK
        string name
        string specialization
        float consultation_fee
    }
    
    APPOINTMENTS {
        uuid id PK
        uuid user_id FK
        uuid doctor_id FK
        datetime scheduled_at
        string status
        string meeting_room_id
    }
```

---

## 4. Data Flow Diagram (DFD)
This diagram maps out how data securely passes between the User interface, Backend Router, AI components, and persistence layers.

```mermaid
flowchart LR
    User([User]) -- "Auth Token + Input Data" --> FE[Next.js Client]
    FE -- "REST API Requests" --> API[FastAPI Gateway]
    
    API -- "CRUD Operations" --> DB[(Supabase PostgreSQL)]
    API -- "Upload/Download Blobs" --> Store[(Supabase Storage)]
    
    subgraph AI Processing Pipeline
        API -- "Context + Multi-modal Data" --> Agent[AI Agent Router]
        Agent -- "Constructed Prompts" --> LLM[LLM Engines API]
        Agent -- "Preprocessed Tensors" --> TFModel[Local/Cloud TF Model]
    end
    
    LLM -- "Structured Output" --> Agent
    TFModel -- "Classification Scores" --> Agent
    Agent -- "Combined Inference" --> API
    API -- "JSON Response" --> FE
    FE -- "Rendered UI Components" --> User
```

---

## 5. Block Diagram
A high-level architectural block diagram representing the decoupling of frontend, API gateway, distinct AI services, and database.

```mermaid
flowchart TB
    subgraph Client Tier
        UI[React UI Components]
        State[State Management]
        XHR[Axios / Fetch Module]
    end
    
    subgraph API Tier
        FastAPI_Router[FastAPI Routers]
        Clerk_Auth[Clerk JWT Validator]
        Pydantic[Pydantic Validation]
    end
    
    subgraph Intelligence Tier
        Medical_Agent[Voice Consultation Agent]
        XRay_Agent[X-Ray Diagnostics Engine]
        Report_Agent[PDF Health Report Analyzer]
    end
    
    subgraph Data Tier
        SQLModel_ORM[SQLModel ORM Layer]
        Postgres[(Relational DB)]
        S3Bucket[(File Storage Blob)]
    end
    
    Client Tier -->|REST Calls| API Tier
    API Tier -->|Dispatch Task| Intelligence Tier
    Intelligence Tier -->|Read/Write Context| Data Tier
    API Tier -->|User/Logs Fetch| Data Tier
```

---

## 6. Detailed System Flowchart (Health Report Analysis)
A dedicated flowchart detailing the step-by-step logic of the Health Report processing feature.

```mermaid
flowchart TD
    A([Start]) --> B{User Uploads PDF}
    B --> C[Frontend parses Form Data]
    C --> D[POST /api/health-report]
    D --> E[FastAPI extracts & saves PDF to Supabase File Storage]
    E --> F[PyMuPDF / PDFPlumber extracts raw text data]
    F --> G[Construct System Prompt + Extracted Text]
    G --> H[Invoke Gemini / OpenAI API Call]
    
    H --> I{Valid JSON parsing?}
    I -- Yes --> J[Save extracted metrics & analysis via ORM to DB]
    I -- No --> K[Fallback loop: Retry LLM with formatting correction]
    
    K --> I
    J --> L[Return generated analysis object to Frontend]
    L --> M[Render Visual Report Dashboard using React]
    M --> N([End])
```
