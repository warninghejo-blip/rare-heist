"""Original chiptune score for the Rare Heist trailer, synthesised from scratch (numpy only).
Sections follow timeline.json so every cut lands on a bar. Usage: python3 music.py out.wav"""
import json,sys,wave,numpy as np
SR=44100;T=json.load(open(__file__.rsplit('/',1)[0]+'/timeline.json'));BPM=T['bpm'];BEAT=60/BPM;BAR=4*BEAT
sections=[];b=0
for s in T['scenes']:sections+=[s['name']]*s['bars'];b+=s['bars']
NB=len(sections);L=int((NB*BAR+1.6)*SR);mix=np.zeros((L,2))
rng=np.random.default_rng(7)
def mtof(m):return 440*2**((m-69)/12)
def env(n,a=.005,d=.08,s=.6,r=.05):
    t=np.arange(n)/SR;e=np.ones(n)*s;na=int(a*SR);nd=int(d*SR);nr=int(r*SR)
    e[:na]=np.linspace(0,1,na) if na else 1;e[na:na+nd]=np.linspace(1,s,len(e[na:na+nd]));
    if nr:e[-nr:]*=np.linspace(1,0,min(nr,n))[-len(e[-nr:]):]
    return e
def add(x,at,vol,pan=0.):
    i=int(at*SR);j=min(L,i+len(x));x=x[:j-i]*vol;mix[i:j,0]+=x*(1-pan)*.9;mix[i:j,1]+=x*(1+pan)*.9
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
def snare():
    n=int(.2*SR);t=np.arange(n)/SR;return (rng.uniform(-1,1,n)*np.exp(-t/.05)*.8+np.sin(2*np.pi*190*t)*np.exp(-t/.04)*.6)
def hat(l=.03):
    n=int(l*4*SR);x=np.diff(rng.uniform(-1,1,n+1));return x*np.exp(-np.arange(n)/SR/l)
def crash():
    n=int(1.4*SR);x=np.diff(rng.uniform(-1,1,n+1));return x*np.exp(-np.arange(n)/SR/.45)
def riser(dur):
    n=int(dur*SR);x=rng.uniform(-1,1,n);k=np.linspace(0,1,n)**2;x=np.diff(np.concatenate([[0],x]))*k;return x
def siren(dur):
    n=int(dur*SR);t=np.arange(n)/SR;f=700+220*np.sin(2*np.pi*2.2*t);ph=np.cumsum(f)/SR%1;return np.where(ph<.5,1.,-1.)*.6
CH=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]   # Am F C G
BASS=[45,41,48,43]
LEAD=[76,None,74,72,69,None,72,74, 72,None,69,67,65,None,67,69, 67,None,72,76,79,None,76,74, 76,None,74,72,74,None,None,None]
full={'logo','friend','wallet','heist','evolve','fortify','grid','outro','mobile','caught'}
for bar,name in enumerate(sections):
    t0=bar*BAR;ch=CH[bar%4];root=BASS[bar%4];first=bar==0 or sections[bar-1]!=name
    if name=='intro':
        add(pad([m-12 for m in ch]+[ch[0]],BAR+.4),t0,.5)
        for k in (0,2):add(kick(),t0+k*BEAT,.55)
        if bar==1:add(riser(BAR),t0,.25)
        continue
    if name=='lasttitle':
        add(crash(),t0,.5);add(kick(),t0,1.);add(tri(33,BAR),t0,.6);add(riser(BAR),t0,.3);add(pad(ch,BAR),t0,.45);continue
    if name=='inspect':
        add(pad(ch,BAR+.2),t0,.35)
        for e in range(8):add(hat(.02),t0+e*BEAT/2,.12)
        for s16 in range(16):add(pulse(ch[s16%3]+12,BEAT/4*.9,.25),t0+s16*BEAT/4,.07,.3*(1 if s16%2 else -1))
        if bar==len(sections)-1 or sections[bar+1]!='inspect':add(riser(BAR),t0,.18)
        continue
    if name=='outro' and bar>=len(sections)-2:
        if bar==len(sections)-1:add(pad(CH[0]+[69,72],BAR+1.5),t0,.6);add(crash(),t0,.35);add(kick(),t0,.9);add(tri(33,BAR+1),t0,.5)
        else:
            for k in range(4):add(kick(),t0+k*BEAT,.8);add(pulse(ch[0]+12,BEAT*.8,.5),t0+k*BEAT,.1)
        continue
    # groove
    if first or name in('evolve',) or (name=='grid' and bar%2==0):add(crash(),t0,.32)
    for k in range(4):add(kick(),t0+k*BEAT,.85)
    if name!='mobile':
        for k in (1,3):add(snare(),t0+k*BEAT,.42)
    hats=16 if name=='grid' else 8
    for e in range(hats):add(hat(),t0+e*BAR/hats,.13 if e%2==0 else .08,.2)
    for e in range(8):add(tri(root+(12 if e%2 else 0),BEAT/2*.9),t0+e*BEAT/2,.32)
    arp=[ch[0],ch[1],ch[2],ch[0]+12];up=12 if name=='grid' else 0
    for s16 in range(16):add(pulse(arp[s16%4]+12+up,BEAT/4*.85,.25),t0+s16*BEAT/4,.075,.35*(1 if s16%2 else -1))
    if name=='caught':add(siren(BAR),t0,.07)
    if name in('heist','evolve','grid'):
        k=(bar%4)*8
        for e in range(8):
            m=LEAD[k+e]
            if m:add(pulse(m+(12 if name=='grid' else 0),BEAT/2*.95,.5),t0+e*BEAT/2,.11,-.1)
x=np.tanh(mix*1.1);x/=np.abs(x).max()/0.89
fade=int(1.2*SR);x[-fade:]*=np.linspace(1,0,fade)[:,None]
w=wave.open(sys.argv[1],'wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((x*32767).astype(np.int16).tobytes());w.close()
print('music',round(L/SR,2),'s',NB,'bars')
