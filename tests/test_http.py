import concurrent.futures
import http.client
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from datetime import datetime,timedelta,timezone

class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory()
        with socket.socket() as s:s.bind(('127.0.0.1',0));cls.port=s.getsockname()[1]
        env={**os.environ,'ARTIVO_DB':str(Path(cls.tmp.name)/'http.sqlite3'),'PORT':str(cls.port),'ARTIVO_DEMO':'1'}
        cls.process=subprocess.Popen([sys.executable,'server.py'],cwd=Path(__file__).resolve().parent.parent,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                cls.request('GET','/api/auth/me');break
            except OSError:time.sleep(.05)
        else:raise RuntimeError('Server did not start')
        cls.client=cls.login('cliente');cls.artist=cls.login('gary');cls.other=cls.login('business')
    @classmethod
    def tearDownClass(cls):cls.process.terminate();cls.process.wait(timeout=5);cls.tmp.cleanup()
    @classmethod
    def request(cls,method,path,data=None,cookie=None,headers=None):
        conn=http.client.HTTPConnection('127.0.0.1',cls.port,timeout=10);h={'Content-Type':'application/json',**(headers or {})}
        if cookie:h['Cookie']=cookie
        conn.request(method,path,body=json.dumps(data) if data is not None else None,headers=h)
        response=conn.getresponse();body=response.read();status=response.status;result_headers=dict(response.getheaders());conn.close()
        if 'application/json' in result_headers.get('Content-Type',''):body=json.loads(body)
        return status,body,result_headers
    @classmethod
    def login(cls,name):
        status,body,h=cls.request('POST','/api/auth/login',{'email':name+'@artivo.demo','password':'Artivo2026!'});assert status==200
        return h['Set-Cookie'].split(';')[0]
    def test_session_cookie_is_http_only(self):
        status,body,h=self.request('POST','/api/auth/login',{'email':'cliente@artivo.demo','password':'Artivo2026!'});self.assertIn('HttpOnly',h['Set-Cookie']);self.assertIn('SameSite=Strict',h['Set-Cookie'])
    def test_unauthenticated_api(self):self.assertEqual(401,self.request('GET','/api/bookings')[0])
    def test_cross_site_post_blocked(self):self.assertEqual(403,self.request('POST','/api/auth/logout',{},self.client,{'Origin':'https://evil.example'})[0])
    def test_form_encoded_write_blocked(self):self.assertEqual(415,self.request('POST','/api/auth/logout',{},self.client,{'Content-Type':'application/x-www-form-urlencoded'})[0])
    def test_static_security_headers(self):
        status,body,h=self.request('GET','/');self.assertEqual(200,status);self.assertIn("frame-ancestors 'none'",h['Content-Security-Policy']);self.assertEqual('nosniff',h['X-Content-Type-Options'])
    def test_no_arbitrary_file_access(self):self.assertEqual(404,self.request('GET','/artivo/schema.sql')[0])
    def test_unknown_route(self):self.assertEqual(404,self.request('GET','/api/nonexistent',cookie=self.client)[0])
    def test_concurrent_acceptance_is_atomic(self):
        start=(datetime.now(timezone(timedelta(hours=-4)))+timedelta(days=5)).replace(tzinfo=None,hour=20,minute=0,second=0,microsecond=0)
        data={'artist_id':2,'title':'Concurrency test','city':'Punta Cana','location':'Test venue','start':start.isoformat(timespec='minutes'),'end':(start+timedelta(hours=2)).isoformat(timespec='minutes'),'amount':8000}
        first=self.request('POST','/api/bookings',data,self.client)[1];second=self.request('POST','/api/bookings',data,self.other)[1]
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            futures=[pool.submit(self.request,'POST',f"/api/bookings/{b['id']}/action",{'action':'accept'},self.artist) for b in (first,second)]
            results=[f.result()[0] for f in futures]
        self.assertEqual([200,409],sorted(results))
    def test_invalid_json_shape(self):self.assertEqual(400,self.request('POST','/api/auth/login',[],self.client)[0])

if __name__=='__main__':unittest.main()
