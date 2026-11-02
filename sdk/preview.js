'use strict';
const fs=require('fs'), path=require('path'), os=require('os'), http=require('http');
const {execFileSync,spawn}=require('child_process');
const sdk=require('./index');
async function preview(root) {
 const m=sdk.validate(root), build=fs.mkdtempSync(path.join(os.tmpdir(),'goode-preview-')), binary=path.join(build,'screen');
 const compiler=m.renderer.language==='cpp'?'clang++':'clang';
 execFileSync(compiler,['-O2','-I',path.join(__dirname,'include'),sdk.file(root,m.renderer.entry),path.join(__dirname,'host/preview.c'),'-o',binary],{timeout:30000});
 const child=spawn(binary,[],{stdio:['pipe','pipe','pipe']});
 const size=480*240*3;let pending=Buffer.alloc(0),latest=Buffer.alloc(size),error='';
 child.stderr.on('data',d=>{error=(error+d).slice(-2000);});
 child.stdout.on('data',d=>{pending=Buffer.concat([pending,d]);while(pending.length>=size){latest=Buffer.from(pending.subarray(0,size));pending=pending.subarray(size);}});
 const token=require('crypto').randomBytes(24).toString('hex');
 const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.searchParams.get('token')!==token){res.writeHead(403).end();return;}
  res.setHeader('Cache-Control','no-store');
  if(u.pathname==='/frame'){res.setHeader('Content-Type','application/octet-stream');res.end(latest);return;}
  if(u.pathname==='/touch' && req.method==='POST'){
   const x=Number(u.searchParams.get('x')),y=Number(u.searchParams.get('y')),p=Number(u.searchParams.get('p'));
   if(Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<480&&y>=0&&y<240&&[0,1].includes(p)&&!child.killed&&child.stdin.writable) child.stdin.write(`${x} ${y} ${p}\n`);
   res.end();return;
  }
  res.setHeader('Content-Type','text/html');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'");
  res.end(`<!doctype html><meta charset="utf-8"><title>Goodecode 2 — native preview</title><style>body{margin:0;background:#061525;color:#eafaff;font:16px system-ui;display:grid;place-content:center;min-height:100vh}canvas{width:min(960px,95vw);aspect-ratio:2;image-rendering:pixelated;touch-action:none;border:1px solid #26d8f4}p{color:#ffd454}</style><canvas width="480" height="240"></canvas><p>MODDED · Simulated telemetry · Native renderer · 480 × 240</p><script>const c=document.querySelector('canvas'),ctx=c.getContext('2d'),token=new URLSearchParams(location.search).get('token');async function frame(){try{const b=new Uint8Array(await(await fetch('/frame?token='+token)).arrayBuffer()),d=ctx.createImageData(480,240);for(let i=0,j=0;i<b.length;i+=3,j+=4){d.data[j]=b[i];d.data[j+1]=b[i+1];d.data[j+2]=b[i+2];d.data[j+3]=255;}ctx.putImageData(d,0,0);}finally{setTimeout(frame,33)}}frame();for(const [e,p] of [['pointerdown',1],['pointerup',0]])c.addEventListener(e,v=>{const r=c.getBoundingClientRect();fetch('/touch?token='+token+'&x='+Math.min(479,Math.max(0,Math.floor((v.clientX-r.left)*480/r.width)))+'&y='+Math.min(239,Math.max(0,Math.floor((v.clientY-r.top)*240/r.height)))+'&p='+p,{method:'POST'});});</script>`);
 });
 try { await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);}); }
 catch(e) {child.kill();fs.rmSync(build,{recursive:true,force:true});throw e;}
 const close=()=>{child.kill();server.close();server.closeAllConnections();fs.rmSync(build,{recursive:true,force:true});};
 child.on('error',e=>{error=e.message;}); child.on('exit',()=>{error=error||'Renderer exited';});
 return {url:`http://127.0.0.1:${server.address().port}/?token=${token}`,close,get error(){return error;}};
}
module.exports={preview};
