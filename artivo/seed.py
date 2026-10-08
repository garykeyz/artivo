from datetime import timedelta
from .security import password_hash
from .marketplace import TZ_NOW

def seed(db):
    for key,value in [('commission_bps','1000'),('free_cancel_hours','48')]:
        db.execute('INSERT OR IGNORE INTO settings VALUES(?,?)',(key,value))
    categories=[('Pianista','piano'),('DJ','disc'),('Saxofonista','music'),('Cantante','mic'),('Guitarrista','guitar'),('Banda','users'),('Violinista','music')]
    for name,icon in categories: db.execute('INSERT OR IGNORE INTO categories(name,icon) VALUES(?,?)',(name,icon))
    if db.execute('SELECT 1 FROM users').fetchone(): return
    password=password_hash('Artivo2026!')
    accounts=[('Casa Tropical','cliente@artivo.demo','CLIENT'),('Gary Keyz','gary@artivo.demo','ARTIST'),('Elena Rivera','elena@artivo.demo','ARTIST'),('Marco Beats','marco@artivo.demo','ARTIST'),('Sofía Cruz','sofia@artivo.demo','ARTIST'),('Los del Caribe','banda@artivo.demo','ARTIST'),('Daniel Soto','daniel@artivo.demo','ARTIST'),('Hotel Palma Real','business@artivo.demo','BUSINESS'),('Administración','admin@artivo.demo','ADMIN')]
    for name,email,role in accounts: db.execute('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)',(name,email,password,role))
    artists=[
        (2,'Gary Keyz',1,'Punta Cana','El sonido perfecto para una noche inolvidable. Piano en vivo, jazz y versiones de tus canciones favoritas.','Jazz · Lounge · Pop','Piano digital, sonido y micrófono','photo-1520523839897-bd0b52f945a0',7000,1,30),
        (3,'Elena Rivera',3,'Punta Cana','Saxofón con alma. Una experiencia elegante para bodas, cenas y momentos especiales.','Jazz · Soul · Bossa nova','Saxofón y sonido portátil','photo-1511192336575-5a79af67a629',8500,1,25),
        (4,'Marco Beats',2,'Punta Cana','La energía que tu evento necesita. Sets personalizados para cada público.','House · Latin · Open format','Controladora, sonido y luces','photo-1470225620780-dba8ba36b745',12000,1,50),
        (5,'Sofía Cruz',4,'Santo Domingo','Canciones que conectan. Voz en vivo para ceremonias, eventos íntimos y celebraciones.','Acústico · Pop · Soul','Micrófono, guitarra y sonido','photo-1516280440614-37939bbacd81',6500,1,30),
        (6,'Los del Caribe',6,'Punta Cana','Cinco músicos, una sola energía. Llevamos el ritmo del Caribe a tu celebración.','Merengue · Bachata · Tropical','Sonido completo para eventos','photo-1506157786151-b8491531f063',25000,0,50),
        (7,'Daniel Soto',5,'Santo Domingo','Guitarra acústica y un repertorio para crear el ambiente ideal.','Acústico · Flamenco · Pop','Guitarra y amplificador','photo-1510915361894-db8b60106cb1',5500,1,25),
    ]
    now=TZ_NOW()
    for id,name,cat,city,bio,genres,equipment,img,rate,active,radius in artists:
        photo=f'https://images.unsplash.com/{img}?auto=format&fit=crop&w=900&q=85'
        db.execute('INSERT INTO artists(user_id,stage_name,category_id,city,bio,genres,equipment,photo,rate,active,radius) VALUES(?,?,?,?,?,?,?,?,?,?,?)',(id,name,cat,city,bio,genres,equipment,photo,rate,active,radius))
        db.execute("INSERT INTO availability(artist_id,start,end,kind) VALUES(?,?,?,'AVAILABLE')",(id,now.isoformat(timespec='minutes'),(now+timedelta(days=90)).isoformat(timespec='minutes')))
