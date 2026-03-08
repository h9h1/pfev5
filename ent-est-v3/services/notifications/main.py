from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.database import get_session
from app.auth import verify_token
from pydantic import BaseModel
from typing import Optional
import pika, json, uuid, datetime, os, threading

app = FastAPI(title="Notifications Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

RABBITMQ_URL = os.getenv('RABBITMQ_URL', 'amqp://ent_user:ent_pass_2024@rabbitmq:5672/')

def get_rabbit():
    params = pika.URLParameters(RABBITMQ_URL)
    conn = pika.BlockingConnection(params)
    return conn

def publish_event(event_type: str, data: dict):
    try:
        conn = get_rabbit()
        ch = conn.channel()
        ch.exchange_declare(exchange='ent_events', exchange_type='fanout', durable=True)
        msg = json.dumps({'type': event_type, 'data': data, 'ts': datetime.datetime.utcnow().isoformat()})
        ch.basic_publish(exchange='ent_events', routing_key='', body=msg,
            properties=pika.BasicProperties(delivery_mode=2))
        conn.close()
    except Exception as e:
        print(f"RabbitMQ publish error: {e}")

def consume_events():
    import time
    time.sleep(15)
    while True:
        try:
            conn = get_rabbit()
            ch = conn.channel()
            ch.exchange_declare(exchange='ent_events', exchange_type='fanout', durable=True)
            ch.queue_declare(queue='notifications_queue', durable=True)
            ch.queue_bind(exchange='ent_events', queue='notifications_queue')

            def callback(ch, method, properties, body):
                try:
                    event = json.loads(body)
                    s = get_session()
                    nid = uuid.uuid4()
                    receiver_id = event['data'].get('receiver_id')
                    user_id = None
                    if receiver_id:
                        try: user_id = uuid.UUID(receiver_id)
                        except: pass
                    s.execute(
                        "INSERT INTO notifications (id,type,title,message,target_role,user_id,created_at,is_read) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                        (nid, event.get('type',''), event['data'].get('title',''),
                         event['data'].get('message',''), event['data'].get('target_role','all'),
                         user_id, datetime.datetime.utcnow(), False)
                    )
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception as e:
                    print(f"Callback error: {e}")
                    ch.basic_nack(delivery_tag=method.delivery_tag)

            ch.basic_qos(prefetch_count=1)
            ch.basic_consume(queue='notifications_queue', on_message_callback=callback)
            print("✅ RabbitMQ consumer started")
            ch.start_consuming()
        except Exception as e:
            print(f"Consumer error: {e}, retrying in 10s...")
            import time; time.sleep(10)

@app.on_event("startup")
def startup():
    s = get_session()
    s.execute("""CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY,
        type text,
        title text,
        message text,
        target_role text,
        user_id uuid,
        is_read boolean,
        created_at timestamp
    )""")
    t = threading.Thread(target=consume_events, daemon=True)
    t.start()

@app.get("/health")
def health(): return {"status": "ok", "service": "notifications"}

@app.get("/notifications")
def get_notifications(me=Depends(verify_token)):
    s = get_session()
    rows = s.execute("SELECT id,type,title,message,target_role,user_id,is_read,created_at FROM notifications")
    result = []
    for r in rows:
        role_match = r.target_role in ('all', me['role'])
        user_match = r.user_id is None or str(r.user_id) == me['sub']
        if role_match and user_match:
            result.append({
                "id": str(r.id), "type": r.type, "title": r.title,
                "message": r.message, "target_role": r.target_role,
                "is_read": r.is_read, "created_at": str(r.created_at)
            })
    result.sort(key=lambda x: x['created_at'], reverse=True)
    return result[:20]

@app.post("/notifications/read/{notif_id}")
def mark_read(notif_id: str, me=Depends(verify_token)):
    s = get_session()
    s.execute("UPDATE notifications SET is_read=true WHERE id=%s", (uuid.UUID(notif_id),))
    return {"status": "ok"}

class NotifCreate(BaseModel):
    type: str
    title: str
    message: str
    target_role: Optional[str] = 'all'
    receiver_id: Optional[str] = None

@app.post("/notifications/publish")
def publish_notif(payload: NotifCreate, me=Depends(verify_token)):
    if me['role'] not in ('teacher', 'admin'):
        from fastapi import HTTPException
        raise HTTPException(403, "Non autorisé")
    publish_event(payload.type, {
        'title': payload.title,
        'message': payload.message,
        'target_role': payload.target_role,
        'receiver_id': payload.receiver_id
    })
    return {"status": "published"}
