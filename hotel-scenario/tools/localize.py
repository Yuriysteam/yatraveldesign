#!/usr/bin/env python3
"""Localize a browser-exported Travel DOM; never synthesize product markup."""
import concurrent.futures,hashlib,json,re,sys,urllib.request,urllib.parse,mimetypes
from pathlib import Path
from html.parser import HTMLParser
from html import unescape
raw=Path(sys.argv[1]);out=Path(sys.argv[2]);base=sys.argv[3];out.mkdir(parents=True,exist_ok=True)
html=raw.read_text()
# HTML picture media queries use the OS scheme even with theme_light on <html>.
# Keep the source assets that belong to the product's light theme.
html=re.sub(r'<source\b[^>]*\bmedia=(["\'])[^"\']*prefers-color-scheme:\s*dark[^"\']*\1[^>]*>','',html,flags=re.I)
html=re.sub(r'(<source\b[^>]*\bmedia=)(["\'])[^"\']*prefers-color-scheme:\s*light[^"\']*\2',r'\1"all"',html,flags=re.I)
seen={};failures=[]
def absolute(u,origin):
 u=unescape(u.strip()).strip("\"' ")
 if re.match(r'^[a-zA-Z0-9.-]+\.(?:net|ru|com|org)/',u):u='https://'+u
 if not u or u.startswith(('data:','blob:','#')):return None
 return urllib.parse.urljoin(origin,u)
def add(u,origin):
 u=absolute(u,origin)
 if u and u.startswith('https://') and u not in seen:seen[u]=None
 return u
class Resources(HTMLParser):
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t in ('img','source'):
   if a.get('src'):add(a['src'],base)
   for item in a.get('srcset','').split(','):
    if item.strip():add(item.strip().split()[0],base)
  if t=='link' and a.get('rel')=='stylesheet':add(a.get('href',''),base)
Resources().feed(html)
for u in re.findall(r'url\(\s*["\']?([^\)"\']+)',html):add(u,base)
def fetch(u):
 try:
  r=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=30);body=r.read();mime=r.headers.get_content_type();ext=mimetypes.guess_extension(mime) or Path(urllib.parse.urlparse(u).path).suffix or '.bin'
  if ext=='.jpe':ext='.jpg'
  name='assets/'+hashlib.sha256(u.encode()).hexdigest()[:20]+ext
  return u,(name,body,mime)
 except Exception as e:return u,{'error':str(e)}
while any(v is None for v in seen.values()):
 pending=[u for u,v in seen.items() if v is None]
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  for u,result in pool.map(fetch,pending):
   if isinstance(result,dict):failures.append({'url':u,**result});seen[u]=False;continue
   seen[u]=result
   if result[2]=='text/css':
    for match in re.findall(r'url\(\s*["\']?([^\)"\']+)',result[1].decode(errors='replace')):add(match,u)
def rewrite_css(s,origin,in_css=False):
 def repl(m):
  u=absolute(m[2],origin);v=seen.get(u)
  if v:return 'url('+('../'+v[0] if in_css else './'+v[0])+')'
  return m[0] if not u else 'url()'
 return re.sub(r'url\(\s*(["\']?)([^\)"\']+)\1\s*\)',repl,s)
for u,v in seen.items():
 if not v:continue
 name,body,mime=v
 if mime=='text/css':body=rewrite_css(body.decode(),u,True).encode()
 p=out/name;p.parent.mkdir(exist_ok=True);p.write_bytes(body)
html=re.sub(r'<(script|iframe|noscript)\b[^>]*>[\s\S]*?</\1>','',html,flags=re.I)
html=re.sub(r'<meta\b[^>]*\bcontent=["\'][^"\']*(?:token=|offerId=|protoLabel=|addInfo=)[^"\']*["\'][^>]*>','',html,flags=re.I)
html=re.sub(r'<input\b[^>]*type=["\']hidden["\'][^>]*>','',html,flags=re.I)
html=re.sub(r'<base\b[^>]*>','',html,flags=re.I)
html=re.sub(r'<link\b[^>]*rel=["\'](?:preload|prefetch|modulepreload|apple-touch-icon|icon|alternate|canonical)["\'][^>]*>','',html,flags=re.I)
html=re.sub(r'<meta\b[^>]*http-equiv=["\']Content-Security-Policy["\'][^>]*>','',html,flags=re.I)
def attr(m):
 key,q,value=m[1],m[2],m[3];u=absolute(value,base);v=seen.get(u)
 if v:return key+'='+q+'./'+v[0]+q
 if key.lower()=='href':return key+'='+q+('#' if not value.startswith('#') else value)+q
 if key.lower() in ('action','formaction'):return key+'='+q+'#'+q
 return m[0] if not u else key+'='+q+q
html=re.sub(r'\b(src|href|poster|action|formaction)\s*=\s*(["\'])(.*?)\2',attr,html,flags=re.I)
def srcset(m):
 vals=[]
 for c in m[2].split(','):
  bits=c.strip().split()
  if not bits:continue
  v=seen.get(absolute(bits[0],base))
  if v:vals.append('./'+v[0]+' '+(' '.join(bits[1:])))
 return 'srcset='+m[1]+', '.join(vals)+m[1]
html=re.sub(r'(?:srcset|imagesrcset)=(["\'])(.*?)\1',srcset,html,flags=re.I)
html=re.sub(r'\son\w+=(["\']).*?\1','',html,flags=re.I)
html=rewrite_css(html,base)
html=re.sub(r'(<html\b[^>]*class=["\'])([^"\']*)(["\'])',lambda m:m[1]+re.sub(r'theme_(system|dark|light)','',m[2])+' theme_light'+m[3],html,count=1)
html=html.replace('name="color-scheme" content="light dark"','name="color-scheme" content="light"')
html=html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="default-src \'self\' data:; script-src \'none\'; style-src \'self\' \'unsafe-inline\'; font-src \'self\' data:; img-src \'self\' data:; connect-src \'none\'; form-action \'none\'; frame-src \'none\'">',1)
(out/'index.html').write_text(html)
from datetime import datetime,timezone
manifest=dict(sourceUrl=base,capturedAt=datetime.now(timezone.utc).isoformat(),type='rendered-public-html',resourceCount=sum(bool(v) for v in seen.values()),failures=failures)
(out/'source.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in manifest.items() if k!='failures'},ensure_ascii=False));print('failed resources:',len(failures))
