from datetime import datetime,timedelta,timezone
from urllib.parse import urlparse
from .security import APIError,require,text,integer
from .db import rows

TZ_NOW=lambda: datetime.now(timezone(timedelta(hours=-4))).replace(tzinfo=None)
LOCKED=('PAYMENT_PENDING','CONFIRMED','IN_PROGRESS','DISPUTED')

def setting(db,key): return int(db.execute('SELECT value FROM settings WHERE key=?',(key,)).fetchone()[0])
def commission(db,amount): return (amount*setting(db,'commission_bps')+5000)//10000

def times(data):
    try:
        start=datetime.fromisoformat(data['start']);end=datetime.fromisoformat(data['end'])
        if start.tzinfo or end.tzinfo: raise ValueError()
        if not timedelta(minutes=30)<=end-start<=timedelta(hours=24): raise ValueError()
        if start<TZ_NOW(): raise APIError('Selecciona una fecha y hora futuras.')
        return start.isoformat(timespec='minutes'),end.isoformat(timespec='minutes')
    except (KeyError,ValueError,TypeError): raise APIError('Introduce un horario válido de 30 minutos a 24 horas.')

def free(db,artist,start,end,exclude=0):
    blocked=db.execute("SELECT 1 FROM availability WHERE artist_id=? AND kind='BLOCKED' AND start<? AND end>?",(artist,end,start)).fetchone()
    booked=db.execute("SELECT 1 FROM bookings WHERE artist_id=? AND id<>? AND status IN ('PAYMENT_PENDING','CONFIRMED','IN_PROGRESS','DISPUTED') AND start<? AND end>?",(artist,exclude,end,start)).fetchone()
    available=db.execute("SELECT 1 FROM availability WHERE artist_id=? AND kind='AVAILABLE' AND start<=? AND end>=?",(artist,start,end)).fetchone()
    return bool(available and not blocked and not booked)

def profile(db,artist,user=None):
    row=db.execute('''SELECT a.*,c.name category,c.icon,
    (SELECT round(avg(rating),2) FROM reviews WHERE artist_id=a.user_id) rating,
    (SELECT count(*) FROM reviews WHERE artist_id=a.user_id) review_count,
    (SELECT count(*) FROM bookings WHERE artist_id=a.user_id AND status IN ('COMPLETED','PAID_OUT')) completed
    FROM artists a JOIN users u ON u.id=a.user_id JOIN categories c ON c.id=a.category_id WHERE a.user_id=? AND u.suspended=0''',(artist,)).fetchone()
    if not row: raise APIError('Artista no encontrado.',404)
    result=dict(row)
    result['favorite']=bool(user and db.execute('SELECT 1 FROM favorites WHERE user_id=? AND artist_id=?',(user['id'],artist)).fetchone())
    return result

def discover(db,params,user):
    ids=rows(db.execute('SELECT user_id FROM artists JOIN users ON users.id=artists.user_id WHERE suspended=0'))
    artists=[profile(db,r['user_id'],user) for r in ids]
    q=params.get('q','').lower().strip();category=params.get('category','');city=params.get('city','')
    start=params.get('start');end=params.get('end')
    if bool(start)!=bool(end): raise APIError('Indica el horario completo.')
    if start: start,end=times({'start':start,'end':end})
    budget=int(params.get('budget') or 10_000_000)
    result=[]
    for a in artists:
        if q and q not in ' '.join(str(a[k]) for k in ('stage_name','category','city','genres','bio')).lower(): continue
        if category and str(a['category_id'])!=category: continue
        if city and a['city']!=city: continue
        if params.get('active')=='1' and not a['active']: continue
        if a['rate']>budget: continue
        if start and not free(db,a['user_id'],start,end): continue
        a['match']=a['active']*20+(a['rating'] or 0)*10+min(a['completed'],20)+a['verified']*5
        result.append(a)
    return sorted(result,key=lambda a:-a['match'])

def save_profile(db,user,data):
    require(user,'ARTIST')
    category=integer(data,'category_id')
    if not db.execute('SELECT 1 FROM categories WHERE id=?',(category,)).fetchone(): raise APIError('Categoría inválida.')
    photo=text(data,'photo',1500,False);media=text(data,'media_url',1500,False)
    for url in (photo,media):
        if url and (urlparse(url).scheme!='https' or not urlparse(url).hostname): raise APIError('Usa una URL HTTPS para las fotos y videos.')
    if data.get('active') not in (True,False,0,1): raise APIError('Estado de disponibilidad inválido.')
    values=(user['id'],text(data,'stage_name',80),category,text(data,'city',80),text(data,'bio',1500,False),text(data,'genres',200,False),text(data,'equipment',500,False),photo,media,integer(data,'rate',500,1_000_000),int(bool(data.get('active'))),integer(data,'radius',1,200))
    db.execute('''INSERT INTO artists(user_id,stage_name,category_id,city,bio,genres,equipment,photo,media_url,rate,active,radius) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET stage_name=excluded.stage_name,category_id=excluded.category_id,city=excluded.city,bio=excluded.bio,genres=excluded.genres,equipment=excluded.equipment,photo=excluded.photo,media_url=excluded.media_url,rate=excluded.rate,active=excluded.active,radius=excluded.radius''',values)
    return profile(db,user['id'],user)

def booking(db,id,user):
    require(user)
    r=db.execute('''SELECT b.*,a.stage_name artist_name,a.photo,a.category_id,c.name client_name,c.email client_email,
    (SELECT rating FROM reviews WHERE booking_id=b.id) review_rating FROM bookings b JOIN artists a ON a.user_id=b.artist_id JOIN users c ON c.id=b.client_id WHERE b.id=?''',(id,)).fetchone()
    if not r: raise APIError('Reserva no encontrada.',404)
    if user['role']!='ADMIN' and user['id'] not in (r['artist_id'],r['client_id']): raise APIError('No puedes acceder a esta reserva.',403)
    return dict(r)

def bookings(db,user):
    require(user)
    if user['role']=='ADMIN': ids=rows(db.execute('SELECT id FROM bookings ORDER BY start DESC'))
    else: ids=rows(db.execute('SELECT id FROM bookings WHERE client_id=? OR artist_id=? ORDER BY start DESC',(user['id'],user['id'])))
    return [booking(db,r['id'],user) for r in ids]

def create_booking(db,user,data):
    require(user,'CLIENT','BUSINESS')
    artist=integer(data,'artist_id');a=profile(db,artist)
    if not a['active']: raise APIError('El artista no está recibiendo solicitudes.',409)
    start,end=times(data)
    if not free(db,artist,start,end): raise APIError('El artista no está disponible en ese horario.',409)
    city=text(data,'city',80)
    if city!=a['city']: raise APIError('Por ahora las reservas deben estar en la ciudad del artista.')
    amount=integer(data,'amount',500,1_000_000)
    cur=db.execute('INSERT INTO bookings(client_id,artist_id,title,city,location,description,start,end,amount,commission,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)',(user['id'],artist,text(data,'title',120),city,text(data,'location',200),text(data,'description',2000,False),start,end,amount,commission(db,amount),'PENDING'))
    db.execute('INSERT INTO audit(user_id,action,entity_id) VALUES(?,?,?)',(user['id'],'REQUEST_CREATED',cur.lastrowid))
    return booking(db,cur.lastrowid,user)

def action(db,user,id,data,provider):
    b=booking(db,id,user);act=text(data,'action',30);status=b['status']
    artist=user['id']==b['artist_id'];client=user['id']==b['client_id'];admin=user['role']=='ADMIN'
    new=None
    if act in ('accept','reject','counter'):
        if not artist: raise APIError('Solo el artista puede responder.',403)
        if status!='PENDING': raise APIError('La solicitud ya fue respondida.',409)
        if act=='accept':
            if datetime.fromisoformat(b['start'])<TZ_NOW(): raise APIError('El horario de la solicitud ya pasó.',409)
            if not free(db,b['artist_id'],b['start'],b['end'],id): raise APIError('Ya tienes un compromiso en ese horario.',409)
            new='PAYMENT_PENDING'
        elif act=='reject': new='CANCELLED'
        else:
            new='COUNTER_OFFER';db.execute('UPDATE bookings SET counter_amount=? WHERE id=?',(integer(data,'amount',500,1_000_000),id))
    elif act=='accept_counter':
        if not client: raise APIError('Solo el cliente puede aceptar la oferta.',403)
        if status!='COUNTER_OFFER': raise APIError('No hay contraoferta pendiente.',409)
        if datetime.fromisoformat(b['start'])<TZ_NOW(): raise APIError('El horario de la solicitud ya pasó.',409)
        if not free(db,b['artist_id'],b['start'],b['end'],id): raise APIError('El horario ya no está disponible.',409)
        new='PAYMENT_PENDING';db.execute('UPDATE bookings SET amount=?,commission=? WHERE id=?',(b['counter_amount'],commission(db,b['counter_amount']),id))
    elif act=='pay':
        if not client: raise APIError('Solo el cliente puede pagar.',403)
        if status!='PAYMENT_PENDING': raise APIError('La reserva no espera un pago.',409)
        if datetime.fromisoformat(b['start'])<TZ_NOW(): raise APIError('El horario de la reserva ya pasó.',409)
        if not free(db,b['artist_id'],b['start'],b['end'],id): raise APIError('El horario ya no está disponible.',409)
        p=provider.collect(id,b['amount'])
        db.execute('INSERT INTO payments(booking_id,provider,reference,amount,status) VALUES(?,?,?,?,?)',(id,p['provider'],p['reference'],p['amount'],p['status']))
        new='CONFIRMED'
    elif act=='start':
        if not artist: raise APIError('Solo el artista puede iniciar el servicio.',403)
        if status!='CONFIRMED': raise APIError('La reserva no está confirmada.',409)
        from .payments import DemoPaymentProvider
        if not isinstance(provider,DemoPaymentProvider) and TZ_NOW()<datetime.fromisoformat(b['start']): raise APIError('El servicio aún no ha comenzado.')
        new='IN_PROGRESS'
    elif act=='complete':
        if not client: raise APIError('Solo el cliente puede confirmar la finalización.',403)
        if status!='IN_PROGRESS': raise APIError('El servicio todavía no está en curso.',409)
        from .payments import DemoPaymentProvider
        if not isinstance(provider,DemoPaymentProvider) and TZ_NOW()<datetime.fromisoformat(b['end']): raise APIError('El servicio aún no ha terminado.')
        p=db.execute('SELECT * FROM payments WHERE booking_id=?',(id,)).fetchone()
        if not p or p['status']!='HELD': raise APIError('No hay un pago retenido para liberar.',409)
        provider.release(p['reference'])
        db.execute("UPDATE payments SET status='RELEASED' WHERE booking_id=?",(id,))
        db.execute("INSERT INTO transactions(artist_id,booking_id,kind,amount,commission,description) VALUES(?,?,'BOOKING',?,?,?)",(b['artist_id'],id,b['amount'],b['commission'],b['title']))
        new='PAID_OUT'
    elif act=='cancel':
        if status not in ('PENDING','COUNTER_OFFER','PAYMENT_PENDING','CONFIRMED'): raise APIError('No se puede cancelar en este estado.',409)
        if not (artist or client): raise APIError('Solo los participantes pueden cancelar.',403)
        if status=='CONFIRMED':
            if client and (datetime.fromisoformat(b['start'])-TZ_NOW()).total_seconds()<setting(db,'free_cancel_hours')*3600:
                raise APIError('Esta cancelación necesita revisión. Abre una disputa para solicitarla.',409)
            p=db.execute('SELECT * FROM payments WHERE booking_id=?',(id,)).fetchone();provider.refund(p['reference'])
            db.execute("UPDATE payments SET status='REFUNDED' WHERE booking_id=?",(id,));new='REFUNDED'
        else: new='CANCELLED'
    elif act=='dispute':
        if not (client or artist): raise APIError('Solo los participantes pueden abrir una disputa.',403)
        if status not in ('CONFIRMED','IN_PROGRESS'): raise APIError('No se puede abrir una disputa en este estado.',409)
        db.execute('INSERT INTO reports(author_id,booking_id,reason) VALUES(?,?,?)',(user['id'],id,text(data,'reason',2000)))
        new='DISPUTED'
    elif act in ('resolve_refund','resolve_release'):
        if not admin: raise APIError('Solo administración puede resolver disputas.',403)
        if status!='DISPUTED': raise APIError('No hay disputa abierta.',409)
        p=db.execute('SELECT * FROM payments WHERE booking_id=?',(id,)).fetchone()
        if act=='resolve_refund':
            provider.refund(p['reference']);new='REFUNDED';payment_status='REFUNDED'
        else:
            provider.release(p['reference']);new='PAID_OUT';payment_status='RELEASED'
            db.execute("INSERT INTO transactions(artist_id,booking_id,kind,amount,commission,description) VALUES(?,?,'BOOKING',?,?,?)",(b['artist_id'],id,b['amount'],b['commission'],b['title']))
        db.execute('UPDATE payments SET status=? WHERE booking_id=?',(payment_status,id))
        db.execute("UPDATE reports SET status='RESOLVED' WHERE booking_id=?",(id,))
    else: raise APIError('Acción inválida.')
    db.execute('UPDATE bookings SET status=? WHERE id=?',(new,id))
    db.execute('INSERT INTO audit(user_id,action,entity_id) VALUES(?,?,?)',(user['id'],f'BOOKING_{act.upper()}',id))
    return booking(db,id,user)
