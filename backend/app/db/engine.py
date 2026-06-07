from sqlmodel import create_engine, SQLModel, Session  # pyre-ignore[21]
from app.core.config import get_settings  # pyre-ignore[21]
import logging

logger = logging.getLogger(__name__)

settings = get_settings()

# Ensure URL uses sync psycopg2 driver (strip +asyncpg if present)
database_url = settings.DATABASE_URL.replace("+asyncpg", "")

# Determine if we're connecting to a remote DB (Supabase, etc.)
is_remote = "supabase" in database_url or "render" in database_url or "neon" in database_url

# Add sslmode=require for remote databases if not already present
if is_remote and "sslmode" not in database_url:
    separator = "&" if "?" in database_url else "?"
    database_url = f"{database_url}{separator}sslmode=require"

engine = create_engine(
    database_url,
    echo=not is_remote,  # Disable verbose SQL logging in production
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

def get_session():
    with Session(engine) as session:
        yield session
