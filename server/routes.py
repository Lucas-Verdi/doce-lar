from fastapi import APIRouter, Depends, status, HTTPException
from pwdlib import PasswordHash
from sqlmodel import Session, SQLModel, select
import os
from datetime import datetime, timedelta, timezone
import jwt

from database.connection import get_session
from database.models.models import User

router = APIRouter(prefix="/api", tags=["api"])
password_hash = PasswordHash.recommended()



JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 15

class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    full_name: str | None = None


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

#Rota criação de conta
class UserCreate(SQLModel):
    username: str
    email: str
    full_name: str | None = None
    password: str


class UserPublic(SQLModel):
    id: int
    username: str
    email: str
    full_name: str | None

class UserLogin(SQLModel):
    email: str
    password: str


@router.post(
    "/create_account",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_account(
    body: UserCreate,
    session: Session = Depends(get_session),
):
    user = User(
        username=body.username,
        email=body.email,
        full_name=body.full_name,
        hashed_password=password_hash.hash(body.password),
    )

    session.add(user)
    session.commit()
    session.refresh(user)

    return user


@router.post("/user_login", response_model=Token)
def user_login(
    body: UserLogin,
    session: Session = Depends(get_session),
):
    user = session.exec(
        select(User).where(User.email == body.email)
    ).first()

    if user is None or not password_hash.verify(
        body.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
        )

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "username": user.username,
        "full_name": user.full_name,
    }