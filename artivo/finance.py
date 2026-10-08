from datetime import datetime,timezone,timedelta
from .db import rows
from .security import require,APIError,text,integer
from .marketplace import TZ_NOW

EXPENSE_CATEGORIES=['Gasolina','Transporte','Peajes','Alimentación','Equipo','Instrumentos','Reparaciones','Mantenimiento','Personal','Alquiler de equipo','Marketing','Software','Suscripciones','Otros']

def local_month(timestamp):
    return datetime.fromisoformat(timestamp).replace(tzinfo=timezone.utc).astimezone(timezone(timedelta(hours=-4))).strftime('%Y-%m')

def wallet(db,user):
    require(user,'ARTIST')
    transactions=rows(db.execute('SELECT * FROM transactions WHERE artist_id=? ORDER BY id DESC',(user['id'],)))
    expenses=rows(db.execute('SELECT * FROM expenses WHERE artist_id=? ORDER BY date DESC,id DESC',(user['id'],)))
    income=sum(t['amount'] for t in transactions if t['kind']!='WITHDRAWAL')
    fees=sum(t['commission'] for t in transactions)
    spent=sum(e['amount'] for e in expenses)
    withdrawn=-sum(t['amount'] for t in transactions if t['kind']=='WITHDRAWAL')
    pending=db.execute("SELECT coalesce(sum(amount-commission),0) FROM bookings WHERE artist_id=? AND status IN ('CONFIRMED','IN_PROGRESS','DISPUTED')",(user['id'],)).fetchone()[0]
    month=TZ_NOW().strftime('%Y-%m')
    monthly_income=sum(t['amount'] for t in transactions if t['kind']!='WITHDRAWAL' and local_month(t['created_at'])==month)
    monthly_fees=sum(t['commission'] for t in transactions if local_month(t['created_at'])==month)
    monthly_expenses=sum(e['amount'] for e in expenses if e['date'].startswith(month))
    return {'income':income,'commission':fees,'expenses_total':spent,'profit':income-fees-spent,'available':income-fees-withdrawn,'pending':pending,'month_income':monthly_income,'month_commission':monthly_fees,'month_expenses':monthly_expenses,'month_profit':monthly_income-monthly_fees-monthly_expenses,'transactions':transactions,'expenses':expenses,'expense_categories':EXPENSE_CATEGORIES}

def expense(db,user,data):
    require(user,'ARTIST')
    if not db.execute('SELECT 1 FROM artists WHERE user_id=?',(user['id'],)).fetchone(): raise APIError('Primero crea tu perfil de artista.')
    category=text(data,'category',80)
    if category not in EXPENSE_CATEGORIES: raise APIError('Categoría de gasto inválida.')
    booking_id=data.get('booking_id') or None
    if booking_id:
        booking_id=integer({'id':booking_id},'id')
        if not db.execute('SELECT 1 FROM bookings WHERE id=? AND artist_id=?',(booking_id,user['id'])).fetchone(): raise APIError('La reserva no pertenece a tu cuenta.',403)
    date=text(data,'date',10)
    try: datetime.strptime(date,'%Y-%m-%d')
    except ValueError: raise APIError('Fecha inválida.')
    db.execute('INSERT INTO expenses(artist_id,booking_id,category,description,amount,date) VALUES(?,?,?,?,?,?)',(user['id'],booking_id,category,text(data,'description',200),integer(data,'amount'),date))
    return wallet(db,user)

def external_income(db,user,data):
    require(user,'ARTIST')
    if not db.execute('SELECT 1 FROM artists WHERE user_id=?',(user['id'],)).fetchone(): raise APIError('Primero crea tu perfil de artista.')
    db.execute("INSERT INTO transactions(artist_id,kind,amount,description) VALUES(?,'EXTERNAL',?,?)",(user['id'],integer(data,'amount'),text(data,'description',200)))
    return wallet(db,user)
