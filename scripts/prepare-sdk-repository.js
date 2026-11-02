'use strict';
// Whitelist public files. Never copy GoodebotCore or the private runtime/compiler.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||'/private/tmp/Goodecode-2-SDK');
if(fs.existsSync(out)&&fs.readdirSync(out).length)throw Error('Repository output must be empty.');
fs.mkdirSync(out,{recursive:true});
fs.cpSync(path.join(root,'sdk'),path.join(out,'sdk'),{recursive:true});
fs.mkdirSync(path.join(out,'src'));
for(const name of ['project.js','zip.js'])fs.copyFileSync(path.join(root,'src',name),path.join(out,'src',name));
fs.copyFileSync(path.join(root,'sdk/README.md'),path.join(out,'README.md'));
fs.copyFileSync(path.join(root,'README.md'),path.join(out,'sdk/docs/extension-modding.md'));
for(const name of ['LICENSE','NOTICE','TRADEMARKS.md'])fs.copyFileSync(path.join(root,name),path.join(out,name));
fs.writeFileSync(path.join(out,'.gitignore'),'*.goode\n*.vsix\n.DS_Store\nnode_modules/\n');
fs.writeFileSync(path.join(out,'package.json'),JSON.stringify({name:'goodecode-native-sdk',version:'2.0.0-beta.1',private:true,license:'Apache-2.0',scripts:{test:'node --test sdk/test/sdk.test.js'}},null,2)+'\n');
fs.mkdirSync(path.join(out,'.github/workflows'),{recursive:true});
fs.writeFileSync(path.join(out,'.github/workflows/test.yml'),`name: SDK tests
on: [push, pull_request]
jobs:
  sdk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: npm test
`);
console.log(out);
