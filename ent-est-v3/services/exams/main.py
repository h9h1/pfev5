from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.database import get_session

app = FastAPI(title="Exams Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    s = get_session()
    s.execute("""CREATE TABLE IF NOT EXISTS exams (
        id uuid PRIMARY KEY, title text, course_id uuid, teacher_id uuid,
        exam_type text, duration_min int, is_published boolean,
        minio_key text, minio_bucket text, created_at timestamp)""")
    s.execute("""CREATE TABLE IF NOT EXISTS submissions (
        id uuid PRIMARY KEY, exam_id uuid, student_id uuid, student_name text,
        minio_key text, grade float, comment text, submitted_at timestamp)""")

@app.get("/health")
def health(): return {"status":"ok"}
app.include_router(router)
