import os
from . import auth,marketplace as m,finance,social
from .db import rows
from .security import APIError,require,text,integer
from .payments import DemoPaymentProvider,DisabledPaymentProvider

DEMO=os.getenv('ARTIVO_DEMO','1')=='1'
PROVIDER=DemoPaymentProvider() if DEMO else DisabledPaymentProvider()

def dispatch(db,method,path,user,data,params):
    require(user)
    if method=='GET':
        if path=='/api/feed': return social.feed(db,user,params)
        if path.startswith('/api/posts/'):
            parts=path.split('/');id=int(parts[3])
            if len(parts)==5 and parts[4]=='comments': return social.comments(db,user,id)
            if len(parts)==4: return social.get_post(db,id,user)
        if path=='/api/bootstrap':
            own=db.execute('SELECT user_id FROM artists WHERE user_id=?',(user['id'],)).fetchone()
            return {'user':auth.public(user),'categories':rows(db.execute('SELECT * FROM categories')),'cities':rows(db.execute('SELECT DISTINCT city name FROM artists ORDER BY city')),'profile':m.profile(db,user['id'],user) if own else None,'demo':DEMO,'commission_bps':m.setting(db,'commission_bps'),'free_cancel_hours':m.setting(db,'free_cancel_hours')}
        if path=='/api/artists': return m.discover(db,params,user)
        if path.startswith('/api/artists/'):
            id=int(path.split('/')[3]);result=m.profile(db,id,user)
            result['reviews']=rows(db.execute('SELECT r.rating,r.comment,r.created_at,u.name FROM reviews r JOIN users u ON u.id=r.author_id WHERE artist_id=? ORDER BY r.id DESC',(id,)))
            result['availability']=rows(db.execute('SELECT * FROM availability WHERE artist_id=? ORDER BY start',(id,)))
            return result
        if path=='/api/bookings': return m.bookings(db,user)
        if path=='/api/wallet': return finance.wallet(db,user)
        if path=='/api/availability':
            require(user,'ARTIST');return rows(db.execute('SELECT * FROM availability WHERE artist_id=? ORDER BY start',(user['id'],)))
        if path.startswith('/api/bookings/') and path.endswith('/messages'):
            id=int(path.split('/')[3]);m.booking(db,id,user)
            return rows(db.execute('SELECT m.*,u.name FROM messages m JOIN users u ON u.id=m.sender_id WHERE booking_id=? ORDER BY m.id',(id,)))
        if path=='/api/admin':
            require(user,'ADMIN')
            stats=dict(db.execute("SELECT count(*) bookings,coalesce(sum(CASE WHEN status='PAID_OUT' THEN amount ELSE 0 END),0) gmv,coalesce(sum(CASE WHEN status='PAID_OUT' THEN commission ELSE 0 END),0) revenue,sum(CASE WHEN status='PAID_OUT' THEN 1 ELSE 0 END) completed FROM bookings").fetchone())
            return {'users':rows(db.execute('SELECT id,name,email,role,suspended FROM users ORDER BY id')),'bookings':m.bookings(db,user),'reports':rows(db.execute('SELECT r.*,u.name FROM reports r JOIN users u ON u.id=r.author_id ORDER BY r.id DESC')),'audit':rows(db.execute('SELECT * FROM audit ORDER BY id DESC LIMIT 50')),'stats':stats,'settings':rows(db.execute('SELECT * FROM settings'))}
    if method=='POST':
        if path=='/api/posts': return social.publish(db,user,data)
        if path.startswith('/api/posts/'):
            parts=path.split('/');return social.interaction(db,user,int(parts[3]),parts[4],data)
        if path=='/api/profile': return m.save_profile(db,user,data)
        if path=='/api/bookings': return m.create_booking(db,user,data)
        if path=='/api/expenses': return finance.expense(db,user,data)
        if path=='/api/income': return finance.external_income(db,user,data)
        if path=='/api/favorites':
            require(user,'CLIENT','BUSINESS');id=integer(data,'artist_id');m.profile(db,id)
            if db.execute('SELECT 1 FROM favorites WHERE user_id=? AND artist_id=?',(user['id'],id)).fetchone(): db.execute('DELETE FROM favorites WHERE user_id=? AND artist_id=?',(user['id'],id))
            else: db.execute('INSERT INTO favorites VALUES(?,?)',(user['id'],id))
            return {'ok':True}
        if path=='/api/availability':
            require(user,'ARTIST')
            if not db.execute('SELECT 1 FROM artists WHERE user_id=?',(user['id'],)).fetchone(): raise APIError('Primero crea tu perfil.')
            start,end=m.times(data);kind=text(data,'kind',20)
            if kind not in ('AVAILABLE','BLOCKED'): raise APIError('Estado inválido.')
            if kind=='BLOCKED' and db.execute("SELECT 1 FROM bookings WHERE artist_id=? AND status IN ('PAYMENT_PENDING','CONFIRMED','IN_PROGRESS','DISPUTED') AND start<? AND end>?",(user['id'],end,start)).fetchone(): raise APIError('Ese horario tiene una reserva activa.',409)
            db.execute('INSERT INTO availability(artist_id,start,end,kind) VALUES(?,?,?,?)',(user['id'],start,end,kind));return {'ok':True}
        if path=='/api/availability/delete':
            require(user,'ARTIST');id=integer(data,'id')
            if db.execute("SELECT 1 FROM availability a JOIN bookings b ON a.artist_id=b.artist_id WHERE a.id=? AND a.artist_id=? AND b.status IN ('PAYMENT_PENDING','CONFIRMED','IN_PROGRESS','DISPUTED') AND a.start<b.end AND a.end>b.start",(id,user['id'])).fetchone(): raise APIError('No puedes quitar disponibilidad con reservas activas.',409)
            db.execute('DELETE FROM availability WHERE id=? AND artist_id=?',(id,user['id']));return {'ok':True}
        if path.startswith('/api/bookings/'):
            parts=path.split('/');id=int(parts[3]);b=m.booking(db,id,user)
            if parts[4]=='action': return m.action(db,user,id,data,PROVIDER)
            if parts[4]=='messages':
                if user['id'] not in (b['client_id'],b['artist_id']): raise APIError('Solo los participantes pueden enviar mensajes.',403)
                db.execute('INSERT INTO messages(booking_id,sender_id,body) VALUES(?,?,?)',(id,user['id'],text(data,'body',3000)));return {'ok':True}
            if parts[4]=='review':
                if user['id']!=b['client_id']: raise APIError('Solo el cliente de esta reserva puede publicar la reseña.',403)
                if b['status']!='PAID_OUT': raise APIError('Completa el servicio antes de calificar.',409)
                if db.execute('SELECT 1 FROM reviews WHERE booking_id=?',(id,)).fetchone(): raise APIError('Esta reserva ya tiene una reseña.',409)
                db.execute('INSERT INTO reviews(booking_id,author_id,artist_id,rating,comment) VALUES(?,?,?,?,?)',(id,user['id'],b['artist_id'],integer(data,'rating',1,5),text(data,'comment',1500)));return {'ok':True}
        if path=='/api/reports':
            kind=text(data,'target_kind',20);id=integer(data,'target_id');booking_id=None
            if kind=='ARTIST': m.profile(db,id)
            elif kind=='POST': social.get_post(db,id,user)
            elif kind=='BOOKING': m.booking(db,id,user);booking_id=id
            elif kind=='MESSAGE':
                record=db.execute('SELECT booking_id FROM messages WHERE id=?',(id,)).fetchone()
                if not record: raise APIError('Mensaje no encontrado.',404)
                m.booking(db,record['booking_id'],user);booking_id=record['booking_id']
            else: raise APIError('Tipo de reporte inválido.')
            db.execute('INSERT INTO reports(author_id,booking_id,target_kind,target_id,reason) VALUES(?,?,?,?,?)',(user['id'],booking_id,kind,id,text(data,'reason',2000)))
            return {'ok':True}
        if path=='/api/admin/report':
            require(user,'ADMIN');id=integer(data,'id')
            report=db.execute('SELECT * FROM reports WHERE id=?',(id,)).fetchone()
            if not report: raise APIError('Reporte no encontrado.',404)
            if report['booking_id'] and db.execute("SELECT 1 FROM bookings WHERE id=? AND status='DISPUTED'",(report['booking_id'],)).fetchone(): raise APIError('Resuelve la disputa desde la reserva.')
            db.execute("UPDATE reports SET status='RESOLVED' WHERE id=?",(id,))
            db.execute('INSERT INTO audit(user_id,action,entity_id) VALUES(?,?,?)',(user['id'],'REPORT_RESOLVED',id))
            return {'ok':True}
        if path=='/api/admin/user':
            require(user,'ADMIN');id=integer(data,'id')
            target=db.execute('SELECT * FROM users WHERE id=?',(id,)).fetchone()
            if not target or target['role']=='ADMIN': raise APIError('No puedes suspender esta cuenta.')
            db.execute('UPDATE users SET suspended=1-suspended WHERE id=?',(id,));db.execute('DELETE FROM sessions WHERE user_id=?',(id,))
            db.execute('INSERT INTO audit(user_id,action,entity_id) VALUES(?,?,?)',(user['id'],'USER_STATUS_CHANGED',id));return {'ok':True}
        if path=='/api/admin/settings':
            require(user,'ADMIN');bps=integer(data,'commission_bps',0,3000);hours=integer(data,'free_cancel_hours',0,168)
            db.execute("UPDATE settings SET value=? WHERE key='commission_bps'",(str(bps),));db.execute("UPDATE settings SET value=? WHERE key='free_cancel_hours'",(str(hours),))
            db.execute('INSERT INTO audit(user_id,action) VALUES(?,?)',(user['id'],'SETTINGS_UPDATED'));return {'ok':True}
    raise APIError('Ruta no encontrada.',404)
