# AI Doctor Agent - Project Analysis Report

**Date:** December 23, 2025  
**Project Name:** Doctor AI Agent  
**Type:** Full-Stack Next.js Web Application  
**Version:** 0.1.0

---

## 📋 Executive Summary

This is a **medical consultation AI application** built with Next.js that provides real-time voice conversations between users and an AI medical assistant. It features speech-to-text transcription, AI-powered medical responses, and text-to-speech capabilities. The application includes user authentication, session management, and database persistence.

---

## 🏗️ Technical Stack

### Frontend
- **Framework:** Next.js 15.3.4 (React 19)
- **Styling:** TailwindCSS 4 with PostCSS
- **UI Components:** Radix UI, shadcn components
- **State Management:** Zustand 5.0.5
- **Animations:** Framer Motion 12.19.1, Tailwind Animate
- **Charts:** Recharts 3.0.0
- **Icons:** Lucide React, React Icons
- **Carousel:** Embla Carousel

### Backend
- **Runtime:** Node.js (Next.js API Routes)
- **Server:** Express 5.1.0
- **Real-time:** Socket.IO 4.8.1 (client & server)

### Database
- **ORM:** Prisma 6.10.1
- **Database:** PostgreSQL
- **Migrations:** Prisma Migrations system

### Authentication
- **Provider:** Clerk (v6.22.0)

### External APIs
- **Speech-to-Text:** AssemblyAI WebSocket API
- **Text-to-Speech:** Murf AI
- **AI Model:** OpenRouter / OpenAI (GPT-4o)
- **HTTP Client:** Axios 1.10.0

### Development Tools
- **Language:** TypeScript 5
- **Linting:** ESLint 9
- **Build Tool:** Turbopack (Next.js built-in)
- **Package Manager:** npm

---

## 📁 Project Structure

```
Ai-docter-agent/
├── app/                          # Next.js App Router
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout with Clerk provider
│   ├── page.tsx                 # Home page (marketing site)
│   ├── provider.tsx             # Theme/custom providers
│   ├── (auth)/                  # Auth routes (Clerk)
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (routes)/
│   │   └── dashboard/           # Protected dashboard
│   │       ├── page.tsx         # Dashboard main view
│   │       ├── layout.tsx       # Dashboard layout
│   │       ├── medical-agent/   # Voice conversation feature
│   │       └── _components/     # Dashboard components
│   │           ├── AddNewSession.tsx
│   │           ├── AppHeader.tsx
│   │           ├── DoctorsList.tsx
│   │           ├── drawer.tsx
│   │           └── HistoryList.tsx
│   └── api/                      # API routes
│       ├── chat/                # GPT chat endpoint
│       ├── session-chat/        # Session-based chat
│       ├── transcribe/          # AssemblyAI transcription
│       ├── tts/                 # Text-to-Speech conversion
│       ├── suggest-docters/     # Doctor recommendations
│       └── users/               # User management
├── components/                   # Shared React components
│   ├── magicui/                 # Magic UI animations
│   ├── sections/                # Page sections (hero, faq, etc.)
│   ├── ui/                      # Shadcn UI components
│   └── [other components]
├── context/                      # React Context
│   └── UserDetail.tsx           # User context
├── lib/                         # Utilities & helpers
│   ├── config.tsx               # Site configuration
│   ├── utils.ts                 # Utility functions
│   ├── blog.ts                  # Blog utilities
│   ├── hooks/                   # Custom hooks
│   │   └── use-window-size.ts
│   └── generated/prisma/        # Generated Prisma client
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Database migrations
├── public/                       # Static assets
├── shared/                       # Shared utilities
│   ├── OpenAiModel.tsx          # OpenRouter/OpenAI config
│   └── list.tsx
├── middleware.ts                # Clerk authentication middleware
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── package.json                 # Dependencies
├── package-lock.json
├── postcss.config.mjs           # PostCSS configuration
├── components.json              # Shadcn config
├── eslint.config.mjs            # ESLint configuration
└── README.md                     # Documentation
```

---

## 🔄 Application Flow

### 1. **Authentication Flow**
```
User → Sign-in/Sign-up (Clerk) → Dashboard (Protected) → Medical Agent
```
- Uses Clerk for authentication
- Middleware protects all routes except `/sign-in` and `/sign-up`
- User context stores authenticated user data

### 2. **Voice Conversation Flow**
```
1. User clicks "Start Call"
2. AI introduces itself via TTS (Murf AI or Browser TTS)
3. Microphone activates (listening state)
4. User speaks
5. Speech-to-Text (AssemblyAI) converts to text
6. Chat API sends text + doctor prompt to OpenRouter/GPT-4o
7. AI response received
8. TTS converts response to speech
9. Repeat until user ends call
```

### 3. **Data Flow**
```
User Input → AssemblyAI API → Chat API → OpenRouter → Response → TTS API → User Audio
```

---

## 📊 Database Schema

### Current Tables:

#### 1. **User**
```sql
- id: Int (Primary Key, Auto-increment)
- email: String (Unique)
- name: String
- credit: Int
```

#### 2. **Session**
```sql
- id: Int (Primary Key, Auto-increment)
- sessionId: String (Unique)
- notes: String
- selectedDocter: Json (Doctor selection)
- conversation: Json (Chat history)
- report: Json (Medical report)
- createdBy: String (User email/ID)
- createdOn: String (Timestamp)
```

#### ⚠️ Migration Issue:
The initial migration (20250623110055_init) creates a `hello` table which is NOT in the schema.prisma. This is a leftover table that should be removed.

---

## 🔌 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Send messages to AI (GPT-4o) |
| `/api/session-chat` | POST | Session-based chat management |
| `/api/transcribe` | POST | Speech-to-Text (AssemblyAI) |
| `/api/tts` | POST | Text-to-Speech conversion |
| `/api/suggest-docters` | GET/POST | Doctor recommendations |
| `/api/users` | POST | Create/manage user profiles |

---

## 🔑 Required Environment Variables

```env
# Speech-to-Text
NEXT_PUBLIC_ASSEMBLYAI_API_KEY=your_assemblyai_key_here

# Text-to-Speech
MURF_API_KEY=your_murf_api_key_here

# AI Model
OPEN_ROUTER_API_KEY=your_openrouter_key_here

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_public_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/doctor_ai?schema=public

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🎯 Key Features

1. **Real-time Voice Conversation**
   - Voice activity detection
   - Turn-taking conversation management
   - Dual captions (user & AI)

2. **Medical AI Assistant**
   - GPT-4o powered responses
   - Doctor specialization prompts
   - Fallback responses for API failures

3. **Session Management**
   - Session history
   - Conversation persistence
   - Medical report generation

4. **User Management**
   - Clerk authentication
   - User profiles with credits
   - Doctor selection

5. **Responsive UI**
   - Dark/Light theme support
   - Mobile-friendly design
   - Real-time streaming updates

---

## 📦 Dependencies Summary

### Core (18 packages)
- Next.js, React, React DOM
- Clerk, Prisma
- OpenAI, AssemblyAI, Axios
- Zustand, Framer Motion

### UI/Styling (10 packages)
- TailwindCSS, Tailwind Merge
- Radix UI, Shadcn components
- Lucide React, React Icons
- Recharts, Embla Carousel

### Dev Dependencies (8 packages)
- TypeScript, ESLint
- Tailwind CSS, Prisma

---

## ⚠️ Current Issues Identified

1. **Orphaned Migration Table**
   - The `hello` table exists in migration but not in schema.prisma
   - Needs cleanup

2. **Generated Prisma Client**
   - Located at `/lib/generated/prisma/` (not recommended path)
   - Should be in `.prisma/client/` (default)

3. **Environment Configuration**
   - Multiple API keys required
   - No fallback for missing keys (except TTS)
   - No validation on startup

4. **Database Connection**
   - Prisma instantiation in every API route
   - Could benefit from connection pooling (PrismaProxy)

---

## 🚀 Performance Considerations

1. **Socket.IO Overhead**
   - Socket.IO added as dependency but might not be fully utilized
   - Check if it's actually used in medical-agent component

2. **Database Queries**
   - Each API route creates new Prisma instance
   - Consider using Prisma middleware for logging/optimization

3. **LLM API Calls**
   - OpenRouter has rate limits
   - Max tokens set to 500 (reasonable for voice)
   - Temperature 0.7 (good for medical advice)

4. **Audio Processing**
   - AssemblyAI handles on their servers
   - Browser Audio API for recording
   - Murf AI or Web Speech API for TTS

---

## 🔐 Security Notes

1. **Authentication**
   - Clerk provides robust auth
   - All protected routes require authentication
   - Middleware enforces protection

2. **API Keys**
   - Public keys (NEXT_PUBLIC_*) exposed intentionally
   - Secret keys stored server-side only
   - AssemblyAI key can be public (API-key based auth)

3. **Database**
   - Prisma handles SQL injection prevention
   - User data tied to Clerk user IDs
   - Session isolation per user

---

## 📈 Scalability Insights

- **Current Setup:** SQLite-ready but configured for PostgreSQL
- **Recommended for Production:**
  - Database: PostgreSQL with connection pooling (PgBouncer)
  - Caching: Redis for session state
  - File Storage: S3 for audio files
  - CDN: Vercel's edge network or Cloudflare
  - Monitoring: Sentry for error tracking

---

## 🎓 Code Quality

- **Type Safety:** Full TypeScript implementation
- **Component Structure:** Good separation of concerns
- **Styling:** Utility-first with TailwindCSS
- **State Management:** Zustand (lightweight, efficient)
- **Testing:** Not currently implemented (recommended: Jest, React Testing Library)

---

