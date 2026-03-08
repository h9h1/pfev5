from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.database import get_session
import os

app = FastAPI(title="Users Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    s = get_session()
    s.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id uuid PRIMARY KEY,
            username text,
            email text,
            password_hash text,
            first_name text,
            last_name text,
            role text,
            department text,
            student_id text,
            is_active boolean,
            created_at timestamp
        )
    """)
    # Create default admin if not exists
    import uuid, datetime
    from passlib.hash import bcrypt
    rows = s.execute("SELECT id FROM users ALLOW FILTERING")
    existing = list(rows)
    if not existing:
        domain = os.getenv('EMAIL_DOMAIN','est.ac.ma')
        admin_id = uuid.uuid4()
        s.execute(
            "INSERT INTO users (id,username,email,password_hash,first_name,last_name,role,department,student_id,is_active,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (admin_id,'admin',f'admin@{domain}',bcrypt.hash('admin2024'),
             'Admin','ENT','admin','Direction','ADM-001',True,datetime.datetime.utcnow())
        )
        print(f"✅ Admin créé: admin@{domain} / admin2024")

@app.get("/health")
def health(): return {"status":"ok","service":"users"}

app.include_router(router)
