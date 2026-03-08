from fastapi import APIRouter, HTTPException, Depends
from app.database import get_session
from app.auth import verify_token
from pydantic import BaseModel
from typing import Optional
import uuid, datetime

router = APIRouter()

class MessageCreate(BaseModel):
    receiver_id: str
    content: str

@router.post("/messages", status_code=201)
def send_message(payload: MessageCreate, me=Depends(verify_token)):
    s = get_session()
    uid = uuid.uuid4()
    try: rid = uuid.UUID(payload.receiver_id)
    except: raise HTTPException(400,"receiver_id invalide")
    s.execute("INSERT INTO messages (id,sender_id,sender_name,receiver_id,receiver_name,content,is_read,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
        (uid, uuid.UUID(me['sub']), f"{me['first_name']} {me['last_name']}".strip(),
         rid, '', payload.content, False, datetime.datetime.utcnow()))
    try:
        publish_message_event(f"{me['first_name']} {me['last_name']}".strip(), str(rid))
    except: pass
    return {"id":str(uid),"created_at":datetime.datetime.utcnow().isoformat()}

@router.get("/messages/conversation")
def get_conversation(user2_id: str, me=Depends(verify_token)):
    s = get_session()
    u1 = uuid.UUID(me['sub'])
    try: u2 = uuid.UUID(user2_id)
    except: raise HTTPException(400)
    rows = s.execute("SELECT id,sender_id,sender_name,receiver_id,content,is_read,created_at FROM messages ALLOW FILTERING")
    msgs = []
    for r in rows:
        if (r.sender_id==u1 and r.receiver_id==u2) or (r.sender_id==u2 and r.receiver_id==u1):
            msgs.append({"id":str(r.id),"sender_id":str(r.sender_id),"sender_name":r.sender_name,
                "receiver_id":str(r.receiver_id),"content":r.content,"is_read":r.is_read,"created_at":str(r.created_at)})
    msgs.sort(key=lambda x: x["created_at"])
    for m in msgs:
        if m["receiver_id"]==me['sub'] and not m["is_read"]:
            s.execute("UPDATE messages SET is_read=true WHERE id=%s",(uuid.UUID(m["id"]),))
    return msgs

@router.get("/messages/contacts")
def get_contacts(me=Depends(verify_token)):
    s = get_session()
    uid = uuid.UUID(me['sub'])
    rows = s.execute("SELECT sender_id,sender_name,receiver_id,receiver_name,content,is_read,created_at FROM messages ALLOW FILTERING")
    contacts = {}
    for r in rows:
        if r.sender_id==uid:
            key = str(r.receiver_id)
            if key not in contacts or str(r.created_at) > contacts[key]["last_time"]:
                contacts[key] = {"user_id":key,"name":r.receiver_name or "","last_message":r.content,"last_time":str(r.created_at),"unread":contacts.get(key,{}).get("unread",0)}
        elif r.receiver_id==uid:
            key = str(r.sender_id)
            if key not in contacts or str(r.created_at) > contacts[key]["last_time"]:
                contacts[key] = {"user_id":key,"name":r.sender_name or "","last_message":r.content,"last_time":str(r.created_at),"unread":contacts.get(key,{}).get("unread",0)}
            if not r.is_read:
                contacts[key]["unread"] = contacts[key].get("unread",0)+1
    result = list(contacts.values())
    result.sort(key=lambda x: x["last_time"], reverse=True)
    return result

def publish_message_event(sender_name, receiver_id):
    try:
        import pika, json, datetime as dt, os
        url = os.getenv('RABBITMQ_URL','amqp://ent_user:ent_pass_2024@rabbitmq:5672/')
        conn = pika.BlockingConnection(pika.URLParameters(url))
        ch = conn.channel()
        ch.exchange_declare(exchange='ent_events', exchange_type='fanout', durable=True)
        msg = json.dumps({'type':'new_message','data':{
            'title': f"Nouveau message",
            'message': f"{sender_name} vous a envoyé un message",
            'target_role': 'all',
            'receiver_id': receiver_id
        },'ts': dt.datetime.utcnow().isoformat()})
        ch.basic_publish(exchange='ent_events', routing_key='', body=msg,
            properties=pika.BasicProperties(delivery_mode=2))
        conn.close()
    except Exception as e:
        print(f"RabbitMQ error: {e}")
