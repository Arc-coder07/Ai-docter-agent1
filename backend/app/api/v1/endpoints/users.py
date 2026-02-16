from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.engine import get_session
from app.core.auth import get_current_user
from app.models import User
from app.schemas import CreateUserRequest

router = APIRouter()

@router.post("/")
def create_user(
    request: CreateUserRequest,
    claims: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    clerk_user_id = claims["sub"]
    # Check if user exists
    statement = select(User).where(User.clerk_id == clerk_user_id)
    user = db.exec(statement).first()
    
    if user:
        return {"status": "exists", "id": str(user.id)}
        
    # Create new user
    # Create new user
    # Trust token claims over request body where possible
    # Note: Clerk tokens might not have email unless configured. 
    # Fallback to request body if missing in token, but verify match if possible.
    # For now, we take from token or body.
    
    email = claims.get("email") or request.email
    name = claims.get("name") or request.name
    
    user = User(
        clerk_id=clerk_user_id,
        email=email,
        name=name
    )
    db.add(user)
    try:
        db.commit()
    except Exception: # IntegrityError
        db.rollback()
        # Race condition hit, return existing
        statement = select(User).where(User.clerk_id == clerk_user_id)
        user = db.exec(statement).first()
        if not user:
            raise HTTPException(status_code=500, detail="Creation failed")
            
    db.refresh(user)
    
    return {"status": "created", "id": str(user.id)}
