'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {execFileSync}=require('child_process'),sdk=require('..');
function project(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'goode-sdk-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));sdk.create(root);return root;}
test('Python, JavaScript and TypeScript produce identical canonical Cortex source',t=>{
 const root=project(t),m=sdk.manifest(root);let expected;
 for(const [language,ext]of [['python','py'],['javascript','js'],['typescript','ts']]){
  m.adapter={language,entry:`authoring/program.${ext}`};fs.writeFileSync(path.join(root,'goode.mod.json'),JSON.stringify(m));sdk.generate(root);
  const source=fs.readFileSync(path.join(root,'src/main.goode.py'),'utf8');if(expected)assert.equal(source,expected);else expected=source;
 }
});
test('mod export preserves sources, lock, generated instructions and format 2 marker',t=>{
 const root=project(t);sdk.generate(root);const output=path.join(root,'demo.goode');sdk.exportMod(root,output);
 const entries=execFileSync('/usr/bin/unzip',['-Z1',output],{encoding:'utf8'});
 for(const file of ['goode.mod.json','goode.lock.json','goode.instructions.json','renderer/screen.c','authoring/program.py'])assert.ok(entries.split('\n').includes(file));
 const metadata=JSON.parse(execFileSync('/usr/bin/unzip',['-p',output,'goodecode.json']));assert.equal(metadata.formatVersion,2);assert.equal(metadata.modded,true);
 const checks=JSON.parse(execFileSync('/usr/bin/unzip',['-p',output,'checksums.json']));assert.ok(checks.files['renderer/screen.c']);
 assert.throws(()=>require('../../src/project').buildPackage({root,outputPath:output,extensionVersion:'1.0.2'}),/Export Modded/);
});
test('reject stale output, incompatible ABI and path traversal without executing authoring code',t=>{
 const root=project(t);sdk.generate(root);fs.appendFileSync(path.join(root,'authoring/program.py'),'\nraise Exception("MUST NOT RUN")');assert.throws(()=>sdk.validate(root),/stale/);
 const m=sdk.manifest(root);m.renderer.entry='../escape.c';fs.writeFileSync(path.join(root,'goode.mod.json'),JSON.stringify(m));assert.throws(()=>sdk.manifest(root),/Renderer/);
 m.renderer.entry='renderer/screen.c';m.renderer.abiVersion=9;fs.writeFileSync(path.join(root,'goode.mod.json'),JSON.stringify(m));assert.throws(()=>sdk.manifest(root),/ABI/);
});
test('reject renderer symlinks and unknown IR operations',t=>{
 const root=project(t);fs.unlinkSync(path.join(root,'renderer/screen.c'));fs.symlinkSync('/etc/passwd',path.join(root,'renderer/screen.c'));assert.throws(()=>sdk.manifest(root),/symlink/);
 assert.throws(()=>sdk.validateIR({schemaVersion:1,name:'bad',configuration:[],autonomous:[{op:'native_shell',args:{}}],driver:[]}),/Unsupported/);
});
test('native desktop host produces changing RGB frames and responds to touch',async t=>{
 const root=project(t);sdk.generate(root);const host=await require('../preview').preview(root);t.after(host.close);
 const url=new URL(host.url),token=url.searchParams.get('token');
 async function frame(){return Buffer.from(await(await fetch(`${url.origin}/frame?token=${token}`)).arrayBuffer());}
 // Wait on observable frames rather than depending on compiler/host startup timing.
 let a;for(let i=0;i<30;i++){a=await frame();if(a.some(v=>v!==0))break;await new Promise(r=>setTimeout(r,10));}
 assert.equal(a.length,480*240*3);assert.ok(a.some(v=>v!==0));
 await fetch(`${url.origin}/touch?token=${token}&x=200&y=180&p=1`,{method:'POST'});
 let b;for(let i=0;i<30;i++){b=await frame();if(!b.equals(a))break;await new Promise(r=>setTimeout(r,10));}assert.ok(!b.equals(a));
 assert.equal((await fetch(`${url.origin}/frame`)).status,403);
});
