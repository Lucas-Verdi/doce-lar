from fastapi import APIRouter, Depends, status
from pwdlib import PasswordHash
from sqlmodel import Session, SQLModel

from database.connection import get_session
from database.models.models import User

router = APIRouter(prefix="/users", tags=["users"])
password_hash = PasswordHash.recommended()


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

@router.get()