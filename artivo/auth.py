import re
import secrets
import time
from .security import APIError,password_hash,verify_password,token_hash,text,require

def public(user):
    return {k:user[k] for k in ('id','name','email','role','suspended')} if user else None

def session(db,user_id):
    token=secrets.token_urlsafe(32)
    db.execute('DELETE FROM sessions WHERE expires_at<?',(int(time.time()),))
    db.execute('INSERT INTO sessions VALUES(?,?,?)',(token_hash(token),user_id,int(time.time())+604800))
    return token

def current(db,token):
    return db.execute('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires_at>?',(token_hash(token),int(time.time()))).fetchone() if token else None

def register(db,data):
    name=text(data,'name',80); email=text(data,'email',254).lower(); role=text(data,'role',20)
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email): raise APIError('Introduce un correo válido.')
    if role not in ('CLIENT','ARTIST','BUSINESS'): raise APIError('Selecciona un tipo de cuenta válido.')
    if db.execute('SELECT 1 FROM users WHERE email=?',(email,)).fetchone(): raise APIError('Ese correo ya tiene una cuenta.',409)
    password=password_hash(data.get('password'))
    cur=db.execute('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)',(name,email,password,role))
    user=db.execute('SELECT * FROM users WHERE id=?',(cur.lastrowid,)).fetchone()
    return public(user),session(db,user['id'])

def login(db,data):
    email=text(data,'email',254).lower()
    user=db.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
    # Hash even for unknown users to avoid a cheap timing-based enumeration.
    valid=verify_password(data.get('password'),user['password'] if user else 'dummy$'+'0'*64)
    if not user or not valid: raise APIError('Correo o contraseña incorrectos.',401)
    require(user)
    return public(user),session(db,user['id'])

def recovery(db,data,demo):
    if not demo: raise APIError('La recuperación por correo aún no está configurada.',503)
    email=text(data,'email',254).lower()
    user=db.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
    result={'message':'Si el correo está registrado, recibirás instrucciones de recuperación.'}
    if user:
        token=secrets.token_urlsafe(32)
        db.execute('DELETE FROM resets WHERE user_id=?',(user['id'],))
        db.execute('INSERT INTO resets VALUES(?,?,?)',(token_hash(token),user['id'],int(time.time())+1800))
        if demo: result['demo_reset_token']=token
        # In non-demo deployments supply an email delivery adapter; never log the token.
        else: raise APIError('La recuperación por correo aún no está configurada.',503)
    return result

def reset(db,data):
    token=text(data,'token',200)
    record=db.execute('SELECT * FROM resets WHERE token=? AND expires_at>?',(token_hash(token),int(time.time()))).fetchone()
    if not record: raise APIError('El enlace expiró o ya se utilizó.')
    db.execute('UPDATE users SET password=? WHERE id=?',(password_hash(data.get('password')),record['user_id']))
    db.execute('DELETE FROM sessions WHERE user_id=?',(record['user_id'],))
    db.execute('DELETE FROM resets WHERE user_id=?',(record['user_id'],))
    return {'message':'Contraseña actualizada. Inicia sesión.'}
