from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.database import get_session

app = FastAPI(title="Courses Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    s = get_session()
    s.execute("""CREATE TABLE IF NOT EXISTS courses (
        id uuid PRIMARY KEY, title text, description text,
        teacher_id uuid, teacher_name text, is_published boolean, created_at timestamp)""")
    s.execute("""CREATE TABLE IF NOT EXISTS course_files (
        id uuid PRIMARY KEY, course_id uuid, filename text,
        file_type text, file_size bigint, minio_key text, uploaded_at timestamp)""")

@app.get("/health")
def health(): return {"status":"ok"}
app.include_router(router)
