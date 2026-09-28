// "Every level, solved" proof video: records trailer/solved.html frame by frame at exactly 30 fps (no wall clock),
// then encodes media/all-levels-solved.mp4 (1080p) and media/all-levels-solved-720p.mp4 with ffmpeg (on PATH).
//   node trailer/solved-rec.mjs plan                              print the per-level timeline (turns, PAR, seconds)
//   node trailer/solved-rec.mjs stills <outDir> <t1,t2,...>        PNG stills at those seconds
//   node trailer/solved-rec.mjs video <framesDir> [--out=media] [--jobs=6] [--size=1920x1080] [--keep]
// Frames go to <framesDir> (can be large: ~5k PNGs). Audio is a silent AAC track.
import { chromium } from 'playwright';
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(here);
const args=process.argv.slice(2),opt=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>{const [k,...v]=a.slice(2).split('=');return [k,v.join('=')||'1'];})),rest=args.filter(a=>!a.startsWith('--'));
const [mode,OUT,list]=rest,[w,h]=(opt.size||'1920x1080').split('x').map(Number),FPS=30,JOBS=+opt.jobs||6;
function ff(a){const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...a],{stdio:'inherit'});if(r.status!==0)throw new Error('ffmpeg failed ('+(r.error?.message||r.status)+')');}
const b=await chromium.launch();
async function page(){const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});const p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
 await p.goto(pathToFileURL(path.join(here,'solved.html')).href+'#rec=1&w='+w+'&h='+h);
 await p.waitForFunction(()=>window.__ready===true||window.__err,null,{timeout:30000}).catch(()=>{});
 if(errs.length||!(await p.evaluate(()=>window.__ready===true)))throw new Error('solved.html failed: '+errs.join(' | '));
 p.errs=errs;return p;}
const first=await page(),plan=await first.evaluate(()=>window.__plan);
const fmt=s=>s.toFixed(2).padStart(6);
if(mode==='plan'||mode==='video'){for(const s of plan.segments)console.log(fmt(s.start),fmt(s.dur),s.kind==='level'?(s.label.padEnd(24)+' '+s.name.padEnd(22)+' '+String(s.turns).padStart(3)+' turns, '+s.detections+' detections, PAR '+s.par+', '+(s.step*1000).toFixed(0)+' ms/turn'):s.kind);
 console.log('total',plan.total.toFixed(2),'s,',plan.segments.filter(s=>s.kind==='level').length,'levels');}
if(mode==='stills'){fs.mkdirSync(OUT,{recursive:true});const ts=list.split(',').map(Number).sort((a,b)=>a-b);let f=0;
 for(const t of ts){const seg=plan.segments.filter(s=>s.start<=t+1e-9).at(-1);f=Math.max(f,Math.ceil(seg.start*FPS-1e-9));
  for(;f/FPS<t-1e-9;f++)await first.evaluate(x=>window.__frame(x),f/FPS);await first.evaluate(x=>window.__frame(x),t);
  const file=path.join(OUT,'still-'+t.toFixed(2).padStart(7,'0')+'.png');await first.screenshot({path:file});console.log(file);}}
if(mode==='video'){const dir=path.resolve(OUT);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
 const queue=plan.segments.slice().sort((a,b)=>b.dur-a.dur),pages=[first];for(let i=1;i<Math.min(JOBS,queue.length);i++)pages.push(await page());const t0=Date.now();let done=0;
 await Promise.all(pages.map(async p=>{while(queue.length){const s=queue.shift(),a=Math.ceil(s.start*FPS-1e-9),e=Math.ceil((s.start+s.dur)*FPS-1e-9);
  for(let f=a;f<e;f++){await p.evaluate(x=>window.__frame(x),f/FPS);await p.screenshot({path:path.join(dir,String(f).padStart(5,'0')+'.png')});}
  if(p.errs.length)throw new Error('page error in segment '+s.i+': '+p.errs.join(' | '));
  console.log('segment',String(s.i).padStart(2),(s.id||s.kind).padEnd(13),e-a,'frames',++done+'/'+plan.segments.length,((Date.now()-t0)/1000).toFixed(0)+'s');}}));
 const n=Math.ceil(plan.total*FPS-1e-9),have=fs.readdirSync(dir).filter(x=>x.endsWith('.png')).length;if(have!==n)throw new Error('expected '+n+' frames, have '+have);
 const media=path.resolve(opt.out||path.join(root,'media')),hd=path.join(media,'all-levels-solved.mp4'),sd=path.join(media,'all-levels-solved-720p.mp4');fs.mkdirSync(media,{recursive:true});
 const silent=['-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=44100'],dur=(n/FPS).toFixed(3);
 const x264=(crf,max)=>['-c:v','libx264','-preset','slow','-tune','animation','-crf',String(crf),'-maxrate',max,'-bufsize',String(parseInt(max)*2)+'k','-pix_fmt','yuv420p','-r',String(FPS),'-g','60'];
 ff(['-framerate',String(FPS),'-i',path.join(dir,'%05d.png'),...silent,'-map','0:v','-map','1:a','-t',dur,...x264(opt.crf||20,opt.maxrate||'1150k'),'-c:a','aac','-b:a','32k','-movflags','+faststart',hd]);
 ff(['-framerate',String(FPS),'-i',path.join(dir,'%05d.png'),...silent,'-map','0:v','-map','1:a','-t',dur,'-vf','scale=1280:720:flags=area',...x264(opt.crf720||23,opt.maxrate720||'470k'),'-c:a','aac','-b:a','32k','-movflags','+faststart',sd]);
 for(const f of [hd,sd])console.log(f,(fs.statSync(f).size/1048576).toFixed(2),'MB');
 if(!opt.keep)fs.rmSync(dir,{recursive:true,force:true});}
await b.close();
