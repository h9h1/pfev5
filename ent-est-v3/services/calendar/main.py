from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.database import get_session

app = FastAPI(title="Calendar Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    s = get_session()
    s.execute("""CREATE TABLE IF NOT EXISTS events (
        id uuid PRIMARY KEY, title text, description text,
        event_date text, event_time text, duration_min int,
        course_id text, created_by text, event_type text, created_at timestamp)""")

@app.get("/health")
def health(): return {"status":"ok"}
app.include_router(router)
