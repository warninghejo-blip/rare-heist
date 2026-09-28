// Generate friend-edition/index.html: the branded landing in front of the static FriendSDK build (friend-edition/app/).
// Inputs: sdk/src/friend-landing.html (page), src/pixel-font.js (Heist Grid font), src/art.js (guest #3412 frames, verbatim),
// src/cutaway-levels.js (lesson and job counts). Run from anywhere: node sdk/src/friend-landing.mjs
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..'),at=(...p)=>path.join(root,...p),read=f=>readFileSync(f,'utf8').replace(/\r\n/g,'\n');
const art=read(at('src','art.js')),sample=JSON.parse(art.slice(art.indexOf('['),art.lastIndexOf(']')+1)).find(x=>x.tokenId==='3412');
if(!sample||sample.frames.length!==64)throw Error('guest #3412 frames not found in src/art.js');
const frames=['idle-down','walk-down','walk-left','walk-right'].flatMap(clip=>sample.clips[clip].map(i=>sample.frames[i]));
const levels=createRequire(import.meta.url)(at('src','cutaway-levels.js')),ids=levels.map(l=>l.id);
const lessons=ids.filter(id=>id==='cut-00'||id.startsWith('drill-')).length,jobs=ids.filter(id=>/^cut-(0[1-9]|1[0-2])$/.test(id)||id.startsWith('annex-')).length;
let html=read(at('sdk','src','friend-landing.html'));
for(const [mark,value] of [['/*PIXEL_FONT*/',read(at('src','pixel-font.js')).trim()],['/*FRAMES*/[]',JSON.stringify(frames)],['__LESSONS__',String(lessons)],['__JOBS__',String(jobs)]]){if(!html.includes(mark))throw Error('missing '+mark);html=html.split(mark).join(value);}
writeFileSync(at('friend-edition','index.html'),html);
console.log('friend-edition/index.html:',Buffer.byteLength(html),'bytes;',lessons,'lessons,',jobs,'jobs');
