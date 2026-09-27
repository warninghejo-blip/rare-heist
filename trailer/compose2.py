"""Beat-synced trailer: director scenes + real UI captures + original score.
Usage: python3 trailer/compose2.py <framesDir> <outDir>"""
import json,os,subprocess,sys
import imageio_ffmpeg
FF=imageio_ffmpeg.get_ffmpeg_exe()
HERE=os.path.dirname(os.path.abspath(__file__));SRC,OUT=sys.argv[1],sys.argv[2]
CL=os.path.join(OUT,'clips2');os.makedirs(CL,exist_ok=True)
T=json.load(open(os.path.join(HERE,'timeline.json')));BAR=240/T['bpm'];XF=T['xf'];FPS=30;W,H=1920,1080
def run(a):subprocess.run([FF,'-hide_banner','-loglevel','error','-y']+a,check=True)
ENC=['-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-r',str(FPS)]
scenes=T['scenes'];clips=[]
for i,s in enumerate(scenes):
    last=i==len(scenes)-1;dur=s['bars']*BAR+(1.6 if last else XF);out=os.path.join(CL,f"{i:02d}-{s['name']}.mp4")
    if s['src']=='dir':
        run(['-framerate',str(FPS),'-i',os.path.join(SRC,'d-'+s['name'],'%05d.png'),'-t',f'{dur:.3f}','-vf',f'scale={W}:{H}:flags=neighbor']+ENC+[out])
    else:
        scene=s['src'].split(':')[1];rs=s['ranges'];total=sum(b-a for a,b in rs);k=dur/total
        parts=''.join(f"[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS[p{j}];" for j,(a,b) in enumerate(rs))
        cat=''.join(f'[p{j}]' for j in range(len(rs)))+f'concat=n={len(rs)}:v=1:a=0[c];[c]setpts=PTS*{k:.5f},fps={FPS}'
        if s['name']=='mobile':
            bg=os.path.join(OUT,'mobile-bg.png')
            fc=parts+cat+"[v];[v]scale=-2:900:flags=neighbor,pad=iw+28:ih+28:14:14:color=black,pad=iw+8:ih+8:4:4:color=0xccff00[ph];[1:v]scale=1920:1080[bg];[bg][ph]overlay=x=W-w-190:y=(H-h)/2:shortest=1[o]"
            run(['-framerate',str(FPS),'-i',os.path.join(SRC,scene,'%05d.png'),'-loop','1','-framerate',str(FPS),'-i',bg,'-filter_complex',fc,'-map','[o]','-t',f'{dur:.3f}']+ENC+[out])
        else:
            fc=parts+cat+(f",crop={s['crop']}" if s.get('crop') else '')+f",scale={W}:{H}:flags=lanczos[o]"
            run(['-framerate',str(FPS),'-i',os.path.join(SRC,scene,'%05d.png'),'-filter_complex',fc,'-map','[o]','-t',f'{dur:.3f}']+ENC+[out])
    clips.append((out,s));print('clip',s['name'],round(dur,2))
# chain: each incoming clip starts exactly on its bar; transition covers its first XF seconds
inputs=[];[inputs.extend(['-i',c]) for c,_ in clips]
fc='';prev='[0:v]';off=0
for i in range(1,len(clips)):
    off+=scenes[i-1]['bars']*BAR;name=scenes[i]['name']
    tr='fadeblack' if name in('lasttitle','outro') else 'fadewhite' if name=='logo' else 'pixelize'
    fc+=f"{prev}[{i}:v]xfade=transition={tr}:duration={XF}:offset={off:.4f}[v{i}];";prev=f'[v{i}]'
music=os.path.join(OUT,'music.wav');n=len(clips)
video=os.path.join(OUT,'rare-heist-trailer.mp4')
run(inputs+['-i',music,'-filter_complex',fc.rstrip(';'),'-map',prev,'-map',f'{n}:a','-c:a','aac','-b:a','192k','-shortest']+ENC+['-movflags','+faststart',video])
run(['-i',video,'-vf','scale=1280:720:flags=lanczos','-c:v','libx264','-preset','slow','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',os.path.join(OUT,'rare-heist-trailer-720p.mp4')])
print('trailer done')
def clip(name):return next(c for c,s in clips if s['name']==name)
def gif(name,segs,width=880,fps=18):
    # segs: list of (sceneName,start,end) joined into one looping GIF
    inp=[];fcs=''
    for j,(sc,a,b) in enumerate(segs):inp+=['-i',clip(sc)];fcs+=f'[{j}:v]trim=start={a}:end={b},setpts=PTS-STARTPTS,fps={fps},scale={width}:-1:flags=lanczos[s{j}];'
    fcs+=''.join(f'[s{j}]' for j in range(len(segs)))+f'concat=n={len(segs)}:v=1:a=0,split[a][b];[a]palettegen=max_colors=48:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle'
    out=os.path.join(OUT,name);run(inp+['-filter_complex',fcs,'-loop','0',out]);print('gif',name,os.path.getsize(out)//1024,'KB')
gif('rare-heist.gif',[('logo',0,2.6),('heist',6.5,13.1)])
gif('play-as-your-friend.gif',[('friend',0,3.75),('wallet',0.3,4.0)])
gif('last-heist-evolves.gif',[('lasttitle',0,1.6),('evolve',0,7.5)])
gif('22-heists.gif',[('grid',0,7.5)])
gif('caught.gif',[('caught',0,3.75)])
gif('mobile.gif',[('mobile',0,3.75)],width=800)
