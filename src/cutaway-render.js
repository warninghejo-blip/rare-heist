/* Design A cutaway renderer, extended from the branch's f79308f sample.
   Exact bitmap rendering is shared by the game, street, picker and thumbnails.
   Colors: black, white, #ccff00 only. Lighting and sight use ordered dithering. */
(function(root){'use strict';
 const E=root.HeistEngine,INK='#000000',PAPER='#ffffff',SIG='#ccff00',cache=new Map();
 const rect=(c,x,y,w,h,color=INK)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 function box(c,x,y,w,h,color=PAPER,b=2){rect(c,x,y,w,h);rect(c,x+b,y+b,w-b*2,h-b*2,color);}
 function text(c,str,x,y,k=2,color=INK,align='left'){
  str=String(str).toUpperCase();k=Math.max(1,Math.floor(k));let width=str.length*6*k-k;if(align==='center')x-=width/2;else if(align==='right')x-=width;
  for(const ch of str){const g=(root.HeistPixel?.glyphs[ch]||root.HeistPixel?.glyphs['?'])?.split('/');if(g)for(let j=0;j<g.length;j++)for(let i=0;i<g[j].length;i++)if(g[j][i]==='1')rect(c,x+i*k,y+j*k,k,k,color);x+=6*k;}
 }
 function mask(sample,facing='down',walking=false,frame=0){
  if(!sample)return [];
  if(sample.familyId===6&&['up','down'].includes(facing))facing='right';
  const list=sample.clips[(walking?'walk':'idle')+'-'+facing]||sample.clips['idle-down'];
  const hex=sample.frames[list[((frame%list.length)+list.length)%list.length]];
  if(!cache.has(hex)){const n=BigInt(hex),out=[];for(let i=0;i<256;i++)if((n>>BigInt(i))&1n)out.push([i&15,i>>4]);cache.set(hex,out);}return cache.get(hex);
 }
 function sprite(c,sample,x,foot,scale=3,facing='down',walking=false,frame=0,halo=true){
  const px=mask(sample,facing,walking,frame),k=Math.max(1,Math.floor(scale)),L=Math.round(x-8*k),T=Math.round(foot-15*k);
  if(halo)for(const [a,b]of px)rect(c,L+(a-1)*k,T+(b-1)*k,3*k,3*k,PAPER);
  for(const [a,b]of px)rect(c,L+a*k,T+b*k,k,k);return {left:L,top:T,scale:k};
 }
 function stipple(c,x,y,w,h,step=6,color=INK,back=null){if(back)rect(c,x,y,w,h,back);c.save();c.beginPath();c.rect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));c.clip();for(let yy=Math.floor(y/step)*step;yy<y+h;yy+=step)for(let xx=Math.floor(x/step)*step;xx<x+w;xx+=step)rect(c,xx,yy,2,2,color);c.restore();}
 function dotted(c,x1,y1,x2,y2,color=INK,size=2,step=8){const n=Math.hypot(x2-x1,y2-y1);for(let i=0;i<=n;i+=step){const q=n?i/n:0;rect(c,x1+(x2-x1)*q,y1+(y2-y1)*q,size,size,color);}}
 function create(canvas){const c=canvas.getContext('2d',{alpha:false});let geo={},effects=[];
  // Short event feedback. Drawn around the hero, never on its pixels.
  function pulse(events,time){for(const e of events||[]){const d={alarm:700,caught:900,relic:900,key:700,intel:700,switch:500,vent:400,emp:700}[e];if(d)effects.push({e,start:time,end:time+d});}if(effects.length>8)effects=effects.slice(-8);}
  // Cells keep a readable minimum width; on narrow screens the camera follows the hero instead of squashing the building.
  function layout(l,w,h,thumbnail,focusX){const rows=l.map.length,cols=l.map[0].length,n=(rows-1)/2,m=thumbnail?4:w<620?6:24,sky=thumbnail?8:h<420?18:30,min=thumbnail?0:40;let cw=Math.floor((w-2*m)/cols);const pan=cw<min;if(pan)cw=min;const slab=Math.max(5,Math.floor(cw*.24)),fh=Math.floor((h-sky-24-(n+1)*slab)/n),H=n*fh+(n+1)*slab,x0=pan?Math.round(Math.max(w-m-cols*cw,Math.min(m,w/2-(focusX+.5)*cw))):Math.floor((w-cols*cw)/2),y0=sky,top=[],hh=[];let y=y0;for(let i=0;i<rows;i++){top[i]=y;hh[i]=i%2?fh:slab;y+=hh[i];}
   // Integer scale up to the FriendSDK reference 5x: the visible 14-row body must fit the floor height.
   return {w,h,rows,cols,n,cw,slab,fh,H,x0,y0,top,hh,pan,scale:Math.max(1,Math.min(5,Math.floor(Math.min((fh-6)/14,cw*2/16))))};}
  const X=x=>geo.x0+x*geo.cw;
  const foot=y=>y%2?geo.top[y]+geo.hh[y]-2:geo.top[y]+geo.hh[y]/2+geo.scale*5;
  function ladder(x,y,height){const a=x+geo.cw*.26,b=x+geo.cw*.74;rect(c,a,y,3,height);rect(c,b-3,y,3,height);for(let q=y+6;q<y+height;q+=10)rect(c,a,q,b-a,2);}
  function mark(p,label='',color=SIG){if(!p||p.y<0||p.y>=geo.rows||p.x<0||p.x>=geo.cols)return;const x=X(p.x),y=geo.top[p.y],hh=geo.hh[p.y];for(let q=x+2;q<x+geo.cw-2;q+=8){rect(c,q,y+2,4,3,color);rect(c,q,y+hh-5,4,3,color);}for(let q=y+2;q<y+hh-2;q+=8){rect(c,x+2,q,3,4,color);rect(c,x+geo.cw-5,q,3,4,color);}if(label){box(c,x,y-16,Math.max(32,label.length*6+8),16,color);text(c,label,x+4,y-12,1);}}
  function render(l,s,o={}){
   const w=o.width||960,h=o.height||640;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}c.imageSmoothingEnabled=false;
   const nowT=o.time??performance.now();effects=effects.filter(f=>f.end>nowT);const shaking=!o.reduced&&!o.thumbnail&&effects.some(f=>f.e==='alarm'||f.e==='caught');c.save();if(shaking){const k=Math.round(Math.sin(nowT/18)*3);c.translate(k,0);}
   geo=layout(l,w,h,o.thumbnail,o.anim?.from&&(o.time??performance.now())<o.anim.end?(o.anim.from.x+s.x)/2:s.x);const {cw,fh,rows,cols,x0,y0,slab}=geo,time=o.time??performance.now(),lit=E.lightsOn(l,s);
   rect(c,0,0,w,h,PAPER);stipple(c,0,h-28,w,28,4);rect(c,0,h-31,w,3);
   const buildingX=X(1)-12,buildingW=(cols-2)*cw+24;rect(c,buildingX,y0,buildingW,geo.H);
   if(!o.thumbnail){rect(c,buildingX-4,y0-8,buildingW+8,8);box(c,buildingX+24,y0-25,44,17);stipple(c,buildingX+28,y0-21,36,9,4);rect(c,buildingX+buildingW-62,y0-26,3,20);rect(c,buildingX+buildingW-72,y0-26,22,3);}
   for(let y=1;y<rows-1;y++)for(let x=1;x<cols-1;x++){
    const ch=l.map[y][x],xx=X(x),yy=geo.top[y],hh=geo.hh[y];if(!(y%2)){if(ch!== '#'){rect(c,xx,yy,cw,hh,PAPER);ladder(xx,yy,hh);}continue;}
    if(ch==='#'){stipple(c,xx,yy,cw,hh,4,INK,PAPER);rect(c,xx+cw*.34,yy,cw*.32,hh);continue;}
    rect(c,xx,yy,cw,hh,PAPER);if(!lit)stipple(c,xx,yy,cw,hh,4);stipple(c,xx,yy+hh-7,cw,7,8);
    if(l.map[y-1][x]==='.')ladder(xx,yy,hh);
   }
   const hazards=E.threats(l,s),next=o.forecast?E.threats(l,s,s.turn+1):null;
   for(const p of hazards.vision){const xx=X(p.x),yy=geo.top[p.y];stipple(c,xx+1,yy+2,cw-2,geo.hh[p.y]-4,4,SIG);dotted(c,xx,yy+2,xx+cw,yy+2);dotted(c,xx,yy+geo.hh[p.y]-4,xx+cw,yy+geo.hh[p.y]-4);}
   if(next){const now=new Set([...hazards.vision,...hazards.lasers].map(p=>E.xy(p.x,p.y)));for(const p of [...next.vision,...next.lasers])if(!now.has(E.xy(p.x,p.y)))mark(p,'',INK);for(const p of next.guards)if(!hazards.guards.some(q=>E.same(q,p)))mark(p,'NEXT',INK);}
   const vents=E.positions(l,'v');if(vents.length===2){const [a,b]=vents;dotted(c,X(a.x)+cw/2,geo.top[a.y]+fh*.2,X(b.x)+cw/2,geo.top[b.y]+fh*.2,INK,2,10);}
   const chips=E.positions(l,'o');
   for(let y=1;y<rows-1;y+=2)for(let x=1;x<cols-1;x++){
    const ch=l.map[y][x],xx=X(x),yy=geo.top[y],F=yy+fh,m=xx+cw/2;
    if(ch==='S'){rect(c,xx+6,F-6,cw-12,6);text(c,'IN',m,F-18,1,INK,'center');}
    if(ch==='E'){box(c,m-cw*.29,F-fh*.68,cw*.58,fh*.68,SIG,3);rect(c,m+cw*.12,F-fh*.34,4,4);box(c,m-cw*.33,F-fh*.68-18,cw*.66,16,SIG);text(c,'EXIT',m,F-fh*.68-13,1,INK,'center');}
    if(ch==='T'){box(c,m-cw*.27,F-20,cw*.54,20,PAPER,3);if(!s.relic){box(c,m-11,F-44,22,18,SIG,3);rect(c,m-3,F-27,6,7);rect(c,m-9,F-22,18,3);}else text(c,'EMPTY',m,F-34,1,INK,'center');}
    if(ch==='a'||ch==='b'){rect(c,m-cw*.28,F-27,cw*.56,3);rect(c,m-cw*.24,F-27,3,27);rect(c,m+cw*.24-3,F-27,3,27);if(!(s.keys&(ch==='a'?1:2))){box(c,m-9,F-40,18,13,SIG);text(c,ch,m-3,F-37,1);}}
    if('ABDR'.includes(ch)){const open=E.doorOpen(l,s,ch);if(!open){rect(c,m-cw*.28,yy+3,cw*.56,fh-3);box(c,m-9,yy+fh*.4,18,17,SIG);text(c,ch,m-3,yy+fh*.4+5,1);}else{dotted(c,m-cw*.28,yy+3,m-cw*.28,F);dotted(c,m+cw*.28,yy+3,m+cw*.28,F);text(c,ch+' OK',m,yy+8,1,INK,'center');}}
    if(ch==='G'||ch==='H'){const open=E.doorOpen(l,s,ch);for(let j=0;j<4;j++)rect(c,m-cw*.32+j*cw*.2,yy+2,4,open?12:fh-2);text(c,ch,m,yy+18,1,INK,'center');}
    if(ch==='1'||ch==='2'){const on=s.switches&(ch==='1'?1:2);box(c,m-9,yy+fh*.4,18,22,on?SIG:PAPER);rect(c,m-3,yy+fh*.4+(on?4:13),6,5);text(c,ch,m-3,yy+fh*.4-11,1);}
    if(ch==='p'||ch==='P'){box(c,m-cw*.3,F-9,cw*.6,9,E.held(l,s,ch==='p'?0:1)?SIG:PAPER);text(c,ch==='p'?'P1':'P2',m,F-21,1,INK,'center');}
    if(ch==='o'){const i=chips.findIndex(p=>p.x===x&&p.y===y);if(!(s.intel&(1<<i))){box(c,m-7,F-20,14,18);rect(c,m-4,F-15,8,2);rect(c,m-4,F-10,8,2);}}
    if(ch==='v'){box(c,m-cw*.3,yy+fh*.15,cw*.6,18);for(let j=0;j<3;j++)rect(c,m-cw*.25,yy+fh*.15+4+j*4,cw*.5,2);text(c,'VENT',m,yy+fh*.15+23,1,INK,'center');}
    if(ch==='l'){box(c,m-9,yy+fh*.4,18,22,lit?SIG:PAPER);rect(c,m-3,yy+fh*.4+7,6,8);text(c,'L',m-3,yy+fh*.4-11,1);}
   }
   for(const p of s.crates){const size=Math.min(cw*.67,fh*.4),xx=X(p.x)+(cw-size)/2,yy=geo.top[p.y]+geo.hh[p.y]-size;box(c,xx,yy,size,size);dotted(c,xx+4,yy+4,xx+size-5,yy+size-5);dotted(c,xx+size-5,yy+4,xx+4,yy+size-5);}
   for(const d of l.lasers){const xx=X(d.x)+cw/2,yy=geo.top[d.y],F=yy+geo.hh[d.y],on=E.active(d,s,s.turn),ray=E.ray(l,s,d.x,d.y,d.dir,d.range);rect(c,xx-10,F-fh*.63,20,fh*.63);rect(c,xx-4,F-fh*.48,8,8,on?SIG:PAPER);if(d.circuit!=null)text(c,String(d.circuit+1),xx,F-fh*.7,1,INK,'center');if(ray.length){const end=ray.at(-1),hor='EW'.includes(d.dir),startX=xx,startY=F-fh*.43,endX=hor?X(end.x)+(d.dir==='E'?cw:0):xx,endY=hor?startY:geo.top[end.y]+(d.dir==='S'?geo.hh[end.y]:0);if(on){if(hor){rect(c,Math.min(startX,endX),startY-3,Math.abs(endX-startX),6);rect(c,Math.min(startX,endX),startY-2,Math.abs(endX-startX),4,SIG);}else{rect(c,xx-3,Math.min(startY,endY),6,Math.abs(endY-startY));rect(c,xx-2,Math.min(startY,endY),4,Math.abs(endY-startY),SIG);}}else dotted(c,startX,startY,endX,endY);}}
   for(const d of l.cameras){const x=X(d.x)+cw/2,y=geo.top[d.y],ro=d.rotation||[d.dir],dir=ro[((Math.floor(s.turn/(d.speed||2))+(d.phase||0))%ro.length+ro.length)%ro.length];rect(c,x-2,y,4,12);box(c,x-14,y+9,28,16);rect(c,x+(dir==='W'?-11:dir==='E'?6:-3),y+14,6,6);if(d.afterRelic&&!s.relic)text(c,'ARMED',x,y+31,1,INK,'center');}
   for(const g of hazards.guards){const x=X(g.x)+cw/2,y=geo.top[g.y]+geo.hh[g.y]*.42,b=o.reduced?0:Math.round(Math.sin(time/220+g.source)*2);rect(c,x-18,y+b,36,27);rect(c,x-22,y+b-5,44,3);rect(c,x-2,y+b-5,4,7);rect(c,x-8+(g.dir==='E'?5:-5),y+b+9,12,8,PAPER);rect(c,x-3+(g.dir==='E'?5:-5),y+b+11,4,4);rect(c,x-12,y+b+27,3,5);rect(c,x+9,y+b+27,3,5);}
   if(o.trace)for(let i=1;i<o.trace.length;i++){const a=o.trace[i-1],b=o.trace[i];dotted(c,X(a.x)+cw/2,foot(a.y)-5,X(b.x)+cw/2,foot(b.y)-5,INK,5,10);dotted(c,X(a.x)+cw/2+1,foot(a.y)-4,X(b.x)+cw/2+1,foot(b.y)-4,SIG,3,10);}
   if(o.editor){for(let x=1;x<cols;x++)dotted(c,X(x),y0,X(x),y0+geo.H,INK,1,8);}
   if(o.inspection)mark(o.inspection,'SCAN');if(o.incident){const d=o.incident;mark(d.origin,d.id);mark(d.target,'CAUGHT');dotted(c,X(d.origin.x)+cw/2,geo.top[d.origin.y]+geo.hh[d.origin.y]*.35,X(d.target.x)+cw/2,foot(d.target.y)-12,INK,5,9);dotted(c,X(d.origin.x)+cw/2+1,geo.top[d.origin.y]+geo.hh[d.origin.y]*.35+1,X(d.target.x)+cw/2+1,foot(d.target.y)-11,SIG,3,9);}if(o.guide)mark(o.guide,o.guideLabel||'GO');if(o.hover)mark(o.hover);if(o.mutation)mark(o.mutation,'NEW');if(o.selected)mark(o.selected,'EDIT');
   // GOLDEN TRAIL (LIVE BURN cosmetic): lime footprints on the cells the Friend just left. Never on the Friend's own pixels.
   if(o.trail){const k=Math.max(2,Math.round(cw/20)),n=o.trail.length;o.trail.forEach((t,i)=>{if(t.x===s.x&&t.y===s.y)return;const fresh=i>=n-5,px=X(t.x)+cw/2,py=foot(t.y)-k-3;for(const [dx,dy] of [[-k*2.6,0],[k*0.6,-k*1.2]]){rect(c,px+dx-1,py+dy-1,k*2+2,k+2,INK);rect(c,px+dx,py+dy,k*2,k,fresh?SIG:PAPER);}});}
   let fx=X(s.x)+cw/2,fy=foot(s.y),moving=false;const a=o.anim;
   if(a?.from&&time<a.end&&!o.reduced){let t=Math.min(1,Math.max(0,(time-a.start)/(a.end-a.start)));t=t*t*(3-2*t);fx=X(a.from.x)+cw/2+(fx-X(a.from.x)-cw/2)*t;fy=foot(a.from.y)+(fy-foot(a.from.y))*t;moving=a.from.x!==s.x||a.from.y!==s.y;}
   if(!o.hideHero){const k=geo.scale;if(!lit)rect(c,fx-7*k,fy+1,14*k,3,SIG);sprite(c,o.sample,fx,fy,k,s.facing||'down',moving,o.reduced?0:Math.floor(time/120));if(s.relic){box(c,fx-7,fy-16*geo.scale-13,14,11,SIG);}}
   if(!o.hideHero&&!o.thumbnail)for(const f of effects){const t=(nowT-f.start)/(f.end-f.start),k=geo.scale,top=fy-16*k-8,lift=o.reduced?0:Math.round(t*14);
    if(f.e==='alarm'||f.e==='caught'){if(o.reduced||Math.floor(t*6)%2===0){box(c,fx-12,top-26,24,22,f.e==='caught'?INK:SIG,3);text(c,'!',fx-2,top-21,2,f.e==='caught'?PAPER:INK);}for(let q=0;q<w;q+=10){rect(c,q,0,5,4,SIG);rect(c,q,h-4,5,4,SIG);}}
    else{const label={relic:'TROPHY',key:'KEY',intel:'INTEL',switch:'SWITCH',vent:'VENT',emp:'EMP'}[f.e];const tw=label.length*6+8;box(c,fx-tw/2,top-10-lift,tw,15,f.e==='relic'?SIG:PAPER,2);text(c,label,fx-tw/2+4,top-6-lift,1);}}
   c.restore();
   if(!o.thumbnail&&X(1)-46>=0)for(let y=1;y<rows-1;y+=2){box(c,X(1)-46,geo.top[y]+8,28,16);text(c,'F'+(geo.n-(y-1)/2),X(1)-41,geo.top[y]+12,1);}
   return geo;
  }
  function hit(cx,cy){const r=canvas.getBoundingClientRect(),sx=(cx-r.left)*canvas.width/r.width,sy=(cy-r.top)*canvas.height/r.height;return {x:Math.floor((sx-geo.x0)/geo.cw),y:geo.top?.findIndex((y,i)=>sy>=y&&sy<y+geo.hh[i])??-1};}
  return {render,hit,pulse,metrics:()=>geo};
 }
 root.HeistPixels=Object.freeze({INK,PAPER,SIG,rect,box,text,sprite,mask,stipple,dotted});root.HeistCutawayRenderer={create};
})(globalThis);
