from contextlib import asynccontextmanager
from routes import router as users_router
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy import inspect
from sqlmodel import SQLModel

import database.models.models  # noqa: F401  registra as models no metadata
from database.connection import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    if engine is not None:
        SQLModel.metadata.create_all(engine)
        with engine.begin() as connection:
            columns = {column["name"] for column in inspect(connection).get_columns("user")}
            migrations = {
                "reset_token_hash": "VARCHAR(128)",
                "reset_token_expires_at": "DATETIME",
                "reset_token_used": "BOOLEAN NOT NULL DEFAULT FALSE",
            }
            for name, definition in migrations.items():
                if name not in columns:
                    connection.execute(text(f"ALTER TABLE `user` ADD COLUMN {name} {definition}"))
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_origins=["http://localhost:4200", "https://doce-lar-eight.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(users_router)




@app.get("/health")
def health():
    if engine is None:
        raise HTTPException(status_code=503, detail="DATABASE_URL não configurada")
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(
            status_code=503, detail=f"Falha na conexão com o banco: {type(exc).__name__}"
        )
    return {"status": "ok", "database": "connected"}  