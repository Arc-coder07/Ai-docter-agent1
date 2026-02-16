from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.v1.endpoints import chat, history, users, assistant, report, xray, consultation
import os

app = FastAPI(title="AI Doctor Agent API")

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
if os.path.exists(uploads_dir):
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
app.include_router(history.router, prefix="/api/v1/history", tags=["history"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(assistant.router, prefix="/api/v1/assistant", tags=["assistant"])
app.include_router(report.router, prefix="/api/v1/report", tags=["report"])
app.include_router(xray.router, prefix="/api/v1/xray", tags=["xray"])
app.include_router(consultation.router, prefix="/api/v1/consultation", tags=["consultation"])

@app.get("/")
def read_root():
    return {"message": "AI Doctor Agent API is running"}

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
