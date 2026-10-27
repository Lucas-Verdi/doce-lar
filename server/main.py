from fastapi import FastAPI, HTTPException
from sqlalchemy import text

from database.connection import engine

app = FastAPI()


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


@app.get("/")
def read_root():
    return {"Hello": "World"}