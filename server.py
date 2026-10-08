#!/usr/bin/env python3
"""Local ARTIVO application. No external Python dependencies required."""
import json
import logging
import os
import sqlite3
from http.cookies import SimpleCookie
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from urllib.parse import urlparse,parse_qs
from artivo import db,auth,api,seed,social
from artivo.security import APIError,rate_limit,token_hash

HOST=os.getenv('ARTIVO_HOST','127.0.0.1');PORT=int(os.getenv('PORT','8000'))
WEB=db.ROOT/'web'

class Handler(BaseHTTPRequestHandler):
    def send_json(self,status,payload,cookie=None):
        body=json.dumps(payload,ensure_ascii=False).encode()
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
        if cookie is not None:
            secure='; Secure' if os.getenv('ARTIVO_SECURE_COOKIE')=='1' else ''
            self.send_header('Set-Cookie',f'artivo_session={cookie}; HttpOnly; SameSite=Strict; Path=/; Max-Age={604800 if cookie else 0}{secure}')
        self.end_headers();self.wfile.write(body)
    def do_GET(self): self.handle_request('GET')
    def do_POST(self): self.handle_request('POST')
    def handle_request(self,method):
        parsed=urlparse(self.path);path=parsed.path
        if not path.startswith('/api/'):
            if method!='GET': return self.send_json(405,{'error':'Método no permitido.'})
            files={'/':'index.html','/app.js':'app.js','/feed.js':'feed.js','/arti-domain.js':'arti-domain.js','/arti-ui.js':'arti-ui.js','/style.css':'style.css','/favicon.svg':'favicon.svg','/artist-placeholder.svg':'artist-placeholder.svg'}
            name=files.get(path)
            if not name: return self.send_json(404,{'error':'No encontrado.'})
            content=(WEB/name).read_bytes();self.send_response(200)
            self.send_header('Content-Type',{'html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8','css':'text/css; charset=utf-8','svg':'image/svg+xml'}[name.split('.')[-1]])
            self.send_header('X-Content-Type-Options','nosniff')
            self.send_header('Content-Security-Policy',"default-src 'self'; img-src 'self' https: data:; media-src 'self' https:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
            self.end_headers();self.wfile.write(content);return
        try:
            rate_limit(('api',self.client_address[0]),600,60)
            data={};cookie=None
            if method=='POST':
                # Browsers must use a same-origin JSON request. Reject cross-site writes.
                origin=self.headers.get('Origin');host=self.headers.get('Host')
                if origin and origin not in (f'http://{host}',f'https://{host}'): raise APIError('Origen no permitido.',403)
                if self.headers.get('Sec-Fetch-Site')=='cross-site': raise APIError('Origen no permitido.',403)
                if self.headers.get('Content-Type','').split(';')[0]!='application/json': raise APIError('Se requiere JSON.',415)
                length=int(self.headers.get('Content-Length','0'))
                if length<0 or length>65536: raise APIError('La solicitud es demasiado grande.',413)
                try: data=json.loads(self.rfile.read(length))
                except (json.JSONDecodeError,UnicodeDecodeError): raise APIError('JSON inválido.')
                if not isinstance(data,dict): raise APIError('La solicitud debe ser un objeto.')
            cookies=SimpleCookie();cookies.load(self.headers.get('Cookie',''))
            token=cookies['artivo_session'].value if 'artivo_session' in cookies else ''
            with db.connect() as conn:
                # Serialize all mutations so availability and financial checks stay atomic.
                if method=='POST': conn.execute('BEGIN IMMEDIATE')
                user=auth.current(conn,token)
                if path=='/api/auth/me' and method=='GET': result={'user':auth.public(user),'demo':api.DEMO}
                elif path in ('/api/auth/login','/api/auth/register') and method=='POST':
                    rate_limit(('auth',self.client_address[0]),25,300)
                    result,cookie=(auth.login if path.endswith('login') else auth.register)(conn,data)
                elif path=='/api/auth/logout' and method=='POST':
                    conn.execute('DELETE FROM sessions WHERE token=?',(token_hash(token),));result={'ok':True};cookie=''
                elif path=='/api/auth/recover' and method=='POST':
                    rate_limit(('recovery',self.client_address[0]),10,300);result=auth.recovery(conn,data,api.DEMO)
                elif path=='/api/auth/reset' and method=='POST':
                    rate_limit(('reset',self.client_address[0]),10,300);result=auth.reset(conn,data)
                else: result=api.dispatch(conn,method,path,user,data,{k:v[0] for k,v in parse_qs(parsed.query).items()})
            self.send_json(200,result,cookie)
        except APIError as e: self.send_json(e.status,{'error':e.message})
        except (ValueError,TypeError,KeyError,IndexError): self.send_json(400,{'error':'Revisa los datos de la solicitud.'})
        except sqlite3.IntegrityError: self.send_json(409,{'error':'La operación entra en conflicto con un registro existente.'})
        except Exception:
            logging.exception('Request failed');self.send_json(500,{'error':'No pudimos completar la operación. Inténtalo de nuevo.'})

if __name__=='__main__':
    db.init()
    with db.connect() as conn:
        if api.DEMO:
            seed.seed(conn)
            social.seed_posts(conn)
        else:
            for key,value in [('commission_bps','1000'),('free_cancel_hours','48')]: conn.execute('INSERT OR IGNORE INTO settings VALUES(?,?)',(key,value))
            for name,icon in [('Pianista','piano'),('DJ','disc'),('Saxofonista','music'),('Cantante','mic'),('Guitarrista','guitar'),('Banda','users'),('Violinista','music')]: conn.execute('INSERT OR IGNORE INTO categories(name,icon) VALUES(?,?)',(name,icon))
    print(f'ARTIVO → http://{HOST}:{PORT} | Pagos: {"DEMO" if api.DEMO else "deshabilitados"}',flush=True)
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
