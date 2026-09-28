"""Original score for the Rare Heist trailer v2 (trailer/cut.html), synthesised from scratch (numpy only).
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
    global GAIN
    GAIN=gain
    for b in range(bars):
        tb=t0+b*BAR;k=(start_bar+b)%4;ch=CH[k];root=BASS[k]
        for i in range(kicks):add(kick(),tb+i*BAR/kicks,.8)
        if snares:
            for i in (1,3):add(snare(),tb+i*BEAT,.38)
        for i in range(hats):add(hat(),tb+i*BAR/hats,.12 if i%2==0 else .07,.2)
        for i in range(8):add(tri(root+(12 if i%2 else 0),BEAT/2*.9),tb+i*BEAT/2,bassv)
        if arp:
            a=[ch[0],ch[1],ch[2],ch[0]+12]
            for s in range(16):add(pulse(a[s%4]+12+up,BEAT/4*.85,.25),tb+s*BEAT/4,.06,.35*(1 if s%2 else -1))
        if lead:
            for i in range(8):
                m=LEAD[k*8+i]
                if m:add(pulse(m+up,BEAT/2*.95,.5),tb+i*BEAT/2,.1,-.1)
    GAIN=1.0
# ---------------- COLD OPEN 0-8: clock, heartbeat, flashlight hum
add(pad([33,40,45],8.2,1.5),0,.42)
for i in range(16):add(tick(),i*BEAT,.14 if i%2==0 else .08,.25)
for b in range(4):
    for k in (0,.35):add(kick(),b*BAR+k,.35 if k else .5)
add(tick(900),.6,.5)
hum=sine(120,4.0)*.5+sine(240,4.0)*.25;add(hum*np.minimum(1,np.linspace(0,8,len(hum))),.6,.12)
for x in (4.6,4.7,4.8):add(tick(900),x,.35)
add(hum,4.85,.1)
add(riser(2.0),6.0,.28);add(sweep(1.9,90,700,.3,False)*np.linspace(0,1,int(1.9*SR)),6.1,.03)
# ---------------- REVEAL 8-14: drop
add(boom(),8.0,.85);add(crash(.7),8.0,.45)
for i in range(18):blip(69+[0,3,7,12,15,19][i%6],8.03+i*.032,.07,(-.5 if i%2 else .5))
add(pad([57,60,64,69],2.0,.1),8.0,.25)
groove(8.5,2,kicks=2,snares=False,hats=8,arp=True,bassv=.26,gain=.75)
add(snare(),9.5,.5);add(crash(.3),9.5,.3);stab([57,64,69,72],9.5,.25,.5)
for i in range(8):blip(81+[0,2,4,7][i%4],11.0+i*.0625,.06)
groove(12.5,1,kicks=4,snares=True,hats=16,arp=True,lead=False,bassv=.28,start_bar=2)
add(riser(.9),13.1,.25)
# ---------------- CURTAIN 14-18
add(sweep(.9,1200,120),14.0,.05);add(whoosh(.9),14.0,.3)
add(boom(.4),15.0,.55);add(crash(.6),15.0,.2);add(pad([45,52,57,64],3.0,.5),15.0,.35)
for i in range(6):blip(88-i*2,15.14+i*.04,.035)
groove(16.0,1,kicks=2,snares=False,hats=8,arp=False,bassv=.3,gain=.6)
add(riser(1.0),17.0,.3)
for i in range(8):add(snare(),17.5+i*BEAT/8,.1+i*.03)
# ---------------- LOGO 18-22
for i in range(4):add(kick(),18.0+i*.125,.7);stab([57+[0,3,7,12][i]],18.0+i*.125,.12,.12)
add(boom(),19.0,.8);add(crash(.8),19.0,.5);stab([57,64,69,72,76],19.0,.3,.9)
add(sweep(.8,300,3000,.2),19.5,.02)
groove(20.0,1,lead=True,start_bar=0)
for i in range(4):add(snare(),21.5+i*.125,.2+i*.05)
# ---------------- HEIST A 22-26: stealth groove, then the power goes
groove(22.0,1,snares=False,arp=True,lead=False,start_bar=0,bassv=.28,gain=.55)
groove(24.0,1,snares=True,arp=True,lead=False,start_bar=1,bassv=.28,gain=.7)
m=int(25.0*SR);mix[m:m+int(.02*SR)]*=np.linspace(1,0,int(.02*SR))[:,None]   # hard cut of the groove tail into the blackout
mix[m+int(.02*SR):int(26*SR)]*=0.0
add(boom(.3),25.0,.5);add(sweep(.5,700,40,.5),25.0,.12)
for i in range(2):add(kick(),25.0+.5+i*.35,.45)
add(tick(),25.5,.12);add(whoosh(.26),25.87,.35)
# ---------------- MONTAGE 26-32: a hit on every whip
groove(26.0,3,lead=True,start_bar=0)
for j in range(6):
    add(crash(.2),26.0+j,.18);stab([m+12 for m in CH[j%4]],26.0+j,.15,.2)
    if j:add(whoosh(.24),26.0+j-.12,.28)
add(whoosh(.26),31.87,.35)
# ---------------- HEIST B 32-36: the trophy, the guard, the mistake
groove(32.0,1,snares=False,arp=True,lead=False,bassv=.3,gain=.55)
groove(34.0,1,snares=True,arp=True,lead=False,bassv=.32,start_bar=1,gain=.7)
for i in range(6):blip(84+[0,4,7,12,16,19][i],34.75+i*.035,.07)
add(riser(1.2),34.8,.3)
for i in range(8):add(snare(),35.5+i*BEAT/8,.1+i*.04)
m=int(35.98*SR);mix[m:int(36.0*SR)]*=np.linspace(1,0,int(36.0*SR)-m)[:,None];mix[int(36.0*SR):int(39.0*SR)]*=0
# ---------------- CAUGHT 36-39: one hit, then nothing but a ringing
add(boom(.7),36.0,1.);add(crash(.7),36.0,.55);add(snare(),36.0,.6);add(kick(),36.0,1.)
add(sine(3100,2.6,1.3),36.1,.018);add(sine(55,2.8,1.4),36.0,.35)
# ---------------- UNDO 39-41
add(sweep(.55,120,2600,.4),39.0,.07);add(sweep(.4,2600,300,.4),39.2,.04);add(whoosh(.5),39.0,.25)
for i in range(4):add(tick(),40.0+i*BEAT/2,.14)
add(kick(),40.0,.5);add(kick(),40.35,.35);add(riser(1.0),40.0,.25)
# ---------------- CLEAN ROUTE 41-48
groove(41.0,1,snares=False,arp=True,lead=False,start_bar=0,gain=.6)
groove(43.0,1,snares=True,arp=True,lead=True,start_bar=1,gain=.75)
for i in range(6):blip(79+[0,3,7,10,12,15][i],42.3+i*.05,.06)
groove(45.0,1,snares=True,arp=True,lead=True,start_bar=2,gain=.85)
add(riser(1.0),47.0,.35)
for i in range(16):add(snare(),47.0+i*BEAT/8,.08+i*.022)
add(kick(),48.0,.9);add(crash(.4),48.0,.3);add(pad([57,61,64],1.0,.05),48.0,.3)
for i in range(4):blip(76+[0,4,7,12][i],48.66+i*.05,.07)
# ---------------- CLEAN 49
add(boom(),49.0,.9);add(crash(.9),49.0,.55);stab([57,64,69,73,76],49.0,.32,1.0)
add(pad([57,61,64,69],1.4,.02),49.0,.45)
for i in range(12):blip(81+[0,4,7,12][i%4]+12*(i//8),49.05+i*.045,.05,(-.4 if i%2 else .4))
# ---------------- GRID 50-56
add(crash(.6),50.0,.35);add(boom(.4),50.0,.5)
groove(50.0,3,hats=16,lead=True,up=12,start_bar=0)
for i in range(23):blip(72+(i%8)*2,50.38+i*.07,.05,(-.3 if i%2 else .3))
add(crash(.4),52.2,.25);stab([69,72,76],52.2,.18,.3)
add(riser(.9),55.1,.3)
# ---------------- LAST HEIST 56-58
for i in range(4):add(kick(),56.0+i*.125,.7);stab([45+[0,3,7,12][i]],56.0+i*.125,.12,.12)
add(boom(),56.5,.8);add(crash(.8),56.5,.45);stab([45,52,57,60],56.5,.3,.9);add(pad([45,52,57,60],1.6,.1),56.5,.4)
add(riser(.9),57.1,.3);add(whoosh(.5),57.8,.35)
# ---------------- EDITOR 58-62
groove(58.0,2,snares=True,arp=True,lead=False,kicks=2,start_bar=0,bassv=.26,gain=.65)
add(sweep(.35,90,70,.5,False),59.2,.12);add(sweep(.35,97,75,.5,False),59.2,.1);add(kick(),59.2,.8);add(crash(.25),59.2,.2)
for i,m in enumerate([72,76,79,84]):blip(m,60.75+i*.06,.09)
add(crash(.4),60.75,.25);stab([60,64,67,72],60.75,.22,.5)
# ---------------- EVOLVE 62-66
groove(62.0,2,lead=True,start_bar=2)
for j in range(4):add(crash(.25),62.0+j,.22);stab([m+j*2 for m in (57,64,69)],62.0+j,.18,.25)
add(sweep(.3,1500,80),65.7,.06);m=int(65.95*SR);mix[m:int(66.0*SR)]*=np.linspace(1,0,int(66.0*SR)-m)[:,None]
# ---------------- STAKES 66-72
for i in range(9):add(kick(),66.0+i*.06,.35+.04*i) if i%2==0 else blip(57+i,66.0+i*.06,.06)
add(boom(),67.0,.7);add(crash(.5),67.0,.4);stab([57,64,69,72],67.0,.28,.6)
add(boom(.3),67.5,.6);add(crackle(1.5,.01),67.5,.35)
groove(68.0,2,lead=True,start_bar=0)
add(whoosh(.35),68.85,.3);add(whoosh(.35),70.15,.3);add(snare(),70.2,.45);add(crash(.3),70.2,.3);stab([60,64,67,72],70.2,.22,.4)
add(riser(1.4),70.6,.28)
# ---------------- BURN 72-78
add(noise(.6,lambda u:np.sin(u*np.pi)),71.8,.18);add(boom(.5),72.0,.6);add(crash(.6),72.0,.35)
add(crackle(6.0,.006),72.0,.3)
groove(72.0,2,snares=True,arp=True,lead=False,kicks=4,start_bar=1,bassv=.3)
for j in range(4):add(kick(),72.5+j*.5,.6);stab([57+j*2],72.5+j*.5,.1,.15)
add(boom(),74.9,.85);add(crash(.8),74.9,.5);stab([57,64,69,72,76],74.9,.3,.8);add(crackle(1.4,.03),74.9,.35)
add(pad([45,52,57],3.0,.3),75.0,.4)
for i in range(21):add(tick(3000),76.2+i*.05,.05)
add(riser(1.3),76.7,.3)
for i in range(8):add(snare(),77.5+i*BEAT/8,.1+i*.04)
# ---------------- TITLE 78-87.5
add(boom(),78.0,.9);add(crash(1.),78.0,.55)
for i in range(4):stab([57+[0,3,7,12][i]],78.05+i*.125,.14,.14)
add(boom(.5),78.55,.7);stab([57,64,69,72,76],78.55,.3,1.0)
groove(79.0,3,lead=True,start_bar=0)
add(crash(.6),85.0,.35);add(kick(),85.0,.9)
add(pad([57,64,69,72,76],2.6,.05),85.0,.55);add(tri(33,2.4),85.0,.4)
for i in range(12):blip(81+[0,4,7,12][i%4]+12*(i//8),85.02+i*.06,.045)
x=np.tanh(mix*1.05);x/=np.abs(x).max()/0.9
fade=int(1.0*SR);end=int(TOTAL*SR);x[end-fade:end]*=np.linspace(1,0,fade)[:,None];x=x[:end]
w=wave.open(sys.argv[1],'wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((x*32767).astype(np.int16).tobytes());w.close()
print('score',round(len(x)/SR,2),'s')
