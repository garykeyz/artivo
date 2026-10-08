import tempfile
import unittest
from pathlib import Path
from artivo import db,seed,social,api
from artivo.security import APIError

class SocialTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();db.DB_PATH=Path(self.temp.name)/'social.sqlite3';db.init()
        self.conn=db.connect();seed.seed(self.conn);social.seed_posts(self.conn)
        self.client=self.conn.execute('SELECT * FROM users WHERE id=1').fetchone();self.artist=self.conn.execute('SELECT * FROM users WHERE id=2').fetchone();self.admin=self.conn.execute('SELECT * FROM users WHERE id=9').fetchone()
        self.post_id=self.conn.execute('SELECT id FROM posts WHERE artist_id=2').fetchone()[0]
    def tearDown(self):self.conn.close();self.temp.cleanup()
    def call(self,user,path,data=None,params=None):return api.dispatch(self.conn,'POST' if data is not None else 'GET',path,user,data or {},params or {})
    def test_feed_uses_persisted_posts(self):
        feed=self.call(self.client,'/api/feed');self.assertEqual(6,len(feed['posts']));self.assertEqual(0,feed['posts'][0]['like_count']);self.assertFalse(feed['has_more'])
    def test_demo_seed_is_idempotent(self):
        social.seed_posts(self.conn);self.assertEqual(6,self.conn.execute('SELECT count(*) FROM posts').fetchone()[0])
    def test_only_artists_can_publish(self):
        data={'caption':'Nueva sesión de jazz','media_url':'https://example.com/piano.jpg','media_type':'IMAGE'}
        with self.assertRaises(APIError):self.call(self.client,'/api/posts',data)
        p=self.call(self.artist,'/api/posts',{**data,'artist_id':3});self.assertEqual(2,p['artist_id'])
    def test_video_requires_direct_https_file(self):
        for url in ['javascript:alert(1)','http://example.com/a.mp4','https://youtube.com/watch?v=demo']:
            with self.assertRaises(APIError):self.call(self.artist,'/api/posts',{'caption':'Video','media_url':url,'media_type':'VIDEO'})
        p=self.call(self.artist,'/api/posts',{'caption':'Video','media_url':'https://example.com/performance.mp4','media_type':'VIDEO'});self.assertEqual('VIDEO',p['media_type'])
    def test_like_toggle_and_user_isolation(self):
        path=f'/api/posts/{self.post_id}/like';p=self.call(self.client,path,{});self.assertEqual(1,p['like_count']);self.assertTrue(p['liked']);self.assertFalse(self.call(self.artist,f'/api/posts/{self.post_id}')['liked']);p=self.call(self.client,path,{});self.assertEqual(0,p['like_count'])
    def test_saved_feed(self):
        self.assertEqual([],self.call(self.client,'/api/feed',params={'mode':'saved'})['posts']);self.call(self.client,f'/api/posts/{self.post_id}/save',{});self.assertEqual(1,len(self.call(self.client,'/api/feed',params={'mode':'saved'})['posts']))
    def test_following_feed_and_self_follow(self):
        self.call(self.client,f'/api/posts/{self.post_id}/follow',{});self.assertEqual(1,len(self.call(self.client,'/api/feed',params={'mode':'following'})['posts']))
        with self.assertRaises(APIError):self.call(self.artist,f'/api/posts/{self.post_id}/follow',{})
    def test_comments_validation_and_author(self):
        path=f'/api/posts/{self.post_id}/comment'
        with self.assertRaises(APIError):self.call(self.client,path,{'body':' '})
        self.call(self.client,path,{'body':'¡Excelente sesión!'});comments=self.call(self.client,f'/api/posts/{self.post_id}/comments');self.assertEqual('Casa Tropical',comments[0]['name']);self.assertEqual(1,self.call(self.client,f'/api/posts/{self.post_id}')['comment_count'])
    def test_suspended_artist_hidden(self):
        self.conn.execute('UPDATE users SET suspended=1 WHERE id=2');self.assertEqual(5,len(self.call(self.client,'/api/feed')['posts']))
        with self.assertRaises(APIError):self.call(self.client,f'/api/posts/{self.post_id}')
    def test_post_report(self):
        self.call(self.client,'/api/reports',{'target_kind':'POST','target_id':self.post_id,'reason':'Reporte de prueba'});report=self.call(self.admin,'/api/admin')['reports'][0];self.assertEqual('POST',report['target_kind']);self.call(self.admin,'/api/admin/report',{'id':report['id']});self.assertEqual('RESOLVED',self.call(self.admin,'/api/admin')['reports'][0]['status'])
    def test_pagination_does_not_repeat_posts(self):
        for i in range(10):self.call(self.artist,'/api/posts',{'caption':f'Sesión {i}','media_url':'https://example.com/a.jpg','media_type':'IMAGE'})
        first=self.call(self.client,'/api/feed');second=self.call(self.client,'/api/feed',params={'offset':str(first['next_offset'])});self.assertTrue(first['has_more']);self.assertEqual(12,len(first['posts']));self.assertEqual(4,len(second['posts']));self.assertFalse(set(p['id'] for p in first['posts'])&set(p['id'] for p in second['posts']))
    def test_invalid_filter(self):
        with self.assertRaises(APIError):self.call(self.client,'/api/feed',params={'mode':'private'})

if __name__=='__main__':unittest.main()
