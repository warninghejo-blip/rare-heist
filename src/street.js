/* Side-view street. A local walking hub, not a fake multiplayer scene.
   Pixel-exact: the bitmap is sized so one art pixel is a whole number of device pixels, and the
   camera is snapped to whole art pixels, so building signs never shimmer while the Friend walks.
   Parallax: sky (fixed), far skyline (0.18), near skyline (0.42), street (1.0). */
(function(root){'use strict';const P=root.HeistPixels;
 const districts=[
 {id:'foundry',name:'Foundry Row',width:1900,doors:[['academy','ACADEMY','Learn movement, ladders and extraction.',180],['solo','VAULT OFFICE','Twelve tactical buildings. Pick your next job.',440],['last','LAST HEIST','One shared vault. One last successful raider.',700],['workshop','WORKSHOP','Build a floor plan and prove your escape.',960],['replays','REPLAY OFFICE','Review your routes. Find the missed beat.',1220],['studio','DEMO STUDIO','Creator packs. Simulated RF only.',1480],['canal','CANAL WALK','Cross to the pump station.',1750]]},
 {id:'canal',name:'Canal Walk',width:1380,doors:[['foundry','FOUNDRY ROW','Return to the main street.',160],['annex-01','PUMP HOUSE','Light switch. Relay. One clean escape.',470],['replays','REPLAY OFFICE','Replay your field work.',800],['roof','ROOF ACCESS','Climb to the observatory district.',1150]]},
 {id:'roof',name:'Rooftop Line',width:1380,doors:[['canal','CANAL WALK','Go back down to the waterfront.',160],['annex-02','OBSERVATORY','Two credentials and a cycling blackout.',470],['daily','DAILY DISPATCH','Same UTC-day challenge. No EMP. One detection ends it.',800],['workshop','WORKSHOP','Design your next cutaway vault.',1150]]}
 ];
 const {INK,PAPER,SIG}=P,{night:NIGHT,dusk:DUSK,haze:HAZE,mist:MIST,wall:WALL}=P.PAL,F=0.5;
 const rect=P.rect,dither=P.dither,hash=P.hash,text=P.text;
 const seed=id=>{let h=7;for(const ch of id)h=(h*31+ch.charCodeAt(0))>>>0;return h;};

 function create(canvas){const c=canvas.getContext('2d',{alpha:false});let geo={},cam=null,lastT=null,key='',L={},pace=null;const touch=typeof matchMedia==='function'&&matchMedia('(hover: none) and (pointer: coarse)').matches;
  function size(){const cssW=canvas.clientWidth||960,dpr=Math.max(1,root.devicePixelRatio||1),mobile=cssW<620,zoom=Math.max(1,Math.min(Math.round((mobile?1.5:2)*dpr),Math.floor(cssW*dpr/(mobile?240:420))||1));
   return {iw:Math.max(160,Math.round(cssW*dpr/zoom)),ih:Math.round((mobile?250:300)*dpr/zoom),zoom,mobile};}
  const layer=(w,h)=>{const cv=document.createElement('canvas');cv.width=Math.max(1,Math.ceil(w));cv.height=h;const g=cv.getContext('2d');g.imageSmoothingEnabled=false;return [cv,g];};

  // ---- cached layers ----
  function build(d,iw,ih,gy){const s=seed(d.id),W=Math.ceil(d.width*F);
   const [sky,sg]=layer(iw,ih);rect(sg,0,0,iw,ih,NIGHT);for(const [f,lv] of [[.45,2],[.62,4],[.76,7],[.88,10]]){const y=Math.floor(gy*f);dither(sg,0,y,iw,gy-y,lv,DUSK);}
   for(let i=0;i<iw*gy/700;i++)rect(sg,Math.floor(hash(i,1,s)*iw),Math.floor(hash(i,2,s)*gy*.55),1,1,hash(i,3,s)<.3?MIST:HAZE);
   const mx=Math.floor(iw*(d.id==='roof'?.2:.78)),my=Math.floor(gy*.18),r=d.id==='roof'?9:6;for(let y=-r;y<=r;y++){const h=Math.floor(Math.sqrt(r*r-y*y));rect(sg,mx-h,my+y,h*2+1,1,PAPER);}for(let y=-r;y<=r;y++){const h=Math.floor(Math.sqrt(r*r-y*y));if(h>2)rect(sg,mx-h+Math.round(r*.9),my+y-1,Math.max(0,h*2+1-Math.round(r*.9)),1,DUSK);}
   for(let yy=-r-4;yy<=r+4;yy++)for(let xx=-r-4;xx<=r+4;xx++){const q=Math.hypot(xx,yy);if(q>r+1&&q<=r+4&&!((xx+yy)&1)&&hash(xx,yy,3)<.6)rect(sg,mx+xx,my+yy,1,1,DUSK);}
   // skylines
   const skyline=(par,col,win,hmin,hmax,sd)=>{const w=Math.ceil(iw+Math.max(0,W-iw)*par)+8,[cv,g]=layer(w,ih);let x=0,i=0;while(x<w){const bw=12+Math.floor(hash(i,7,sd)*26),bh=Math.floor(hmin+hash(i,8,sd)*(hmax-hmin)),top=gy-bh;rect(g,x,top,bw,bh+2,col);
     if(hash(i,9,sd)<.35)rect(g,x+Math.floor(bw/2),top-6,1,6,col);if(hash(i,10,sd)<.25){rect(g,x+2,top-4,6,4,col);}
     for(let yy=top+3;yy<gy-2;yy+=4)for(let xx=x+2;xx<x+bw-2;xx+=3)if(hash(xx,yy,sd)<(win===MIST?.12:.08))rect(g,xx,yy,1,2,win);x+=bw+(hash(i,11,sd)<.3?3:0);i++;}return cv;};
   const far=skyline(.18,'#211d4a',HAZE,gy*.25,gy*.55,s+1),mid=skyline(.42,DUSK,MIST,gy*.12,gy*.4,s+2);
   // street layer (world scale F)
   const [front,g]=layer(W+2,ih);
   ground(g,d,W,ih,gy);
   const doorRects=[];for(let i=0;i<d.doors.length;i++){const [id,name,,dx]=d.doors[i];doorRects[i]=facade(g,id,name,Math.round(dx*F),gy,i,d);}
   for(let i=0;i<=d.doors.length;i++){const a=i?d.doors[i-1][3]:0,b=i<d.doors.length?d.doors[i][3]:d.width,x=Math.round((a+b)/2*F);if(x>6&&x<W-6)lamp(g,x,gy);}
   return {sky,far,mid,front,W,doorRects};}
  function ground(g,d,W,ih,gy){
   if(d.id==='canal'){rect(g,0,gy,W,4,DUSK);rect(g,0,gy,W,1,MIST);rect(g,0,gy+4,W,1,INK);for(let x=0;x<W;x+=6){rect(g,x,gy-6,1,6,HAZE);}rect(g,0,gy-6,W,1,HAZE);rect(g,0,gy-3,W,1,DUSK);
    rect(g,0,gy+5,W,ih-gy-5,NIGHT);dither(g,0,gy+5,W,ih-gy-5,3,DUSK);}
   else if(d.id==='roof'){rect(g,0,gy,W,ih-gy,DUSK);rect(g,0,gy,W,1,MIST);dither(g,0,gy+1,W,ih-gy-1,4,NIGHT);for(let x=3;x<W;x+=9)rect(g,x,gy+3+(x%3),1,1,HAZE);rect(g,0,gy+4,W,1,INK);}
   else{rect(g,0,gy,W,5,DUSK);rect(g,0,gy,W,1,MIST);for(let x=0;x<W;x+=12)rect(g,x,gy+1,1,4,NIGHT);rect(g,0,gy+5,W,1,HAZE);rect(g,0,gy+6,W,1,INK);rect(g,0,gy+7,W,ih-gy-7,NIGHT);dither(g,0,gy+7,W,ih-gy-7,2,DUSK);for(let x=4;x<W;x+=20)rect(g,x,gy+Math.floor((ih-gy)*.62),9,1,HAZE);}
  }
  function lamp(g,x,gy){const h=44;rect(g,x,gy-h,2,h,INK);rect(g,x-1,gy-2,4,2,INK);rect(g,x,gy-h,1,h,HAZE);rect(g,x-4,gy-h-2,10,3,INK);rect(g,x-3,gy-h+1,8,1,PAPER);for(let i=0;i<h-6;i++){const w=2+Math.floor(i*.35);dither(g,x+1-w,gy-h+2+i,w*2,1,i<8?4:2,MIST);}dither(g,x-14,gy,30,3,5,MIST);}
  function win(g,x,y,w,h,s,i,lit=true){rect(g,x-1,y-1,w+2,h+2,INK);const on=lit&&hash(i,x,s)<.7;rect(g,x,y,w,h,on?(hash(i,y,s)<.5?PAPER:MIST):NIGHT);if(on){dither(g,x,y+h-2,w,2,6,MIST);if(hash(x,y,s)<.35){const px=x+1+Math.floor(hash(x,y,9)*(w-4));rect(g,px,y+h-5,3,5,DUSK);rect(g,px+1,y+h-7,1,2,DUSK);}}else dither(g,x,y,w,h,3,DUSK);rect(g,x+Math.floor(w/2),y,1,h,INK);}
  function sign(g,cx,y,name,style=0){const w=name.length*6+7,x=cx-Math.floor(w/2);rect(g,x-1,y-1,w+2,13,INK);rect(g,x,y,w,11,style?PAPER:DUSK);rect(g,x,y,w,1,style?PAPER:HAZE);text(g,name,x+4,y+2,1,style?INK:PAPER);return w;}
  function facade(g,id,name,cx,gy,i,d){const s=seed(id)+i;const type={academy:'school',solo:'bank',last:'tower',workshop:'garage',replays:'cinema',studio:'studio',canal:'gate',foundry:'gate',roof:'stairs','annex-01':'pump','annex-02':'dome',daily:'kiosk'}[id]||'shop';
   const nameW=name.length*6+7,bw=Math.max(nameW+14,{tower:84,bank:108,dome:96,gate:88,stairs:80,kiosk:92}[type]||100),bh={tower:112,bank:74,school:84,garage:66,cinema:80,studio:72,gate:60,stairs:92,pump:76,dome:70,kiosk:62}[type]||76,x=cx-Math.floor(bw/2),top=gy-bh;
   const brick=(xx,yy,w,h,base,mortar)=>{rect(g,xx,yy,w,h,base);for(let r=yy+2;r<yy+h;r+=4){rect(g,xx,r,w,1,mortar);for(let q=xx+((r>>2)&1)*4;q<xx+w;q+=8)rect(g,q,r-3,1,3,mortar);}};
   if(type==='gate'){ // archway to another district
    rect(g,x,top,10,bh,INK);rect(g,x+bw-10,top,10,bh,INK);brick(x+1,top+1,8,bh-1,DUSK,NIGHT);brick(x+bw-9,top+1,8,bh-1,DUSK,NIGHT);rect(g,x-2,top-4,bw+4,16,INK);rect(g,x-1,top-3,bw+2,14,DUSK);
    for(let a=0;a<bw-20;a++){const yy=Math.round(Math.sqrt(Math.max(0,1-Math.pow((a-(bw-20)/2)/((bw-20)/2),2)))*10);rect(g,x+10+a,top+12,1,10-yy,DUSK);rect(g,x+10+a,top+22-yy,1,1,INK);}
    sign(g,cx,top-1,name,1);const ax=cx-6,ay=gy-26;rect(g,cx,ay+6,1,20,INK);rect(g,ax-8,ay-2,28,10,INK);rect(g,ax-7,ay-1,26,8,SIG);text(g,d.doors.findIndex(q=>q[0]===id)===0?'<':'>',cx-2,ay,1,INK);
    return {x:x+10,y:top+22,w:bw-20,h:gy-top-22,gate:true};}
   if(type==='stairs'){ // fire escape to the roofs
    rect(g,x+14,top,bw-28,bh,INK);brick(x+15,top+1,bw-30,bh-1,DUSK,NIGHT);for(let k=0;k<4;k++){const yy=top+10+k*20;rect(g,x+8,yy,bw-16,2,INK);rect(g,x+8,yy-6,1,6,INK);rect(g,x+bw-9,yy-6,1,6,INK);rect(g,x+8,yy-6,bw-16,1,INK);for(let q=0;q<9;q++)rect(g,x+18+q*((bw-40)/9)|0,yy+2+q*2,5,1,INK);}
    sign(g,cx,top-14,name,1);return {x:x+14,y:gy-30,w:bw-28,h:30,gate:true};}
   // body
   const base={bank:MIST,tower:NIGHT,garage:HAZE,cinema:DUSK,studio:NIGHT,pump:DUSK,dome:MIST,kiosk:DUSK,school:DUSK}[type]||DUSK;
   rect(g,x-1,top-1,bw+2,bh+1,INK);
   if(type==='school'||type==='pump')brick(x,top,bw,bh,DUSK,NIGHT);
   else if(type==='bank'||type==='dome'){rect(g,x,top,bw,bh,MIST);for(let r=top+5;r<gy;r+=6)rect(g,x,r,bw,1,HAZE);}
   else if(type==='garage'){rect(g,x,top,bw,bh,HAZE);for(let q=x+2;q<x+bw;q+=4)rect(g,q,top,1,bh,DUSK);}
   else if(type==='tower'){rect(g,x,top,bw,bh,NIGHT);for(let q=x+3;q<x+bw;q+=8)rect(g,q,top,1,bh,DUSK);}
   else rect(g,x,top,bw,bh,base);
   rect(g,x-3,top-3,bw+6,4,INK);rect(g,x-2,top-3,bw+4,1,type==='bank'||type==='dome'?PAPER:HAZE);
   // toppers
   if(type==='school'){rect(g,cx-14,top-16,28,13,INK);rect(g,cx-13,top-15,26,12,DUSK);for(let a=0;a<14;a++)rect(g,cx-14+a,top-16-Math.floor(a*.6),28-2*a,1,INK);rect(g,cx-5,top-14,11,11,INK);rect(g,cx-4,top-13,9,9,PAPER);rect(g,cx,top-12,1,4,INK);rect(g,cx,top-9,3,1,INK);}
   if(type==='bank'){for(let a=0;a<bw/2+4;a++){rect(g,x-4+a,top-4-Math.floor(a*.32),bw+8-2*a,1,a%3?MIST:PAPER);}rect(g,x-4,top-4,bw+8,1,INK);for(let q=0;q<5;q++){const qx=x+8+Math.round(q*(bw-20)/4);rect(g,qx,top+14,5,bh-16,PAPER);rect(g,qx+4,top+14,1,bh-16,HAZE);rect(g,qx-1,top+13,7,2,HAZE);rect(g,qx-1,gy-3,7,3,HAZE);}}
   if(type==='tower'){rect(g,cx-1,top-22,2,19,INK);rect(g,cx-6,top-8,12,5,INK);for(let yy=top+18;yy<gy-26;yy+=9)for(let q=x+6;q<x+bw-8;q+=10)win(g,q,yy,6,5,s,yy*3+q,hash(q,yy,s)<.35);}
   if(type==='garage'){for(let q=0;q<4;q++){const qx=x+q*(bw/4);for(let a=0;a<bw/4;a++)rect(g,qx+a,top-3-Math.floor(a*.4),1,Math.floor(a*.4)+1,INK);}}
   if(type==='cinema'){rect(g,x+6,top+18,bw-12,16,INK);rect(g,x+7,top+19,bw-14,14,NIGHT);text(g,'NOW SHOWING',cx,top+23,1,MIST,'center');}
   if(type==='pump'){rect(g,x+bw-18,top-26,10,24,INK);brick(x+bw-17,top-25,8,22,DUSK,NIGHT);rect(g,x+bw-19,top-27,12,3,INK);rect(g,x+4,gy-26,bw-8,4,INK);rect(g,x+4,gy-25,bw-8,2,HAZE);for(const q of [x+14,x+bw-22]){rect(g,q-4,gy-30,9,9,INK);rect(g,q-3,gy-29,7,7,HAZE);rect(g,q,gy-29,1,7,INK);rect(g,q-3,gy-26,7,1,INK);}}
   if(type==='dome'){const r=Math.floor(bw*.36);for(let yy=0;yy<=r;yy++){const h=Math.floor(Math.sqrt(r*r-yy*yy));rect(g,cx-h,top-yy-1,h*2+1,1,yy===r?INK:yy%4?MIST:HAZE);rect(g,cx-h-1,top-yy-1,1,1,INK);rect(g,cx+h+1,top-yy-1,1,1,INK);}rect(g,cx-3,top-r,6,r-2,INK);rect(g,cx+3,top-r+2,12,3,INK);rect(g,cx+13,top-r+1,3,5,HAZE);}
   if(type==='kiosk'){rect(g,x+bw-16,top-18,12,15,INK);rect(g,x+bw-15,top-17,10,13,DUSK);rect(g,x+bw-13,top-15,6,6,PAPER);rect(g,x+bw-10,top-14,1,3,INK);}
   if(type==='studio'){for(let q=x+4;q<x+bw-4;q+=14)win(g,q,top+30,10,Math.min(20,bh-50),s,q,true);}
   // name sign, awning, door, windows
   const sy=type==='cinema'?top+4:type==='bank'?top+2:top+6;sign(g,cx,sy,name,type==='bank'||type==='studio'||type==='cinema'?1:0);
   const dw=type==='garage'?36:type==='bank'?22:18,dh=type==='garage'?26:28,dx=cx-Math.floor(dw/2),dy=gy-dh;
   if(type==='school'||type==='cinema'||type==='kiosk'){const ay=dy-12;for(let q=x+2;q<x+bw-2;q+=6){rect(g,q,ay,6,5,(q/6|0)%2?PAPER:DUSK);rect(g,q,ay+5,6,1,INK);}rect(g,x+1,ay-1,bw-2,1,INK);}
   // door surround: an ink frame, a stone casing with a lintel, and a step
   if(type!=='garage'){rect(g,dx-5,dy-6,dw+10,dh+6,INK);rect(g,dx-4,dy-5,dw+8,dh+5,type==='bank'||type==='dome'?PAPER:HAZE);rect(g,dx-6,dy-7,dw+12,2,INK);rect(g,dx-5,dy-6,dw+10,1,MIST);rect(g,dx-4,dy-5,1,dh+5,MIST);}
   rect(g,dx-2,dy-2,dw+4,dh+2,INK);
   if(type==='bank'){rect(g,dx,dy,dw,dh,DUSK);const r=Math.floor(dw/2)-2,cy=dy+Math.floor(dh/2);for(let yy=-r;yy<=r;yy++){const h=Math.floor(Math.sqrt(r*r-yy*yy));rect(g,cx-h,cy+yy,h*2+1,1,yy===-r||yy===r?INK:HAZE);rect(g,cx-h,cy+yy,1,1,INK);rect(g,cx+h,cy+yy,1,1,INK);}for(const [a,b] of [[0,-1],[1,0],[0,1],[-1,0]])rect(g,cx+a*(r-3),cy+b*(r-3),1,1,INK);rect(g,cx-1,cy-1,3,3,MIST);}
   else if(type==='garage'){rect(g,dx,dy,dw,dh,NIGHT);for(let yy=dy;yy<dy+dh-8;yy+=3){rect(g,dx,yy,dw,2,HAZE);rect(g,dx,yy+2,dw,1,DUSK);}dither(g,dx,dy+dh-8,dw,8,6,MIST);}
   else if(type==='tower'){rect(g,dx,dy,dw,dh,INK);for(let q=dx+2;q<dx+dw;q+=4)rect(g,q,dy,1,dh,DUSK);rect(g,dx,dy+4,dw,1,SIG);}
   else{// a pair of panelled leaves under a lit transom
    const leaf=type==='studio'?DUSK:NIGHT,panel=type==='studio'?HAZE:DUSK,tr=5;rect(g,dx,dy,dw,dh,INK);rect(g,dx+1,dy+1,dw-2,tr-1,MIST);dither(g,dx+1,dy+1,dw-2,tr-1,6,PAPER);for(let q=dx+4;q<dx+dw-2;q+=4)rect(g,q,dy+1,1,tr-1,INK);
    const lw=Math.floor((dw-1)/2);for(const lx of [dx,dx+dw-lw]){rect(g,lx,dy+tr+1,lw,dh-tr-1,leaf);rect(g,lx+1,dy+tr+3,lw-2,Math.floor((dh-tr)*.38),panel);rect(g,lx+1,dy+tr+4+Math.floor((dh-tr)*.38),lw-2,Math.floor((dh-tr)*.34),panel);rect(g,lx+1,dy+tr+3,lw-2,1,type==='studio'?MIST:HAZE);}
    rect(g,dx+lw-2,dy+Math.floor(dh*.58),1,2,MIST);rect(g,dx+dw-lw+1,dy+Math.floor(dh*.58),1,2,MIST);}
   rect(g,dx-6,gy-1,dw+12,1,MIST);rect(g,dx-5,gy-2,dw+10,1,HAZE);
   if(type==='school'||type==='cinema'||type==='pump'||type==='kiosk'||type==='dome'){const wy=type==='cinema'?top+40:top+22;if(wy+14<dy-6)for(const q of [x+6,x+bw-22])win(g,q,wy,16,12,s,q,true);}
   // house number
   const nx=dx+dw+5,num=String(i+1);rect(g,nx,dy+3,num.length*6+5,11,INK);rect(g,nx+1,dy+4,num.length*6+3,9,MIST);text(g,num,nx+3,dy+5,1,INK);
   // window light on the pavement
   dither(g,dx-8,gy,dw+16,2,3,MIST);
   return {x:dx,y:dy,w:dw,h:dh};
  }

  // ---- frame ----
  function render(state,sample,time,{reduced=false,hover=null}={}){
   const d=districts.find(x=>x.id===state.district)||districts[0],{iw,ih,mobile}=size();
   if(canvas.width!==iw||canvas.height!==ih){canvas.width=iw;canvas.height=ih;}c.imageSmoothingEnabled=false;
   const gy=ih-(mobile?18:22),k=key!==d.id+iw+'x'+ih;if(k){key=d.id+iw+'x'+ih;L=build(d,iw,ih,gy);cam=null;}
   // Pace: the hub walk is scaled up here, x2.2 on a held key and x2.6 on click-to-walk (street.x is navigation, never
   // game state). One frame's step at most, clamped so a walk never overshoots its target or the end of the street.
   if(pace&&pace.d===d.id&&state.walking){const dx=state.x-pace.x;if(dx&&Math.abs(dx)<=24){let nx=state.x+dx*(state.target!=null?1.6:1.2);if(state.target!=null)nx=dx>0?Math.min(nx,state.target):Math.max(nx,state.target);state.x=Math.max(60,Math.min(d.width-60,nx));}}
   pace={d:d.id,x:state.x};
   // Camera: look ahead while walking; standing at a door frames that whole building; idle between doors holds still.
   const hx=state.x*F,near=d.doors.find(q=>Math.abs(state.x-q[3])<44);let aim=hx-iw*.46;
   if(state.walking)aim=hx-iw*(state.facing==='left'?.64:.36);else if(near)aim=near[3]*F-iw/2;else if(cam!=null)aim=Math.max(hx-iw*.8,Math.min(hx-iw*.2,cam));
   const target=Math.max(0,Math.min(L.W-iw,aim));
   if(cam==null||reduced||lastT==null)cam=target;else{const dt=Math.max(0,Math.min(100,time-lastT));cam+=(target-cam)*(1-Math.exp(-dt/140));if(Math.abs(target-cam)<.4)cam=target;}lastT=time;
   const camera=Math.round(cam);geo={camera,floor:gy,width:iw,height:ih,doors:d.doors,scale:F};
   c.drawImage(L.sky,0,0);c.drawImage(L.far,-Math.round(camera*.18),0);c.drawImage(L.mid,-Math.round(camera*.42),0);
   if(!reduced)weatherBack(d,iw,ih,gy,time);
   c.drawImage(L.front,-camera,0);
   if(!reduced)life(d,iw,ih,gy,time,camera);
   // Doors. The one you stand at opens onto a lit hall: light fills the doorway and spills onto the pavement, lime
   // corners frame it and an ENTER tag waits above. A door under the pointer gets paper corners (click walks there).
   d.doors.forEach((q,i)=>{const r=L.doorRects[i];if(!r)return;const x0=r.x-camera;if(x0<-80||x0>iw+80)return;const at=q===near,hov=!at&&hover===q[0];if(!at&&!hov)return;
    const breathe=reduced?0:Math.floor(time/650)%2,bx={l:x0-6,t:r.y-8,r:x0+r.w+5,b:gy+1};
    if(at){if(!r.gate){rect(c,x0+1,r.y+6,r.w-2,r.h-6,PAPER);dither(c,x0+1,r.y+6,r.w-2,r.h-6,5,MIST);rect(c,x0+1,r.y+6,2,r.h-6,INK);rect(c,x0+r.w-3,r.y+6,2,r.h-6,INK);}
     for(let k=0;k<5;k++){const sp=Math.round(k*1.6);dither(c,x0-sp,gy+k,r.w+sp*2,1,k<2?6:3,PAPER);}}
    corners(c,bx,breathe,at?SIG:PAPER);
    if(at){const lbl=touch?'ENTER':'E  ENTER',w=lbl.length*6+7,cx=x0+Math.floor(r.w/2),by=bx.t-16-breathe;rect(c,cx-Math.floor(w/2)-1,by-1,w+2,13,INK);rect(c,cx-Math.floor(w/2),by,w,11,SIG);text(c,lbl,cx-Math.floor(w/2)+4,by+2,1,INK);rect(c,cx-2,by+12,5,1,INK);rect(c,cx-1,by+13,3,1,INK);rect(c,cx,by+14,1,1,INK);}});
   // walk target
   if(state.target!=null){const tx=Math.round(state.target*F)-camera,sx=Math.round(hx)-camera;for(let q=Math.min(tx,sx);q<Math.max(tx,sx);q+=5)rect(c,q,gy+2,2,1,SIG);rect(c,tx-2,gy+1,5,3,INK);rect(c,tx-1,gy+2,3,1,SIG);}
   // the Friend, feet on the pavement
   const fx=Math.round(hx)-camera;dither(c,fx-7,gy+1,15,2,6,INK);
   // Walking plays the walk clip; standing breathes on the idle clip at a slow, calm tempo (no look-around).
   P.sprite(c,sample,fx,gy+1,1,state.facing||'right',!!state.walking,reduced?0:Math.floor(time/(state.walking?105:320)));
   foreground(d,iw,ih,gy,camera);
   if(!reduced)weatherFront(d,iw,ih,gy,time,camera);
   // chrome: street sign, local note, hints, edge arrows
   const nm=d.name.toUpperCase(),w=nm.length*6+9;rect(c,4,4,w+2,13,INK);rect(c,5,5,w,11,SIG);text(c,nm,10,7,1,INK);rect(c,5+Math.floor(w/2),17,1,3,INK);
   if(!mobile)text(c,'LOCAL / NO TIMER',iw-6,7,1,MIST,'right');
   const hint=mobile?'< > WALK  E ENTER':'< > WALK    E ENTER    CLICK A DOOR TO WALK THERE',hw=hint.length*6+9;rect(c,Math.floor((iw-hw)/2),ih-11,hw,11,NIGHT);text(c,hint,Math.floor(iw/2),ih-9,1,MIST,'center');
   // edges: the next door beyond the frame is named on a lime tag ("REPLAY OFFICE >"); a click there walks to it
   const blink=reduced||Math.floor(time/500)%2,sx=q=>Math.round(q[3]*F)-camera,right=d.doors.find(q=>sx(q)>iw-8),left=[...d.doors].reverse().find(q=>sx(q)<8);
   for(const [q,side] of [[left,-1],[right,1]]){if(side<0?camera<=0:camera>=L.W-iw)continue;if(!q){if(blink)text(c,side<0?'<':'>',side<0?4:iw-9,gy-40,1,SIG);continue;}
    const lbl=side<0?'< '+q[1]:q[1]+' >',tw=lbl.length*6+5,tx=side<0?3:iw-tw-3,ty=22,nudge=reduced?0:(Math.floor(time/400)%2)*side;rect(c,tx-1,ty-1,tw+2,13,INK);rect(c,tx,ty,tw,11,SIG);text(c,lbl,tx+3+(side<0?Math.min(0,nudge):Math.max(0,nudge)),ty+2,1,INK);}
   return geo;}
  // Corner brackets, lime or paper over an ink outline (the same mark the building uses for things in reach).
  function corners(g,b,off,color){const arm=5,segs=[];for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const cx=sx<0?b.l-off:b.r+off,cy=sy<0?b.t-off:b.b+off;segs.push([sx<0?cx:cx-arm+1,cy,arm,1],[cx,sy<0?cy:cy-arm+1,1,arm]);}
   for(const [x,y,w,h] of segs)rect(g,x-1,y-1,w+2,h+2,INK);for(const [x,y,w,h] of segs)rect(g,x,y,w,h,color);}
  // Near layer at 1.3x: short props on the kerb side of the road. Never taller than the gap under the Friend.
  function foreground(d,iw,ih,gy,camera){const s=seed(d.id),base=ih-12,W=L.W*1.3;for(let i=0,x=20;x<W;i++,x+=60+Math.floor(hash(i,31,s)*70)){const sx=Math.round(x-camera*1.3);if(sx<-20||sx>iw+20)continue;const r=hash(i,32,s);
    if(d.id==='canal'){rect(c,sx-10,base-7,22,1,INK);rect(c,sx-10,base-7,1,7,INK);rect(c,sx+11,base-7,1,7,INK);rect(c,sx-10,base-4,22,1,HAZE);}
    else if(d.id==='roof'){rect(c,sx-2,base-9,5,9,INK);rect(c,sx-1,base-8,3,8,DUSK);rect(c,sx-4,base-10,9,2,INK);rect(c,sx-3,base-10,7,1,HAZE);}
    else if(r<.4){rect(c,sx-1,base-8,3,8,INK);rect(c,sx-2,base-9,5,2,INK);rect(c,sx-1,base-9,3,1,MIST);}
    else if(r<.7){rect(c,sx-3,base-7,7,7,INK);rect(c,sx-2,base-8,5,1,INK);rect(c,sx-2,base-6,5,5,DUSK);rect(c,sx-4,base-5,9,2,INK);rect(c,sx-2,base-6,1,5,HAZE);}
    else{for(let q=0;q<9;q++){const h=3+Math.floor(hash(i,q,s)*5);rect(c,sx-6+q*2,base-h,2,h,q%2?INK:DUSK);}}}}
  function weatherBack(d,iw,ih,gy,time){// slow cloud bank drifting across the moon
   const x=Math.round((time/260)%(iw+120))-60,y=Math.floor(gy*.2);dither(c,x,y,56,5,3,DUSK);dither(c,x+10,y-3,30,3,2,DUSK);dither(c,x+70-iw,y+14,40,4,2,DUSK);}
  function life(d,iw,ih,gy,time,camera){const s=seed(d.id);
   // marquee bulbs, beacon, chimney steam, flickering lamp
   for(const q of d.doors){const x=Math.round(q[3]*F)-camera;if(x<-80||x>iw+80)continue;
    if(q[0]==='replays'){const t=Math.floor(time/180);for(let i=0;i<10;i++){const bx=x-36+i*8;rect(c,bx,gy-80+17,2,2,(i+t)%3?PAPER:DUSK);}}
    if(q[0]==='last'&&Math.floor(time/700)%2){rect(c,x-2,gy-112-24,4,3,SIG);dither(c,x-7,gy-112-29,15,13,4,SIG);}
    if(q[0]==='studio'&&Math.floor(time/90)%23){rect(c,x-30,gy-72+30-4,60,1,MIST);}
    if(q[0]==='annex-01'){for(let i=0;i<4;i++){const t=((time/40+i*25)%100)/100,px=x+Math.floor(100/2)-13+Math.round(Math.sin(t*6+i)*3),py=gy-76-28-Math.round(t*24);dither(c,px-2,py,5+Math.round(t*4),3,Math.max(1,6-Math.round(t*6)),MIST);}}}
   if(d.id==='canal'){for(let i=0;i<30;i++){const x=Math.floor(hash(i,4,s)*iw),y=gy+7+Math.floor(hash(i,5,s)*(ih-gy-8)),on=(Math.floor(time/300)+i)%4===0;if(on)rect(c,x,y,3,1,HAZE);}}
  }
  function weatherFront(d,iw,ih,gy,time,camera){const s=seed(d.id);if(d.id==='roof'){for(let i=0;i<12;i++){const x=Math.floor((hash(i,1,s)*iw+time*.05*(1+hash(i,2,s)))%iw),y=Math.floor(hash(i,3,s)*gy*.8);rect(c,x,y,2,1,DUSK);}return;}
   const n=d.id==='canal'?22:40;for(let i=0;i<n;i++){const sp=.08+hash(i,21,s)*.04,y=(hash(i,23,s)*ih+time*sp)%(ih+6)-6,x=Math.floor(((hash(i,22,s)*(iw+30)-y*.3)%(iw+30)+iw+30)%(iw+30))-10;rect(c,x,Math.floor(y),1,3,i%3?DUSK:HAZE);}
   for(let i=0;i<5;i++){const t=(Math.floor(time/120)+i*7)%23;if(t<2)rect(c,Math.floor(hash(i,Math.floor(time/2760),s)*iw),gy+1,t?3:1,1,MIST);}}
  function hit(cx,cy){const r=canvas.getBoundingClientRect(),sx=(cx-r.left)*canvas.width/r.width,sy=(cy-r.top)*canvas.height/r.height,x=(sx+geo.camera)/F;return {x,y:sy,door:geo.doors?.find(d=>Math.abs(d[3]-x)<110&&sy>geo.floor-120&&sy<geo.floor+8)};}
  return {render,hit,metrics:()=>geo};
 }
 root.HeistStreet={create,districts};
})(globalThis);
