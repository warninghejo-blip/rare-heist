"""Beat-synced trailer and README GIFs from director frames + the synthesised score. ffmpeg only.
Usage: python trailer/compose.py <framesDir> <outDir> [--gifs-only]
  framesDir holds d-<scene>/%05d.png from `node trailer/rec.mjs frames <framesDir>`
  outDir receives music.wav, rare-heist-trailer.mp4, rare-heist-trailer-720p.mp4 and the GIFs."""
import json,os,shutil,subprocess,sys
FF=shutil.which('ffmpeg') or 'ffmpeg'
HERE=os.path.dirname(os.path.abspath(__file__));SRC,OUT=sys.argv[1],sys.argv[2];GIFS_ONLY='--gifs-only' in sys.argv
os.makedirs(OUT,exist_ok=True)
T=json.load(open(os.path.join(HERE,'timeline.json')));BAR=240/T['bpm'];XF=T['xf'];FPS=30
scenes=T['scenes'];N=len(scenes)
def run(a):
    r=subprocess.run([FF,'-hide_banner','-loglevel','error','-y']+a)
    if r.returncode:sys.exit('ffmpeg failed: '+' '.join(a[-3:]))
def seq(name):return os.path.join(SRC,'d-'+name,'%05d.png')
starts=[];acc=0
for s in scenes:starts.append(acc);acc+=s['bars']*BAR
TOTAL=acc+T['tail']
music=os.path.join(OUT,'music.wav')
if not GIFS_ONLY:
    subprocess.run([sys.executable,os.path.join(HERE,'music.py'),music],check=True)
    inputs=[];fc=''
    for i,s in enumerate(scenes):
        dur=s['bars']*BAR+(T['tail'] if i==N-1 else XF)
        inputs+=['-framerate',str(FPS),'-i',seq(s['name'])]
        fc+=f"[{i}:v]trim=duration={dur:.4f},setpts=PTS-STARTPTS,fps={FPS},format=yuv420p,settb=AVTB[s{i}];"
    prev='[s0]'
    for i in range(1,N):
        kind=scenes[i].get('in','fade');d=1/FPS if kind=='cut' else XF;tr='fade' if kind=='cut' else kind
        fc+=f"{prev}[s{i}]xfade=transition={tr}:duration={d:.4f}:offset={starts[i]:.4f}[v{i}];";prev=f'[v{i}]'
    fc+=f"{prev}fade=t=out:st={TOTAL-.7:.3f}:d=0.7[vout]"
    master=os.path.join(OUT,'rare-heist-trailer.mp4')
    run(inputs+['-i',music,'-filter_complex',fc,'-map','[vout]','-map',f'{N}:a','-t',f'{TOTAL:.3f}',
        '-c:v','libx264','-preset','slow','-tune','animation','-crf',os.environ.get('CRF','18'),'-maxrate','3200k','-bufsize','6400k','-pix_fmt','yuv420p','-r',str(FPS),
        '-c:a','aac','-b:a','192k','-movflags','+faststart',master])
    run(['-i',master,'-vf','scale=1280:720:flags=area','-c:v','libx264','-preset','slow','-tune','animation','-crf','23','-maxrate','1100k','-bufsize','2200k','-pix_fmt','yuv420p',
         '-c:a','aac','-b:a','128k','-movflags','+faststart',os.path.join(OUT,'rare-heist-trailer-720p.mp4')])
    print('trailer',round(TOTAL,2),'s')
# ---- README GIFs: straight from the PNG frames, halved with nearest neighbour so the game's
# 4-pixel art grid stays exact (2 px per art pixel), then a small shared palette.
def gif(name,segs,fps=15,width=960,colors=40):
    inp=[];fcs=''
    for j,(sc,a,b) in enumerate(segs):
        inp+=['-framerate',str(FPS),'-i',seq(sc)]
        fcs+=f'[{j}:v]trim=start={a}:end={b},setpts=PTS-STARTPTS,fps={fps},scale={width}:-1:flags=neighbor[s{j}];'
    fcs+=''.join(f'[s{j}]' for j in range(len(segs)))+f'concat=n={len(segs)}:v=1:a=0,split[a][b];[a]palettegen=max_colors={colors}:stats_mode=full:reserve_transparent=0[p];[b][p]paletteuse=dither=none:diff_mode=rectangle'
    out=os.path.join(OUT,name);run(inp+['-filter_complex',fcs,'-loop','0',out]);print('gif',name,round(os.path.getsize(out)/1048576,2),'MB')
G=json.loads(os.environ.get('GIFS','null')) or ['rare-heist.gif','caught.gif','22-heists.gif','last-heist-evolves.gif']
if 'rare-heist.gif' in G:gif('rare-heist.gif',[('logo',.2,1.4),('friend',1.7,3.25),('hook',0,2.45),('heist2',3.55,7.3)],fps=12)
if 'caught.gif' in G:gif('caught.gif',[('caught',0,3.75),('heist2',0,1.9)],fps=15)
if '22-heists.gif' in G:gif('22-heists.gif',[('grid',0,5.6)],fps=15)
if 'last-heist-evolves.gif' in G:gif('last-heist-evolves.gif',[('lasttitle',0,1.6),('evolve',0,7.5)],fps=15)
