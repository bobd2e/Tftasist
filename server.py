"""TFT Advisor local server: password protected admin and cached dataset."""
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlsplit, parse_qs
import json, os, secrets, hashlib, hmac, time, mimetypes, threading, webbrowser, sys

ROOT=Path(__file__).resolve().parent
WEB=ROOT/'web'
DATA=ROOT/'data'
DATA.mkdir(exist_ok=True)
CACHE=DATA/'ko_kr.json'
REMOTE='https://raw.communitydragon.org/latest/cdragon/tft/ko_kr.json'
PASSWORD=os.environ.get('TFT_ADMIN_PASSWORD') or secrets.token_urlsafe(12)
SECRET=secrets.token_bytes(32)
SESSIONS={}
LOCK=threading.RLock()
MAX_UPLOAD=40*1024*1024


def validate(raw):
    if not isinstance(raw,dict):raise ValueError('JSON 객체가 아닙니다')
    sets=raw.get('setData') or []
    target=next((s for s in sets if str(s.get('number'))=='18'),None)
    if not target:target=(raw.get('sets') or {}).get('18')
    if not isinstance(target,dict) or not isinstance(target.get('champions'),list) or not isinstance(target.get('traits'),list):
        raise ValueError('세트 18 champions/traits가 포함된 CommunityDragon JSON이 아닙니다')
    return {'champions':len(target['champions']),'traits':len(target['traits']),'items':len(raw.get('items') or [])}


def update_remote():
    req=Request(REMOTE,headers={'User-Agent':'TFTAdvisorLocal/2.0'})
    with urlopen(req,timeout=35) as response:
        payload=response.read(MAX_UPLOAD+1)
    if len(payload)>MAX_UPLOAD:raise ValueError('데이터가 최대 용량을 초과했습니다')
    info=validate(json.loads(payload))
    tmp=CACHE.with_suffix('.tmp');tmp.write_bytes(payload);tmp.replace(CACHE)
    return info

class Handler(BaseHTTPRequestHandler):
    def send_bytes(self,data,code=200,ctype='application/json; charset=utf-8',headers=None):
        self.send_response(code);self.send_header('Content-Type',ctype);self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('X-Frame-Options','DENY');self.send_header('Referrer-Policy','no-referrer')
        for k,v in (headers or {}).items():self.send_header(k,v)
        self.end_headers();self.wfile.write(data)
    def reply(self,obj,code=200,headers=None):self.send_bytes(json.dumps(obj,ensure_ascii=False).encode(),code,headers=headers)
    def cookie(self):
        cookies=self.headers.get('Cookie','')
        for item in cookies.split(';'):
            k,sep,v=item.strip().partition('=')
            if k=='tft_admin' and sep:return v
        return ''
    def auth(self):
        sid=self.cookie()
        with LOCK:
            expiry=SESSIONS.get(sid,0)
            if expiry>time.time():return True
            SESSIONS.pop(sid,None)
        return False
    def read_json(self):
        n=int(self.headers.get('Content-Length','0'))
        if n<=0 or n>MAX_UPLOAD:raise ValueError('잘못된 요청 크기')
        return json.loads(self.rfile.read(n))
    def do_GET(self):
        path=urlsplit(self.path).path
        if path=='/api/data':
            if not CACHE.exists():
                try:
                    with LOCK:
                        if not CACHE.exists():update_remote()
                except Exception as e:return self.reply({'error':'데이터를 불러오지 못했습니다: '+str(e)},503)
            return self.send_bytes(CACHE.read_bytes())
        if path=='/api/admin/status':
            if not self.auth():return self.reply({'error':'인증 필요'},401)
            info=None
            if CACHE.exists():
                try:info=validate(json.loads(CACHE.read_bytes()))
                except Exception:pass
            return self.reply({'ready':bool(info),'counts':info,'size':CACHE.stat().st_size if CACHE.exists() else 0,'updated':CACHE.stat().st_mtime if CACHE.exists() else None})
        if path in ('/admin','/admin/'):
            if not self.auth():return self.redirect('/login')
            return self.file('admin.html')
        if path=='/login':
            if self.auth():return self.redirect('/admin')
            return self.file('login.html')
        if path in ('/','/index.html'):return self.file('index.html')
        self.reply({'error':'찾을 수 없음'},404)
    def redirect(self,url):self.send_bytes(b'',302,headers={'Location':url})
    def file(self,name):self.send_bytes((WEB/name).read_bytes(),ctype='text/html; charset=utf-8')
    def do_POST(self):
        path=urlsplit(self.path).path
        if path=='/api/admin/login':
            try:body=self.read_json()
            except Exception:return self.reply({'error':'요청 형식 오류'},400)
            if not hmac.compare_digest(str(body.get('password','')).encode(),PASSWORD.encode()):
                time.sleep(.3);return self.reply({'error':'비밀번호가 틀렸습니다'},401)
            sid=secrets.token_urlsafe(32)
            with LOCK:SESSIONS[sid]=time.time()+3600*8
            return self.reply({'ok':True},headers={'Set-Cookie':f'tft_admin={sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800'})
        if path=='/api/admin/logout':
            with LOCK:SESSIONS.pop(self.cookie(),None)
            return self.reply({'ok':True},headers={'Set-Cookie':'tft_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'})
        if not self.auth():return self.reply({'error':'인증 필요'},401)
        if self.headers.get('Origin') not in (None,f'http://{self.headers.get("Host")}'):
            return self.reply({'error':'요청 출처가 일치하지 않습니다'},403)
        if path=='/api/admin/refresh':
            try:
                with LOCK:info=update_remote()
                return self.reply({'ok':True,'counts':info})
            except Exception as e:return self.reply({'error':str(e)},502)
        if path=='/api/admin/upload':
            try:
                raw=self.read_json();info=validate(raw)
                payload=json.dumps(raw,ensure_ascii=False,separators=(',',':')).encode()
                if len(payload)>MAX_UPLOAD:raise ValueError('파일이 너무 큽니다')
                with LOCK:
                    tmp=CACHE.with_suffix('.tmp');tmp.write_bytes(payload);tmp.replace(CACHE)
                return self.reply({'ok':True,'counts':info})
            except Exception as e:return self.reply({'error':str(e)},400)
        self.reply({'error':'찾을 수 없음'},404)

def main():
    port=int(os.environ.get('TFT_PORT','8765'))
    server=ThreadingHTTPServer(('127.0.0.1',port),Handler)
    print('\nTFT Advisor 실행됨')
    print(f'일반 사용자: http://127.0.0.1:{port}/')
    print(f'관리자 로그인: http://127.0.0.1:{port}/login')
    print(f'이번 실행의 관리자 비밀번호: {PASSWORD}')
    print('종료: Ctrl+C\n',flush=True)
    if '--no-browser' not in sys.argv:threading.Timer(.8,lambda:webbrowser.open(f'http://127.0.0.1:{port}/')).start()
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
if __name__=='__main__':main()
