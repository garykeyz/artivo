#!/usr/bin/env python3
"""Build the public Pages preview from a NEW demo DB, never from local user data."""
import json
import tempfile
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent.parent))
from artivo import db,seed,social

def build():
    original=db.DB_PATH
    with tempfile.TemporaryDirectory() as directory:
        db.DB_PATH=Path(directory)/'demo.sqlite3'
        db.init()
        with db.connect() as conn:
            seed.seed(conn);social.seed_posts(conn)
            data={'version':2,'users':[dict(r) for r in conn.execute('SELECT id,name,email,role,suspended FROM users')],
                  'categories':[dict(r) for r in conn.execute('SELECT * FROM categories')],
                  'artists':[dict(r) for r in conn.execute('SELECT * FROM artists')],
                  'posts':[dict(r) for r in conn.execute('SELECT * FROM posts')],
                  'settings':{'commission_bps':1000,'free_cancel_hours':48},
                  'expense_categories':['Gasolina','Transporte','Peajes','Alimentación','Equipo','Instrumentos','Reparaciones','Mantenimiento','Personal','Alquiler de equipo','Marketing','Software','Suscripciones','Otros']}
        db.DB_PATH=original
    (db.ROOT/'web/demo-data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print('Demo pública generada desde datos nuevos, sin sesiones ni contraseñas.')

if __name__=='__main__':build()
