"""Encodes the v2 trailer from recorded frames + the synthesised score. ffmpeg only (on PATH).
Usage: python trailer/cut-compose.py <framesDir> [--work=<dir>] [--gif-only]
  framesDir holds %05d.png from `node trailer/cut-rec.mjs frames <framesDir>`.
Writes media/rare-heist-trailer.mp4 (1080p, <= 16 MB, two-pass), media/rare-heist-trailer-720p.mp4 (<= 8 MB)
and media/rare-heist.gif (README hero loop, <= 3 MB, halved with nearest neighbour so the 4 px art grid stays exact)."""
import json,os,shutil,subprocess,sys
FF=shutil.which('ffmpeg') or 'ffmpeg'
HERE=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.dirname(HERE);MEDIA=os.path.join(ROOT,'media')
SRC=sys.argv[1];opt=dict(a[2:].split('=',1) if '=' in a else (a[2:],'1') for a in sys.argv[2:] if a.startswith('--'))
WORK=opt.get('work',os.path.join(SRC,'..','work'));os.makedirs(WORK,exist_ok=True)
src=open(os.path.join(HERE,'cut-timeline.js'),encoding='utf-8').read();CUT=json.loads(src[src.index('{'):src.rindex('}')+1]);FPS=CUT['fps'];TOTAL=CUT['total']
SEQ=os.path.join(SRC,'%05d.png')
def run(a,cwd=None):
    r=subprocess.run([FF,'-hide_banner','-loglevel','error','-y']+a,cwd=cwd)
    if r.returncode:sys.exit('ffmpeg failed: '+' '.join(a[-4:]))
def mb(p):return round(os.path.getsize(p)/1048576,2)
if 'gif-only' not in opt:
    music=os.path.join(WORK,'score.wav');subprocess.run([sys.executable,os.path.join(HERE,'score.py'),music],check=True)
    def enc(out,vf,vb,maxr,ab,limit):
        base=['-framerate',str(FPS),'-i',SEQ,'-i',music,'-map','0:v','-map','1:a','-t',f'{TOTAL:.3f}','-vf',vf+',format=yuv420p',
              '-c:v','libx264','-preset','slow','-tune','animation','-b:v',vb,'-maxrate',maxr,'-bufsize',str(int(maxr[:-1])*2)+'k','-g',str(FPS*2),'-r',str(FPS)]
        log=os.path.join(WORK,'x264'+os.path.basename(out))
        run(base+['-pass','1','-passlogfile',log,'-an','-f','mp4',os.devnull])
        run(base+['-pass','2','-passlogfile',log,'-c:a','aac','-b:a',ab,'-movflags','+faststart',out])
        print(os.path.basename(out),mb(out),'MB');assert mb(out)<=limit,'over size budget'
    enc(os.path.join(MEDIA,'rare-heist-trailer.mp4'),'null',opt.get('vb','1280k'),'3000k','160k',16)
    enc(os.path.join(MEDIA,'rare-heist-trailer-720p.mp4'),'scale=1280:720:flags=lanczos',opt.get('vb720','600k'),'1400k','96k',8)
# README hero GIF: the reveal, the curtain + nameplate, the catch, CLEAN, the title
SEGS=json.loads(opt.get('segs','[[8.15,9.9],[15.0,16.9],[35.6,37.3],[48.9,50.0],[78.0,80.4]]'))
gfps=int(opt.get('gfps','12'));colors=opt.get('colors','40');width=opt.get('gw','960')
inp=[];fc=''
for j,(a,b) in enumerate(SEGS):
    inp+=['-framerate',str(FPS),'-start_number',str(round(a*FPS)),'-i',SEQ]
    fc+=f'[{j}:v]trim=duration={b-a:.3f},setpts=PTS-STARTPTS,fps={gfps},scale={width}:-1:flags=neighbor[s{j}];'
fc+=''.join(f'[s{j}]' for j in range(len(SEGS)))+f'concat=n={len(SEGS)}:v=1:a=0,split[a][b];[a]palettegen=max_colors={colors}:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle'
gif=os.path.join(MEDIA,'rare-heist.gif');run(inp+['-filter_complex',fc,'-loop','0',gif]);print('rare-heist.gif',mb(gif),'MB',round(sum(b-a for a,b in SEGS),2),'s')
