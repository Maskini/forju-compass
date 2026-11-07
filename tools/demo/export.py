"""Edit genuine browser screencast frames; shorten waits, add camera moves and music.
Usage: FFMPEG=/path/to/ffmpeg python3 tools/demo/export.py TAKE_DIR main|project MUSIC.wav
No web service or production dependency is used. Raw answer pixels remain unchanged.
"""
from pathlib import Path
import bisect,itertools,json,os,subprocess,sys
root=Path(__file__).resolve().parents[2]; take=Path(sys.argv[1]).resolve(); kind=sys.argv[2]; music=Path(sys.argv[3]).resolve()
a=json.loads((take/'take.json').read_text()); marks=a['marks']; frames=sorted(a['frames']); times=[f[0] for f in frames]
if kind=='main':
    name='forju-compass-demo-de'
    edl=[('start','opened',2),('opened','answer0',2),('answer0','read0',14),('read0','answer1',2.5),('answer1','read1',7),('read1','link',.5),('source','contact',2),('contact','end',6)]
    keys=[(0,1,1,.3),(1.3,1,1,.3),(3,1.16,1,1),(4,1.16,1,1),(5,1.32,1,.28),(17.4,1.32,1,.28),(18.7,1.16,1,1),(20.5,1.16,1,1),(21.5,1.32,1,.28),(27.4,1.32,1,.28),(27.8,1.1,1,.6),(28,1,.5,.5),(29.8,1,.5,.5),(31,1.26,.5,.54),(36,1.26,.5,.54)]
    chapters=[(0,4,'01  Frage stellen'),(4,18,'02  Antworten entdecken'),(18,28,'03  Im Gespräch bleiben'),(28,36,'04  Bei ForJu weiterlesen')]
    poster='answer0.png'
else:
    name='forju-compass-projekt-de'
    edl=[('start','opened',1.5),('opened','answer',2),('answer','prefill',5.5),('prefill','edited',4),('edited','closed',3),('closed','resumed',3),('resumed','plan',3.5),('plan','resources',3),('resources','impact',3),('impact','review',2),('review','returned',7.5),('returned','end',2)]
    keys=[(0,1,1,.5),(1.5,1.1,1,1),(3.5,1.25,1,.3),(7.5,1.25,1,.3),(8.7,1,.5,.5),(10,1.03,.52,.5),(15,1.03,.52,.5),(16,1,1,.5),(18,1,1,.5),(20,1.03,.5,.5),(30.5,1.03,.5,.5),(32,1.02,.5,.5),(37,1.02,.5,.5),(38,1,.5,.5),(40,1,.5,.5)]
    chapters=[(0,9,'01  Eine Idee vorstellen'),(9,16,'02  Angaben aus dem Chat'),(16,30.5,'03  Angaben fortsetzen'),(30.5,40,'04  Projekt überprüfen')]
    poster='project.png'
selected=[]
for start,end,duration in edl:
    n=round(duration*30)
    selected.extend(frames[max(0,bisect.bisect_right(times,marks[start]+(marks[end]-marks[start])*i/n)-1)][1] for i in range(n))
lines=['ffconcat version 1.0']
for f,g in itertools.groupby(selected):lines += [f"file '{f}'",'option framerate 30',f'duration {len(list(g))/30:.8f}']
lines += [f"file '{selected[-1]}'",'option framerate 30'];(take/'edit.ffconcat').write_text('\n'.join(lines)+'\n')
def curve(col):
    terms=[str(keys[0][col])]
    for before,after in zip(keys,keys[1:]):
        delta=after[col]-before[col]
        if delta:terms.append(f'({delta:.6f})*(1-cos(PI*clip((on-{30*before[0]:.3f})/{30*(after[0]-before[0]):.3f},0,1)))/2')
    return '+'.join(terms)
font=os.environ.get('DEMO_FONT','/System/Library/Fonts/Supplemental/Arial Bold.ttf')
box_y,box_w,heading_size = (135,790,34) if kind=='main' else (270,505,28)
filters=[f"fps=30,zoompan=z='{curve(1)}':x='(iw-iw/zoom)*({curve(2)})':y='(ih-ih/zoom)*({curve(3)})':d=1:s=2560x1600:fps=30,format=yuv420p",
f'drawbox=x=28:y=ih-{box_y}:w={box_w}:h=115:color=0xFFF8F1@0.96:t=fill',
f'drawbox=x=28:y=ih-{box_y}:w=6:h=115:color=0xA61B66:t=fill',
f"drawtext=fontfile='{font}':text='Website-Vorschau · ForJu Compass':x=54:y=h-{box_y-71}:fontsize=21:fontcolor=0x755963"]
for start,end,label in chapters:
    filters.append(f"drawtext=fontfile='{font}':text='{label}':x=54:y=h-{box_y-22}:fontsize={heading_size}:fontcolor=0x6F174A:enable='gte(t,{start})*lt(t,{end})'")
out=root/'public/demos';out.mkdir(exist_ok=True);ff=os.environ.get('FFMPEG','ffmpeg');duration=len(selected)/30
cmd=[ff,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(take/'edit.ffconcat'),'-i',str(music),'-vf',','.join(filters),'-af',f'loudnorm=I=-21:TP=-2:LRA=8,afade=t=in:d=0.3,afade=t=out:st={duration-1.2}:d=1.2','-t',str(duration),'-c:v','libx264','-preset','fast','-crf','17','-threads','4','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart','-metadata','title=ForJu Compass – Website-Vorschau',str(out/(name+'.mp4'))]
subprocess.run(cmd,check=True)
subprocess.run([ff,'-hide_banner','-loglevel','error','-y','-i',str(take/poster),'-vf','scale=1440:900','-frames:v','1',str(out/(name+'.jpg'))],check=True)
(take/'edit.json').write_text(json.dumps({'duration':duration,'edl':edl,'camera':keys,'chapters':chapters,'music':'original locally generated procedural score'},indent=2))
print(name,duration,'seconds, stereo music,', (out/(name+'.mp4')).stat().st_size,'bytes')
