/* Design A geometry validation. Pure data checks, shared by editor and server.
   Does not change HeistEngine's rules or original sprite artwork. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./engine.js'):root.HeistEngine);if(typeof module==='object'&&module.exports)module.exports=api;else root.CutawayRules=api;})(globalThis,function(E){
 'use strict';
 function conventionErrors(raw){
  const v=E.validate(raw);if(!v.ok)return v.errors;
  const errors=[],h=raw.map.length,w=raw.map[0].length;
  if(h%2!==1||h<7||h>13)errors.push('Use 3 to 6 floors (7 to 13 alternating rows).');
  for(let y=2;y<h-1;y+=2)for(let x=1;x<w-1;x++){
   const c=E.tile(raw,x,y);if(!'#.'.includes(c))errors.push('Slabs accept only a wall or ladder hatch.');
   if(c==='.'&&[y-1,y+1].some(yy=>E.tile(raw,x,yy)==='#'))errors.push('A ladder must connect two open landings.');
   if(c==='.'&&(E.tile(raw,x-1,y)==='.'||E.tile(raw,x+1,y)==='.'))errors.push('Separate ladder shafts by at least one slab column.');
  }
  for(const d of [...(raw.lasers||[]),...(raw.cameras||[])]){
   if(d.y%2!==1||E.tile(raw,d.x,d.y)!=='.')errors.push('Fixed devices need an empty floor tile.');
   if(E.tile(raw,d.x,d.y-1)==='.'||E.tile(raw,d.x,d.y+1)==='.')errors.push('A device cannot obstruct a ladder landing.');
  }
  for(const g of raw.guards||[])if(g.path.some(p=>p[1]%2!==1||p[1]!==g.path[0][1]))errors.push('Drone patrols must stay on a single floor.');
  if(E.period(E.normalize(raw))>720)errors.push('Combined security cycle is too long (maximum 720 turns).');
  return [...new Set(errors)];
 }
 function validate(raw){const errors=conventionErrors(raw);return {ok:!errors.length,errors};}
 function landing(l,x,y){return y%2===1&&(E.tile(l,x,y-1)==='.'||E.tile(l,x,y+1)==='.');}
 function normalize(raw){const v=validate(raw);if(!v.ok)throw Error(v.errors.join(' '));return E.normalize(raw);}
 function blank(floors=4,width=13){floors=Math.max(3,Math.min(6,Math.floor(Number(floors))||4));width=Math.max(9,Math.min(15,Math.floor(Number(width))||13));const rows=2*floors+1,map=Array.from({length:rows},(_,y)=>y%2?'#'+'.'.repeat(width-2)+'#':'#'.repeat(width));for(let y=2;y<rows-1;y+=2){const r=[...map[y]];r[2]='.';r[width-3]='.';map[y]=r.join('');}function put(x,y,c){const r=[...map[y]];r[x]=c;map[y]=r.join('');}put(1,1,'S');put(width-2,1,'E');put(Math.floor(width/2),rows-2,'T');return E.normalize({id:'custom-cutaway',name:'My Cutaway',tag:'WORKSHOP',map,lasers:[],cameras:[],guards:[],emps:1,maxAlarms:2,par:80});}
 return Object.freeze({conventionErrors,validate,normalize,landing,blank});
});
