/* Rare Heist cutaway renderer: "night shift" art pass.
   The board is painted on an internal pixel grid whose pixel is the Friend's own pixel (u),
   then blitted up with integer scaling, so walls, devices, guards and the Friend share one grid.
   Palette: the 1-bit pair (ink / paper) for everything you interact with, a four-step night
   indigo for architecture and mood, and the #ccff00 signal for danger, objectives and exits.
   Light is white, shadow is indigo, attention is lime. Dithering is ordered (Bayer 4x4). */
(function(root){'use strict';
 const E=root.HeistEngine,INK='#000000',PAPER='#ffffff',SIG='#ccff00',cache=new Map();
 const NIGHT='#151233',DUSK='#2c2766',HAZE='#5e56a8',MIST='#b9b3e0',WALL='#e9e5f7';
 const PAL=Object.freeze({ink:INK,paper:PAPER,sig:SIG,night:NIGHT,dusk:DUSK,haze:HAZE,mist:MIST,wall:WALL});
 const rect=(c,x,y,w,h,color=INK)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 function box(c,x,y,w,h,color=PAPER,b=2){rect(c,x,y,w,h);rect(c,x+b,y+b,w-b*2,h-b*2,color);}
 function text(c,str,x,y,k=2,color=INK,align='left'){
  str=String(str).toUpperCase();k=Math.max(1,Math.floor(k));let width=str.length*6*k-k;if(align==='center')x-=width/2;else if(align==='right')x-=width;x=Math.floor(x);y=Math.floor(y);
  for(const ch of str){const g=(root.HeistPixel?.glyphs[ch]||root.HeistPixel?.glyphs['?'])?.split('/');if(g)for(let j=0;j<g.length;j++)for(let i=0;i<g[j].length;i++)if(g[j][i]==='1')rect(c,x+i*k,y+j*k,k,k,color);x+=6*k;}
 }
 // Text with a one-pixel outline, readable on both lit plaster and darkness.
 function label(c,str,x,y,color=PAPER,edge=INK,align='left'){for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[1,1],[-1,1],[1,-1],[-1,-1]])text(c,str,x+dx,y+dy,1,edge,align);text(c,str,x,y,1,color,align);}
 function mask(sample,facing='down',walking=false,frame=0){
  if(!sample)return [];
  if(sample.familyId===6&&['up','down'].includes(facing))facing='right';
  const list=sample.clips[(walking?'walk':'idle')+'-'+facing]||sample.clips['idle-down'];
  const hex=sample.frames[list[((frame%list.length)+list.length)%list.length]];
  if(!cache.has(hex)){const n=BigInt(hex),out=[];for(let i=0;i<256;i++)if((n>>BigInt(i))&1n)out.push([i&15,i>>4]);cache.set(hex,out);}return cache.get(hex);
 }
 // The Friend: original 16x16 one-bit frame, integer scale, black pixels over a one-pixel white halo.
 function sprite(c,sample,x,foot,scale=3,facing='down',walking=false,frame=0,halo=true){
  const px=mask(sample,facing,walking,frame),k=Math.max(1,Math.floor(scale)),L=Math.round(x-8*k),T=Math.round(foot-15*k);
  if(halo)for(const [a,b]of px)rect(c,L+(a-1)*k,T+(b-1)*k,3*k,3*k,PAPER);
  for(const [a,b]of px)rect(c,L+a*k,T+b*k,k,k);return {left:L,top:T,scale:k};
 }
 function stipple(c,x,y,w,h,step=6,color=INK,back=null){if(back)rect(c,x,y,w,h,back);c.save();c.beginPath();c.rect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));c.clip();for(let yy=Math.floor(y/step)*step;yy<y+h;yy+=step)for(let xx=Math.floor(x/step)*step;xx<x+w;xx+=step)rect(c,xx,yy,2,2,color);c.restore();}
 function dotted(c,x1,y1,x2,y2,color=INK,size=2,step=8){const n=Math.hypot(x2-x1,y2-y1);for(let i=0;i<=n;i+=step){const q=n?i/n:0;rect(c,x1+(x2-x1)*q,y1+(y2-y1)*q,size,size,color);}}
 // Ordered dithering through cached 4x4 patterns: one fillRect per area, no per-pixel loops.
 const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],pats=new WeakMap(),tiles=new WeakMap();
 function pattern(c,level,fg,bg){let m=pats.get(c);if(!m)pats.set(c,m=new Map());const key=level+fg+(bg||'');let p=m.get(key);if(!p){const t=document.createElement('canvas');t.width=t.height=4;const g=t.getContext('2d');if(bg){g.fillStyle=bg;g.fillRect(0,0,4,4);}g.fillStyle=fg;for(let i=0;i<16;i++)if(BAYER[i]<level)g.fillRect(i&3,i>>2,1,1);p=c.createPattern(t,'repeat');m.set(key,p);}return p;}
 function dither(c,x,y,w,h,level,fg,bg=null){if(w<=0||h<=0||(level<=0&&!bg))return;c.fillStyle=level>=16?fg:level<=0?bg:pattern(c,level,fg,bg);c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
 function tile(c,key,w,h,draw){let m=tiles.get(c);if(!m)tiles.set(c,m=new Map());let p=m.get(key);if(!p){const t=document.createElement('canvas');t.width=w;t.height=h;draw(t.getContext('2d'));p=c.createPattern(t,'repeat');m.set(key,p);}return p;}
 // Tiny bitmaps: rows of palette letters, '.' is transparent. Run-length cached per art array.
 const runsOf=new WeakMap();
 function bitmap(c,art,x,y,pal,k=1,flip=false){let runs=runsOf.get(art);if(!runs){runs=[];art.forEach((row,j)=>{let i=0;while(i<row.length){const ch=row[i];if(ch==='.'){i++;continue;}let e=i;while(e<row.length&&row[e]===ch)e++;runs.push([i,j,e-i,ch]);i=e;}});runsOf.set(art,runs);}
  const W=art[0].length;x=Math.round(x);y=Math.round(y);for(const [i,j,n,ch] of runs){const col=pal[ch];if(col)rect(c,x+(flip?W-i-n:i)*k,y+j*k,n*k,k,col);}}
 const hash=(a,b,s=0)=>{let h=Math.imul((a|0)*374761393+(b|0)*668265263+(s|0)*2246822519,1)^0x27d4eb2d;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;};
 const seedOf=str=>{let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
 const ease=t=>1-Math.pow(1-Math.min(1,Math.max(0,t)),3);

 // ---- Sprites (original to this game; drawn in the shared night palette) ----
 const GP={k:INK,u:DUSK,h:HAZE,m:MIST,w:PAPER,g:SIG};
 // Security guard, facing right. 14x22. Legs are separate frames.
 const GUARD_TOP=[
  '....kkkkk.....',
  '...kuuuuuk....',
  '...khhuuuukk..',
  '...kkkkkkkkkk.',
  '...kwwwwwk....',
  '...kwwwkwwk...',
  '...kwwwwwk....',
  '....kwwkk.....',
  '...kkkkkkk....',
  '..kuuuumuuk...',
  '..kuuuuuuukkkk',
  '..kuhuuuuukwwk',
  '..kuhuuuukkkkk',
  '..kuhuuuuk....',
  '..kkkkkkkk....',
  '...kuuuuk.....'];
 const GUARD_LEGS=[
  ['..kuk..kuk....','..kuk..kuk....','.kuk....kuk...','.kkk....kkkk..','.kkkk...kkkk..','..............'],
  ['...kuuuuk.....','...kukkuk.....','...kuk.kuk....','...kuk.kuk....','...kkk.kkkk...','..............'],
  ['..kuk..kuk....','..kuk..kuk....','.kuk....kuk...','.kkkk...kkk...','.kkkk...kkkk..','..............'],
  ['...kuuuuk.....','....kuuk......','....kuuk......','....kuuk......','...kkkkkk.....','..............']];
 const GUARD_FRONT=[
  '....kkkkkk....',
  '...kuuuuuuk...',
  '...khhuuuuk...',
  '..kkkkkkkkkk..',
  '...kwwwwwwk...',
  '...kwkwwkwk...',
  '...kwwwwwwk...',
  '....kwwwwk....',
  '..kkkkkkkkkk..',
  '.kuuuuumuuuuk.',
  '.kuhuuuuuuhuk.',
  '.kuhuuuuuuhuk.',
  '.kkhuuuuuuhkk.',
  '.kwkuuuuuukwk.',
  '..kkkkkkkkkk..',
  '...kuuuuuuk...',
  '...kuuk.kuuk..',
  '...kuuk.kuuk..',
  '...kuuk.kuuk..',
  '...kkkk.kkkk..',
  '..kkkkk.kkkkk.',
  '..............'];
 // Hover drone, facing right. 17x10, rotor blur drawn separately.
 const DRONE=[
  '....k.......k....',
  '.kkkkkkkkkkkkkkk.',
  '..kuuuuuuuuuuuk..',
  '.kuhhhhhhhhhhhuk.',
  '.kuuuuuuuuuukkkk.',
  '.kuuuuuuuuuukggk.',
  '..kuuuuuuuuukkk..',
  '...kkkkkkkkkk....',
  '.....k....k......',
  '....kk....kk.....'];
 const ROTOR=[['mmmmmmm...mmmmmmm'],['.mmmm.......mmmm.'],['...mm.......mm...']];
 const CAMERA=[
  'kkkk........',
  '.kk.........',
  '.kkkkkkkkkk.',
  '.kmmmmmmmmkkk',
  '.kmwwwwwmmkgk',
  '.kmmmmmmmmkkk',
  '.kkkkkkkkkk..'];
 const CAMERA_DOWN=[
  '..kkkkkk..',
  '....kk....',
  '.kkkkkkkk.',
  '.kmmmmmmk.',
  '.kmwwwwmk.',
  '.kmmmmmmk.',
  '..kkkkkk..',
  '...kgk....',
  '...kkk....'];
 const CUP=[
  '..kkkkkkk..',
  'kkkgwgggkkk',
  'k.kgwgggk.k',
  'kkkgwgggkkk',
  '..kgggggk..',
  '...kgggk...',
  '....kgk....',
  '....kgk....',
  '...kkkkk...',
  '..kgggggk..',
  '..kkkkkkk..'];

 function create(canvas){
  const c=canvas.getContext('2d',{alpha:false}),buf=document.createElement('canvas'),b=buf.getContext('2d',{alpha:false});
  let geo={},Q={},effects=[],camX=null,lastFrame=null;
  const mem={level:null,turn:null,heroAt:null,guards:null,vision:null,lit:null,status:null,statusAt:0,heroTw:null,guardTw:null,ghost:null,flick:null};
  const layers={bgKey:'',bg:null,bKey:'',lit:null,dark:null,pad:0};
  function pulse(events,time){for(const e of events||[]){const d={alarm:700,caught:900,relic:900,key:700,intel:700,switch:500,vent:400,emp:700}[e];if(d)effects.push({e,start:time,end:time+d});}if(effects.length>8)effects=effects.slice(-8);}

  // ---- Layout ----
  // Wide boards: the largest pixel size u whose floors keep the Friend at about half a storey.
  // Narrow frames (phones, FriendSDK compact frames, thumbnails) keep the original one-to-one layout.
  function layout(l,w,h,thumbnail,focusX){
   const rows=l.map.length,cols=l.map[0].length,n=(rows-1)/2;
   const narrow=w<620;
   if(!thumbnail)for(const u of narrow?[2]:[4,3,2,1]){
    const iw=Math.floor(w/u),ih=Math.floor(h/u),side=narrow?4:22,skyMin=narrow?20:26,gMin=narrow?10:14;
    let cw=Math.floor((iw-2*side)/cols);const pan=narrow&&cw<22;if(pan)cw=22;const guess=Math.floor((ih-skyMin-gMin)/n),slab=Math.max(4,Math.min(8,Math.round(guess*.17)));let fh=Math.floor((ih-skyMin-gMin-(n+1)*slab)/n);
    if(u>1&&(cw<(narrow?20:26)||fh<(narrow?24:26)))continue;
    cw=Math.min(cw,60);fh=Math.min(fh,38);
    const H=n*fh+(n+1)*slab,spare=Math.max(0,ih-H-skyMin-gMin),y0=skyMin+Math.floor(spare*.55),minX=iw-side-cols*cw,x0=pan?Math.round(Math.max(minX,Math.min(side,iw/2-(focusX+.5)*cw))):Math.floor((iw-cols*cw)/2),top=[],hh=[];let y=y0;
    for(let i=0;i<rows;i++){top[i]=y;hh[i]=i%2?fh:slab;y+=hh[i];}
    return {u,iw,ih,w,h,rows,cols,n,cw,slab,fh,H,x0,y0,top,hh,pan,k:1,wallT:Math.max(4,Math.round(cw*.16)),thumbnail:false,minX,maxX:side};
   }
   const m=thumbnail?4:w<620?6:24,sky=thumbnail?8:h<420?18:30,min=thumbnail?0:40;let cw=Math.floor((w-2*m)/cols);const pan=cw<min;if(pan)cw=min;
   const slab=Math.max(5,Math.floor(cw*.24)),fh=Math.floor((h-sky-24-(n+1)*slab)/n),H=n*fh+(n+1)*slab,x0=pan?Math.round(Math.max(w-m-cols*cw,Math.min(m,w/2-(focusX+.5)*cw))):Math.floor((w-cols*cw)/2),y0=sky,top=[],hh=[];let y=y0;
   for(let i=0;i<rows;i++){top[i]=y;hh[i]=i%2?fh:slab;y+=hh[i];}
   const k=Math.max(1,Math.min(4,Math.floor(fh*.56/14),Math.floor(cw/15)));
   return {u:1,iw:w,ih:h,w,h,rows,cols,n,cw,slab,fh,H,x0,y0,top,hh,pan,k,wallT:Math.max(4,Math.round(cw*.16)),thumbnail:!!thumbnail,minX:w-m-cols*cw,maxX:m};
  }
  const X=x=>Q.x0+x*Q.cw;
  const floorY=y=>Q.top[y]+Q.hh[y];
  const foot=y=>y%2?Q.top[y]+Q.hh[y]-1:Q.top[y]+Q.hh[y]/2+Q.k*5;

  // ---- Backdrop: night sky, far skyline, street. Cached per size. ----
  function backdrop(g,l){
   const {iw,ih,y0,H,thumbnail}=Q,ground=y0+H,s=seedOf(l.id||'x');
   dither(g,0,0,iw,ih,0,NIGHT,NIGHT);
   const bands=[[.55,2],[.7,4],[.82,7],[.92,10]];for(const [f,lv] of bands){const yy=Math.floor(ground*f);dither(g,0,yy,iw,ground-yy,lv,DUSK);}
   if(!thumbnail){
    for(let i=0;i<iw*ground/900;i++){const x=Math.floor(hash(i,1,s)*iw),y=Math.floor(hash(i,2,s)*ground*.6);rect(g,x,y,1,1,hash(i,3,s)<.3?MIST:HAZE);}
    const mx=Math.floor(iw*.86),my=Math.max(10,Math.floor(ground*.14)),r=Math.max(5,Math.round(Math.min(iw,ih)*.035));
    for(let yy=-r-3;yy<=r+3;yy++)for(let xx=-r-3;xx<=r+3;xx++){const d=Math.hypot(xx,yy);if(d<=r+3&&d>r)((xx+yy)&1)||rect(g,mx+xx,my+yy,1,1,DUSK);}
    for(let yy=-r;yy<=r;yy++){const half=Math.floor(Math.sqrt(r*r-yy*yy));rect(g,mx-half,my+yy,half*2+1,1,PAPER);const bite=Math.floor(Math.sqrt(Math.max(0,r*r-(yy+1)*(yy+1))));if(bite>0)rect(g,mx-half+Math.round(r*.9),my+yy,Math.max(0,half*2+1-Math.round(r*.9)),1,WALL);}
    rect(g,mx-Math.round(r*.4),my-Math.round(r*.2),2,2,MIST);rect(g,mx-Math.round(r*.1),my+Math.round(r*.4),1,1,MIST);
   }
   // far skyline, two depths
   for(const [depth,col,win] of [[.5,DUSK,HAZE],[.75,HAZE,MIST]]){if(thumbnail&&depth>.6)continue;let x=-4,i=0;while(x<iw){const bw=10+Math.floor(hash(i,7,s+depth*99)*22),bh=Math.floor(ground*(depth>.6?.10:.2)+hash(i,8,s+depth*99)*ground*(depth>.6?.14:.26));const top=ground-bh;rect(g,x,top,bw,bh,depth>.6?DUSK:NIGHT);
     if(depth<.6){rect(g,x,top,bw,1,DUSK);if(hash(i,9,s)<.3)rect(g,x+Math.floor(bw/2),top-5,1,5,DUSK);}
     for(let yy=top+3;yy<ground-3;yy+=4)for(let xx=x+2;xx<x+bw-2;xx+=3)if(hash(xx,yy,s+depth*7)<(depth>.6?.10:.07))rect(g,xx,yy,1,1,depth>.6?HAZE:DUSK);
     x+=bw+(hash(i,10,s)<.3?2:0);i++;}}
   // street
   const gh=ih-ground;rect(g,0,ground,iw,gh,NIGHT);rect(g,0,ground,iw,Math.min(3,gh),DUSK);rect(g,0,ground,iw,1,HAZE);
   if(gh>7){rect(g,0,ground+3,iw,1,INK);dither(g,0,ground+4,iw,gh-4,2,DUSK);for(let x=(s%9);x<iw;x+=18)rect(g,x,ground+Math.floor(gh*.6),8,1,HAZE);}
   if(!thumbnail){for(const lx of [Math.floor((X(1)-Q.wallT)/2),Math.floor((X(Q.cols-1)+Q.wallT+iw)/2)]){if(lx<6||lx>iw-6)continue;const ph=Math.min(Math.floor(H*.45),40),py=ground-ph;rect(g,lx,py,1,ph,INK);rect(g,lx-3,py-1,7,2,INK);rect(g,lx-2,py+1,5,1,PAPER);
     for(let i=0;i<ph;i++){const wd=Math.floor(2+i*.45);dither(g,lx-wd,py+2+i,wd*2+1,1,i<ph*.5?3:2,MIST);}dither(g,lx-12,ground,25,2,6,MIST);}}
  }

  // ---- Building layer: shell, rooms, décor, ladders. Two variants: lights on / off. ----
  function building(g,l,lit){
   const {rows,cols,cw,fh,slab,y0,H,wallT,thumbnail}=Q,left=X(1)-wallT,right=X(cols-1)+wallT,s=seedOf(l.id||'x');
   const room=lit?WALL:NIGHT,deco=lit?MIST:DUSK,deco2=lit?HAZE:DUSK,line=lit?INK:HAZE;
   // shell: brick facade in the exterior walls and parapet
   const brick=tile(g,'brick'+lit,8,6,t=>{t.fillStyle=DUSK;t.fillRect(0,0,8,6);t.fillStyle=NIGHT;t.fillRect(0,2,8,1);t.fillRect(0,5,8,1);t.fillRect(3,0,1,2);t.fillRect(7,3,1,2);t.fillStyle=HAZE;t.fillRect(0,0,3,1);t.fillRect(4,3,3,1);});
   g.fillStyle=brick;g.fillRect(left,y0,right-left,H);
   rect(g,left-1,y0,1,H,INK);rect(g,right,y0,1,H,INK);
   // parapet and cornice
   rect(g,left-2,y0-3,right-left+4,3,INK);rect(g,left-2,y0-3,right-left+4,1,MIST);
   // rooftop props
   if(!thumbnail){
    const tx=left+Math.round(cw*.6),tw=Math.max(12,Math.round(cw*.55)),th=Math.max(9,Math.round(fh*.38)),ty=y0-3-th-6;
    rect(g,tx+2,ty+th,1,7,INK);rect(g,tx+tw-3,ty+th,1,7,INK);rect(g,tx+2,ty+th+3,tw-4,1,INK);
    rect(g,tx,ty,tw,th,INK);rect(g,tx+1,ty+1,tw-2,th-2,DUSK);for(let yy=ty+3;yy<ty+th-1;yy+=3)rect(g,tx+1,yy,tw-2,1,HAZE);rect(g,tx-1,ty-2,tw+2,2,INK);rect(g,tx+Math.floor(tw/2)-2,ty-4,4,2,INK);
    const ax=right-Math.round(cw*.7);rect(g,ax,y0-3-22,1,22,INK);rect(g,ax-3,y0-3-15,7,1,INK);rect(g,ax-2,y0-3-19,5,1,INK);
    const hx=right-Math.round(cw*2.2),hw=Math.max(14,Math.round(cw*.7));rect(g,hx,y0-3-9,hw,9,INK);rect(g,hx+1,y0-3-8,hw-2,7,DUSK);rect(g,hx+3,y0-3-6,hw-6,5,NIGHT);for(let i=0;i<3;i++)rect(g,hx+4+i*2,y0-3-5,1,3,HAZE);
   }
   for(let y=0;y<rows;y++){const yy=Q.top[y],h=Q.hh[y];
    for(let x=1;x<cols-1;x++){const ch=l.map[y][x],xx=X(x);
     if(!(y%2)){ // slab row
      if(ch!=='#'){rect(g,xx,yy,cw,h,room);ladder(g,xx,yy,h,lit,true);rect(g,xx,yy,1,h,INK);rect(g,xx+cw-1,yy,1,h,INK);}
      else{rect(g,xx,yy,cw,h,INK);rect(g,xx,yy,cw,1,y===0?INK:lit?HAZE:DUSK);if(y>0&&y<rows-1)dither(g,xx,yy+1,cw,1,4,DUSK);}
      continue;}
     if(ch==='#'){rect(g,xx,yy,cw,h,INK);g.fillStyle=tile(g,'inner',8,6,t=>{t.fillStyle=INK;t.fillRect(0,0,8,6);t.fillStyle=NIGHT;t.fillRect(0,2,8,1);t.fillRect(0,5,8,1);t.fillRect(3,0,1,2);t.fillRect(7,3,1,2);});g.fillRect(xx+2,yy,cw-4,h);continue;}
     // room cell: back wall, wainscot, ceiling shadow
     rect(g,xx,yy,cw,h,room);
     const wain=Math.round(fh*.32),paper=Math.floor(hash(y,99,s)*4);
     if(!thumbnail){g.fillStyle=wallpaper(g,paper,lit);g.fillRect(xx,yy+3,cw,h-wain-4);}
     dither(g,xx,yy+h-wain,cw,wain,lit?5:6,deco);rect(g,xx,yy+h-wain-1,cw,1,deco);if(paper===2)rect(g,xx,yy+Math.round(fh*.16),cw,1,deco);
     dither(g,xx,yy,cw,2,lit?8:10,lit?MIST:INK);dither(g,xx,yy+2,cw,3,lit?3:4,lit?MIST:INK);
     if(!lit)dither(g,xx,yy+h-wain-6,cw,5,2,DUSK);
     rect(g,xx,yy+h-1,cw,1,lit?MIST:DUSK);
    }
   }
   // décor on the back walls (never ink-black, never lime: those belong to things you use)
   if(!thumbnail)for(let y=1;y<rows-1;y+=2)for(let x=1;x<cols-1;x++){
    const ch=l.map[y][x];if(ch!=='.'||l.map[y-1][x]==='.'||[...l.lasers,...l.cameras].some(d=>d.x===x&&d.y===y))continue;
    const r=hash(x,y,s),xx=X(x),yy=Q.top[y],m=xx+Math.floor(cw/2);
    if(r<.24)painting(g,m,yy,r,lit);else if(r<.44)windowPane(g,m,yy,lit,x,y,s);else if(r<.54)shelf(g,m,yy,lit);else if(r<.6)clock(g,m,yy,lit);else if(r<.68)poster(g,m,yy,lit,r);else if(r<.74)pipe(g,xx,yy,lit);
   }
   // ceiling lamps: pools of light on the floor when lit, dead tubes when dark
   if(!thumbnail)for(let y=1;y<rows-1;y+=2)for(let x=1;x<cols-1;x++){
    const ch=l.map[y][x];if(ch==='#'||(x+y)%2||l.map[y-1][x]!=='#')continue;const m=X(x)+Math.floor(cw/2),yy=Q.top[y];
    const cord=Math.max(2,Math.round(fh*.1));rect(g,m,yy,1,cord,INK);rect(g,m-2,yy+cord,5,1,INK);rect(g,m-3,yy+cord+1,7,2,INK);rect(g,m-2,yy+cord+3,5,1,lit?PAPER:DUSK);
    if(lit){dither(g,m-5,yy+cord+4,11,2,4,PAPER);const pw=Math.floor(cw*.8),fl=floorY(y);dither(g,m-Math.floor(pw/2),fl-3,pw,2,5,PAPER);dither(g,m-Math.floor(pw/2)-3,fl-5,pw+6,2,2,PAPER);}
   }
   // ladders inside rooms below a hatch
   for(let y=1;y<rows-1;y+=2)for(let x=1;x<cols-1;x++)if(l.map[y-1][x]==='.'&&l.map[y][x]!=='#')ladder(g,X(x),Q.top[y],Q.hh[y],lit,false);
   // moonlight shafts from windows when the power is out
   if(!lit&&!thumbnail)for(let y=1;y<rows-1;y+=2)for(let x=1;x<cols-1;x++){const ch=l.map[y][x];if(ch!=='.'||l.map[y-1][x]==='.'||[...l.lasers,...l.cameras].some(d=>d.x===x&&d.y===y))continue;const r=hash(x,y,s);if(r<.24||r>=.44)continue;
    const m=X(x)+Math.floor(cw/2),ww=win(cw),wy=Q.top[y]+Math.round(fh*.18)+Math.round(fh*.42),fl=floorY(y);for(let yy=wy;yy<fl;yy++){const sh=Math.round((yy-wy)*.5);dither(g,m-Math.floor(ww/2)+sh,yy,ww,1,yy>fl-3?5:3,MIST);}}
  }
  const win=cw=>Math.max(8,Math.min(16,Math.round(cw*.42)));
  // Four quiet wallpapers, one per floor: pinstripe, lattice, plain with rail, panels.
  function wallpaper(g,kind,lit){const a=lit?WALL:NIGHT,f=lit?'#dcd6ef':'#1d1940';return tile(g,'paper'+kind+lit,8,8,t=>{t.fillStyle=a;t.fillRect(0,0,8,8);t.fillStyle=f;
   if(kind===0){t.fillRect(0,0,1,8);t.fillRect(4,0,1,8);}else if(kind===1){for(const [x,y] of [[0,0],[1,1],[2,2],[3,3],[4,4],[5,3],[6,2],[7,1]])t.fillRect(x,y,1,1);t.fillRect(4,6,1,1);}else if(kind===3){t.fillRect(0,0,8,1);t.fillRect(0,0,1,8);}else{t.fillRect(2,3,1,1);t.fillRect(6,7,1,1);}});}
  function ladder(g,x,y,h,lit,hatch){const cw=Q.cw,a=x+Math.round(cw*.3),bb=x+Math.round(cw*.7),col=lit?INK:MIST,rung=lit?HAZE:HAZE;
   rect(g,a,y,2,h,col);rect(g,bb-2,y,2,h,col);for(let q=y+3;q<y+h;q+=5)rect(g,a+2,q,bb-a-4,1,lit?INK:HAZE);if(!lit)rect(g,a,y,1,h,PAPER);if(hatch){rect(g,x,y,cw,1,lit?HAZE:DUSK);}}
  function painting(g,m,y,r,lit){const w=Math.max(9,Math.min(18,Math.round(Q.cw*.46))),h=Math.max(7,Math.round(Q.fh*.3)),x=m-Math.floor(w/2),yy=y+Math.round(Q.fh*.2),fr=lit?HAZE:DUSK;
   rect(g,x,yy,w,h,fr);rect(g,x+1,yy+1,w-2,h-2,lit?(r<.08?MIST:r<.16?WALL:MIST):NIGHT);
   if(r<.08){rect(g,x+2,yy+Math.floor(h*.6),w-4,1,lit?HAZE:DUSK);rect(g,x+w-5,yy+2,2,2,lit?PAPER:DUSK);dither(g,x+2,yy+Math.floor(h*.6)+1,w-4,h-Math.floor(h*.6)-2,8,lit?HAZE:DUSK);}
   else if(r<.16){const cx=x+Math.floor(w/2);rect(g,cx-2,yy+2,4,3,lit?HAZE:DUSK);rect(g,cx-3,yy+5,6,h-6,lit?HAZE:DUSK);}
   else{rect(g,x+2,yy+2,Math.floor(w/3),h-4,lit?HAZE:DUSK);rect(g,x+2+Math.floor(w/3),yy+Math.floor(h/2),Math.floor(w/3),h-Math.floor(h/2)-2,lit?DUSK:DUSK);}
   rect(g,m,yy-2,1,2,fr);}
  function windowPane(g,m,y,lit,x,yy0,s){const w=win(Q.cw),h=Math.max(8,Math.round(Q.fh*.42)),xx=m-Math.floor(w/2),yy=y+Math.round(Q.fh*.18),fr=lit?HAZE:MIST;
   rect(g,xx-1,yy-1,w+2,h+2,fr);rect(g,xx,yy,w,h,NIGHT);dither(g,xx,yy+Math.floor(h*.55),w,h-Math.floor(h*.55),6,DUSK);
   const sx=xx+Math.floor(hash(x,yy0,s+3)*(w-2))+1;rect(g,sx,yy+2,1,1,MIST);if(hash(x,yy0,s+4)<.5)rect(g,xx+1,yy+h-4,Math.floor(w/3),3,DUSK);
   rect(g,m,yy,1,h,fr);rect(g,xx,yy+Math.floor(h/2),w,1,fr);rect(g,xx-2,yy+h+1,w+4,1,fr);if(!lit){rect(g,xx,yy,1,h,PAPER);rect(g,xx,yy,w,1,PAPER);}}
  function shelf(g,m,y,lit){const w=Math.max(10,Math.min(20,Math.round(Q.cw*.5))),h=Math.max(10,Math.round(Q.fh*.48)),x=m-Math.floor(w/2),yy=y+Q.fh-Math.round(Q.fh*.32)-h,fr=lit?HAZE:DUSK;
   rect(g,x,yy,w,h,fr);rect(g,x+1,yy+1,w-2,h-2,lit?WALL:NIGHT);for(let r=0;r<2;r++){const ry=yy+1+Math.floor(r*(h-2)/2),rh=Math.floor((h-2)/2);rect(g,x+1,ry+rh-1,w-2,1,fr);for(let i=x+2;i<x+w-2;i+=2)if(hash(i,ry,7)<.75)rect(g,i,ry+1+Math.floor(hash(i,ry,8)*2),1,rh-2-Math.floor(hash(i,ry,8)*2),hash(i,ry,9)<.5?(lit?HAZE:DUSK):(lit?MIST:DUSK));}}
  function clock(g,m,y,lit){const yy=y+Math.round(Q.fh*.22),fr=lit?HAZE:DUSK;rect(g,m-3,yy,7,7,fr);rect(g,m-2,yy+1,5,5,lit?PAPER:NIGHT);rect(g,m,yy+2,1,2,fr);rect(g,m,yy+3,2,1,fr);}
  function poster(g,m,y,lit,r){const w=Math.max(7,Math.round(Q.cw*.28)),h=Math.max(9,Math.round(Q.fh*.36)),x=m-Math.floor(w/2)+(r<.64?-3:3),yy=y+Math.round(Q.fh*.2);rect(g,x,yy,w,h,lit?MIST:DUSK);rect(g,x+1,yy+1,w-2,Math.floor(h*.45),lit?HAZE:NIGHT);for(let i=yy+Math.floor(h*.45)+2;i<yy+h-1;i+=2)rect(g,x+1,i,w-2-((i>>1)&1)*2,1,lit?HAZE:NIGHT);}
  function pipe(g,x,y,lit){const yy=y+3;rect(g,x,yy,Q.cw,2,lit?HAZE:DUSK);rect(g,x,yy,Q.cw,1,lit?MIST:DUSK);const m=x+Math.floor(Q.cw/2);rect(g,m-1,yy-1,3,4,lit?DUSK:DUSK);}

  function ensureLayers(l){
   const key=[l.id,l.map.join(''),l.lasers.map(d=>d.x+','+d.y).join(';'),l.cameras.map(d=>d.x+','+d.y).join(';'),Q.iw,Q.ih,Q.cw,Q.fh,Q.slab,Q.y0,Q.thumbnail,Q.pan].join('|');
   const bgKey=key+'|'+(Q.pan?0:Q.x0);
   if(layers.bgKey!==bgKey){layers.bgKey=bgKey;layers.bg=layers.bg||document.createElement('canvas');layers.bg.width=Q.iw;layers.bg.height=Q.ih;const save=Q.x0;if(Q.pan)Q={...Q,x0:Math.round((Q.iw-Q.cols*Q.cw)/2)};backdrop(layers.bg.getContext('2d',{alpha:false}),l);Q={...Q,x0:save};}
   if(layers.bKey!==key){layers.bKey=key;layers.lit=null;layers.dark=null;}
  }
  function layer(l,lit){const name=lit?'lit':'dark';if(!layers[name]){const pad=32,cv=document.createElement('canvas');cv.width=Q.cols*Q.cw+pad*2;cv.height=Q.ih;const g=cv.getContext('2d');const save=Q;Q={...Q,x0:pad};building(g,l,lit);Q=save;layers[name]=cv;layers.pad=pad;}return layers[name];}

  // ---- Interactive objects: ink outline + paper/mist body so they read on plaster and in darkness ----
  function objects(g,l,s,lit,time,still){
   const {rows,cols,cw,fh}=Q,chips=E.positions(l,'o'),blink=still?1:Math.floor(time/450)%2,k=Q.k;
   const vents=E.positions(l,'v');if(vents.length===2){const [a,bb]=vents;const ay=Q.top[a.y]+Math.round(fh*.24),by=Q.top[bb.y]+Math.round(fh*.24);dotted(g,X(a.x)+cw/2,ay,X(bb.x)+cw/2,by,lit?HAZE:MIST,1,5);}
   for(let y=1;y<rows-1;y+=2)for(let x=1;x<cols-1;x++){
    const ch=l.map[y][x],xx=X(x),T=Q.top[y],F=T+fh,m=xx+Math.floor(cw/2);
    if(ch==='S'){const dw=Math.max(10,Math.round(cw*.42)),dh=Math.min(fh-3,Math.round(fh*.82));rect(g,m-Math.floor(dw/2)-2,F-dh-2,dw+4,dh+2,INK);rect(g,m-Math.floor(dw/2),F-dh,dw,dh,lit?HAZE:DUSK);rect(g,m-Math.floor(dw/2),F-dh,2,dh,lit?MIST:HAZE);rect(g,m-Math.floor(dw/2)-3,F-1,dw+6,1,MIST);label(g,'IN',m,F-dh-11,PAPER,INK,'center');}
    else if(ch==='E'){const dw=Math.max(12,Math.round(cw*.5)),dh=Math.min(fh-2,Math.round(fh*.84)),dx=m-Math.floor(dw/2),dy=F-dh;
     if(!lit||!still){const glow=still?4:4+(Math.floor(time/300)%2);dither(g,dx-5,dy-4,dw+10,dh+4,lit?2:glow,SIG);}
     rect(g,dx-2,dy-2,dw+4,dh+2,INK);rect(g,dx,dy,dw,dh,SIG);rect(g,dx+2,dy+2,dw-4,dh-2,INK);dither(g,dx+2,dy+2,dw-4,dh-2,3,SIG);
     const px=dx+Math.floor(dw/2)-2,py=dy+Math.floor(dh*.35);rect(g,px+1,py,2,2,SIG);rect(g,px,py+2,4,3,SIG);rect(g,px,py+5,1,2,SIG);rect(g,px+3,py+5,1,2,SIG);
     const sw=25,sy=dy-12;rect(g,m-Math.ceil(sw/2)-1,sy-1,sw+2,11,INK);rect(g,m-Math.ceil(sw/2),sy,sw,9,SIG);text(g,'EXIT',m,sy+1,1,INK,'center');}
    else if(ch==='T'){trophy(g,m,F,T,s,time,still,lit);}
    else if(ch==='a'||ch==='b'){const pw=Math.max(8,Math.round(cw*.3));rect(g,m-Math.floor(pw/2),F-10,pw,10,INK);rect(g,m-Math.floor(pw/2)+1,F-9,pw-2,9,lit?MIST:HAZE);rect(g,m-Math.floor(pw/2)-1,F-11,pw+2,2,INK);
     if(!(s.keys&(ch==='a'?1:2))){const cy=F-11-12+(still?0:Math.round(Math.sin(time/300+x)));rect(g,m-6,cy,13,11,INK);rect(g,m-5,cy+1,11,9,SIG);text(g,ch,m-2,cy+2,1,INK);if(!still&&(Math.floor(time/220)+x)%9===0){rect(g,m+6,cy-2,1,3,PAPER);rect(g,m+5,cy-1,3,1,PAPER);}}}
    else if('ABDR'.includes(ch)){const open=E.doorOpen(l,s,ch),dw=Math.max(12,Math.round(cw*.46)),dx=m-Math.floor(dw/2),dy=T+1;
     if(!open){rect(g,dx-2,dy,dw+4,fh-1,INK);rect(g,dx,dy+1,dw,fh-2,lit?HAZE:DUSK);rect(g,dx,dy+1,1,fh-2,MIST);for(let q=dy+4;q<F-2;q+=5)rect(g,dx+2,q,dw-4,1,lit?DUSK:NIGHT);rect(g,dx+dw-3,dy+Math.floor(fh*.55),2,2,MIST);
      const by=T+Math.round(fh*.25);rect(g,m-6,by,13,12,INK);rect(g,m-5,by+1,11,10,SIG);text(g,ch,m-2,by+3,1,INK);}
     else{dither(g,dx,dy+2,dw,fh-3,lit?5:3,lit?HAZE:INK);rect(g,dx-2,dy,2,fh-1,INK);rect(g,dx+dw,dy,2,fh-1,INK);rect(g,dx-2,dy,dw+4,3,INK);rect(g,dx-1,dy+3,1,fh-4,MIST);rect(g,dx+dw+1,dy+3,1,fh-4,MIST);rect(g,dx,dy+2,dw,1,MIST);rect(g,m-4,dy+4,9,11,INK);rect(g,m-3,dy+5,7,9,lit?PAPER:MIST);text(g,ch,m-2,dy+6,1,INK);rect(g,m-1,dy+16,3,2,INK);rect(g,m,dy+16,1,1,SIG);}}
    else if(ch==='G'||ch==='H'){const open=E.doorOpen(l,s,ch),gw=Math.max(14,Math.round(cw*.62)),gx=m-Math.floor(gw/2),hb=open?Math.max(3,Math.round(fh*.18)):fh-2;
     rect(g,gx-1,T,gw+2,4,INK);rect(g,gx,T+1,gw,1,MIST);for(let i=0;i<5;i++){const bx=gx+Math.round(i*(gw-2)/4);rect(g,bx,T+3,2,hb,INK);rect(g,bx,T+3,1,hb,MIST);}if(!open)rect(g,gx,T+Math.floor(fh*.55),gw,2,INK);
     if(open)label(g,ch,gx-5,T+2,MIST,INK,'center');else{const by=T+Math.floor(fh*.22);rect(g,m-6,by,13,11,INK);rect(g,m-5,by+1,11,9,SIG);text(g,ch,m-2,by+2,1,INK);}}
    else if(ch==='1'||ch==='2'){const on=s.switches&(ch==='1'?1:2),by=T+Math.round(fh*.3);rect(g,m-6,by,13,15,INK);rect(g,m-5,by+1,11,13,on?SIG:PAPER);rect(g,m-3,by+3,7,9,INK);rect(g,m-2,by+(on?4:8),5,3,on?SIG:MIST);rect(g,m,by+15,1,F-by-15,INK);label(g,ch,m,by-10,PAPER,INK,'center');}
    else if(ch==='p'||ch==='P'){const held=E.held(l,s,ch==='p'?0:1),pw=Math.max(14,Math.round(cw*.62));rect(g,m-Math.floor(pw/2)-1,F-4,pw+2,4,INK);rect(g,m-Math.floor(pw/2),F-3,pw,2,held?SIG:MIST);if(held&&!still)dither(g,m-Math.floor(pw/2),F-8,pw,4,3+(Math.floor(time/250)%2),SIG);label(g,ch==='p'?'P1':'P2',m,F-15,held?SIG:PAPER,INK,'center');}
    else if(ch==='o'){const i=chips.findIndex(p=>p.x===x&&p.y===y);const dk=Math.max(12,Math.round(cw*.42));rect(g,m-Math.floor(dk/2),F-8,dk,2,INK);rect(g,m-Math.floor(dk/2)+1,F-6,1,6,INK);rect(g,m+Math.floor(dk/2)-2,F-6,1,6,INK);rect(g,m-Math.floor(dk/2),F-8,dk,1,lit?HAZE:MIST);
     if(!(s.intel&(1<<i))){const fy=F-17;rect(g,m-5,fy,10,9,INK);rect(g,m-4,fy+1,8,7,PAPER);rect(g,m-3,fy+1,5,3,HAZE);rect(g,m-3,fy+5,6,1,INK);if(!still&&(Math.floor(time/200)+x*3)%11===0){rect(g,m+5,fy-3,1,3,SIG);rect(g,m+4,fy-2,3,1,SIG);}}}
    else if(ch==='v'){const vw=Math.max(14,Math.round(cw*.56)),vy=T+Math.round(fh*.14),vh=10;rect(g,m-Math.floor(vw/2)-1,vy-1,vw+2,vh+2,INK);rect(g,m-Math.floor(vw/2),vy,vw,vh,MIST);for(let j=0;j<3;j++)rect(g,m-Math.floor(vw/2)+1,vy+2+j*3,vw-2,1,INK);label(g,'VENT',m,vy+vh+3,lit?INK:MIST,lit?WALL:NIGHT,'center');}
    else if(ch==='l'){const by=T+Math.round(fh*.34);if(!lit&&!still)dither(g,m-10,by-6,21,24,2+(Math.floor(time/400)%2),SIG);rect(g,m-5,by,11,14,INK);rect(g,m-4,by+1,9,12,lit?SIG:PAPER);rect(g,m-1,by+(lit?3:7),3,4,INK);label(g,'L',m,by-10,lit?PAPER:SIG,INK,'center');}
   }
   for(const p of s.crates){const size=Math.max(8,Math.min(Math.round(cw*.6),Math.round(fh*.5))),xx=X(p.x)+Math.floor((cw-size)/2),yy=floorY(p.y)-size;
    rect(g,xx,yy,size,size,INK);rect(g,xx+1,yy+1,size-2,size-2,lit?MIST:HAZE);rect(g,xx+1,yy+1,size-2,1,PAPER);for(let q=yy+Math.floor(size/3);q<yy+size-1;q+=Math.floor(size/3))rect(g,xx+1,q,size-2,1,lit?HAZE:DUSK);
    for(let i=2;i<size-2;i++)rect(g,xx+i,yy+size-1-i,1,1,INK);rect(g,xx+2,yy+2,1,1,INK);rect(g,xx+size-3,yy+2,1,1,INK);rect(g,xx+2,yy+size-3,1,1,INK);rect(g,xx+size-3,yy+size-3,1,1,INK);}
  }
  function trophy(g,m,F,T,s,time,still,lit){const cw=Q.cw,fh=Q.fh,pw=Math.max(12,Math.round(cw*.42)),ph=Math.max(7,Math.round(fh*.28)),px=m-Math.floor(pw/2),py=F-ph;
   // spotlight from the ceiling
   if(!s.relic&&!lit)dither(g,m-8,F-ph-Math.round(fh*.36)-6,17,Math.round(fh*.36)+6,still?3:3+(Math.floor(time/600)%2),SIG);
   if(!s.relic&&lit)for(let i=0;i<fh-ph-2;i++){const wd=3+Math.floor(i*.35);dither(g,m-wd,T+2+i,wd*2+1,1,3,PAPER);}
   rect(g,px-1,py,pw+2,ph,INK);rect(g,px,py+1,pw,ph-1,MIST);for(let q=px+2;q<px+pw-1;q+=3)rect(g,q,py+2,1,ph-2,HAZE);rect(g,px-2,py,pw+4,2,INK);rect(g,px-1,py,pw+2,1,PAPER);
   const cwid=Math.max(pw-2,15),ch=Math.max(14,Math.round(fh*.42)),cx=m-Math.floor(cwid/2),cy=py-ch;
   if(!s.relic){rect(g,cx,cy,cwid,ch,INK);dither(g,cx+1,cy+1,cwid-2,ch-1,5,MIST,NIGHT);rect(g,cx+1,cy+1,1,ch-2,PAPER);
    const gx=m,gy=cy+Math.floor(ch/2)+(still?0:Math.round(Math.sin(time/380)));bitmap(g,CUP,gx-5,gy-5,{k:INK,g:SIG,w:PAPER});
    if(!still){const t=Math.floor(time/160)%14;if(t<3){rect(g,gx+3+t,gy-5-t,1,1,PAPER);rect(g,gx-4-t,gy-4-t,1,1,SIG);}}}
   else{for(let q=cx;q<cx+cwid;q+=3)rect(g,q,cy,1,1,MIST);rect(g,cx,cy,1,ch,MIST);rect(g,cx+cwid-1,cy,1,ch,MIST);}}

  // ---- Hazards ----
  function visionCells(h){const by=new Map();for(const p of h.vision){const key=p.type+p.source;if(!by.has(key))by.set(key,[]);by.get(key).push(p);}return by;}
  function coneFrom(g,ox,oy,cells,level,fade=1,dir='E'){ // widening dither beam from (ox,oy) across the listed cells
   if(!cells.length)return;const last=cells.at(-1),hor='EW'.includes(dir),cw=Q.cw;
   if(hor){const dirE=dir==='E',x1=dirE?X(last.x)+cw:X(last.x),y=cells[0].y,T=Q.top[y]+2,F=floorY(y)-1,len=Math.abs(x1-ox);
    for(let i=0;i<len;i++){const x=dirE?ox+i:ox-i-1,q=i/len,top=Math.round(oy-(oy-T)*Math.min(1,q*1.6)),bot=Math.round(oy+(F-oy)*Math.min(1,q*1.25));dither(g,x,top,1,bot-top,Math.max(1,Math.round(level*fade*(1-q*.35))),SIG);}}
   else{for(const p of cells){dither(g,X(p.x)+2,Q.top[p.y],cw-4,Q.hh[p.y],Math.round(level*fade),SIG);}}}
  function visionFill(g,cells,lit,fade=1){for(const p of cells){const x=X(p.x),y=Q.top[p.y],h=Q.hh[p.y];dither(g,x,y+1,Q.cw,h-1,Math.max(1,Math.round((lit?4:5)*fade)),SIG);if(p.y%2){rect(g,x,y+h-2,Q.cw,1,SIG);for(let i=x;i<x+Q.cw;i+=4)rect(g,i,y+h-1,2,1,INK);}}}
  // Dashed cell outline in two tones: visible on plaster and in darkness.
  function mark(g,p,lbl='',color=SIG){if(!p||p.y<0||p.y>=Q.rows||p.x<0||p.x>=Q.cols)return;const x=X(p.x),y=Q.top[p.y],hh=Q.hh[p.y],cw=Q.cw,edge=color===SIG?INK:PAPER,core=color===SIG?SIG:INK;
   const dash=(a,bq,w,h)=>{rect(g,a-1,bq-1,w+2,h+2,edge);rect(g,a,bq,w,h,core);};
   for(let q=x+1;q<x+cw-3;q+=6){dash(q,y+1,3,1);dash(q,y+hh-2,3,1);}for(let q=y+1;q<y+hh-3;q+=6){dash(x+1,q,1,3);dash(x+cw-2,q,1,3);}
   if(lbl)labels.push([lbl,x,p.y%2?y-11:y+hh+1,color]);}
  let labels=[];
  function flushLabels(g){for(const [lbl,x,y,color] of labels){const w=Math.max(20,lbl.length*6+5);rect(g,x,y,w,11,INK);rect(g,x+1,y+1,w-2,9,color===SIG?SIG:PAPER);text(g,lbl,x+3,y+2,1,INK);}labels=[];}
  function lasers(g,l,s,lit,time,still){const {cw,fh}=Q;
   for(const d of l.lasers){const m=X(d.x)+Math.floor(cw/2),T=Q.top[d.y],F=T+Q.hh[d.y],on=E.active(d,s,s.turn),ray=E.ray(l,s,d.x,d.y,d.dir,d.range),by=F-Math.round(fh*.43),hor='EW'.includes(d.dir);
    if(ray.length){const end=ray.at(-1),ex=hor?X(end.x)+(d.dir==='E'?cw:0):m,ey=hor?by:Q.top[end.y]+(d.dir==='S'?Q.hh[end.y]:0);
     if(on){if(hor){const a=Math.min(m,ex),w=Math.abs(ex-m);dither(g,a,by-4,w,2,lit?3:5,SIG);dither(g,a,by+3,w,2,lit?3:5,SIG);rect(g,a,by-2,w,5,INK);rect(g,a,by-1,w,3,SIG);rect(g,a,by,w,1,PAPER);if(!still)for(let i=0;i<w;i+=7){const q=(i*13+Math.floor(time/60)*7)%w;rect(g,a+q,by-1,2,1,PAPER);}}
      else{const a=Math.min(by,ey),h=Math.abs(ey-by);rect(g,m-2,a,5,h,INK);rect(g,m-1,a,3,h,SIG);rect(g,m,a,1,h,PAPER);}}
     else{if(hor){for(let i=Math.min(m,ex);i<Math.max(m,ex);i+=4)rect(g,i,by,2,1,lit?HAZE:MIST);}else for(let i=Math.min(by,ey);i<Math.max(by,ey);i+=4)rect(g,m,i,1,2,lit?HAZE:MIST);}}
    // emitter post
    const ph=Math.round(fh*.62);rect(g,m-3,F-ph,7,ph,INK);rect(g,m-2,F-ph+1,1,ph-1,lit?HAZE:MIST);rect(g,m-5,F-2,11,2,INK);
    const hx=hor?(d.dir==='E'?m+1:m-5):m-2;rect(g,hx-1,by-3,6,7,INK);rect(g,hx,by-2,4,5,on?SIG:DUSK);if(on)rect(g,hx+1,by-1,2,2,PAPER);
    if(d.circuit!=null)label(g,String(d.circuit+1),m,F-ph-10,PAPER,INK,'center');}}
  function cameras(g,l,s,lit,time,still){
   for(const [i,d] of l.cameras.entries()){const x=X(d.x)+Math.floor(Q.cw/2),y=Q.top[d.y],ro=d.rotation||[d.dir],dir=ro[((Math.floor(s.turn/(d.speed||2))+(d.phase||0))%ro.length+ro.length)%ro.length],live=!(E.sensorsPaused?.(s)||s.empLeft>0)&&!(d.afterRelic&&!s.relic)&&!(d.circuit!=null&&(s.switches&(1<<d.circuit)));
    const led=live?(still||Math.floor(time/500+i)%3?SIG:PAPER):DUSK,pal={k:INK,m:lit?MIST:HAZE,w:lit?PAPER:MIST,g:led};
    if(dir==='S'||dir==='N')bitmap(g,CAMERA_DOWN,x-5,y,pal);else bitmap(g,CAMERA,dir==='W'?x-9:x-3,y,pal,1,dir==='W');
    if(d.afterRelic&&!s.relic)label(g,'ARMED',x,y+12,MIST,INK,'center');if(d.circuit!=null)label(g,String(d.circuit+1),x+(dir==='W'?8:-8),y+1,PAPER,INK,'center');}}
  function lensOf(d,dir){const x=X(d.x)+Math.floor(Q.cw/2),y=Q.top[d.y];return dir==='W'?[x-9,y+4]:dir==='E'?[x+9,y+4]:[x,y+9];}

  // ---- Guards: walkers (security staff with flashlights) and hover drones ----
  function guardPose(l,gd,time){const src=l.guards[gd.source]||{},tw=mem.guardTw,prev=tw?.from?.[gd.source];let x=X(gd.x)+Q.cw/2,y=gd.y,moving=false,t=1;
   if(prev&&tw&&time<tw.end&&!(prev.x===gd.x&&prev.y===gd.y)){t=ease((time-tw.start)/(tw.end-tw.start));x=X(prev.x)+Q.cw/2+(X(gd.x)-X(prev.x))*t;moving=true;}
   const fy=prev&&moving&&prev.y!==gd.y?foot(prev.y)+(foot(gd.y)-foot(prev.y))*t:foot(gd.y);return {x,fy,moving,walker:src.kind==='walker'};}
  function guards(g,l,s,h,lit,time,still){
   const cells=visionCells(h);
   for(const gd of h.guards){const pose=guardPose(l,gd,time),dir=gd.dir,flip=dir==='W',sight=cells.get('guard'+gd.source)||cells.get('walker'+gd.source)||[];
    if(pose.walker){const walkF=still?0:pose.moving?Math.floor(time/70)%4:0,bob=(walkF%2)?-1:0,gx=Math.round(pose.x-7),gy=Math.round(pose.fy-21+bob);
     const pal={k:INK,u:lit?DUSK:DUSK,h:HAZE,m:MIST,w:PAPER,g:SIG};
     if(dir==='N'||dir==='S'){bitmap(g,GUARD_FRONT,gx,Math.round(pose.fy-21),pal);}
     else{outlineBitmap(g,GUARD_TOP,gx,gy,flip,lit);bitmap(g,GUARD_TOP,gx,gy,pal,1,flip);outlineBitmap(g,GUARD_LEGS[walkF],gx,gy+16,flip,lit);bitmap(g,GUARD_LEGS[walkF],gx,gy+16,pal,1,flip);
      // flashlight lens
      const lx=flip?gx:gx+13;rect(g,lx,gy+11,1,1,sight.length?SIG:MIST);}}
    else{const bob=still?0:Math.round(Math.sin(time/220+gd.source)*1.5),dy=Math.round(Q.top[gd.y]+Q.hh[gd.y]*.34)+bob,dx=Math.round(pose.x-8);
     if(gd.y%2)dither(g,Math.round(pose.x-7),floorY(gd.y)-2,15,2,lit?6:4,lit?HAZE:INK);
     const eye=sight.length||(l.guards[gd.source]?.range===0)?SIG:DUSK,pal={k:INK,u:DUSK,m:lit?HAZE:MIST,w:PAPER,h:HAZE,g:eye};outlineBitmap(g,DRONE,dx,dy,flip,lit);bitmap(g,DRONE,dx,dy,pal,1,flip);bitmap(g,ROTOR[still?0:Math.floor(time/40)%3],dx,dy-1,pal);if(!still&&sight.length&&Math.floor(time/300)%2)rect(g,flip?dx+2:dx+13,dy+5,2,1,PAPER);}}}
  function outlineBitmap(g,art,x,y,flip,lit){if(lit)return;const pal={};for(const ch of 'kuhmwg')pal[ch]=PAPER;for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])bitmap(g,art,x+dx,y+dy,{k:MIST,u:MIST,h:MIST,m:MIST,w:MIST,g:MIST},1,flip);}
  function guardBeams(g,l,s,h,lit,time,fade){const cells=visionCells(h);
   for(const gd of h.guards){const sight=cells.get('guard'+gd.source)||cells.get('walker'+gd.source);if(!sight?.length)continue;const pose=guardPose(l,gd,time);
    if(pose.walker&&'EW'.includes(gd.dir)){const gx=Math.round(pose.x-7),gy=Math.round(pose.fy-21);coneFrom(g,gd.dir==='W'?gx:gx+14,gy+11,sight,lit?7:9,fade,gd.dir);}
    else{const dx=Math.round(pose.x),dy=Math.round(Q.top[gd.y]+Q.hh[gd.y]*.34)+(gd.y%2?0:0)+5;coneFrom(g,gd.dir==='W'?dx-6:dx+6,dy,sight,lit?7:9,fade,gd.dir);}}}

  // ---- Frame ----
  function render(l,s,o={}){
   const w=o.width||960,h=o.height||640;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}c.imageSmoothingEnabled=false;
   const time=o.time??performance.now(),still=!!(o.reduced||o.thumbnail),lit=E.lightsOn(l,s);effects=effects.filter(f=>f.end>time);
   // memory of the previous frame drives tweens, ghosts and transitions (visual only)
   const sameLevel=mem.level===l;if(!sameLevel){mem.level=l;mem.turn=s.turn;mem.guards=null;mem.guardTw=null;mem.heroTw=null;mem.ghost=null;mem.flick=null;mem.lit=lit;mem.status=s.status;mem.statusAt=time;camX=null;}
   const hz=E.threats(l,s);
   if(sameLevel&&mem.turn!==s.turn){const step=Math.abs(s.turn-mem.turn)===1,dur=o.anim&&o.anim.end>o.anim.start?Math.max(120,o.anim.end-o.anim.start):150;
    if(step&&!still&&mem.guards)mem.guardTw={from:mem.guards,start:time,end:time+dur};else mem.guardTw=null;
    if(step&&!still&&!o.anim&&mem.heroAt&&(mem.heroAt.x!==s.x||mem.heroAt.y!==s.y))mem.heroTw={from:mem.heroAt,start:time,end:time+dur};
    if(!still&&mem.vision){const now=new Set(hz.vision.map(p=>E.xy(p.x,p.y)));const gone=mem.vision.filter(p=>!now.has(E.xy(p.x,p.y)));mem.ghost=gone.length?{cells:gone,start:time,end:time+380}:null;}
    mem.turn=s.turn;}
   if(sameLevel&&mem.lit!==lit){mem.flick=still?null:{to:lit,start:time};mem.lit=lit;}
   if(mem.status!==s.status){mem.status=s.status;mem.statusAt=time;}
   mem.guards=hz.guards.map(q=>({x:q.x,y:q.y}));mem.vision=hz.vision.map(p=>({x:p.x,y:p.y,type:p.type,source:p.source}));mem.heroAt={x:s.x,y:s.y};
   // hero position (tweened)
   const a=o.anim?.from&&!o.reduced&&time<o.anim.end?o.anim:mem.heroTw&&time<mem.heroTw.end?mem.heroTw:null;let tt=1;if(a)tt=ease((time-a.start)/(a.end-a.start));
   const from=a?a.from:{x:s.x,y:s.y},focusX=from.x+(s.x-from.x)*tt;
   Q=layout(l,w,h,o.thumbnail,focusX);
   // smooth camera on narrow frames
   if(Q.pan){const target=Q.x0;if(camX==null||still||lastFrame==null)camX=target;else{const dt=Math.max(0,Math.min(100,time-lastFrame));camX+=(target-camX)*(1-Math.exp(-dt/110));if(Math.abs(target-camX)<.5)camX=target;}Q.x0=Math.round(Math.max(Q.minX,Math.min(Q.maxX,camX)));}
   lastFrame=time;
   if(buf.width!==Q.iw||buf.height!==Q.ih){buf.width=Q.iw;buf.height=Q.ih;}
   const g=b;g.imageSmoothingEnabled=false;ensureLayers(l);labels=[];
   g.drawImage(layers.bg,0,0);
   const ground=Q.y0+Q.H;
   if(!still)ambientSky(g,l,time,ground);
   // lights: flicker between variants during a transition
   let showLit=lit;if(mem.flick){const t=time-mem.flick.start,seq=[70,60,40,110,50,50];let acc=0,phase=0;for(const d of seq){if(t<acc+d)break;acc+=d;phase++;}if(phase>=seq.length)mem.flick=null;else showLit=phase%2?!mem.flick.to:mem.flick.to;}
   const L=layer(l,showLit);g.drawImage(L,Q.x0-layers.pad,0);
   if(!still)ambientRooms(g,l,s,showLit,time);
   if(!lit)darkness(g,l,s);
   objects(g,l,s,showLit,time,still);
   // vision: cell fields, beams, fading ghosts of cells that just went dark
   const cells=visionCells(hz);
   for(const [key,list] of cells){visionFill(g,list,lit);if(key.startsWith('camera')){const d=l.cameras[list[0].source],ro=d.rotation||[d.dir],dir=ro[((Math.floor(s.turn/(d.speed||2))+(d.phase||0))%ro.length+ro.length)%ro.length],[ox,oy]=lensOf(d,dir);coneFrom(g,ox,oy,list,lit?6:8,1,dir);}}
   guardBeams(g,l,s,hz,lit,time,1);
   if(mem.ghost&&time<mem.ghost.end){const f=1-(time-mem.ghost.start)/(mem.ghost.end-mem.ghost.start);visionFill(g,mem.ghost.cells,lit,f);}else mem.ghost=null;
   const next=o.forecast?E.threats(l,s,s.turn+1):null;
   if(next){const now=new Set([...hz.vision,...hz.lasers].map(p=>E.xy(p.x,p.y)));for(const p of [...next.vision,...next.lasers])if(!now.has(E.xy(p.x,p.y)))mark(g,p,'',INK);for(const p of next.guards)if(!hz.guards.some(q=>E.same(q,p)))mark(g,p,'NEXT',INK);}
   lasers(g,l,s,lit,time,still);cameras(g,l,s,lit,time,still);guards(g,l,s,hz,lit,time,still);
   const {cw}=Q;
   if(o.trace)for(let i=1;i<o.trace.length;i++){const p=o.trace[i-1],q=o.trace[i];dotted(g,X(p.x)+cw/2,foot(p.y)-5,X(q.x)+cw/2,foot(q.y)-5,INK,3,6);dotted(g,X(p.x)+cw/2,foot(p.y)-5,X(q.x)+cw/2,foot(q.y)-5,SIG,2,6);}
   if(o.editor){for(let x=1;x<Q.cols;x++)dotted(g,X(x),Q.y0,X(x),Q.y0+Q.H,lit?HAZE:MIST,1,4);}
   if(o.inspection)mark(g,o.inspection,'SCAN');
   if(o.incident){const d=o.incident;mark(g,d.origin,d.id);mark(g,d.target,'CAUGHT');const ax=X(d.origin.x)+cw/2,ay=Q.top[d.origin.y]+Q.hh[d.origin.y]*.35,bx=X(d.target.x)+cw/2,by=foot(d.target.y)-8;dotted(g,ax,ay,bx,by,INK,4,6);dotted(g,ax+1,ay+1,bx+1,by+1,SIG,2,6);}
   if(o.guide)mark(g,o.guide,o.guideLabel||'GO');if(o.hover)mark(g,o.hover);if(o.mutation)mark(g,o.mutation,'NEW');if(o.selected)mark(g,o.selected,'EDIT');
   // golden trail (LIVE BURN cosmetic): lime footprints on the cells just left, never on the Friend
   if(o.trail){const kk=Math.max(1,Math.round(cw/24)),n=o.trail.length;o.trail.forEach((t,i)=>{if(t.x===s.x&&t.y===s.y)return;const fresh=i>=n-5,px=X(t.x)+cw/2,py=foot(t.y)-kk-1;for(const [dx,dy] of [[-kk*2.6,0],[kk*0.6,-kk*1.2]]){rect(g,px+dx-1,py+dy-1,kk*2+2,kk+2,INK);rect(g,px+dx,py+dy,kk*2,kk,fresh?SIG:PAPER);}});}
   // the Friend
   let fx=X(s.x)+cw/2,fy=foot(s.y),moving=false;
   if(a){fx=X(a.from.x)+cw/2+(fx-X(a.from.x)-cw/2)*tt;fy=foot(a.from.y)+(fy-foot(a.from.y))*tt;moving=a.from.x!==s.x||a.from.y!==s.y;if(moving&&a.from.y===s.y)fy-=Math.round(Math.sin(tt*Math.PI)*2);}
   const k=Q.k;
   if(!o.hideHero){if(!lit){dither(g,fx-10*k,fy-16*k,20*k,17*k,2,PAPER);rect(g,fx-7*k,fy+1,14*k,1,SIG);}else if(s.y%2)dither(g,fx-6*k,Math.round(foot(s.y)),12*k,1,8,HAZE);
    if(a&&moving&&!still&&s.y%2&&a.from.y===s.y){const t=(time-a.start)/(a.end-a.start),dx=s.x>a.from.x?-1:1;for(let i=0;i<3;i++){const q=Math.min(1,t*1.2);rect(g,fx+dx*(5*k+i*2+q*4),fy-1-i-Math.round(q*2),1,1,lit?HAZE:MIST);}}
    sprite(g,o.sample,fx,fy,k,s.facing||'down',moving,still?0:Math.floor(time/120));
    if(s.relic){const ry=fy-16*k-10;rect(g,fx-5,ry,11,9,INK);rect(g,fx-4,ry+1,9,7,SIG);rect(g,fx-2,ry+2,5,3,INK);rect(g,fx-1,ry+5,3,1,INK);}}
   flushLabels(g);
   const top=fy-16*k-6;
   if(!o.hideHero&&!o.thumbnail)for(const f of effects){const t=(time-f.start)/(f.end-f.start),lift=still?0:Math.round(t*10);
    if(f.e==='alarm'||f.e==='caught'){if(still||Math.floor(t*6)%2===0){rect(g,fx-7,top-18,14,15,INK);rect(g,fx-6,top-17,12,13,f.e==='caught'?PAPER:SIG);text(g,'!',fx-2,top-14,1,INK);}const on=still||Math.floor(t*8)%2===0;if(on){for(let q=0;q<Q.iw;q+=8){rect(g,q,0,4,2,SIG);rect(g,q,Q.ih-2,4,2,SIG);}if(!still)dither(g,X(1),Q.y0,(Q.cols-2)*cw,Q.H,2,SIG);}}
    else{const lbl={relic:'TROPHY',key:'KEY',intel:'INTEL',switch:'SWITCH',vent:'VENT',emp:'EMP'}[f.e];const tw=lbl.length*6+5;rect(g,fx-tw/2,top-8-lift,tw,11,INK);rect(g,fx-tw/2+1,top-7-lift,tw-2,9,f.e==='relic'?SIG:PAPER);text(g,lbl,fx-tw/2+3,top-6-lift,1);
     if(!still&&(f.e==='relic'||f.e==='key'||f.e==='intel'))for(let i=0;i<8;i++){const ang=i*Math.PI/4,r=4+t*14;rect(g,fx+Math.cos(ang)*r,fy-8*k+Math.sin(ang)*r,1,1,i%2?PAPER:SIG);}}}
   endStates(g,l,s,fx,fy,time,still,o);
   if(!o.thumbnail&&l.lighting)lightSign(g,l,s,lit,time,still);
   // floor plaques
   if(!o.thumbnail){const px=X(1)-Q.wallT-16;if(px>=1)for(let y=1;y<Q.rows-1;y+=2){const yy=Q.top[y]+3;rect(g,px,yy,14,11,INK);rect(g,px+1,yy+1,12,9,s.y===y?SIG:MIST);text(g,'F'+(Q.n-(y-1)/2),px+2,yy+2,1,INK);}}
   // blit to the canvas at the Friend's pixel size
   let shake=0;if(!still&&effects.some(f=>f.e==='alarm'||f.e==='caught'))shake=Math.round(Math.sin(time/18)*2)*Q.u;
   c.fillStyle=NIGHT;c.fillRect(0,0,w,h);c.drawImage(buf,0,0,Q.iw,Q.ih,shake,0,Q.iw*Q.u,Q.ih*Q.u);
   const u=Q.u;geo={w,h,rows:Q.rows,cols:Q.cols,n:Q.n,cw:Q.cw*u,slab:Q.slab*u,fh:Q.fh*u,H:Q.H*u,x0:Q.x0*u,y0:Q.y0*u,top:Q.top.map(v=>v*u),hh:Q.hh.map(v=>v*u),pan:Q.pan,scale:Q.k*u,pixel:u};
   return geo;
  }
  function searchlight(g,bx,ground,ang,iw){const len=ground*1.3,sp=.12;for(let y=ground-1;y>0;y-=1){const d=(ground-y)/Math.cos(ang),cx=bx+Math.tan(ang)*(ground-y),hw=Math.max(1,d*sp);if(cx+hw<0||cx-hw>iw||d>len)continue;dither(g,cx-hw,y,hw*2,1,d<len*.35?2:1,MIST);}}
  function ambientSky(g,l,time,ground){const s=seedOf(l.id||'x'),{iw}=Q;
   if(!Q.thumbnail&&Q.u>1){searchlight(g,Math.floor(iw*.1),ground,Math.sin(time/2300)*.55-.1,iw);searchlight(g,Math.floor(iw*.93),ground,Math.sin(time/2900+2)*.5+.15,iw);}
   // twinkle: a few stars brighten in turn
   for(let i=0;i<6;i++){const j=(Math.floor(time/700)+i*7)%40,x=Math.floor(hash(j,11,s)*iw),y=Math.floor(hash(j,12,s)*ground*.55);rect(g,x,y,1,1,PAPER);if(i<2){rect(g,x-1,y,3,1,MIST);rect(g,x,y-1,1,3,MIST);rect(g,x,y,1,1,PAPER);}}
   // drizzle outside the building
   const left=X(1)-Q.wallT-2,right=X(Q.cols-1)+Q.wallT+2;for(let i=0;i<46;i++){const sp=.09+hash(i,21,s)*.05,x0=hash(i,22,s)*(iw+40),yy=((hash(i,23,s)*ground+time*sp)%(ground+10))-10,x=Math.floor((x0-yy*.25)%(iw+40))-20;if(yy<0||(x>=left&&x<=right&&yy>=Q.y0-24))continue;rect(g,x,Math.floor(yy),1,3,i%3?DUSK:HAZE);}
   // antenna beacon
   const ax=X(Q.cols-1)+Q.wallT-Math.round(Q.cw*.7);if(Math.floor(time/600)%3===0){rect(g,ax,Q.y0-3-23,1,1,PAPER);dither(g,ax-2,Q.y0-3-25,5,5,4,PAPER);}}
  function ambientRooms(g,l,s,lit,time){// dust in the trophy spotlight, a restless tube before a scheduled flip
   const T=E.positions(l,'T')[0];if(T&&!s.relic&&lit){const m=X(T.x)+Math.floor(Q.cw/2),top=Q.top[T.y];for(let i=0;i<5;i++){const yy=top+4+((i*9+time/90)%Math.max(6,Q.fh-14)),xx=m+Math.round(Math.sin(time/700+i*2)*(2+i));rect(g,xx,yy,1,1,PAPER);}}
   if(l.lighting?.period&&E.lightsOn(l,s,s.turn+1)!==lit&&Math.floor(time/90)%5===0){dither(g,X(1),Q.y0,(Q.cols-2)*Q.cw,Q.H,2,lit?NIGHT:PAPER);}}
  function darkness(g,l,s){// the Friend's eyes adjust: a faint pool, nothing more
  }
  function lightSign(g,l,s,lit,time,still){let n=null;for(let i=1;i<=Math.min(24,l.lighting?.period||0);i++)if(E.lightsOn(l,s,s.turn+i)!==lit){n=i;break;}
   const main=lit?'LIGHTS ON':'BLACKOUT',sub=n?(lit?'OFF IN ':'ON IN ')+n:lit?'':'SWITCH L',txt=sub?main+' / '+sub:main,w=txt.length*6+7,cx=Q.pan?Math.round(Q.iw/2):Math.round((X(1)+X(Q.cols-1))/2),y=Q.y0-3-14;
   if(!lit)dither(g,cx-Math.floor(w/2)-4,y-4,w+8,20,still?3:3+(Math.floor(time/500)%2),SIG);rect(g,cx-Math.floor(w/2),y+12,1,2,INK);rect(g,cx+Math.floor(w/2)-1,y+12,1,2,INK);rect(g,cx-Math.floor(w/2),y,w,12,INK);rect(g,cx-Math.floor(w/2)+1,y+1,w-2,10,lit?DUSK:INK);
   const warn=n===1&&!still&&Math.floor(time/250)%2;text(g,txt,cx-Math.floor(w/2)+4,y+3,1,lit?(warn?SIG:PAPER):(warn?PAPER:SIG));}
  function endStates(g,l,s,fx,fy,time,still,o){if(o.thumbnail)return;const t=time-mem.statusAt;
   if(s.status==='lost'){const k=Q.k,r=Math.round(Q.fh*1.1);if(!still&&t<700&&Math.floor(t/90)%2===0)dither(g,0,0,Q.iw,Q.ih,3,SIG);
    dither(g,0,0,Q.iw,Math.max(0,fy-r-8*k),2,INK);dither(g,0,fy+8,Q.iw,Q.ih,2,INK);
    for(let i=0;i<Q.fh;i++){const wd=4+Math.floor(i*.5);dither(g,fx-wd,fy-Q.fh+i,wd*2,1,3,PAPER);}}
   if(s.status==='won'&&!still&&t<1400){for(let i=0;i<24;i++){const ang=i/24*Math.PI*2+hash(i,5,1),sp=18+hash(i,6,1)*40,q=t/1000,x=fx+Math.cos(ang)*sp*q,y=fy-10+Math.sin(ang)*sp*q+q*q*30;rect(g,x,y,1+(i%2),1+(i%2),i%3?SIG:PAPER);}}}
  function hit(cx,cy){const r=canvas.getBoundingClientRect(),sx=(cx-r.left)*canvas.width/r.width,sy=(cy-r.top)*canvas.height/r.height;return {x:Math.floor((sx-geo.x0)/geo.cw),y:geo.top?.findIndex((y,i)=>sy>=y&&sy<y+geo.hh[i])??-1};}
  return {render,hit,pulse,metrics:()=>geo};
 }
 root.HeistPixels=Object.freeze({INK,PAPER,SIG,PAL,rect,box,text,label,sprite,mask,stipple,dotted,dither,pattern,tile,bitmap,hash});root.HeistCutawayRenderer={create};
})(globalThis);
