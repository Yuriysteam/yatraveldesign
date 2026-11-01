#!/usr/bin/env python3
"""Reuse the genuine compiled UIKit CSS and brand assets in the HTML snapshot."""
from pathlib import Path
from html.parser import HTMLParser
import re,json,shutil
root=Path(__file__).resolve().parents[1];home=root/'01-home/index.html';out=root/'catalog';out.mkdir(exist_ok=True)
class Styles(HTMLParser):
 def __init__(self):super().__init__();self.inside=False;self.current='';self.result=[]
 def handle_starttag(self,t,a):
  if t=='style':self.inside=True;self.current=''
 def handle_data(self,d):
  if self.inside:self.current+=d
 def handle_endtag(self,t):
  if t=='style' and self.inside:self.result.append(self.current);self.inside=False
parser=Styles();parser.feed(home.read_text());css='\n'.join(parser.result).replace('./assets/','../01-home/assets/')
(out/'uikit.css').write_text(css)
for name in ['8e3c82ec26b55fc0b287.svg','a9ec8021c6460b8813f2.svg','791438e4d6403eec520e.svg']:
 source=root/'03-hotel/assets'/name
 if source.exists():shutil.copy2(source,out/name)
source=json.loads((root/'01-home/source.json').read_text());(out/'source.json').write_text(json.dumps({'source':'../01-home/index.html','capturedAt':source['capturedAt'],'kind':'compiled Travel UIKit CSS, theme tokens and fonts','buttonClasses':'WvMZr, -ZlQV, mR5dx, dsupm, jNuum','fontFamily':'YS Text / YS Display'},ensure_ascii=False,indent=2))
print('UIKit CSS, tokens and brand assets prepared')
