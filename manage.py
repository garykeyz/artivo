#!/usr/bin/env python3
"""Administrative account creation; passwords are prompted, never command arguments."""
import argparse
import getpass
from artivo import db,auth
from artivo.security import APIError

parser=argparse.ArgumentParser(description='Administración local de ARTIVO')
parser.add_argument('command',choices=['create-admin'])
parser.add_argument('--email',required=True)
parser.add_argument('--name',required=True)
args=parser.parse_args()
password=getpass.getpass('Contraseña de administrador (mínimo 8 caracteres): ')
if password!=getpass.getpass('Repite la contraseña: '):raise SystemExit('Las contraseñas no coinciden.')
db.init()
try:
    with db.connect() as conn:
        user,_=auth.register(conn,{'name':args.name,'email':args.email,'password':password,'role':'CLIENT'})
        conn.execute("UPDATE users SET role='ADMIN' WHERE id=?",(user['id'],))
        conn.execute('DELETE FROM sessions WHERE user_id=?',(user['id'],))
    print('Administrador creado. Inicia sesión con su correo y contraseña.')
except APIError as error:raise SystemExit(error.message)
