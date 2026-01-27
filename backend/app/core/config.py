from pydantic_settings import BaseSettings
from functools import lru_cache

from pathlib import Path

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Doctor Agent"
    API_V1_STR: str = "/api/v1"
    
    # Check .env for these
    DATABASE_URL: str
    GEMINI_API_KEY: str
    
    # CLERK
    CLERK_SECRET_KEY: str
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: str

    class Config:
        # backend/app/core/config.py -> backend/app/core -> backend/app -> backend -> root
        env_file = str(Path(__file__).resolve().parent.parent.parent.parent / ".env")
        case_sensitive = True
        extra = "ignore" 

@lru_cache()
def get_settings():
    return Settings()
