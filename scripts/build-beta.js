'use strict';
// Build a separate extension identity; never rewrite the stable package.json.
const fs=require('fs'),path=require('path');
const base=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(base,'dist/goodecode-beta'));
if(out===base || base.startsWith(out+path.sep)) throw Error('Beta output must not contain the source directory.');
fs.mkdirSync(out,{recursive:true});
for(const item of ['extension.js','src','sdk','media','content','schemas','snippets','syntaxes','language-configuration.json','README.md','LICENSE','.vscodeignore']) {
 const input=path.join(base,item);if(fs.existsSync(input))fs.cpSync(input,path.join(out,item),{recursive:true});
}
const namespace=s=>s.replace(/goodecode\.(?=(?:open|refresh|create|check|export|capture|migrate|generate|validate|preview|brainCapture|sidebar))/g,'goodecodeBeta.');
function rewrite(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())rewrite(p);else if(p.endsWith('.js'))fs.writeFileSync(p,namespace(fs.readFileSync(p,'utf8')));}}
rewrite(path.join(out,'src'));rewrite(path.join(out,'sdk'));fs.writeFileSync(path.join(out,'extension.js'),namespace(fs.readFileSync(path.join(out,'extension.js'),'utf8')));
// Do not rewrite project filenames in the SDK; the namespace substitution above
// applies only to command strings in extension files, restored for SDK/project code.
fs.cpSync(path.join(base,'sdk'),path.join(out,'sdk'),{recursive:true});
fs.copyFileSync(path.join(base,'src/project.js'),path.join(out,'src/project.js'));
const pkg=JSON.parse(fs.readFileSync(path.join(base,'package.json')));
pkg.name='goodecode-beta';pkg.displayName='Goodecode 2 Beta';pkg.version='2.0.0-beta.1';pkg.preview=true;pkg.goodecodeBeta=true;
pkg.description='Native Brain screen mod SDK and language adapters for Cortex (beta).';
const rename=v=>typeof v==='string'?v.replaceAll('goodecode.','goodecodeBeta.'):Array.isArray(v)?v.map(rename):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k.replaceAll('goodecode.','goodecodeBeta.'),rename(x)])):v;
pkg.contributes=rename(pkg.contributes);pkg.activationEvents=rename(pkg.activationEvents);
if(pkg.contributes.viewsContainers?.activitybar) for(const container of pkg.contributes.viewsContainers.activitybar) if(container.id==='goodecode')container.id='goodecodeBeta';
if(pkg.contributes.views?.goodecode){pkg.contributes.views.goodecodeBeta=pkg.contributes.views.goodecode;delete pkg.contributes.views.goodecode;}

for(const [id,title] of Object.entries({createModProject:'Create Mod Project',generateMod:'Generate Mod Instructions',validateMod:'Validate Mod',previewModScreen:'Preview Screen',exportModdedProject:'Export Modded Project'}))pkg.contributes.commands.push({command:'goodecodeBeta.'+id,title,category:'Goodecode 2 Beta'});
pkg.contributes.jsonValidation=[
 {fileMatch:['**/goode.mod.json'],url:'./sdk/schemas/mod.schema.json'},
 {fileMatch:['**/goode.instructions.json'],url:'./sdk/schemas/instructions.schema.json'}
];
pkg.scripts={};delete pkg.devDependencies;
fs.writeFileSync(path.join(out,'package.json'),JSON.stringify(pkg,null,2)+'\n');
console.log(out);
