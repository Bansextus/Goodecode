'use strict';
const fs=require('fs'),path=require('path');
const sdk=require('../sdk');
function activateMods(vscode,context,root) {
 const trusted=()=>{if(!vscode.workspace.isTrusted) throw Error('Native mods and language adapters require a trusted workspace. Review the repository before trusting it.');};
 const register=(name,handler)=>context.subscriptions.push(vscode.commands.registerCommand('goodecode.'+name,async()=>{try{trusted();await handler();}catch(e){vscode.window.showErrorMessage('Goodecode 2: '+e.message);}}));
 register('createModProject',async()=>{
  const dirs=await vscode.window.showOpenDialog({canSelectFolders:true,canSelectFiles:false,canSelectMany:false,openLabel:'Choose empty mod folder'});
  if(!dirs?.[0]) return;sdk.create(dirs[0].fsPath);
  await vscode.commands.executeCommand('vscode.openFolder',dirs[0]);
 });
 register('generateMod',async()=>{sdk.generate(root());vscode.window.showInformationMessage('MODDED project generated. Native renderer and Cortex checks run during build.');});
 register('validateMod',async()=>{sdk.validate(root());vscode.window.showInformationMessage('MODDED package sources and SDK versions are valid. This does not certify native code or deployability.');});
 register('exportModdedProject',async()=>{
  const target=await vscode.window.showSaveDialog({defaultUri:vscode.Uri.file(path.join(root(),path.basename(root())+'.goode')),filters:{'Modded Goodecode':['goode']}});
  if(target){sdk.exportMod(root(),target.fsPath);vscode.window.showInformationMessage('Exported MODDED .goode with editable renderer source.');}
 });
 register('previewModScreen',async()=>{
  const host=await require('../sdk/preview').preview(root());
  const panel=vscode.window.createWebviewPanel('goodecode.nativePreview','MODDED Brain — simulated telemetry',vscode.ViewColumn.Beside,{enableScripts:true});
  const origin=new URL(host.url).origin;
  panel.webview.html=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${origin}; style-src 'unsafe-inline'"><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;background:#061525}</style><iframe src="${host.url}"></iframe>`;
  panel.onDidDispose(()=>host.close());context.subscriptions.push({dispose:host.close});
 });
}
module.exports={activateMods};
