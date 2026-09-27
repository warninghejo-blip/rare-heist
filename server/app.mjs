import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash,timingSafeEqual} from 'node:crypto';
import {ArenaStore} from './store.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function createApp({dbFile=path.join(root,'data/last-heist.sqlite'),clock=Date.now,minActionMs=80,publicOrigin=process.env.PUBLIC_ORIGIN||''}={}){
 if(publicOrigin){const u=new URL(publicOrigin);if(!['http:','https:'].includes(u.protocol))throw Error('PUBLIC_ORIGIN must be http(s)');publicOrigin=u.origin;}
 if(dbFile!==':memory:')mkdirSync(path.dirname(dbFile),{recursive:true});
 const store=new ArenaStore(dbFile,{clock,minActionMs});
 const html=readFileSync(path.join(root,'index.html'));
 const optional=f=>{try{return readFileSync(path.join(root,f));}catch{return null;}},concept=optional('concepts.html'),review=optional('review.html');
 const hashes=[...(html.toString()+(concept?concept.toString():'')).matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>"'sha256-"+createHash('sha256').update(m[1]).digest('base64')+"'");
 const security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()',
 'Content-Security-Policy':`default-src 'none'; script-src ${hashes.join(' ')}; style-src 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://rpc.mainnet.chain.robinhood.com; font-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`};
 const limits=new Map();
 const buildId=createHash('sha256').update(html).digest('hex');
 function limited(key,max){const now=clock();let x=limits.get(key);
  if(!x||now-x.at>60000){x={at:now,n:0};limits.set(key,x);}
  if(limits.size>4000){for(const [k,v] of limits)if(now-v.at>60000)limits.delete(k);while(limits.size>5000)limits.delete(limits.keys().next().value);}
  return ++x.n>max;
 }
 function hostOK(req){const host=req.headers.host||'';if(publicOrigin)return host===new URL(publicOrigin).host;
  return /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host);
 }
 function json(res,status,value,extra={}){res.writeHead(status,{...security,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});res.end(JSON.stringify(value));}
 function checkOrigin(req){const origin=req.headers.origin;const expected=publicOrigin||`http://${req.headers.host}`;if(!origin||origin!==expected){const e=Error('Same-origin requests required');e.code='ORIGIN';throw e;}if(req.headers['sec-fetch-site']==='cross-site'){const e=Error('Cross-site requests rejected');e.code='ORIGIN';throw e;}}
 async function body(req){if(!(req.headers['content-type']||'').startsWith('application/json')){const e=Error('JSON content type required');e.code='CONTENT_TYPE';throw e;}let n=0,chunks=[];for await(const c of req){n+=c.length;if(n>65536){const e=Error('Request too large');e.code='BODY_SIZE';throw e;}chunks.push(c);}try{const b=JSON.parse(Buffer.concat(chunks).toString()||'{}');if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b;}catch{const e=Error('Invalid JSON');e.code='JSON';throw e;}}
 function token(req){return req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('rh_session='))?.slice(11);}
 function authenticate(req){const s=store.session(token(req));if(!s){const e=Error('Open a new guest session');e.code='SESSION';throw e;}if(req.method!=='GET'){const a=Buffer.from(req.headers['x-rh-csrf']||''),b=Buffer.from(s.csrf);if(a.length!==b.length||!timingSafeEqual(a,b)){const e=Error('Invalid request token');e.code='CSRF';throw e;}}return s;}
 const server=createServer(async(req,res)=>{
  try{
   if(!hostOK(req))return json(res,421,{error:'HOST',message:'Use the configured site origin.'});
   const u=new URL(req.url,'http://localhost'),p=u.pathname;
   if(p==='/healthz'){return json(res,200,{ok:true,version:'1.9.0',storage:'sqlite',funds:'none',build:buildId});}
   if(!p.startsWith('/api/')){
    if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'METHOD'});
    let bytes,type='text/html; charset=utf-8';
    if(['/','/index.html','/play'].includes(p))bytes=html;
    else if(concept&&['/concepts','/concepts.html'].includes(p))bytes=concept;
    else if(review&&['/review','/review.html'].includes(p))bytes=review;
    else return json(res,404,{error:'NOT_FOUND'});
    res.writeHead(200,{...security,'Content-Type':type,'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:bytes);return;
   }
   if(!['GET','POST'].includes(req.method))return json(res,405,{error:'METHOD'});
   if(req.method==='POST'&&limited('peer:'+(req.socket.remoteAddress||'unknown'),1200))return json(res,429,{error:'RATE_LIMIT',message:'Too many writes. Wait a minute.'},{'Retry-After':'60'});
   if(req.method==='POST')checkOrigin(req);
   if(p==='/api/session'&&req.method==='POST'){
    await body(req);if(!store.session(token(req))&&limited('new-session:'+(req.socket.remoteAddress||'unknown'),60))return json(res,429,{error:'RATE_LIMIT',message:'Session creation limit reached.'},{'Retry-After':'60'});const v=store.bootstrap(token(req));const extra=v.token?{'Set-Cookie':`rh_session=${v.token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${publicOrigin.startsWith('https:')?'; Secure':''}`}:{};
    return json(res,200,{...v.session,balance:store.balance(v.session.player),source:'server',siteOrigin:publicOrigin||`http://${req.headers.host}`},extra);
   }
   const s=authenticate(req),b=req.method==='POST'?await body(req):null;
   if(limited(req.method+':session:'+s.player,req.method==='POST'?180:900))return json(res,429,{error:'RATE_LIMIT',message:'Please wait before retrying.'},{'Retry-After':'60'});
   if(p==='/api/economy'&&req.method==='GET')return json(res,200,store.economy());
   const resume=p.match(/^\/api\/attempts\/([a-f0-9]{32})$/);
   if(resume&&req.method==='GET')return json(res,200,store.attempt(resume[1],s.player));
   if(p==='/api/session'&&req.method==='GET')return json(res,200,{...s,balance:store.balance(s.player),source:'server',siteOrigin:publicOrigin||`http://${req.headers.host}`});
   if(p==='/api/session/name'&&req.method==='POST')return json(res,200,store.rename(s.player,b.name));
   if(p==='/api/rounds')return json(res,200,req.method==='GET'?{rounds:store.list(s.player)}:store.create(s.player,b.profile));
   const m=p.match(/^\/api\/rounds\/([a-z0-9-]{1,40})(?:\/(enter|finish|fortify|skip|claim|edit-context|replays))?$/);if(!m)return json(res,404,{error:'NOT_FOUND'});
   const [,id,action]=m;
   if(!action&&req.method==='GET')return json(res,200,store.round(id,s.player));
   if(action==='replays'&&req.method==='GET')return json(res,200,store.replays(id,s.player));
   if(action==='edit-context'&&req.method==='GET')return json(res,200,store.context(id,s.player));
   if(req.method!=='POST')return json(res,405,{error:'METHOD'});
   let result;if(action==='enter')result=store.enter(id,s.player,b.heroId);
   else if(action==='finish')result=store.finish(id,b.ticket,s.player,b.actions);
   else if(action==='fortify')result=store.fortify(id,s.player,b.revision,b.change,b.actions);
   else if(action==='skip')result=store.skip(id,s.player);
   else if(action==='claim')result=store.claim(id,s.player);
   else return json(res,404,{error:'NOT_FOUND'});
   json(res,200,result);
  }catch(e){const code=e.code||'SERVER';const status=['SESSION','CSRF','ORIGIN'].includes(code)?403:code==='NOT_FOUND'?404:code==='RATE_LIMIT'?429:code==='BODY_SIZE'?413:code==='SERVER'?500:409;json(res,status,{error:code,message:code==='SERVER'?'Request failed. No outcome was credited.':e.message});}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.maxHeadersCount=50;
 server.on('close',()=>store.close());return {server,store};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||4173),host=process.env.HOST||'127.0.0.1';if(!Number.isInteger(port)||port<1024||port>65535)throw Error('PORT must be 1024..65535');
 const dbFile=path.join(process.env.DATA_DIR||path.join(root,'data'),'last-heist.sqlite');
 const {server}=createApp({dbFile});server.listen(port,host,()=>console.log(`Rare Heist 1.9 — http://${host}:${port}\nShared Last Heist: SQLite, real guest sessions, DEMO rewards only.\nNo wallets, approvals, deposits or real prizes. Ctrl+C to stop.`));
 for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close(()=>process.exit(0)));
}
