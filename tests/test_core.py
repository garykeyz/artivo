import tempfile
import unittest
from pathlib import Path
from datetime import timedelta
from artivo import db,seed,auth,api,marketplace as m
from artivo.security import APIError

class CoreTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();db.DB_PATH=Path(self.temp.name)/'test.sqlite3';db.init()
        self.conn=db.connect();seed.seed(self.conn);self.conn.commit()
        self.client=self.user(1);self.artist=self.user(2);self.other=self.user(8);self.admin=self.user(9)
        self.start=(m.TZ_NOW()+timedelta(days=3)).replace(hour=20,minute=0,second=0,microsecond=0)
        self.data={'artist_id':2,'title':'Jazz en Casa Tropical','city':'Punta Cana','location':'Casa Tropical','description':'Jazz lounge','start':self.start.isoformat(timespec='minutes'),'end':(self.start+timedelta(hours=3)).isoformat(timespec='minutes'),'amount':8000}
    def tearDown(self):self.conn.close();self.temp.cleanup()
    def user(self,id):return self.conn.execute('SELECT * FROM users WHERE id=?',(id,)).fetchone()
    def call(self,user,path,data=None,params=None):return api.dispatch(self.conn,'POST' if data is not None else 'GET',path,user,data or {},params or {})
    def create(self,client=None):return self.call(client or self.client,'/api/bookings',self.data)
    def action(self,b,user,action,**kwargs):return self.call(user,f"/api/bookings/{b['id']}/action",{'action':action,**kwargs})
    def complete(self):
        b=self.create();self.action(b,self.artist,'accept');self.action(b,self.client,'pay');self.action(b,self.artist,'start');self.action(b,self.client,'complete');return b
    def fails(self,fn,status=None):
        with self.assertRaises(APIError) as ctx:fn()
        if status:self.assertEqual(status,ctx.exception.status)
    def test_complete_cycle_and_real_profit(self):
        b=self.complete();self.call(self.artist,'/api/expenses',{'category':'Gasolina','description':'Gasolina','amount':700,'date':self.start.date().isoformat(),'booking_id':b['id']});self.call(self.artist,'/api/expenses',{'category':'Alimentación','description':'Comida','amount':300,'date':self.start.date().isoformat(),'booking_id':b['id']})
        w=self.call(self.artist,'/api/wallet');self.assertEqual((8000,800,1000,6200,7200),(w['income'],w['commission'],w['expenses_total'],w['profit'],w['available']))
        self.call(self.client,f"/api/bookings/{b['id']}/review",{'rating':5,'comment':'Excelente presentación'});self.assertEqual(5,self.call(self.client,'/api/artists/2')['rating'])
    def test_prevent_overlapping_acceptance(self):
        b=self.create();second=self.create(self.other);self.action(b,self.artist,'accept');self.fails(lambda:self.action(second,self.artist,'accept'),409)
    def test_search_filters_available_slots(self):
        self.assertTrue(self.call(self.client,'/api/artists',params={'start':self.data['start'],'end':self.data['end'],'category':'1'}));b=self.create();self.action(b,self.artist,'accept');self.assertEqual([],self.call(self.client,'/api/artists',params={'start':self.data['start'],'end':self.data['end'],'category':'1'}))
    def test_duplicate_payment_rejected(self):
        b=self.create();self.action(b,self.artist,'accept');self.action(b,self.client,'pay');self.fails(lambda:self.action(b,self.client,'pay'),409);self.assertEqual(1,self.conn.execute('SELECT count(*) FROM payments').fetchone()[0])
    def test_duplicate_completion_never_duplicates_income(self):
        b=self.complete();self.fails(lambda:self.action(b,self.client,'complete'),409);self.assertEqual(1,self.conn.execute('SELECT count(*) FROM transactions').fetchone()[0])
    def test_cannot_access_other_booking_or_chat(self):
        b=self.create();self.fails(lambda:self.call(self.other,f"/api/bookings/{b['id']}/messages"),403);self.fails(lambda:self.action(b,self.other,'pay'),403)
    def test_roles_checked(self):
        self.fails(lambda:self.call(self.client,'/api/wallet'),403);self.fails(lambda:self.create(self.artist),403);self.fails(lambda:self.call(self.client,'/api/admin'),403)
    def test_client_cannot_accept_artist_cannot_pay(self):
        b=self.create();self.fails(lambda:self.action(b,self.client,'accept'),403);self.action(b,self.artist,'accept');self.fails(lambda:self.action(b,self.artist,'pay'),403)
    def test_payment_cannot_skip_acceptance(self):
        b=self.create();self.fails(lambda:self.action(b,self.client,'pay'),409)
    def test_invalid_times_and_missing_availability(self):
        self.fails(lambda:self.call(self.client,'/api/bookings',{**self.data,'end':self.data['start']}));future=m.TZ_NOW()+timedelta(days=150);self.fails(lambda:self.call(self.client,'/api/bookings',{**self.data,'start':future.isoformat(timespec='minutes'),'end':(future+timedelta(hours=2)).isoformat(timespec='minutes')}),409)
    def test_blocked_slot(self):
        self.call(self.artist,'/api/availability',{'start':self.data['start'],'end':self.data['end'],'kind':'BLOCKED'});self.fails(self.create,409)
    def test_cannot_block_confirmed_slot(self):
        b=self.create();self.action(b,self.artist,'accept');self.fails(lambda:self.call(self.artist,'/api/availability',{'start':self.data['start'],'end':self.data['end'],'kind':'BLOCKED'}),409)
    def test_counter_offer(self):
        b=self.create();self.action(b,self.artist,'counter',amount=10000);r=self.action(b,self.client,'accept_counter');self.assertEqual((10000,1000,'PAYMENT_PENDING'),(r['amount'],r['commission'],r['status']))
    def test_cancel_frees_slot_and_refunds(self):
        b=self.create();self.action(b,self.artist,'accept');self.action(b,self.client,'pay');r=self.action(b,self.client,'cancel');self.assertEqual('REFUNDED',r['status']);self.assertTrue(m.free(self.conn,2,self.data['start'],self.data['end']));self.assertEqual(0,self.call(self.artist,'/api/wallet')['income'])
    def test_dispute_refund(self):
        b=self.create();self.action(b,self.artist,'accept');self.action(b,self.client,'pay');self.action(b,self.client,'dispute',reason='Revisar cancelación');self.fails(lambda:self.action(b,self.client,'resolve_refund'),403);self.action(b,self.admin,'resolve_refund');self.assertEqual('RESOLVED',self.conn.execute('SELECT status FROM reports').fetchone()[0])
    def test_dispute_release_once(self):
        b=self.create();self.action(b,self.artist,'accept');self.action(b,self.client,'pay');self.action(b,self.artist,'dispute',reason='Servicio realizado');self.action(b,self.admin,'resolve_release');self.assertEqual(7200,self.call(self.artist,'/api/wallet')['available']);self.fails(lambda:self.action(b,self.admin,'resolve_release'),409)
    def test_review_only_after_completion_and_once(self):
        b=self.create();path=f"/api/bookings/{b['id']}/review";d={'rating':5,'comment':'Bien'};self.fails(lambda:self.call(self.client,path,d),409)
        self.action(b,self.artist,'accept');self.action(b,self.client,'pay');self.action(b,self.artist,'start');self.action(b,self.client,'complete');self.fails(lambda:self.call(self.artist,path,d),403);self.call(self.client,path,d);self.fails(lambda:self.call(self.client,path,d),409)
    def test_expense_booking_ownership(self):
        b=self.create();self.fails(lambda:self.call(self.user(3),'/api/expenses',{'booking_id':b['id'],'amount':100,'description':'Gas','category':'Gasolina','date':'2026-10-08'}),403)
    def test_financial_month_uses_dominican_time(self):
        from artivo.finance import local_month
        self.assertEqual('2026-09',local_month('2026-10-01 02:00:00'))
        self.assertEqual('2026-10',local_month('2026-10-01 04:00:00'))
    def test_external_income(self):
        self.call(self.artist,'/api/income',{'amount':5000,'description':'Evento externo'});w=self.call(self.artist,'/api/wallet');self.assertEqual(5000,w['profit']);self.assertEqual(0,w['commission'])
    def test_auth_and_reset_revokes_sessions(self):
        user,token=auth.register(self.conn,{'name':'Nuevo','email':'nuevo@example.com','password':'Password123!','role':'CLIENT'});self.assertEqual(user['id'],auth.current(self.conn,token)['id']);r=auth.recovery(self.conn,{'email':'nuevo@example.com'},True);auth.reset(self.conn,{'token':r['demo_reset_token'],'password':'Changed123!'});self.assertIsNone(auth.current(self.conn,token));self.fails(lambda:auth.login(self.conn,{'email':'nuevo@example.com','password':'Password123!'}),401);auth.login(self.conn,{'email':'nuevo@example.com','password':'Changed123!'})
    def test_admin_registration_prohibited(self):self.fails(lambda:auth.register(self.conn,{'name':'Hacker','email':'hack@example.com','password':'Password123!','role':'ADMIN'}))
    def test_suspension_enforced(self):
        self.call(self.admin,'/api/admin/user',{'id':1});self.fails(lambda:self.call(self.user(1),'/api/bookings'),403)
    def test_settings_validated_and_existing_commission_preserved(self):
        b=self.create();self.call(self.admin,'/api/admin/settings',{'commission_bps':1500,'free_cancel_hours':72});self.assertEqual(800,m.booking(self.conn,b['id'],self.client)['commission']);second=self.create();self.assertEqual(1200,second['commission'])
    def test_client_financial_tampering_ignored(self):
        b=self.call(self.client,'/api/bookings',{**self.data,'commission':0,'status':'PAID_OUT'});self.assertEqual(800,b['commission']);self.assertEqual('PENDING',b['status'])
    def test_profile_report_and_admin_resolution(self):
        self.call(self.client,'/api/reports',{'target_kind':'ARTIST','target_id':2,'reason':'Revisar perfil de demostración'})
        report=self.call(self.admin,'/api/admin')['reports'][0]
        self.assertEqual('ARTIST',report['target_kind'])
        self.fails(lambda:self.call(self.client,'/api/admin/report',{'id':report['id']}),403)
        self.call(self.admin,'/api/admin/report',{'id':report['id']})
        self.assertEqual('RESOLVED',self.call(self.admin,'/api/admin')['reports'][0]['status'])
    def test_public_profile_does_not_include_account_email_or_real_name(self):
        profile=self.call(self.client,'/api/artists/2');self.assertNotIn('email',profile);self.assertNotIn('name',profile)
    def test_injection_stored_as_text(self):
        b=self.call(self.client,'/api/bookings',{**self.data,'title':"'; DROP TABLE users;--"});self.assertEqual(9,self.conn.execute('SELECT count(*) FROM users').fetchone()[0]);self.call(self.client,f"/api/bookings/{b['id']}/messages",{'body':'<script>alert(1)</script>'});self.assertEqual('<script>alert(1)</script>',self.call(self.artist,f"/api/bookings/{b['id']}/messages")[0]['body'])

if __name__=='__main__':unittest.main()
