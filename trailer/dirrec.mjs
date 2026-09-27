// Records director scenes at exact 30 fps using the timeline durations. Usage: node dirrec.mjs <outDir> [scene...]
import { chromium } from 'playwright';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),OUT=process.argv[2],only=process.argv.slice(3);
const T=JSON.parse(fs.readFileSync(path.join(here,'timeline.json'),'utf8')),BAR=240/T.bpm;
const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1.5});
const list=T.scenes.filter(s=>s.src==='dir'&&(!only.length||only.includes(s.name)));
for(const s of list){const last=s===T.scenes.at(-1),dur=s.bars*BAR+(last?1.6:T.xf),frames=Math.round(dur*30);
 const dir=path.join(OUT,'d-'+s.name);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
 const p=await ctx.newPage();p.on('pageerror',e=>console.log(s.name,'ERR',e.message));await p.clock.install({time:new Date('2026-09-28T20:00:00Z')});
 await p.goto('file://'+path.join(here,'director.html')+'#scene='+s.name);await p.clock.pauseAt(new Date('2026-09-28T20:01:00Z'));await p.evaluate(()=>{window.__T0=performance.now();});
 for(let i=0;i<frames;i++){const ms=Math.round((i+1)*1000/30)-Math.round(i*1000/30);await p.clock.runFor(ms);await p.screenshot({path:path.join(dir,String(i).padStart(5,'0')+'.png')});}
 await p.close();console.log('recorded',s.name,frames,'frames');}
await b.close();
