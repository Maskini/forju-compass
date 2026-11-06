"""Collect official public German sitemap pages. Raw snapshots stay in ignored work/."""
import json, urllib.request, xml.etree.ElementTree as ET, time
from pathlib import Path
from html.parser import HTMLParser
class MainText(HTMLParser):
 def __init__(self): super().__init__(); self.main=False; self.skip=0; self.parts=[]; self.title=[]; self.h1=False
 def handle_starttag(self,t,a):
  if t=='main': self.main=True
  if t in ('script','style','nav'): self.skip+=1
  if t=='h1':self.h1=True
 def handle_endtag(self,t):
  if t=='main':self.main=False
  if t in ('script','style','nav'): self.skip=max(0,self.skip-1)
  if t=='h1':self.h1=False
 def handle_data(self,d):
  if self.main and not self.skip and d.strip():
   self.parts.append(d.strip())
   if self.h1:self.title.append(d.strip())
def get(url):
 return urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ForJuCompass-public-index/1.0'}),timeout=30).read().decode()
root=ET.fromstring(get('https://forju.at/sitemap.xml'));ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
rows=[]
for item in root.findall('s:url',ns):
 url=item.find('s:loc',ns).text
 if not (url=='https://forju.at/de' or url.startswith('https://forju.at/de/')):continue
 try:
  p=MainText();p.feed(get(url));txt='\n'.join(p.parts)
  if len(txt)<100:raise ValueError('No main text')
  rows.append({'url':url,'title':' '.join(p.title) or url.split('/')[-1],'lastModified':item.find('s:lastmod',ns).text,'text':txt})
  print(url,len(txt))
 except Exception as e:print('FAILED',url,type(e).__name__)
 time.sleep(.2)
Path('work/public-crawl').mkdir(parents=True,exist_ok=True)
Path('work/public-crawl/pages.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
print('Collected',len(rows),'public pages')
