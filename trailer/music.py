"""Original chiptune score for the Rare Heist trailer, synthesised from scratch (numpy only).
Sections follow timeline.json so every cut lands on a bar; the story hits (caught, undo, clean)
land on the frames the director draws them. Usage: python trailer/music.py out.wav"""
import json,os,sys,wave,numpy as np
SR=44100;HERE=os.path.dirname(os.path.abspath(__file__))
T=json.load(open(os.path.join(HERE,'timeline.json')));BPM=T['bpm'];BEAT=60/BPM;BAR=4*BEAT
sections=[];starts={}
for s in T['scenes']:
    starts[s['name']]=len(sections)*BAR;sections+=[s['name']]*s['bars']
NB=len(sections);L=int((NB*BAR+T['tail'])*SR);mix=np.zeros((L,2))
rng=np.random.default_rng(7)
def mtof(m):return 440*2**((m-69)/12)
def env(n,a=.005,d=.08,s=.6,r=.05):
    e=np.ones(n)*s;na=int(a*SR);nd=int(d*SR);nr=int(r*SR)
    if na:e[:na]=np.linspace(0,1,na)
    e[na:na+nd]=np.linspace(1,s,len(e[na:na+nd]))
    if nr:e[-nr:]*=np.linspace(1,0,min(nr,n))[-len(e[-nr:]):]
    return e
def add(x,at,vol,pan=0.):
    i=int(at*SR)
    if i<0:x=x[-i:];i=0
    j=min(L,i+len(x));x=x[:j-i]*vol;mix[i:j,0]+=x*(1-pan)*.9;mix[i:j,1]+=x*(1+pan)*.9
def pulse(m,dur,duty=.5):
    n=int(dur*SR);t=np.arange(n)/SR;ph=(t*mtof(m))%1;return np.where(ph<duty,1.,-1.)*env(n)
def tri(m,dur):
    n=int(dur*SR);t=np.arange(n)/SR;ph=(t*mtof(m))%1;return (4*np.abs(ph-.5)-1)*env(n,.003,.05,.8,.03)
def pad(ms,dur):
    n=int(dur*SR);t=np.arange(n)/SR;x=np.zeros(n)
    for m in ms:
        for det in (-.07,.07):
            f=mtof(m+det);x+=sum(np.sin(2*np.pi*f*k*t)/k for k in range(1,6))
    return x/len(ms)/4*env(n,.4,.3,.8,.6)
def kick():
    n=int(.28*SR);t=np.arange(n)/SR;f=45+105*np.exp(-t/.03);ph=2*np.pi*np.cumsum(f)/SR;return np.sin(ph)*np.exp(-t/.11)
def boom():
    n=int(1.6*SR);t=np.arange(n)/SR;f=32+90*np.exp(-t/.05);ph=2*np.pi*np.cumsum(f)/SR;return np.tanh(2.5*np.sin(ph)*np.exp(-t/.5))
def snare():
    n=int(.2*SR);t=np.arange(n)/SR;return (rng.uniform(-1,1,n)*np.exp(-t/.05)*.8+np.sin(2*np.pi*190*t)*np.exp(-t/.04)*.6)
def hat(l=.03):
    n=int(l*4*SR);x=np.diff(rng.uniform(-1,1,n+1));return x*np.exp(-np.arange(n)/SR/l)
def tick():
    n=int(.03*SR);t=np.arange(n)/SR;return np.sin(2*np.pi*2400*t)*np.exp(-t/.006)
def crash(l=.45):
    n=int(1.4*SR);x=np.diff(rng.uniform(-1,1,n+1));return x*np.exp(-np.arange(n)/SR/l)
def riser(dur):
    n=int(dur*SR);x=rng.uniform(-1,1,n);k=np.linspace(0,1,n)**2;return np.diff(np.concatenate([[0],x]))*k
def sweep(dur,f0,f1):
    n=int(dur*SR);t=np.arange(n)/SR;f=f0*(f1/f0)**(t/dur);ph=np.cumsum(f)/SR%1;return np.where(ph<.3,1.,-1.)*np.linspace(1,.2,n)
def siren(dur):
    n=int(dur*SR);t=np.arange(n)/SR;f=700+220*np.sin(2*np.pi*3.2*t);ph=np.cumsum(f)/SR%1;return np.where(ph<.5,1.,-1.)*.6*np.exp(-t/.9)
def chord(ms,at,vol=.1,dur=BEAT*.9):
    for m in ms:add(pulse(m,dur,.25),at,vol/len(ms)*2.2)
CH=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]   # Am F C G
BASS=[45,41,48,43]
LEAD=[76,None,74,72,69,None,72,74, 72,None,69,67,65,None,67,69, 67,None,72,76,79,None,76,74, 76,None,74,72,74,None,None,None]
def groove(t0,bar,*,snares=True,hats=8,arp=True,lead=False,up=0,bassvol=.32,kicks=4):
    ch=CH[bar%4];root=BASS[bar%4]
    for k in range(kicks):add(kick(),t0+k*BEAT*4/kicks,.85)
    if snares:
        for k in (1,3):add(snare(),t0+k*BEAT,.42)
    for e in range(hats):add(hat(),t0+e*BAR/hats,.13 if e%2==0 else .08,.2)
    for e in range(8):add(tri(root+(12 if e%2 else 0),BEAT/2*.9),t0+e*BEAT/2,bassvol)
    if arp:
        a=[ch[0],ch[1],ch[2],ch[0]+12]
        for s16 in range(16):add(pulse(a[s16%4]+12+up,BEAT/4*.85,.25),t0+s16*BEAT/4,.075,.35*(1 if s16%2 else -1))
    if lead:
        k=(bar%4)*8
        for e in range(8):
            m=LEAD[k+e]
            if m:add(pulse(m+up,BEAT/2*.95,.5),t0+e*BEAT/2,.11,-.1)
for bar,name in enumerate(sections):
    t0=bar*BAR;local=bar-int(round(starts[name]/BAR));first=local==0;ch=CH[bar%4]
    if name=='hook':   # a clock ticking in the dark, a heartbeat, then the lift into the title
        add(pad([m-12 for m in CH[0]]+[45],BAR+.4),t0,.45)
        for e in range(8):add(tick(),t0+e*BEAT/2,.16 if e%2==0 else .09,.25)
        for k in (0,.75,2,2.75):add(kick(),t0+k*BEAT,.5 if k%1 else .7)
        for e in range(8):add(tri(33,BEAT/2*.8),t0+e*BEAT/2,.22)
        if local==1:add(riser(BAR),t0,.3);add(sweep(BAR*.9,120,900),t0+BAR*.1,.03)
        continue
    if name=='logo':
        if first:add(crash(),t0,.45);add(boom(),t0,.55);chord([57,64,69,72],t0,.16,BAR*.5)
        groove(t0,bar,snares=not first,arp=True,lead=False);continue
    if name=='friend':
        groove(t0,bar,snares=local==1,hats=8,arp=True)
        if local==1:add(crash(.3),t0,.25)
        continue
    if name in('heist1',):
        if first:add(crash(),t0,.3)
        groove(t0,bar,lead=local>=1);continue
    if name=='montage':
        groove(t0,bar,lead=True)
        for h in (0,2):add(kick(),t0+h*BEAT,.5);add(crash(.18),t0+h*BEAT,.18);chord([m+12 for m in ch],t0+h*BEAT,.12,BEAT*.4)
        continue
    if name=='caught':
        if local==0:
            groove(t0,bar,snares=False,arp=True,lead=False,bassvol=.36)
            add(riser(BAR),t0,.22)
        else:  # the flashlight lands: one hit, a siren, the slam, then nothing but a low drone
            add(boom(),t0,.9);add(crash(.6),t0,.45);add(siren(1.2),t0,.08)
            add(kick(),t0+.45,1.);add(crash(.35),t0+.45,.35);add(snare(),t0+.45,.5)
            add(pad([33,40,45],BAR+.3),t0+.5,.4)
        continue
    if name=='heist2':
        if local==0:
            add(sweep(.62,1400,90),t0+.33,.07)            # the undo: five moves spooled back
            for e in range(4):add(tick(),t0+.95+e*BEAT/2,.14)
            add(riser(.9),t0+.95,.2)
        elif local==3:  # CLEAN on the downbeat
            add(crash(),t0,.5);add(boom(),t0,.5);add(kick(),t0,1.);chord([57,64,69,72,76],t0,.2,BAR*.6)
            for e in range(8):add(tri(45+(12 if e%2 else 0),BEAT/2*.9),t0+e*BEAT/2,.2)
        else:
            if local==1:add(crash(),t0,.3)
            groove(t0,bar,lead=True)
        continue
    if name=='grid':
        add(crash(),t0,.3 if local%2==0 else .15);groove(t0,bar,hats=16,lead=True,up=12);continue
    if name=='lasttitle':
        add(crash(),t0,.5);add(boom(),t0,.6);add(tri(33,BAR),t0,.6);add(riser(BAR),t0,.3);add(pad(ch,BAR),t0,.45);continue
    if name=='evolve':
        add(crash(.3),t0,.28);groove(t0,bar,lead=True);continue
    if name=='outro':
        if local<1:
            if first:add(crash(),t0,.4);add(boom(),t0,.45)
            groove(t0,bar,snares=local==1,lead=False)
        else:
            add(pad(CH[0]+[69,72],BAR+1.5),t0,.6);add(crash(),t0,.35);add(kick(),t0,.9);add(tri(33,BAR+1),t0,.5);chord([57,64,69,72],t0,.14,BAR*.6)
        continue
x=np.tanh(mix*1.1);x/=np.abs(x).max()/0.89
fade=int(1.2*SR);x[-fade:]*=np.linspace(1,0,fade)[:,None]
w=wave.open(sys.argv[1],'wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((x*32767).astype(np.int16).tobytes());w.close()
print('music',round(L/SR,2),'s',NB,'bars')
