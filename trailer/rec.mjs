// Records director scenes frame by frame at exactly 30 fps (no wall clock involved).
//   node trailer/rec.mjs frames <outDir> [scene ...]          every timeline scene (or the listed ones)
//   node trailer/rec.mjs stills <outDir> <scene:t1,t2,...> ... PNG stills at those seconds
//   options: --size=960x540  --jobs=6  --dur=<seconds> (frames mode, overrides the timeline)
import { chromium } from 'playwright';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2),opt=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>a.slice(2).split('='))),rest=args.filter(a=>!a.startsWith('--'));
const [mode,OUT,...names]=rest,[w,h]=(opt.size||'1920x1080').split('x').map(Number),FPS=30,JOBS=+opt.jobs||6;
const T=JSON.parse(fs.readFileSync(path.join(here,'timeline.json'),'utf8')),BAR=240/T.bpm;
const durOf=name=>{if(opt.dur)return +opt.dur;const i=T.scenes.findIndex(s=>s.name===name);if(i<0)return 6;const s=T.scenes[i];return s.bars*BAR+(i===T.scenes.length-1?T.tail:T.xf);};
const b=await chromium.launch();
async function page(scene){const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});const p=await ctx.newPage();p.on('pageerror',e=>console.log(scene,'PAGE ERROR',e.message));p.on('console',m=>{if(m.type()==='error')console.log(scene,'console',m.text());});
 await p.goto(pathToFileURL(path.join(here,'director.html')).href+'#scene='+scene+'&rec=1&w='+w+'&h='+h);await p.waitForFunction(()=>window.__ready===true);return p;}
async function frames(scene){const dir=path.join(OUT,'d-'+scene);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});const p=await page(scene),n=Math.round(durOf(scene)*FPS),t0=Date.now();
 for(let i=0;i<n;i++){await p.evaluate(t=>window.__frame(t),i/FPS);await p.screenshot({path:path.join(dir,String(i).padStart(5,'0')+'.png')});}
 await p.context().close();console.log('recorded',scene,n,'frames',((Date.now()-t0)/1000).toFixed(1)+'s');}
async function stills(spec){const [scene,list]=spec.split(':'),ts=list.split(',').map(Number).sort((a,b)=>a-b),p=await page(scene);fs.mkdirSync(OUT,{recursive:true});let i=0;
 for(const t of ts){for(;i/FPS<t-1e-9;i++)await p.evaluate(x=>window.__frame(x),i/FPS);await p.evaluate(x=>window.__frame(x),t);await p.screenshot({path:path.join(OUT,scene+'-'+t.toFixed(2)+'.png')});}
 await p.context().close();}
const jobs=mode==='stills'?names.map(n=>()=>stills(n)):(names.length?names:T.scenes.map(s=>s.name)).map(n=>()=>frames(n));
let k=0;await Promise.all(Array.from({length:Math.min(JOBS,jobs.length)},async()=>{while(k<jobs.length)await jobs[k++]();}));
await b.close();
