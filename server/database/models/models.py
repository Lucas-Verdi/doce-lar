from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, Query
from sqlmodel import Field, Session, SQLModel, create_engine, select

ORDER_FOREIGN_KEY = "order.id"

class Hero(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    age: int | None = Field(default=None, index=True)
    secret_name: str

class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True)
    email: str = Field(index=True)
    full_name: str | None = Field(default=None)
    hashed_password: str

class Product(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: str | None = Field(default=None)
    price: float
    in_stock: bool = Field(default=True)
    quantity: int = Field(default=0)

class UserCart(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    product_id: int = Field(foreign_key="product.id")
    quantity: int = Field(default=1)

class Order(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    total_amount: float
    status: str = Field(default="pending")

class OrderProduct(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key=ORDER_FOREIGN_KEY)
    product_id: int = Field(foreign_key="product.id")
    quantity: int = Field(default=1)

class Payment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key=ORDER_FOREIGN_KEY)
    amount: float
    status: str = Field(default="pending")
    payment_method: str = Field(default="credit_card")

class Shipment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key=ORDER_FOREIGN_KEY)
    address: str
    status: str = Field(default="pending")


