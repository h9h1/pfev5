from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.database import get_session

app = FastAPI(title="Messaging Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    s = get_session()
    s.execute("""CREATE TABLE IF NOT EXISTS messages (
        id uuid PRIMARY KEY, sender_id uuid, sender_name text,
        receiver_id uuid, receiver_name text, content text,
        is_read boolean, created_at timestamp)""")

@app.get("/health")
def health(): return {"status":"ok"}
app.include_router(router)
