"""Original Compass demo music; stdlib only, no recordings or external services.
No third-party samples or melodies are used. Supply an output WAV path
and duration (seconds).
"""
from array import array
from math import sin, cos, pi, exp, sqrt, tanh
from pathlib import Path
import random, sys, wave

out=Path(sys.argv[1]); duration=float(sys.argv[2]) if len(sys.argv)>2 else 40
sr=44100; total=int((duration+.4)*sr); L=array('f',[0])*total; R=array('f',[0])*total
beat=60/112; rng=random.Random(4707)
def add(start,length,fn,amp=1,pan=0):
    start=int(start*sr); n=min(int(length*sr),total-start)
    if start<0 or n<=0:return
    gl=sqrt((1-pan)/2)*amp;gr=sqrt((1+pan)/2)*amp
    for j in range(n):
        v=fn(j/sr);L[start+j]+=v*gl;R[start+j]+=v*gr

def note(t,midi,length,amp=.12,pan=0,kind='keys'):
    f=440*2**((midi-69)/12)
    def sound(x):
        attack=min(1,x/.009);release=min(1,max(0,(length-x)/.15))
        if kind=='bass':return attack*release*exp(-x*2.8)*(sin(2*pi*f*x)+.2*sin(4*pi*f*x))
        env=attack*release*exp(-x*3.1)
        return env*(sin(2*pi*f*x)+.24*exp(-x*5)*sin(4*pi*f*x)+.10*exp(-x*9)*sin(6*pi*f*x))
    add(t,length,sound,amp,pan)
    if kind=='keys':add(t+.17,length,sound,amp*.16,-pan)

# D major / B minor / G major / A major, with a gentle rising original motif.
chords=[(50,[62,66,69,73]),(47,[59,62,66,69]),(43,[59,62,67,71]),(45,[61,64,69,73])]
bar=0
while bar*4*beat<duration:
    root,notes=chords[bar%4];start=bar*4*beat
    for i,n in enumerate(notes):note(start+i*.018,n,beat*2.7,.085,(i-1.5)*.22)
    order=[0,2,1,3,2,1,3,2]
    for k,idx in enumerate(order):note(start+k*beat/2,notes[idx]+12,beat*.8,.045 if k%2 else .065,(-.25 if k%2 else .25))
    for b in [0,1.5,2,3.5]:note(start+b*beat,root,beat*.75,.18,0,'bass')
    # Rounded kick, restrained clap and closed hats. All synthesized, no samples.
    for b in range(4):
        t=start+b*beat
        add(t,.22,lambda x:sin(2*pi*(47*x+5.8*(1-exp(-x*30))))*exp(-x*20),.25)
        if b%2:
            add(t,.11,lambda x:(rng.random()*2-1)*exp(-x*38)*(.7+.3*sin(2*pi*1700*x)),.065)
        for half in [0,.5]:add(t+half*beat,.045,lambda x:(rng.random()*2-1)*exp(-x*105),.035,-.18 if half else .18)
    bar+=1
# A soft closing tonic resolves the cue instead of cutting a beat abruptly.
for i,n in enumerate([62,66,69,74]):note(duration-1.5+i*.028,n,1.5,.10,(i-1.5)*.15)
peak=max(max(abs(v) for v in L),max(abs(v) for v in R),.001);scale=.69/peak
pcm=array('h')
for i in range(int(duration*sr)):
    fade=min(1,i/(sr*.35),max(0,(duration-i/sr)/1.1))
    pcm.append(int(tanh(L[i]*scale)*fade*32760));pcm.append(int(tanh(R[i]*scale)*fade*32760))
out.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(out),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes(pcm.tobytes())
print('Original stereo score:',out, duration,'seconds')
