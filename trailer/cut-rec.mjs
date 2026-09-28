// Records trailer/cut.html frame by frame at exactly CUT.fps (no wall clock involved).
//   node trailer/cut-rec.mjs stills <outDir> <t1,t2,...>     PNG stills at those seconds (sequential warm-up)
//   node trailer/cut-rec.mjs frames <outDir> [--jobs=6] [--from=s] [--to=s]   every frame as %05d.png
// Each job renders its chunk after replaying every frame since the start of the earliest shot it touches,
// so tweens, follow cameras and the game's own curtain/caught/escape timers match a single sequential run.
import {chromium} from 'playwright';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2),opt=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>a.slice(2).split('='))),[mode,OUT,list]=args.filter(a=>!a.startsWith('--'));
const src=fs.readFileSync(path.join(here,'cut-timeline.js'),'utf8'),CUT=JSON.parse(src.slice(src.indexOf('{'),src.lastIndexOf('}')+1)),FPS=CUT.fps,N=Math.round(CUT.total*FPS);
const warmFrom=t=>{let a=t;for(const s of CUT.shots)if(t>=s.a&&t<s.b)a=Math.min(a,s.a);for(const x of CUT.transitions)if(t>=x.t0&&t<x.t1)for(const s of CUT.shots)if(s.name===x.to||s.name===x.from)a=Math.min(a,s.a);return Math.max(0,Math.floor(a*FPS));};
const b=await chromium.launch({args:['--disable-gpu-vsync']});
async function page(){const ctx=await b.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});const p=await ctx.newPage();p.on('pageerror',e=>console.log('PAGE ERROR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('console',m.text());});
 await p.goto(pathToFileURL(path.join(here,'cut.html')).href+'#rec=1');await p.waitForFunction(()=>window.__ready===true,null,{timeout:60000});return p;}
fs.mkdirSync(OUT,{recursive:true});
if(mode==='stills'){const ts=list.split(',').map(Number).sort((a,b)=>a-b);const p=await page();let f=-1;
 for(const t of ts){const target=Math.round(t*FPS),w=warmFrom(t);if(f<w-1||f>=target)f=w-1;for(f=f+1;f<target;f++)await p.evaluate(x=>window.__frame(x),f/FPS);await p.evaluate(x=>window.__frame(x),target/FPS);f=target;
  const file=path.join(OUT,'s'+t.toFixed(2).padStart(6,'0')+'.png');await p.screenshot({path:file});console.log(file);}}
if(mode==='frames'){const from=Math.round((+opt.from||0)*FPS),to=Math.round((opt.to?+opt.to:CUT.total)*FPS),JOBS=+opt.jobs||6;
 // chunks cut at shot starts where possible
 const cuts=[from];const step=Math.ceil((to-from)/(JOBS*3));for(let f=from+step;f<to;f+=step)cuts.push(f);cuts.push(to);const chunks=cuts.slice(0,-1).map((a,i)=>[a,cuts[i+1]]);
 let k=0;const t0=Date.now();await Promise.all(Array.from({length:Math.min(JOBS,chunks.length)},async()=>{const p=await page();while(k<chunks.length){const [a,e]=chunks[k++];const w=Math.min(a,warmFrom(a/FPS));
   for(let f=w;f<e;f++){await p.evaluate(x=>window.__frame(x),f/FPS);if(f>=a)await p.screenshot({path:path.join(OUT,String(f).padStart(5,'0')+'.png')});}
   console.log('chunk',(a/FPS).toFixed(1)+'-'+(e/FPS).toFixed(1),'warm',((a-w)/FPS).toFixed(1)+'s',((Date.now()-t0)/1000).toFixed(0)+'s');}await p.context().close();}));}
await b.close();
