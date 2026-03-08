from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import StreamingResponse
from app.database import get_session
from app.auth import verify_token, require_teacher
from pydantic import BaseModel
from typing import Optional
from minio import Minio
from io import BytesIO
import uuid, datetime, os

router = APIRouter()

def mc():
    return Minio(os.getenv('MINIO_ENDPOINT','minio:9000').replace('http://',''),
        access_key=os.getenv('MINIO_ROOT_USER','minio_admin'),
        secret_key=os.getenv('MINIO_ROOT_PASSWORD','minio_secret_2024'), secure=False)

BUCKET = 'courses-files'

def ensure(client):
    if not client.bucket_exists(BUCKET): client.make_bucket(BUCKET)

def get_course_or_403(s, course_id, teacher_id):
    rows = s.execute("SELECT id, teacher_id FROM courses WHERE id=%s", (uuid.UUID(course_id),))
    c = next(iter(rows), None)
    if not c: raise HTTPException(404, "Cours introuvable")
    if str(c.teacher_id) != teacher_id: raise HTTPException(403, "Vous n'êtes pas le propriétaire de ce cours")
    return c

class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None

@router.post("/courses", status_code=201)
def create_course(payload: CourseCreate, me=Depends(require_teacher)):
    s = get_session()
    uid = uuid.uuid4()
    s.execute("INSERT INTO courses (id,title,description,teacher_id,teacher_name,is_published,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s)",
        (uid, payload.title, payload.description or '',
         uuid.UUID(me['sub']), f"{me['first_name']} {me['last_name']}".strip() or me['username'],
         False, datetime.datetime.utcnow()))
    try: publish_course_event(payload.title, f"{me['first_name']} {me['last_name']}")
    except: pass
    return {"id": str(uid), "title": payload.title}

@router.get("/courses")
def list_courses(me=Depends(verify_token)):
    s = get_session()
    rows = s.execute("SELECT id,title,description,teacher_id,teacher_name,is_published,created_at FROM courses")
    result = []
    for r in rows:
        fc = len(list(s.execute("SELECT id FROM course_files WHERE course_id=%s ALLOW FILTERING", (r.id,))))
        result.append({"id":str(r.id),"title":r.title,"description":r.description,
            "teacher_id":str(r.teacher_id),"teacher_name":r.teacher_name,
            "is_published":r.is_published,"file_count":fc,"created_at":str(r.created_at)})
    return result

@router.delete("/courses/{course_id}")
def delete_course(course_id: str, me=Depends(require_teacher)):
    s = get_session()
    get_course_or_403(s, course_id, me['sub'])
    client = mc()
    files = list(s.execute("SELECT id,minio_key FROM course_files WHERE course_id=%s ALLOW FILTERING", (uuid.UUID(course_id),)))
    for f in files:
        if f.minio_key:
            try: client.remove_object(BUCKET, f.minio_key)
            except: pass
        s.execute("DELETE FROM course_files WHERE id=%s", (f.id,))
    s.execute("DELETE FROM courses WHERE id=%s", (uuid.UUID(course_id),))
    return {"status": "deleted"}

@router.post("/courses/{course_id}/files")
def upload_file(course_id: str, file: UploadFile = File(...), me=Depends(require_teacher)):
    s = get_session()
    get_course_or_403(s, course_id, me['sub'])
    client = mc(); ensure(client)
    raw = file.file.read()
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'bin'
    key = f"{course_id}/{uuid.uuid4()}.{ext}"
    ct  = 'application/pdf' if ext == 'pdf' else (file.content_type or 'application/octet-stream')
    client.put_object(BUCKET, key, BytesIO(raw), len(raw), ct)
    fid = uuid.uuid4()
    s.execute("INSERT INTO course_files (id,course_id,filename,file_type,file_size,minio_key,uploaded_at) VALUES (%s,%s,%s,%s,%s,%s,%s)",
        (fid, uuid.UUID(course_id), file.filename, ct, len(raw), key, datetime.datetime.utcnow()))
    return {"id": str(fid), "filename": file.filename, "file_size": len(raw)}

@router.get("/courses/{course_id}/files")
def list_files(course_id: str, me=Depends(verify_token)):
    s = get_session()
    rows = s.execute("SELECT id,filename,file_type,file_size,minio_key,uploaded_at FROM course_files WHERE course_id=%s ALLOW FILTERING", (uuid.UUID(course_id),))
    return [{"id":str(r.id),"filename":r.filename,"file_type":r.file_type,
             "file_size":r.file_size,"minio_key":r.minio_key,"uploaded_at":str(r.uploaded_at)} for r in rows]

@router.get("/courses/{course_id}/files/{file_id}/download")
def download_file(course_id: str, file_id: str, me=Depends(verify_token)):
    s = get_session()
    rows = s.execute("SELECT minio_key,filename,file_type FROM course_files WHERE id=%s ALLOW FILTERING", (uuid.UUID(file_id),))
    r = next(iter(rows), None)
    if not r: raise HTTPException(404, "Fichier introuvable")
    obj = mc().get_object(BUCKET, r.minio_key)
    return StreamingResponse(obj, media_type=r.file_type or 'application/octet-stream',
        headers={"Content-Disposition": f'attachment; filename="{r.filename}"',
                 "Access-Control-Expose-Headers": "Content-Disposition"})

@router.delete("/courses/{course_id}/files/{file_id}")
def delete_file(course_id: str, file_id: str, me=Depends(require_teacher)):
    s = get_session()
    get_course_or_403(s, course_id, me['sub'])
    rows = s.execute("SELECT minio_key FROM course_files WHERE id=%s ALLOW FILTERING", (uuid.UUID(file_id),))
    r = next(iter(rows), None)
    if not r: raise HTTPException(404)
    try: mc().remove_object(BUCKET, r.minio_key)
    except: pass
    s.execute("DELETE FROM course_files WHERE id=%s", (uuid.UUID(file_id),))
    return {"status": "deleted"}

def publish_course_event(title, teacher_name):
    try:
        import pika, json, datetime as dt
        url = os.getenv('RABBITMQ_URL','amqp://ent_user:ent_pass_2024@rabbitmq:5672/')
        conn = pika.BlockingConnection(pika.URLParameters(url))
        ch = conn.channel()
        ch.exchange_declare(exchange='ent_events', exchange_type='fanout', durable=True)
        msg = json.dumps({'type':'new_course','data':{
            'title': f"Nouveau cours : {title}",
            'message': f"{teacher_name} a publié un nouveau cours : {title}",
            'target_role': 'student'
        },'ts': dt.datetime.utcnow().isoformat()})
        ch.basic_publish(exchange='ent_events', routing_key='', body=msg,
            properties=pika.BasicProperties(delivery_mode=2))
        conn.close()
    except Exception as e:
        print(f"RabbitMQ error (non-blocking): {e}")
