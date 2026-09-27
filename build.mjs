// Rebuild the single-file game from src/. Output: index.html (no dependencies, no network).
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url)),src=f=>path.join(root,'src',f);
const MODULES=['pixel-font.js','engine.js','art.js','economy.js','identity.js','burn.js','cutaway-rules.js','cutaway-levels.js','cutaway-render.js','street.js','last-heist.js','last-client.js','playfeel.js','ui.js'];
let html=await readFile(src('shell.html'),'utf8');

const css=await readFile(src('style.css'),'utf8');html=html.replace('/*STYLE*/',()=>css);
for(const name of MODULES){const marker='/*'+name.toUpperCase().replace(/-/g,'_').replace('.JS','')+'*/';const text=await readFile(src(name),'utf8');if(!html.includes(marker))throw Error('missing marker '+marker);html=html.replace(marker,()=>text);}
await writeFile(path.join(root,'index.html'),html);
console.log('Built index.html:',Buffer.byteLength(html),'bytes');
