from fastapi import APIRouter, Depends, status, HTTPException
from pwdlib import PasswordHash
from sqlmodel import Session, SQLModel, select, Field
import os
from datetime import datetime, timedelta, timezone
import jwt
from typing import Annotated
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database.connection import get_session
from database.models.models import Order, OrderProduct, Payment, Product, User, UserCart

router = APIRouter(prefix="/api", tags=["api"])
password_hash = PasswordHash.recommended()
bearer = HTTPBearer()

def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends (bearer)],
    session: Session = Depends (get_session),
) -> User:
    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
        )
        user_id = int(payload['sub'])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    current_user = session.get(User, user_id)
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail= "Usuário não encontrado",
        )
    return current_user


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

class OrderItemInput(SQLModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=99)

class OrderCreate(SQLModel):
    items: list[OrderItemInput] = Field(min_length=1)
    payment_method: str

class OrderPublic(SQLModel):
    id: int
    total_amount: float
    status: str
    payment_method: str

class OrderItemPublic(SQLModel):
    product_id: int
    name: str
    price: float
    quantity: int
    subtotal: float

class OrderHistoryPublic(SQLModel):
    id: int
    total_amount: float
    payment_method: str
    items: list[OrderItemPublic]


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

class ProductPublic(SQLModel):
    id: int
    name: str
    description: str | None
    price: float
    in_stock: bool
    quantity: int

#Rota criação de conta
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

#Rota de login
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

#Pega o produtos do banco de dados.
@router.get("/get_products", response_model=list [ProductPublic])
def get_products(
    session: Session = Depends(get_session),
) -> list[Product]:
    return session.exec(select(Product)).all()


@router.post(
    "/orders",
    response_model=OrderPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_order(
    body: OrderCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if body.payment_method not in {"credit_card", "pix"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Forma de pagamento inválida.",
        )

    product_ids = [item.product_id for item in body.items]

    if len(set(product_ids)) != len(product_ids):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Envie cada produto apenas uma vez.",
        )

    products: dict[int, Product] = {}

    for product_id in product_ids:
        product = session.get(Product, product_id)

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {product_id} não encontrado.",
            )

        products[product_id] = product

    for item in body.items:
        product = products[item.product_id]

        if not product.in_stock or product.quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Estoque insuficiente para {product.name}.",
            )

    total = sum(
        products[item.product_id].price * item.quantity
        for item in body.items
    )

    # Substitui o conteúdo anterior do carrinho pelo enviado agora.
    carrinho_anterior = session.exec(
        select(UserCart).where(UserCart.user_id == current_user.id)
    ).all()

    for item in carrinho_anterior:
        session.delete(item)

    order = Order(
        user_id=current_user.id,
        total_amount=total,
        status="pending",
    )
    session.add(order)
    session.flush()  # Grava o pedido para obter order.id sem confirmar a transação.

    for item in body.items:
        product = products[item.product_id]

        session.add(
            OrderProduct(
                order_id=order.id,
                product_id=product.id,
                quantity=item.quantity,
            )
        )

        product.quantity -= item.quantity
        product.in_stock = product.quantity > 0

    session.add(
        Payment(
            order_id=order.id,
            amount=total,
            status="paid",
            payment_method=body.payment_method,
        )
    )
    session.commit()
    session.refresh(order)

    return OrderPublic(
        id=order.id,
        total_amount=order.total_amount,
        status=order.status,
        payment_method=body.payment_method,
    )


@router.get("/orders", response_model=list[OrderHistoryPublic])
def get_orders(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[OrderHistoryPublic]:
    orders = session.exec(
        select(Order)
        .where(Order.user_id == current_user.id)
        .order_by(Order.id.desc())
    ).all()

    result: list[OrderHistoryPublic] = []
    for order in orders:
        payment = session.exec(
            select(Payment).where(Payment.order_id == order.id)
        ).first()
        order_items = session.exec(
            select(OrderProduct).where(OrderProduct.order_id == order.id)
        ).all()
        history_items: list[OrderItemPublic] = []
        for order_item in order_items:
            product = session.get(Product, order_item.product_id)
            if product is None:
                continue
            history_items.append(
                OrderItemPublic(
                    product_id=product.id,
                    name=product.name,
                    price=product.price,
                    quantity=order_item.quantity,
                    subtotal=product.price * order_item.quantity,
                )
            )
        result.append(
            OrderHistoryPublic(
                id=order.id,
                total_amount=order.total_amount,
                payment_method=payment.payment_method if payment else "unknown",
                items=history_items,
            )
        )
    return result