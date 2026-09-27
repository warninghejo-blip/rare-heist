/* Side-view street. A local walking hub, not a fake multiplayer scene. */
(function(root){'use strict';const P=root.HeistPixels;
 const districts=[
 {id:'foundry',name:'Foundry Row',width:1900,doors:[['academy','ACADEMY','Learn movement, ladders and extraction.',180],['solo','VAULT OFFICE','Twelve tactical buildings. Pick your next job.',440],['last','LAST HEIST','One shared vault. One last successful raider.',700],['workshop','WORKSHOP','Build a floor plan and prove your escape.',960],['replays','REPLAY OFFICE','Review your routes. Find the missed beat.',1220],['studio','DEMO STUDIO','Creator packs. Simulated RF only.',1480],['canal','CANAL WALK','Cross to the pump station.',1750]]},
 {id:'canal',name:'Canal Walk',width:1380,doors:[['foundry','FOUNDRY ROW','Return to the main street.',160],['annex-01','PUMP HOUSE','Light switch. Relay. One clean escape.',470],['replays','REPLAY OFFICE','Replay your field work.',800],['roof','ROOF ACCESS','Climb to the observatory district.',1150]]},
 {id:'roof',name:'Rooftop Line',width:1380,doors:[['canal','CANAL WALK','Go back down to the waterfront.',160],['annex-02','OBSERVATORY','Two credentials and a cycling blackout.',470],['daily','DAILY DISPATCH','Same UTC-day challenge. No EMP. One alarm.',800],['workshop','WORKSHOP','Design your next cutaway vault.',1150]]}
 ];
 function create(canvas){const c=canvas.getContext('2d',{alpha:false});let geo={};
  function render(state,sample,time,{reduced=false}={}){const d=districts.find(x=>x.id===state.district)||districts[0],w=canvas.clientWidth<620?640:960,h=canvas.clientWidth<620?390:260;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}c.imageSmoothingEnabled=false;const camera=Math.max(0,Math.min(d.width-w,state.x-w*.46)),floor=h-44;geo={camera,floor,width:w,height:h,doors:d.doors};
   P.rect(c,0,0,w,h,P.PAPER);P.stipple(c,0,95,w,180,12);P.rect(c,0,floor+8,w,20);P.stipple(c,0,floor+28,w,h-floor-28,4);P.text(c,d.name,24,12,2);P.text(c,'LOCAL / NO TIMER',w-24,12,1,P.INK,'right');
   for(let i=0;i<d.doors.length;i++){const [id,name,,dx]=d.doors[i],x=dx-camera;if(x< -150||x>w+150)continue;const bw=202,top=(h<300?48:120)+(i%2)*18,bh=floor-top;P.box(c,x-bw/2,top,bw,bh,P.PAPER,4);P.rect(c,x-bw/2-8,top-8,bw+16,8);P.stipple(c,x-bw/2+5,top+4,20,bh-5,4);P.stipple(c,x+bw/2-23,top+4,19,bh-5,4);P.box(c,x-76,top+15,152,30,P.INK);P.text(c,name,x,top+26,1,P.PAPER,'center');
    const active=Math.abs(state.x-dx)<44;P.box(c,x-26,floor-78,52,78,active?P.SIG:P.PAPER,4);P.rect(c,x+12,floor-43,5,5);P.rect(c,x-38,floor-83,76,5);
    P.box(c,x-71,top+64,37,30);P.box(c,x+34,top+64,37,30);P.rect(c,x-54,top+64,3,30);P.rect(c,x+51,top+64,3,30);
    if(i%2===0){P.rect(c,x-80,top-32,28,24);P.stipple(c,x-76,top-28,20,16,4,P.PAPER);}else {P.rect(c,x+60,top-33,3,25);P.rect(c,x+47,top-33,28,3);}
    P.text(c,String(i+1).padStart(2,'0'),x-86,floor-28,2);
    if(active){P.box(c,x-56,floor-112,112,22,P.SIG);P.text(c,'E / ENTER',x,floor-105,1,P.INK,'center');}
    const lamp=x+bw/2+21;P.rect(c,lamp,floor-127,4,127);P.box(c,lamp-8,floor-137,20,18,P.SIG);P.rect(c,lamp-7,floor-4,18,4);
   }
   if(d.id==='canal'){P.text(c,'PUMP STATION / EAST',580-camera+260,h-12,1);}
   if(state.target!=null){const tx=state.target-camera;P.dotted(c,state.x-camera,floor+4,tx,floor+4,P.SIG,4,10);P.rect(c,tx-3,floor+2,6,6,P.SIG);}
   P.sprite(c,sample,state.x-camera,floor,4,state.facing||'right',!!state.walking,reduced?0:Math.floor(time/105));
   if(camera>0)P.text(c,'<',15,179,3);if(camera<d.width-w)P.text(c,'>',w-15,179,3,P.INK,'right');
   P.rect(c,0,0,w,30,P.PAPER);P.rect(c,0,29,w,1,P.INK);P.text(c,d.name,24,10,2);P.text(c,'LOCAL / NO TIMER',w-24,12,1,P.INK,'right');P.rect(c,0,h-21,w,21,P.INK);P.text(c,'< > WALK    E ENTER    CLICK A DOOR TO WALK THERE',w/2,h-14,1,P.PAPER,'center');return geo;
  }
  function hit(cx,cy){const r=canvas.getBoundingClientRect(),x=(cx-r.left)*canvas.width/r.width+geo.camera,y=(cy-r.top)*canvas.height/r.height;return {x,y,door:geo.doors?.find(d=>Math.abs(d[3]-x)<102&&y>55&&y<geo.floor+15)};}
  return {render,hit,metrics:()=>geo};
 }
 root.HeistStreet={create,districts};
})(globalThis);
