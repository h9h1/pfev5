from fastapi import APIRouter, HTTPException, Depends
from app.database import get_session
from app.auth import verify_token, require_teacher
from pydantic import BaseModel
from typing import Optional
import uuid, datetime

router = APIRouter()

# ── Categories ──
@router.get("/forum/categories")
def list_categories(me=Depends(verify_token)):
    s = get_session()
    rows = s.execute("SELECT id,name,description,created_at FROM forum_categories")
    result = []
    for r in rows:
        tc = len(list(s.execute("SELECT id FROM forum_threads WHERE category_id=%s ALLOW FILTERING",(r.id,))))
        result.append({"id":str(r.id),"name":r.name,"description":r.description,"thread_count":tc})
    return result

class CatCreate(BaseModel):
    name: str
    description: Optional[str] = ""

@router.post("/forum/categories", status_code=201)
def create_category(payload: CatCreate, me=Depends(require_teacher)):
    s = get_session()
    uid = uuid.uuid4()
    s.execute("INSERT INTO forum_categories (id,name,description,created_by,created_at) VALUES (%s,%s,%s,%s,%s)",
        (uid, payload.name, payload.description or "", me['username'], datetime.datetime.utcnow()))
    return {"id":str(uid),"name":payload.name}

# ── Threads ──
class ThreadCreate(BaseModel):
    category_id: str
    title: str
    content: str

@router.post("/forum/threads", status_code=201)
def create_thread(payload: ThreadCreate, me=Depends(verify_token)):
    s = get_session()
    uid = uuid.uuid4()
    now = datetime.datetime.utcnow()
    try: cid = uuid.UUID(payload.category_id)
    except: raise HTTPException(400,"category_id invalide")
    s.execute("INSERT INTO forum_threads (id,category_id,title,content,author_id,author_name,is_pinned,is_locked,reply_count,view_count,created_at,updated_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (uid, cid, payload.title, payload.content, uuid.UUID(me['sub']),
         f"{me['first_name']} {me['last_name']}".strip() or me['username'],
         False, False, 0, 0, now, now))
    return {"id":str(uid),"title":payload.title}

@router.get("/forum/threads")
def list_threads(category_id: Optional[str]=None, me=Depends(verify_token)):
    s = get_session()
    if category_id:
        rows = s.execute("SELECT id,category_id,title,content,author_id,author_name,is_pinned,is_locked,reply_count,view_count,created_at,updated_at FROM forum_threads WHERE category_id=%s ALLOW FILTERING",(uuid.UUID(category_id),))
    else:
        rows = s.execute("SELECT id,category_id,title,content,author_id,author_name,is_pinned,is_locked,reply_count,view_count,created_at,updated_at FROM forum_threads")
    result = [{"id":str(r.id),"category_id":str(r.category_id),"title":r.title,
        "content":r.content[:200],"author_id":str(r.author_id),"author_name":r.author_name,
        "is_pinned":r.is_pinned,"is_locked":r.is_locked,
        "reply_count":r.reply_count or 0,"view_count":r.view_count or 0,
        "created_at":str(r.created_at),"updated_at":str(r.updated_at)} for r in rows]
    result.sort(key=lambda x: (not x["is_pinned"], x["updated_at"]), reverse=False)
    result.sort(key=lambda x: x["is_pinned"], reverse=True)
    return result

@router.get("/forum/threads/{thread_id}")
def get_thread(thread_id: str, me=Depends(verify_token)):
    s = get_session()
    tid = uuid.UUID(thread_id)
    rows = s.execute("SELECT id,category_id,title,content,author_id,author_name,is_pinned,is_locked,reply_count,view_count,created_at FROM forum_threads WHERE id=%s",(tid,))
    r = next(iter(rows), None)
    if not r: raise HTTPException(404,"Sujet introuvable")
    # Increment views
    s.execute("UPDATE forum_threads SET view_count=%s WHERE id=%s",((r.view_count or 0)+1, tid))
    replies = s.execute("SELECT id,content,author_id,author_name,author_role,created_at FROM forum_replies WHERE thread_id=%s ALLOW FILTERING",(tid,))
    return {
        "id":str(r.id),"category_id":str(r.category_id),"title":r.title,"content":r.content,
        "author_id":str(r.author_id),"author_name":r.author_name,
        "is_pinned":r.is_pinned,"is_locked":r.is_locked,
        "reply_count":r.reply_count or 0,"view_count":(r.view_count or 0)+1,
        "created_at":str(r.created_at),
        "replies":[{"id":str(rp.id),"content":rp.content,"author_id":str(rp.author_id),
            "author_name":rp.author_name,"author_role":rp.author_role,"created_at":str(rp.created_at)} for rp in replies]
    }

# ── Replies ──
class ReplyCreate(BaseModel):
    content: str

@router.post("/forum/threads/{thread_id}/replies", status_code=201)
def add_reply(thread_id: str, payload: ReplyCreate, me=Depends(verify_token)):
    s = get_session()
    tid = uuid.UUID(thread_id)
    rows = s.execute("SELECT is_locked,reply_count FROM forum_threads WHERE id=%s",(tid,))
    t = next(iter(rows), None)
    if not t: raise HTTPException(404)
    if t.is_locked: raise HTTPException(403,"Ce sujet est verrouillé")
    uid = uuid.uuid4()
    now = datetime.datetime.utcnow()
    s.execute("INSERT INTO forum_replies (id,thread_id,content,author_id,author_name,author_role,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s)",
        (uid, tid, payload.content, uuid.UUID(me['sub']),
         f"{me['first_name']} {me['last_name']}".strip() or me['username'],
         me['role'], now))
    s.execute("UPDATE forum_threads SET reply_count=%s, updated_at=%s WHERE id=%s",
        ((t.reply_count or 0)+1, now, tid))
    return {"id":str(uid),"content":payload.content,"author_name":me['first_name']}

# ── Pin / Lock (teacher only) ──
@router.patch("/forum/threads/{thread_id}/pin")
def pin_thread(thread_id: str, me=Depends(require_teacher)):
    s = get_session()
    tid = uuid.UUID(thread_id)
    rows = s.execute("SELECT is_pinned FROM forum_threads WHERE id=%s",(tid,))
    r = next(iter(rows), None)
    if not r: raise HTTPException(404)
    s.execute("UPDATE forum_threads SET is_pinned=%s WHERE id=%s",(not r.is_pinned, tid))
    return {"is_pinned": not r.is_pinned}

@router.patch("/forum/threads/{thread_id}/lock")
def lock_thread(thread_id: str, me=Depends(require_teacher)):
    s = get_session()
    tid = uuid.UUID(thread_id)
    rows = s.execute("SELECT is_locked FROM forum_threads WHERE id=%s",(tid,))
    r = next(iter(rows), None)
    if not r: raise HTTPException(404)
    s.execute("UPDATE forum_threads SET is_locked=%s WHERE id=%s",(not r.is_locked, tid))
    return {"is_locked": not r.is_locked}

@router.delete("/forum/threads/{thread_id}")
def delete_thread(thread_id: str, me=Depends(verify_token)):
    s = get_session()
    tid = uuid.UUID(thread_id)
    rows = s.execute("SELECT author_id FROM forum_threads WHERE id=%s",(tid,))
    r = next(iter(rows), None)
    if not r: raise HTTPException(404)
    if str(r.author_id) != me['sub'] and me['role'] not in ('teacher','admin'):
        raise HTTPException(403,"Non autorisé")
    s.execute("DELETE FROM forum_threads WHERE id=%s",(tid,))
    return {"status":"deleted"}
