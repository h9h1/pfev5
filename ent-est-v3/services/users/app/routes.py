from fastapi import APIRouter, HTTPException, Depends
from app.database import get_session
from app.auth import verify_token, require_admin
from pydantic import BaseModel
from typing import Optional
from passlib.hash import bcrypt
import jwt, uuid, datetime, os

router = APIRouter()
SECRET = os.getenv('JWT_SECRET','super_secret_jwt_key_2024')
DOMAIN = os.getenv('EMAIL_DOMAIN','est.ac.ma')

def make_token(user):
    payload = {
        'sub':   str(user['id']),
        'username': user['username'],
        'email': user['email'],
        'role':  user['role'],
        'first_name': user['first_name'],
        'last_name':  user['last_name'],
        'exp':   datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET, algorithm='HS256')

# ── LOGIN ──
class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/auth/login")
def login(payload: LoginRequest):
    s = get_session()
    rows = s.execute("SELECT id,username,email,password_hash,first_name,last_name,role,department,student_id,is_active FROM users ALLOW FILTERING")
    user = None
    for r in rows:
        if r.email == payload.email.lower():
            user = r; break
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé")
    if not bcrypt.verify(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    u = {'id':user.id,'username':user.username,'email':user.email,
         'first_name':user.first_name,'last_name':user.last_name,
         'role':user.role,'department':user.department,'student_id':user.student_id}
    token = make_token(u)
    return {'access_token': token, 'token_type':'bearer', 'user': u}

# ── ADMIN: Create user with university email ──
class UserCreate(BaseModel):
    first_name: str
    last_name:  str
    role:       str = 'student'       # student | teacher | admin
    department: Optional[str] = ''
    student_id: Optional[str] = ''   # matricule

@router.post("/admin/users", status_code=201)
def admin_create_user(payload: UserCreate, admin=Depends(require_admin)):
    s = get_session()
    
    # Generate university email: prenom.nom@est.ac.ma
    base = f"{payload.first_name.lower().strip()}.{payload.last_name.lower().strip()}"
    base = base.replace(' ','.').replace('-','.')
    # Remove accents simple
    import unicodedata
    base = ''.join(c for c in unicodedata.normalize('NFD',base) if unicodedata.category(c) != 'Mn')
    email_base = f"{base}@{DOMAIN}"
    # Check uniqueness — add number if exists
    existing = [r.email for r in s.execute("SELECT email FROM users ALLOW FILTERING")]
    email = email_base
    counter = 1
    while email in existing:
        email = f"{base}{counter}@{DOMAIN}"
        counter += 1
    username = email.split('@')[0]
    # Generate temporary password: FirstName + year
    import random, string
    temp_pw = f"{payload.first_name.capitalize()}{datetime.datetime.now().year}{''.join(random.choices(string.digits,k=3))}"
    uid = uuid.uuid4()
    sid = payload.student_id or f"{'STU' if payload.role=='student' else 'ENS'}-{str(uid)[:8].upper()}"
    s.execute(
        "INSERT INTO users (id,username,email,password_hash,first_name,last_name,role,department,student_id,is_active,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (uid, username, email, bcrypt.hash(temp_pw),
         payload.first_name, payload.last_name, payload.role,
         payload.department or '', sid, True, datetime.datetime.utcnow())
    )
    return {
        'id': str(uid),
        'email': email,
        'username': username,
        'temp_password': temp_pw,
        'student_id': sid,
        'role': payload.role,
        'message': f"Compte créé. Email: {email} / Mot de passe temporaire: {temp_pw}"
    }

# ── ADMIN: List users ──
@router.get("/admin/users")
def admin_list_users(admin=Depends(require_admin)):
    s = get_session()
    rows = s.execute("SELECT id,username,email,first_name,last_name,role,department,student_id,is_active,created_at FROM users")
    return [{'id':str(r.id),'username':r.username,'email':r.email,
             'first_name':r.first_name,'last_name':r.last_name,
             'role':r.role,'department':r.department,'student_id':r.student_id,
             'is_active':r.is_active,'created_at':str(r.created_at)} for r in rows]

# ── ADMIN: Toggle active ──
@router.patch("/admin/users/{user_id}/toggle")
def toggle_user(user_id: str, admin=Depends(require_admin)):
    s = get_session()
    uid = uuid.UUID(user_id)
    rows = s.execute("SELECT is_active FROM users WHERE id=%s",(uid,))
    r = next(iter(rows), None)
    if not r: raise HTTPException(404,"Utilisateur introuvable")
    s.execute("UPDATE users SET is_active=%s WHERE id=%s",(not r.is_active, uid))
    return {'is_active': not r.is_active}

# ── ADMIN: Reset password ──
@router.post("/admin/users/{user_id}/reset-password")
def reset_password(user_id: str, admin=Depends(require_admin)):
    s = get_session()
    uid = uuid.UUID(user_id)
    import random, string
    new_pw = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
    s.execute("UPDATE users SET password_hash=%s WHERE id=%s",(bcrypt.hash(new_pw), uid))
    return {'temp_password': new_pw}

# ── ADMIN: Delete user ──
@router.delete("/admin/users/{user_id}")
def delete_user(user_id: str, admin=Depends(require_admin)):
    s = get_session()
    s.execute("DELETE FROM users WHERE id=%s",(uuid.UUID(user_id),))
    return {'status':'deleted'}

# ── Change own password ──
class PwChange(BaseModel):
    old_password: str
    new_password: str

@router.post("/auth/change-password")
def change_password(payload: PwChange, me=Depends(verify_token)):
    s = get_session()
    uid = uuid.UUID(me['sub'])
    rows = s.execute("SELECT password_hash FROM users WHERE id=%s",(uid,))
    r = next(iter(rows), None)
    if not r: raise HTTPException(404)
    if not bcrypt.verify(payload.old_password, r.password_hash):
        raise HTTPException(400, "Ancien mot de passe incorrect")
    s.execute("UPDATE users SET password_hash=%s WHERE id=%s",(bcrypt.hash(payload.new_password), uid))
    return {'status':'ok'}

# ── Get profile ──
@router.get("/users/me")
def get_me(me=Depends(verify_token)):
    s = get_session()
    uid = uuid.UUID(me['sub'])
    rows = s.execute("SELECT id,username,email,first_name,last_name,role,department,student_id FROM users WHERE id=%s",(uid,))
    r = next(iter(rows), None)
    if not r: raise HTTPException(404)
    return {'id':str(r.id),'username':r.username,'email':r.email,
            'first_name':r.first_name,'last_name':r.last_name,
            'role':r.role,'department':r.department,'student_id':r.student_id}

# ── List all users (authenticated) ──
@router.get("/users")
def list_users(me=Depends(verify_token)):
    s = get_session()
    rows = s.execute("SELECT id,username,email,first_name,last_name,role,department,student_id FROM users WHERE is_active=true ALLOW FILTERING")
    return [{'id':str(r.id),'username':r.username,'email':r.email,
             'first_name':r.first_name,'last_name':r.last_name,
             'role':r.role,'department':r.department,'student_id':r.student_id} for r in rows]
