from sqlmodel import create_engine, SQLModel, Session
from app.core.config import get_settings

settings = get_settings()

# Use standard postgres URL (psycopg2)
# Ensure sslmode is set if needed (it is in .env)
# But sqlalchemy might need 'postgresql+psycopg2://' explicitly or just 'postgresql://' defaults to psycopg2.
# The .env has 'postgresql://...' which defaults to psycopg2.
database_url = settings.DATABASE_URL

# engine = create_engine(database_url, echo=True, pool_pre_ping=True)
# Safe check: replace +asyncpg if it was there (it wasn't in .env but env.py was adding it)
database_url = database_url.replace("+asyncpg", "")

engine = create_engine(database_url, echo=True, pool_pre_ping=True)

def get_session():
    with Session(engine) as session:
        yield session
