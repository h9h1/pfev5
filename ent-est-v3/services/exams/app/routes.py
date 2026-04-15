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

BE, BD = 'exams-files', 'devoirs-files'

def ensure(client, b):
    if not client.bucket_exists(b): client.make_bucket(b)

def get_exam_or_403(s, exam_id, teacher_id):
    rows = s.execute("SELECT id,teacher_id,exam_type,minio_key,minio_bucket FROM exams WHERE id=%s", (uuid.UUID(exam_id),))
    e = next(iter(rows), None)
    if not e: raise HTTPException(404, "Examen introuvable")
    if str(e.teacher_id) != teacher_id: raise HTTPException(403, "Vous n'êtes pas le propriétaire de cet examen")
    return e

def require_admin(me=Depends(verify_token)):
    if me.get('role') != 'admin':
        raise HTTPException(403, "Réservé à l'administrateur")
    return me

class ExamCreate(BaseModel):
    title: str
    course_id: str
    exam_type: str = 'examen'
    duration_min: Optional[int] = None

class GradeUpdate(BaseModel):
    grade: float
    comment: Optional[str] = None

@router.post("/exams", status_code=201)
def create_exam(payload: ExamCreate, me=Depends(require_teacher)):
    s = get_session()
    uid = uuid.uuid4()
    try: cid = uuid.UUID(payload.course_id)
    except: raise HTTPException(400, "course_id invalide")
    s.execute("INSERT INTO exams (id,title,course_id,teacher_id,exam_type,duration_min,is_published,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
        (uid, payload.title, cid, uuid.UUID(me['sub']), payload.exam_type, payload.duration_min, False, datetime.datetime.utcnow()))
    return {"id": str(uid), "title": payload.title, "exam_type": payload.exam_type}

@router.get("/exams")
def list_exams(me=Depends(verify_token)):
    s = get_session()
    rows = s.execute("SELECT id,title,course_id,teacher_id,exam_type,is_published,minio_key,duration_min,created_at FROM exams")
    result = []
    for r in rows:
        sc = len(list(s.execute("SELECT id FROM submissions WHERE exam_id=%s ALLOW FILTERING", (r.id,))))
        result.append({"id":str(r.id),"title":r.title,"course_id":str(r.course_id),
            "teacher_id":str(r.teacher_id),"exam_type":r.exam_type,
            "is_published":r.is_published,"minio_key":r.minio_key,
            "duration_min":r.duration_min,"submission_count":sc})
    return result

@router.delete("/exams/{exam_id}")
def delete_exam(exam_id: str, me=Depends(require_teacher)):
    s = get_session()
    e = get_exam_or_403(s, exam_id, me['sub'])
    client = mc()
    if e.minio_key:
        try: client.remove_object(e.minio_bucket or BE, e.minio_key)
        except: pass
    subs = list(s.execute("SELECT id,minio_key FROM submissions WHERE exam_id=%s ALLOW FILTERING", (uuid.UUID(exam_id),)))
    for sub in subs:
        if sub.minio_key:
            try: client.remove_object(BD, sub.minio_key)
            except: pass
        s.execute("DELETE FROM submissions WHERE id=%s", (sub.id,))
    s.execute("DELETE FROM exams WHERE id=%s", (uuid.UUID(exam_id),))
    return {"status": "deleted"}

@router.post("/exams/{exam_id}/upload-sujet")
def upload_sujet(exam_id: str, file: UploadFile = File(...), me=Depends(require_teacher)):
    s = get_session()
    e = get_exam_or_403(s, exam_id, me['sub'])
    client = mc()
    bucket = BD if e.exam_type == 'devoir' else BE
    ensure(client, bucket)
    raw = file.file.read()
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'pdf'
    key = f"sujets/{exam_id}/{uuid.uuid4()}.{ext}"
    ct  = 'application/pdf' if ext == 'pdf' else (file.content_type or 'application/octet-stream')
    client.put_object(bucket, key, BytesIO(raw), len(raw), ct)
    s.execute("UPDATE exams SET minio_key=%s, minio_bucket=%s WHERE id=%s", (key, bucket, uuid.UUID(exam_id)))
    return {"message": "Sujet uploadé", "key": key}

@router.get("/exams/{exam_id}/sujet/download")
def download_sujet(exam_id: str, me=Depends(verify_token)):
    s = get_session()
    rows = s.execute("SELECT minio_key,minio_bucket FROM exams WHERE id=%s", (uuid.UUID(exam_id),))
    r = next(iter(rows), None)
    if not r or not r.minio_key: raise HTTPException(404, "Sujet non disponible")
    bucket = r.minio_bucket or BE
    obj = mc().get_object(bucket, r.minio_key)
    fname = r.minio_key.split('/')[-1]
    mt = 'application/pdf' if fname.lower().endswith('.pdf') else 'application/octet-stream'
    return StreamingResponse(obj, media_type=mt,
        headers={"Content-Disposition": f'attachment; filename="{fname}"',
                 "Access-Control-Expose-Headers": "Content-Disposition"})

@router.post("/submissions", status_code=201)
def create_submission(exam_id: str, me=Depends(verify_token)):
    if me['role'] not in ('student',):
        raise HTTPException(403, "Seuls les étudiants peuvent rendre un devoir")
    s = get_session()
    uid = uuid.uuid4()
    s.execute("INSERT INTO submissions (id,exam_id,student_id,student_name,submitted_at,grade_approved) VALUES (%s,%s,%s,%s,%s,%s)",
        (uid, uuid.UUID(exam_id), uuid.UUID(me['sub']),
         f"{me['first_name']} {me['last_name']}".strip() or me['username'],
         datetime.datetime.utcnow(), False))
    return {"id": str(uid)}

@router.post("/submissions/{sub_id}/upload")
def upload_submission(sub_id: str, exam_id: str, file: UploadFile = File(...), me=Depends(verify_token)):
    if me['role'] not in ('student',):
        raise HTTPException(403, "Seuls les étudiants peuvent soumettre un devoir")
    s = get_session()
    rows = s.execute("SELECT student_id FROM submissions WHERE id=%s ALLOW FILTERING", (uuid.UUID(sub_id),))
    r = next(iter(rows), None)
    if not r: raise HTTPException(404)
    if str(r.student_id) != me['sub']: raise HTTPException(403, "Ce n'est pas votre soumission")
    client = mc(); ensure(client, BD)
    raw = file.file.read()
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'pdf'
    key = f"submissions/{exam_id}/{sub_id}/{uuid.uuid4()}.{ext}"
    ct  = 'application/pdf' if ext == 'pdf' else (file.content_type or 'application/octet-stream')
    client.put_object(BD, key, BytesIO(raw), len(raw), ct)
    s.execute("UPDATE submissions SET minio_key=%s WHERE id=%s", (key, uuid.UUID(sub_id)))
    return {"message": "Devoir soumis", "key": key}

@router.get("/submissions/{sub_id}/download")
def download_submission(sub_id: str, me=Depends(verify_token)):
    s = get_session()
    rows = s.execute("SELECT minio_key,student_id FROM submissions WHERE id=%s ALLOW FILTERING", (uuid.UUID(sub_id),))
    r = next(iter(rows), None)
    if not r or not r.minio_key: raise HTTPException(404)
    if me['role'] == 'student' and str(r.student_id) != me['sub']:
        raise HTTPException(403, "Accès non autorisé")
    obj = mc().get_object(BD, r.minio_key)
    fname = r.minio_key.split('/')[-1]
    mt = 'application/pdf' if fname.lower().endswith('.pdf') else 'application/octet-stream'
    return StreamingResponse(obj, media_type=mt,
        headers={"Content-Disposition": f'attachment; filename="{fname}"',
                 "Access-Control-Expose-Headers": "Content-Disposition"})

@router.get("/exams/{exam_id}/submissions")
def list_submissions(exam_id: str, me=Depends(verify_token)):
    if me.get('role') not in ('teacher', 'admin'):
        raise HTTPException(403, "Réservé aux enseignants et administrateurs")
    rows = get_session().execute(
        "SELECT id,student_id,student_name,minio_key,grade,comment,submitted_at,grade_approved FROM submissions WHERE exam_id=%s ALLOW FILTERING",
        (uuid.UUID(exam_id),))
    return [{"id":str(r.id),"student_id":str(r.student_id),"student_name":r.student_name,
             "minio_key":r.minio_key,"grade":r.grade,"comment":r.comment,
             "submitted_at":str(r.submitted_at),
             "grade_approved": r.grade_approved if r.grade_approved is not None else False}
            for r in rows]

@router.patch("/submissions/{sub_id}/grade")
def grade_sub(sub_id: str, payload: GradeUpdate, me=Depends(require_teacher)):
    s = get_session()
    rows = s.execute("SELECT id FROM submissions WHERE id=%s ALLOW FILTERING", (uuid.UUID(sub_id),))
    if not next(iter(rows), None): raise HTTPException(404)
    # Save grade but mark as NOT approved — admin must approve before student sees it
    s.execute(
        "UPDATE submissions SET grade=%s, comment=%s, grade_approved=%s WHERE id=%s",
        (payload.grade, payload.comment, False, uuid.UUID(sub_id))
    )
    return {"status": "noté", "grade": payload.grade, "grade_approved": False}

# ── Admin: list all submissions waiting for grade approval ──────────────────
@router.get("/submissions/pending-approval")
def pending_approval(me=Depends(verify_token)):
    if me.get('role') != 'admin':
        raise HTTPException(403, "Réservé à l'administrateur")
    s = get_session()
    rows = s.execute(
        "SELECT id,exam_id,student_id,student_name,grade,comment,submitted_at,grade_approved,minio_key FROM submissions ALLOW FILTERING"
    )
    pending = []
    for r in rows:
        if r.grade is not None and not r.grade_approved:
            exam_rows = s.execute("SELECT title,exam_type FROM exams WHERE id=%s", (r.exam_id,))
            exam = next(iter(exam_rows), None)
            pending.append({
                "id": str(r.id),
                "exam_id": str(r.exam_id),
                "exam_title": exam.title if exam else "—",
                "exam_type":  exam.exam_type if exam else "—",
                "student_id": str(r.student_id),
                "student_name": r.student_name,
                "grade": r.grade,
                "comment": r.comment,
                "submitted_at": str(r.submitted_at),
                "grade_approved": False,
                "minio_key": getattr(r, 'minio_key', None)
            })
    return pending

# ── Admin: approve a grade ──────────────────────────────────────────────────
@router.patch("/submissions/{sub_id}/approve-grade")
def approve_grade(sub_id: str, me=Depends(verify_token)):
    if me.get('role') != 'admin':
        raise HTTPException(403, "Réservé à l'administrateur")
    s = get_session()
    rows = s.execute(
        "SELECT id,grade,student_id,student_name FROM submissions WHERE id=%s ALLOW FILTERING",
        (uuid.UUID(sub_id),)
    )
    r = next(iter(rows), None)
    if not r: raise HTTPException(404, "Soumission introuvable")
    if r.grade is None: raise HTTPException(400, "Aucune note à approuver")
    s.execute(
        "UPDATE submissions SET grade_approved=%s WHERE id=%s",
        (True, uuid.UUID(sub_id))
    )
    # Notify student
    publish_grade_event(r.student_name, r.grade)
    return {"status": "approuvé", "grade": r.grade}

# ── Student: get my grades (approved only) ─────────────────────────────────
@router.get("/submissions/my-grades")
def my_grades(me=Depends(verify_token)):
    if me['role'] != 'student':
        raise HTTPException(403, "Réservé aux étudiants")
    s = get_session()
    rows = s.execute(
        "SELECT id,exam_id,grade,comment,submitted_at,grade_approved FROM submissions WHERE student_id=%s ALLOW FILTERING",
        (uuid.UUID(me['sub']),)
    )
    result = []
    for r in rows:
        if r.grade is not None and r.grade_approved:
            exam_rows = s.execute("SELECT title,exam_type FROM exams WHERE id=%s", (r.exam_id,))
            exam = next(iter(exam_rows), None)
            result.append({
                "submission_id": str(r.id),
                "exam_id": str(r.exam_id),
                "exam_title": exam.title if exam else "—",
                "exam_type":  exam.exam_type if exam else "—",
                "grade": r.grade,
                "comment": r.comment,
                "submitted_at": str(r.submitted_at)
            })
    return result

def publish_grade_event(student_name, grade):
    try:
        import pika, json, datetime as dt, os
        url = os.getenv('RABBITMQ_URL','amqp://ent_user:ent_pass_2024@rabbitmq:5672/')
        conn = pika.BlockingConnection(pika.URLParameters(url))
        ch = conn.channel()
        ch.exchange_declare(exchange='ent_events', exchange_type='fanout', durable=True)
        msg = json.dumps({'type':'new_grade','data':{
            'title': 'Note disponible',
            'message': f"Votre devoir a été noté et approuvé : {grade}/20",
            'target_role': 'student'
        },'ts': dt.datetime.utcnow().isoformat()})
        ch.basic_publish(exchange='ent_events', routing_key='', body=msg,
            properties=pika.BasicProperties(delivery_mode=2))
        conn.close()
    except Exception as e:
        print(f"RabbitMQ error: {e}")