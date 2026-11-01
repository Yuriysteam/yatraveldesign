#!/usr/bin/env node
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const selected=process.argv.slice(2);const modes=selected.length?selected:['hotels','avia','trains'];
for(const mode of modes){if(!['hotels','avia','trains'].includes(mode))throw Error('Допустимые сценарии: hotels avia trains');console.log('\n'+{hotels:'ОТЕЛИ',avia:'АВИА',trains:'Ж/Д'}[mode]);const args=mode==='hotels'?[path.join(root,'update.mjs')]:[path.join(root,'update-transport.mjs'),mode];const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{cwd:root,stdio:'inherit'});p.on('error',reject);p.on('exit',resolve)});if(code!==0){process.exitCode=1;break}}

if(!process.exitCode){const code=await new Promise((resolve,reject)=>{const p=spawn('python3',[path.join(root,'tools/build-catalog.py')],{cwd:root,stdio:'inherit'});p.on('error',reject);p.on('exit',resolve)});if(code!==0)process.exitCode=1}
