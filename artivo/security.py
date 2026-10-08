import hashlib
import hmac
import secrets
import time
from collections import defaultdict, deque

class APIError(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status

def password_hash(password):
    if not isinstance(password,str) or len(password)<8 or len(password)>256:
        raise APIError('La contraseña debe tener entre 8 y 256 caracteres.')
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256',password.encode(),salt.encode(),600_000).hex()
    return f'{salt}${digest}'

def verify_password(password,stored):
    if not isinstance(password,str) or len(password)>256: return False
    salt,digest=stored.split('$')
    actual=hashlib.pbkdf2_hmac('sha256',password.encode(),salt.encode(),600_000).hex()
    return hmac.compare_digest(actual,digest)

def token_hash(token): return hashlib.sha256(token.encode()).hexdigest()

def require(user,*roles):
    if not user: raise APIError('Inicia sesión para continuar.',401)
    if user['suspended']: raise APIError('Esta cuenta está suspendida.',403)
    if roles and user['role'] not in roles: raise APIError('Tu cuenta no tiene permiso para esta acción.',403)

ATTEMPTS=defaultdict(deque)
def rate_limit(key,limit=20,period=300):
    now=time.time()
    q=ATTEMPTS[key]
    while q and q[0]<now-period: q.popleft()
    if len(q)>=limit: raise APIError('Demasiados intentos. Vuelve a intentarlo en unos minutos.',429)
    q.append(now)

def text(data,key,maximum=1000,required=True):
    value=data.get(key,'')
    if not isinstance(value,str): raise APIError(f'El campo {key} no es válido.')
    value=value.strip()
    if (required and not value) or len(value)>maximum: raise APIError(f'Revisa el campo {key}.')
    return value

def integer(data,key,minimum=1,maximum=10_000_000):
    value=data.get(key)
    if isinstance(value,bool): raise APIError(f'Revisa el campo {key}.')
    try:
        number=int(value)
        if float(value)!=number: raise ValueError()
    except (TypeError,ValueError,OverflowError): raise APIError(f'Revisa el campo {key}.')
    if not minimum<=number<=maximum: raise APIError(f'Revisa el campo {key}.')
    return number
