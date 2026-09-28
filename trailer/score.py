"""Original score for the Rare Heist trailer (trailer/cut.html), synthesised from scratch (numpy only).
120 BPM, so a bar is 2 s and every cut in cut-timeline.js lands on a beat. The arc: a clock and a flashlight hum in the
dark, a drop on the reveal, a stealth groove, a power-down on the blackout, one hit and near silence on CAUGHT, a tape
rewind on UNDO, the release on CLEAN, and a triumphant close on the title. Usage: python trailer/score.py out.wav"""
import json,os,sys,wave,numpy as np
HERE=os.path.dirname(os.path.abspath(__file__))
src=open(os.path.join(HERE,'cut-timeline.js'),encoding='utf-8').read();CUT=json.loads(src[src.index('{'):src.rindex('}')+1])
SR=44100;BPM=CUT['bpm'];BEAT=60/BPM;BAR=4*BEAT;TOTAL=CUT['total'];L=int((TOTAL+.5)*SR);mix=np.zeros((L,2));rng=np.random.default_rng(11)
def mtof(m):return 440*2**((m-69)/12)
def env(n,a=.005,d=.08,s=.6,r=.05):
    e=np.ones(n)*s;na=min(n,int(a*SR));nd=int(d*SR);nr=min(n,int(r*SR))
    if na:e[:na]=np.linspace(0,1,na)
    seg=e[na:na+nd];e[na:na+nd]=np.linspace(1,s,len(seg))
    if nr:e[-nr:]*=np.linspace(1,0,nr)
    return e
GAIN=1.0
def add(x,at,vol,pan=0.):
    vol*=GAIN
    i=int(round(at*SR))
    if i<0:x=x[-i:];i=0
    j=min(L,i+len(x))
    if j<=i:return
    x=x[:j-i]*vol;mix[i:j,0]+=x*(1-pan)*.9;mix[i:j,1]+=x*(1+pan)*.9
def pulse(m,dur,duty=.5,e=None):
    n=int(dur*SR);t=np.arange(n)/SR;ph=(t*mtof(m))%1;return np.where(ph<duty,1.,-1.)*(env(n) if e is None else e(n))
def tri(m,dur):
    n=int(dur*SR);t=np.arange(n)/SR;ph=(t*mtof(m))%1;return (4*np.abs(ph-.5)-1)*env(n,.003,.05,.8,.03)
def pad(ms,dur,a=.4):
    n=int(dur*SR);t=np.arange(n)/SR;x=np.zeros(n)
    for m in ms:
        for det in (-.08,.08):
            f=mtof(m+det);x+=sum(np.sin(2*np.pi*f*k*t)/k for k in range(1,6))
    return x/len(ms)/4*env(n,a,.3,.8,min(.8,dur*.4))
def sine(f,dur,decay=None):
    n=int(dur*SR);t=np.arange(n)/SR;x=np.sin(2*np.pi*f*t);return x*(np.exp(-t/decay) if decay else env(n,.02,.1,.9,.2))
def kick(v=1):
    n=int(.3*SR);t=np.arange(n)/SR;f=45+110*np.exp(-t/.03);return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.12)
def boom(l=.6):
    n=int(2.2*SR);t=np.arange(n)/SR;f=30+95*np.exp(-t/.05);return np.tanh(2.6*np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/l))
def snare():
    n=int(.22*SR);t=np.arange(n)/SR;return rng.uniform(-1,1,n)*np.exp(-t/.05)*.8+np.sin(2*np.pi*190*t)*np.exp(-t/.04)*.6
def hat(l=.03):
    n=int(l*4*SR);x=np.diff(rng.uniform(-1,1,n+1));return x*np.exp(-np.arange(n)/SR/l)
def tick(f=2400):
    n=int(.03*SR);t=np.arange(n)/SR;return np.sin(2*np.pi*f*t)*np.exp(-t/.006)
def crash(l=.5):
    n=int(1.8*SR);x=np.diff(rng.uniform(-1,1,n+1));return x*np.exp(-np.arange(n)/SR/l)
def noise(dur,shape):
    n=int(dur*SR);return rng.uniform(-1,1,n)*shape(np.linspace(0,1,n))
def riser(dur):
    n=int(dur*SR);x=np.diff(np.concatenate([[0],rng.uniform(-1,1,n)]));return x*np.linspace(0,1,n)**2
def sweep(dur,f0,f1,duty=.3,fade=True):
    n=int(dur*SR);t=np.arange(n)/SR;f=f0*(f1/f0)**(t/dur);ph=np.cumsum(f)/SR%1;return np.where(ph<duty,1.,-1.)*(np.linspace(1,.15,n) if fade else 1)
def whoosh(dur=.3):
    n=int(dur*SR);x=rng.uniform(-1,1,n);k=np.sin(np.linspace(0,np.pi,n))**2;y=np.convolve(x,np.ones(6)/6,'same');return y*k
def crackle(dur,dens=.004):
    n=int(dur*SR);x=np.zeros(n);idx=rng.random(n)<dens;x[idx]=rng.uniform(-1,1,idx.sum());return np.convolve(x,np.exp(-np.arange(200)/30),'same')
def chord(ms,at,vol=.12,dur=BEAT*.9,duty=.25):
    for m in ms:add(pulse(m,dur,duty),at,vol/len(ms)*2.2)
def stab(ms,at,vol=.2,dur=.35):
    for m in ms:add(pulse(m,dur,.25,lambda n:env(n,.002,.15,.25,.1)),at,vol/len(ms)*2.2)
def blip(m,at,vol=.08,pan=0.,dur=.06):add(pulse(m,dur,.125,lambda n:env(n,.001,.03,.4,.02)),at,vol,pan)
CH=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]];BASS=[45,41,48,43]           # Am F C G
LEAD=[76,None,74,72,69,None,72,74, 72,None,69,67,65,None,67,69, 67,None,72,76,79,None,76,74, 76,None,74,72,74,None,None,None]
def groove(t0,bars,*,kicks=4,snares=True,hats=8,arp=True,lead=False,bassv=.3,up=0,start_bar=0,gain=1.0):
    """Drums, bass, arpeggio and lead from t0 for `bars` bars (fractions allowed: events at or after the end are dropped)."""
    global GAIN
    GAIN=gain;end=t0+bars*BAR-1e-6
    def at(x,*a):
        if x<end:add(*a[:1],x,*a[1:])
    for b in range(int(np.ceil(bars))):
        tb=t0+b*BAR;k=(start_bar+b)%4;ch=CH[k];root=BASS[k]
        for i in range(kicks):at(tb+i*BAR/kicks,kick(),.8)
        if snares:
            for i in (1,3):at(tb+i*BEAT,snare(),.38)
        for i in range(hats):at(tb+i*BAR/hats,hat(),.12 if i%2==0 else .07,.2)
        for i in range(8):at(tb+i*BEAT/2,tri(root+(12 if i%2 else 0),BEAT/2*.9),bassv)
        if arp:
            a=[ch[0],ch[1],ch[2],ch[0]+12]
            for s in range(16):at(tb+s*BEAT/4,pulse(a[s%4]+12+up,BEAT/4*.85,.25),.06,.35*(1 if s%2 else -1))
        if lead:
            for i in range(8):
                m=LEAD[k*8+i]
                if m:at(tb+i*BEAT/2,pulse(m+up,BEAT/2*.95,.5),.1,-.1)
    GAIN=1.0
def mute(a,b,fade=.02):
    i=int(a*SR);j=int(b*SR);f=int(fade*SR);mix[i:i+f]*=np.linspace(1,0,f)[:,None];mix[i+f:j]*=0
O={s['name']:s['own'] for s in CUT['shots']}   # every cue below is relative to its section's start in cut-timeline.js
# ---------------- COLD OPEN (10 s): clock, heartbeat, flashlight hum
T=O['cold']
add(pad([33,40,45],10.2,1.5),T,.42)
for i in range(20):add(tick(),T+i*BEAT,.14 if i%2==0 else .08,.25)
for b in range(5):
    for k in (0,.35):add(kick(),T+b*BAR+k,.35 if k else .5)
hum=sine(120,5.4)*.5+sine(240,5.4)*.25;add(hum*np.minimum(1,np.linspace(0,8,len(hum))),T+.6,.12);add(tick(900),T+.6,.5)
for x in (6.0,6.1,6.2):add(tick(900),T+x,.35)
add(sine(120,3.6)*.5+sine(240,3.6)*.25,T+6.4,.1)
add(riser(2.0),T+8.0,.28);add(sweep(1.9,90,700,.3,False)*np.linspace(0,1,int(1.9*SR)),T+8.1,.03)
# ---------------- REVEAL (8 s): the drop
T=O['reveal']
add(boom(),T,.85);add(crash(.7),T,.45)
for i in range(18):blip(69+[0,3,7,12,15,19][i%6],T+.03+i*.032,.07,(-.5 if i%2 else .5))
add(pad([57,60,64,69],2.0,.1),T,.25)
groove(T+.5,3,kicks=2,snares=False,hats=8,arp=True,bassv=.26,gain=.75)
add(snare(),T+1.5,.5);add(crash(.3),T+1.5,.3);stab([57,64,69,72],T+1.5,.25,.5)
for i in range(8):blip(81+[0,2,4,7][i%4],T+4.6+i*.0625,.06)
groove(T+6.5,.75,kicks=4,snares=True,hats=16,bassv=.28,start_bar=3,gain=.8)
add(riser(1.0),T+7.0,.25)
for i in range(4):add(snare(),T+7.5+i*.125,.12+i*.05)
# ---------------- OPEN (14 s): match cut, curtain, logo, lights out
T=O['open']
add(sweep(.9,1200,120),T,.05);add(whoosh(.9),T,.3)
add(boom(.4),T+1.0,.55);add(crash(.6),T+1.0,.2);add(pad([45,52,57,64],3.0,.5),T+1.0,.35)
for i in range(6):blip(88-i*2,T+1.14+i*.04,.035)
groove(T+2.0,1,kicks=2,snares=False,hats=8,arp=False,bassv=.3,gain=.6)
add(riser(.9),T+3.1,.3)
for i in range(4):add(kick(),T+4.0+i*.125,.7);stab([57+[0,3,7,12][i]],T+4.0+i*.125,.12,.12)
add(boom(),T+5.0,.8);add(crash(.8),T+5.0,.5);stab([57,64,69,72,76],T+5.0,.3,.9)
add(sweep(.8,300,3000,.2),T+5.5,.02)
groove(T+6.0,1.5,lead=True,start_bar=0,gain=.85)
add(whoosh(.5),T+8.8,.3)
groove(T+9.0,1,snares=False,arp=True,start_bar=0,bassv=.28,gain=.55)
groove(T+11.0,.5,snares=True,arp=True,start_bar=1,bassv=.28,gain=.7)
mute(T+12.0,T+14.0)
add(boom(.3),T+12.0,.5);add(sweep(.5,700,40,.5),T+12.0,.12)
for i in range(4):add(kick(),T+12.5+i*.5,.45 if i%2==0 else .3)
add(tick(),T+12.5,.12);add(riser(1.2),T+12.6,.2);add(whoosh(.26),T+13.87,.35)
# ---------------- MONTAGE (6 s): a hit on every whip (1.5 s)
T=O['montage']
groove(T,3,lead=True,start_bar=0)
for j in range(4):
    add(crash(.2),T+j*1.5,.18);stab([m+12 for m in CH[j%4]],T+j*1.5,.15,.2)
    if j:add(whoosh(.24),T+j*1.5-.12,.28)
add(whoosh(.26),T+5.87,.35)
# ---------------- HEIST (22 s): approach, CAUGHT (hit on 6.0, then near silence), UNDO 10.0, the clean way out, CLEAN 19.0
T=O['heist']
groove(T,2,snares=False,arp=True,bassv=.3,gain=.55)
groove(T+4.0,1,snares=True,arp=True,bassv=.32,start_bar=2,gain=.7)
for i in range(6):blip(84+[0,4,7,12,16,19][i],T+4.0+i*.035,.07)
add(riser(1.5),T+4.5,.3)
for i in range(8):add(snare(),T+5.5+i*BEAT/8,.1+i*.04)
mute(T+5.98,T+10.0)
add(boom(.7),T+6.0,1.);add(crash(.7),T+6.0,.55);add(snare(),T+6.0,.6);add(kick(),T+6.0,1.)
add(sine(3100,3.4,1.5),T+6.1,.018);add(sine(55,3.8,1.6),T+6.0,.35)
add(sweep(.55,120,2600,.4),T+10.0,.07);add(sweep(.4,2600,300,.4),T+10.2,.04);add(whoosh(.5),T+10.0,.25)
for i in range(4):add(tick(),T+11.0+i*BEAT/2,.14)
add(kick(),T+11.0,.5);add(kick(),T+11.35,.35);add(riser(1.0),T+11.0,.2)
groove(T+12.0,1,snares=False,arp=True,start_bar=0,gain=.6)
for i in range(6):blip(79+[0,3,7,10,12,15][i],T+12.5+i*.05,.06)
groove(T+14.0,1,snares=True,arp=True,lead=True,start_bar=1,gain=.75)
groove(T+16.0,.5,snares=True,arp=True,lead=True,start_bar=2,gain=.85)
add(riser(1.0),T+17.0,.35)
for i in range(16):add(snare(),T+17.0+i*BEAT/8,.08+i*.022)
add(kick(),T+18.0,.9);add(crash(.4),T+18.0,.3);add(pad([57,61,64],1.0,.05),T+18.0,.3)
for i in range(4):blip(76+[0,4,7,12][i],T+18.66+i*.05,.07)
add(boom(),T+19.0,.9);add(crash(.9),T+19.0,.55);stab([57,64,69,73,76],T+19.0,.32,1.0);add(pad([57,61,64,69],2.8,.02),T+19.0,.45)
for i in range(12):blip(81+[0,4,7,12][i%4]+12*(i//8),T+19.05+i*.045,.05,(-.4 if i%2 else .4))
groove(T+20.0,1,snares=True,arp=True,start_bar=0,gain=.7)
# ---------------- GRID (6 s)
T=O['grid']
add(crash(.6),T,.35);add(boom(.4),T,.5)
groove(T,3,hats=16,lead=True,up=12,start_bar=0)
for i in range(23):blip(72+(i%8)*2,T+.38+i*.07,.05,(-.3 if i%2 else .3))
add(crash(.4),T+2.2,.25);stab([69,72,76],T+2.2,.18,.3)
add(riser(.9),T+5.1,.3)
# ---------------- LAST HEIST (5 s)
T=O['lasttitle']
for i in range(4):add(kick(),T+i*.125,.7);stab([45+[0,3,7,12][i]],T+i*.125,.12,.12)
add(boom(),T+.5,.8);add(crash(.8),T+.5,.45);stab([45,52,57,60],T+.5,.3,.9);add(pad([45,52,57,60],4.0,.1),T+.5,.4)
groove(T+1.0,1.5,kicks=2,snares=False,arp=True,bassv=.26,gain=.5)
add(riser(1.2),T+3.6,.3);add(whoosh(.5),T+4.8,.35)
# ---------------- EDITOR (12 s): verdict hits at 1.2 (blocked) and 3.75 (beatable), then four versions on 5.5/7/8.5/10
T=O['editor']
groove(T,2.75,snares=True,arp=True,kicks=2,start_bar=0,bassv=.26,gain=.6)
add(sweep(.35,90,70,.5,False),T+1.2,.12);add(sweep(.35,97,75,.5,False),T+1.2,.1);add(kick(),T+1.2,.8);add(crash(.25),T+1.2,.2)
for i,m in enumerate([72,76,79,84]):blip(m,T+3.75+i*.06,.09)
add(crash(.4),T+3.75,.25);stab([60,64,67,72],T+3.75,.22,.5)
groove(T+5.5,3,lead=True,start_bar=2,gain=.85)
for j in range(4):add(crash(.25),T+5.5+j*1.5,.22);stab([m+j*2 for m in (57,64,69)],T+5.5+j*1.5,.18,.25)
add(sweep(.3,1500,80),T+11.7,.06);mute(T+11.95,T+12.0,.04)
# ---------------- STAKES (10 s, DEMO)
T=O['stakes']
for i in range(9):
    if i%2==0:add(kick(),T+i*.06,.35+.04*i)
    else:blip(57+i,T+i*.06,.06)
add(boom(),T+1.0,.7);add(crash(.5),T+1.0,.4);stab([57,64,69,72],T+1.0,.28,.6)
add(boom(.3),T+1.5,.6);add(crackle(1.5,.01),T+1.5,.35)
groove(T+2.0,3.5,lead=True,start_bar=0,gain=.8)
add(whoosh(.35),T+5.45,.3);add(snare(),T+5.6,.45);add(crash(.3),T+5.6,.3);stab([60,64,67,72],T+5.6,.22,.4)
add(riser(1.4),T+8.1,.28);add(noise(.6,lambda u:np.sin(u*np.pi)),T+9.3,.18)
# ---------------- BURN (9 s)
T=O['burn']
add(boom(.5),T,.6);add(crash(.6),T,.35);add(crackle(9.0,.006),T,.3)
groove(T,1.5,snares=True,arp=True,start_bar=1,bassv=.3,gain=.8)
for j in range(4):add(kick(),T+.5+j*.5,.6);stab([57+j*2],T+.5+j*.5,.1,.15)
add(boom(),T+3.0,.85);add(crash(.8),T+3.0,.5);stab([57,64,69,72,76],T+3.0,.3,.8);add(crackle(1.4,.03),T+3.0,.35)
add(pad([45,52,57],4.0,.3),T+3.0,.4)
groove(T+4.0,2,snares=False,arp=True,kicks=2,start_bar=0,bassv=.26,gain=.55)
for i in range(21):add(tick(3000),T+4.2+i*.05,.05)
add(riser(1.4),T+7.6,.3)
for i in range(8):add(snare(),T+8.5+i*BEAT/8,.1+i*.04)
# ---------------- TITLE (8 s)
T=O['title']
add(boom(),T,.9);add(crash(1.),T,.55)
for i in range(4):stab([57+[0,3,7,12][i]],T+.05+i*.125,.14,.14)
add(boom(.5),T+.55,.7);stab([57,64,69,72,76],T+.55,.3,1.0)
groove(T+1.0,2.5,lead=True,start_bar=0)
add(crash(.6),T+6.0,.35);add(kick(),T+6.0,.9)
add(pad([57,64,69,72,76],2.0,.05),T+6.0,.55);add(tri(33,2.0),T+6.0,.4)
for i in range(12):blip(81+[0,4,7,12][i%4]+12*(i//8),T+6.02+i*.06,.045)
x=np.tanh(mix*1.05);x/=np.abs(x).max()/0.9
fade=int(1.0*SR);end=int(TOTAL*SR);x[end-fade:end]*=np.linspace(1,0,fade)[:,None];x=x[:end]
w=wave.open(sys.argv[1],'wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((x*32767).astype(np.int16).tobytes());w.close()
print('score',round(len(x)/SR,2),'s')
