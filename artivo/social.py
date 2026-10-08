"""A hiring-focused social feed with persistent posts and interactions."""
from urllib.parse import urlparse
from .db import rows
from .security import require,APIError,text,integer
from .marketplace import profile

def get_post(db,id,user):
    post=db.execute('''SELECT p.*,a.stage_name,a.photo,a.city,a.rate,a.active,c.name category,c.icon,
    (SELECT count(*) FROM post_likes WHERE post_id=p.id) like_count,
    (SELECT count(*) FROM post_comments pc JOIN users cu ON cu.id=pc.author_id WHERE pc.post_id=p.id AND cu.suspended=0) comment_count,
    EXISTS(SELECT 1 FROM post_likes WHERE post_id=p.id AND user_id=?) liked,
    EXISTS(SELECT 1 FROM post_saves WHERE post_id=p.id AND user_id=?) saved,
    EXISTS(SELECT 1 FROM follows WHERE artist_id=p.artist_id AND user_id=?) following
    FROM posts p JOIN artists a ON a.user_id=p.artist_id JOIN users u ON u.id=p.artist_id
    JOIN categories c ON c.id=a.category_id WHERE p.id=? AND u.suspended=0''',(user['id'],user['id'],user['id'],id)).fetchone()
    if not post: raise APIError('Publicación no encontrada.',404)
    return dict(post)

def feed(db,user,params):
    require(user)
    mode=params.get('mode','all')
    if mode not in ('all','following','saved','mine'): raise APIError('Filtro de feed inválido.')
    offset=integer({'offset':params.get('offset',0)},'offset',0,100000)
    sql='SELECT p.id FROM posts p JOIN users u ON u.id=p.artist_id WHERE u.suspended=0';args=[]
    if mode=='following': sql+=' AND EXISTS(SELECT 1 FROM follows WHERE user_id=? AND artist_id=p.artist_id)';args.append(user['id'])
    elif mode=='saved': sql+=' AND EXISTS(SELECT 1 FROM post_saves WHERE user_id=? AND post_id=p.id)';args.append(user['id'])
    elif mode=='mine': sql+=' AND p.artist_id=?';args.append(user['id'])
    sql+=' ORDER BY p.created_at DESC,p.id DESC LIMIT 13 OFFSET ?';args.append(offset)
    ids=rows(db.execute(sql,args));has_more=len(ids)>12
    return {'posts':[get_post(db,p['id'],user) for p in ids[:12]],'has_more':has_more,'next_offset':offset+min(len(ids),12)}

def publish(db,user,data):
    require(user,'ARTIST');a=profile(db,user['id']);kind=text(data,'media_type',10);url=text(data,'media_url',1500)
    parsed=urlparse(url)
    if parsed.scheme!='https' or not parsed.hostname or parsed.username or parsed.password: raise APIError('Usa una URL HTTPS pública para tu foto o video.')
    if kind not in ('IMAGE','VIDEO'): raise APIError('Selecciona foto o video.')
    if kind=='VIDEO' and not parsed.path.lower().endswith(('.mp4','.webm')): raise APIError('El video debe ser una URL directa a un archivo MP4 o WebM.')
    cur=db.execute('INSERT INTO posts(artist_id,caption,media_url,media_type) VALUES(?,?,?,?)',(a['user_id'],text(data,'caption',2200),url,kind))
    return get_post(db,cur.lastrowid,user)

def interaction(db,user,id,action,data):
    require(user);post=get_post(db,id,user)
    if action in ('like','save'):
        table='post_likes' if action=='like' else 'post_saves'
        if db.execute(f'SELECT 1 FROM {table} WHERE user_id=? AND post_id=?',(user['id'],id)).fetchone():db.execute(f'DELETE FROM {table} WHERE user_id=? AND post_id=?',(user['id'],id))
        else:db.execute(f'INSERT INTO {table} VALUES(?,?)',(user['id'],id))
    elif action=='comment': db.execute('INSERT INTO post_comments(post_id,author_id,body) VALUES(?,?,?)',(id,user['id'],text(data,'body',1000)))
    elif action=='follow':
        if post['artist_id']==user['id']:raise APIError('No puedes seguir tu propio perfil.')
        if db.execute('SELECT 1 FROM follows WHERE user_id=? AND artist_id=?',(user['id'],post['artist_id'])).fetchone():db.execute('DELETE FROM follows WHERE user_id=? AND artist_id=?',(user['id'],post['artist_id']))
        else:db.execute('INSERT INTO follows VALUES(?,?)',(user['id'],post['artist_id']))
    else: raise APIError('Acción social no válida.')
    return get_post(db,id,user)

def comments(db,user,id):
    require(user);get_post(db,id,user)
    return rows(db.execute('''SELECT pc.id,pc.body,pc.created_at,coalesce(a.stage_name,u.name) name
    FROM post_comments pc JOIN users u ON u.id=pc.author_id LEFT JOIN artists a ON a.user_id=u.id
    WHERE pc.post_id=? AND u.suspended=0 ORDER BY pc.id DESC LIMIT 100''',(id,)))

def seed_posts(db):
    # One-time demo migration, kept separate from visitor/account data.
    if db.execute("SELECT 1 FROM settings WHERE key='social_seeded'").fetchone(): return
    captions={
        'gary@artivo.demo':'Un piano, una noche y las canciones que nunca se olvidan. Jazz y lounge para tu próximo evento. 🎹',
        'elena@artivo.demo':'Hay momentos que merecen una banda sonora especial. Saxofón en vivo para tu próxima celebración. ✨',
        'marco@artivo.demo':'La noche empieza con un buen beat. ¿Listos para bailar? 🎧',
        'sofia@artivo.demo':'La música se siente más cerca cuando es en vivo. Voz, guitarra y mucho corazón. 🎤',
        'daniel@artivo.demo':'A veces, una guitarra es todo lo que necesitas. Sesiones acústicas y canciones a tu medida. 🎸',
        'banda@artivo.demo':'El Caribe suena a celebración. Música en vivo para compartir y disfrutar. 🌴'
    }
    for artist in db.execute('SELECT a.*,u.email FROM artists a JOIN users u ON u.id=a.user_id'):
        if artist['email'] in captions:
            db.execute("INSERT INTO posts(artist_id,caption,media_url,media_type) VALUES(?,?,?,'IMAGE')",(artist['user_id'],captions[artist['email']],artist['photo']))
    db.execute("INSERT INTO settings VALUES('social_seeded','1')")
