from fastapi import APIRouter, Depends
from app.database import get_session
from app.auth import verify_token, require_teacher
from pydantic import BaseModel
from typing import Optional
import uuid, datetime

router = APIRouter()

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: str
    event_time: Optional[str] = "08:00"
    duration_min: Optional[int] = 60
    course_id: Optional[str] = None
    event_type: Optional[str] = "cours"

@router.post("/events", status_code=201)
def create_event(payload: EventCreate, me=Depends(require_teacher)):
    s = get_session()
    uid = uuid.uuid4()
    s.execute("INSERT INTO events (id,title,description,event_date,event_time,duration_min,course_id,created_by,event_type,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (uid, payload.title, payload.description or "", payload.event_date,
         payload.event_time or "08:00", payload.duration_min or 60,
         payload.course_id or "", me['sub'], payload.event_type or "cours",
         datetime.datetime.utcnow()))
    return {"id":str(uid),"title":payload.title}

@router.get("/events")
def list_events(me=Depends(verify_token)):
    rows = get_session().execute("SELECT id,title,description,event_date,event_time,duration_min,course_id,event_type FROM events")
    return [{"id":str(r.id),"title":r.title,"description":r.description,"event_date":r.event_date,
             "event_time":r.event_time,"duration_min":r.duration_min,"course_id":r.course_id,"event_type":r.event_type} for r in rows]
