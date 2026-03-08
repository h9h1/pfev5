from fastapi import HTTPException, Header
from typing import Optional
import jwt, os, requests, json
from jwt.algorithms import RSAAlgorithm

KEYCLOAK_URL = os.getenv('KEYCLOAK_URL', 'http://keycloak:8080')
REALM        = os.getenv('KEYCLOAK_REALM', 'est')
JWT_SECRET   = os.getenv('JWT_SECRET', 'super_secret_jwt_key_2024')

_kc_public_key = None

def get_keycloak_public_key():
    global _kc_public_key
    if _kc_public_key: return _kc_public_key
    try:
        url = f"{KEYCLOAK_URL}/realms/{REALM}"
        r = requests.get(url, timeout=5)
        key_str = r.json().get('public_key','')
        _kc_public_key = f"-----BEGIN PUBLIC KEY-----\n{key_str}\n-----END PUBLIC KEY-----"
        return _kc_public_key
    except Exception as e:
        print(f"Cannot get KC public key: {e}")
        return None

def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Token manquant")
    token = authorization.split(' ')[1]
    # Try Keycloak RS256 first
    try:
        pub_key = get_keycloak_public_key()
        if pub_key:
            payload = jwt.decode(token, pub_key, algorithms=['RS256'],
                options={"verify_aud": False})
            roles = payload.get('realm_access',{}).get('roles',[])
            role = 'admin' if 'admin' in roles else ('teacher' if 'teacher' in roles else 'student')
            return {
                'sub':        payload.get('sub',''),
                'username':   payload.get('preferred_username',''),
                'email':      payload.get('email',''),
                'first_name': payload.get('given_name',''),
                'last_name':  payload.get('family_name',''),
                'role':       role
            }
    except Exception as e:
        pass
    # Fallback: HS256 (JWT maison)
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

def require_admin(authorization: Optional[str] = Header(None)):
    payload = verify_token(authorization)
    if payload.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return payload

def require_teacher(authorization: Optional[str] = Header(None)):
    payload = verify_token(authorization)
    if payload.get('role') not in ('teacher','admin'):
        raise HTTPException(status_code=403, detail="Accès réservé aux enseignants")
    return payload
