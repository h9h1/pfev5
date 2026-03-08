from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.database import get_session

app = FastAPI(title="Forum Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    s = get_session()
    s.execute("""CREATE TABLE IF NOT EXISTS forum_categories (
        id uuid PRIMARY KEY, name text, description text,
        created_by text, created_at timestamp)""")
    s.execute("""CREATE TABLE IF NOT EXISTS forum_threads (
        id uuid PRIMARY KEY, category_id uuid, title text,
        content text, author_id uuid, author_name text,
        is_pinned boolean, is_locked boolean,
        reply_count int, view_count int, created_at timestamp, updated_at timestamp)""")
    s.execute("""CREATE TABLE IF NOT EXISTS forum_replies (
        id uuid PRIMARY KEY, thread_id uuid, content text,
        author_id uuid, author_name text, author_role text,
        created_at timestamp)""")
    # Create default categories
    import uuid as _uuid, datetime
    cats = s.execute("SELECT id FROM forum_categories")
    if not list(cats):
        for name, desc in [
            ("Général","Discussions générales"),
            ("Cours & Pédagogie","Questions sur les cours"),
            ("Examens","Préparation aux examens"),
            ("Vie étudiante","Campus et vie associative"),
            ("Offres de stage","Stages et emploi"),
        ]:
            cid = _uuid.uuid4()
            s.execute("INSERT INTO forum_categories (id,name,description,created_by,created_at) VALUES (%s,%s,%s,%s,%s)",
                (cid,name,desc,"admin",datetime.datetime.utcnow()))
        print("✅ Catégories forum créées")

@app.get("/health")
def health(): return {"status":"ok"}
app.include_router(router)
