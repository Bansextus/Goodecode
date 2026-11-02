#!/usr/bin/env node
'use strict';
const sdk=require('./index');
const [command,root,output]=process.argv.slice(2);
(async()=>{switch(command){
 case 'create':sdk.create(root);break;
 case 'generate':sdk.generate(root);break;
 case 'validate':console.log(JSON.stringify(sdk.validate(root),null,2));break;
 case 'export':sdk.exportMod(root,output);console.log(output);break;
 case 'preview':{const host=await require('./preview').preview(root);console.log(host.url);for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{host.close();process.exit();});break;}
 default:throw Error('Usage: node sdk/cli.js create|generate|validate|preview|export PROJECT [OUTPUT.goode]');
}})().catch(e=>{console.error(e.message);process.exitCode=1;});
