from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.engine import get_session
from app.core.auth import get_current_user
from app.models import User
from app.schemas import CreateUserRequest

router = APIRouter()

@router.post("/")
async def create_user(
    request: CreateUserRequest,
    clerk_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    # Check if user exists
    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()
    
    if user:
        return {"status": "exists", "id": str(user.id)}
        
    # Create new user
    user = User(
        clerk_id=clerk_user_id,
        email=request.email,
        name=request.name
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {"status": "created", "id": str(user.id)}
