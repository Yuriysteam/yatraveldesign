#!/usr/bin/env node
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url));
process.env.PATH=path.dirname(process.execPath)+path.delimiter+(process.env.PATH||'');
const skill=process.env.PLAYWRIGHT_CLI_SKILL_DIR||path.join(os.homedir(),'.agents/skills/playwright-cli');
const {call}=await import(pathToFileURL(path.join(skill,'scripts/playwright_runtime.mjs')));
const mode=process.argv[2];if(!['avia','trains'].includes(mode))throw Error('Укажите avia или trains');
const transport=JSON.parse(await fs.readFile(path.join(root,'transport.json'),'utf8')),scenario=transport[mode],outputRoot=path.join(root,mode);
await fs.mkdir(outputRoot,{recursive:true});
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+transport.offsetDays);const when=d.toISOString().slice(0,10);
const homeUrl='https://travel.yandex.ru/'+(mode==='avia'?'avia':'trains')+'/';
const resultsUrl=mode==='avia'?'https://travel.yandex.ru/avia/search/result/?'+new URLSearchParams({fromId:scenario.fromId,fromName:scenario.fromName,toId:scenario.toId,toName:scenario.toName,when,return_date:'',oneway:'1',klass:scenario.klass,adult_seats:String(scenario.adults),children_seats:'0',infant_seats:'0'}):`https://travel.yandex.ru/trains/${scenario.fromSlug}--${scenario.toSlug}/?when=${when}`;
const detailsUrl=mode==='trains'?'https://travel.yandex.ru/trains/order/?'+new URLSearchParams({...scenario,when}):resultsUrl;
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'travel-four-pages-')),stage=path.join(temp,'pages');await fs.mkdir(stage);
const session='travel-four-'+randomUUID();let opened=false,server;
const quote=JSON.stringify;
function nativeResult(stdout){const text=String(stdout||'').trim();try{const parsed=JSON.parse(text);if(typeof parsed.result==='string')return JSON.parse(parsed.result);if(parsed.result!==undefined)return parsed.result;return parsed}catch{}const start=text.indexOf('### Result\n');if(start<0)throw Error('Нет структурированного результата браузера: '+text.slice(0,300));const body=text.slice(start+11).split('\n### ')[0].trim();return JSON.parse(body)}
async function invoke(args,timeout=90){const r=await call({operation:'invoke',session,cwd:temp,arguments:args,timeout});if(r.status!=='ok')throw Error(r.error||'Ошибка браузера');if(r.stdout?.includes('### Error'))throw Error(r.stdout.slice(r.stdout.indexOf('### Error'),r.stdout.indexOf('### Error')+500));return r}
async function browser(code,timeout=90){return nativeResult((await invoke(['--pw-safe-allow-unrestricted-code','run-code',code],timeout)).stdout)}
async function command(exe,args){await new Promise((resolve,reject)=>{const p=spawn(exe,args,{cwd:root,stdio:['ignore','pipe','pipe']});let err='';p.stdout.on('data',()=>{});p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error(err.slice(-800)||'Ошибка локализации ресурсов')))});}
async function exportPage(slug,source,which='page'){
 const raw=path.join(temp,slug+'.html'),dest=path.join(stage,slug);await fs.mkdir(dest);
 const info=await browser(`async page=>{const target=${which};await target.evaluate(async()=>{document.documentElement.classList.remove('theme_system','theme_dark');document.documentElement.classList.add('theme_light');document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.loading='eager');await document.fonts.ready});try{await target.waitForLoadState('networkidle',{timeout:8000})}catch{};const download=target.waitForEvent('download');await target.evaluate(()=>{const clone=document.documentElement.cloneNode(true);clone.querySelectorAll('script,iframe,noscript').forEach(e=>e.remove());const original=[...document.querySelectorAll('input')];clone.querySelectorAll('input').forEach((e,i)=>e.setAttribute('value',original[i].value));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['<!doctype html>\\n'+clone.outerHTML],{type:'text/html'}));a.download='rendered.html';a.click()});await(await download).saveAs(${quote(raw)});await target.screenshot({path:${quote(path.join(dest,'preview.png'))}});return {title:await target.title(),capturedAt:await target.evaluate(()=>new Date().toISOString())};}`,90);
 await command('python3',[path.join(root,'tools/localize.py'),raw,dest,source]);
 const manifest=JSON.parse(await fs.readFile(path.join(dest,'source.json'),'utf8'));if(manifest.failures.length)console.log(slug+': '+manifest.failures.length+' недоступных дополнительных ресурсов; видимые изображения проверяются отдельно.');manifest.capturedAt=info.capturedAt;manifest.title=info.title;await fs.writeFile(path.join(dest,'source.json'),JSON.stringify(manifest,null,2));
 console.log(slug+': HTML и '+manifest.resourceCount+' ресурсов');
}
try{
 const config=JSON.parse(await fs.readFile(path.join(skill,'assets/chromium-headless.json'),'utf8'));Object.assign(config.browser.contextOptions,{colorScheme:'light',viewport:{width:1440,height:1000}});const configPath=path.join(temp,'browser.json');await fs.writeFile(configPath,JSON.stringify(config),{mode:0o600});
 await invoke(['open','about:blank','--config='+configPath]);opened=true;
 await invoke(['goto',homeUrl]);await browser(`async page=>{await page.locator('body').waitFor();return {ready:true}}`);await exportPage('01-home',homeUrl);
 await invoke(['goto',resultsUrl]);
 let selected={};
 if(mode==='avia'){
  await browser(`async page=>{await page.getByRole('button',{name:'Партнёры',exact:true}).waitFor({timeout:45000});await page.getByRole('button',{name:'Партнёры',exact:true}).click();await page.getByRole('checkbox',{name:'Выбрать всё',exact:true}).uncheck();await page.getByText('Яндекс Путешествия',{exact:true}).click();await page.locator('header').first().click({position:{x:10,y:10}});await page.getByText('купить на Путешествиях',{exact:true}).first().waitFor();return {ready:true}}`,70);
  await exportPage('02-results',resultsUrl);
  selected=await browser(`async page=>{await page.locator('button').filter({has:page.locator('[data-qa=price]')}).first().click();const dialog=page.getByRole('dialog');await dialog.waitFor();await dialog.locator('a[href*="/avia/redirect/"][href*="partner=yatravel"]').first().waitFor();return {details:(await dialog.innerText()).slice(0,450)}}`);
  await exportPage('03-details',resultsUrl);
  await browser(`async page=>{const popup=page.context().waitForEvent('page',{timeout:15000});await page.getByRole('dialog').locator('a[href*="/avia/redirect/"][href*="partner=yatravel"]').first().click();const p=await popup;await p.waitForURL('**/avia/booking/**',{timeout:45000});await p.getByText('Данные пассажиров',{exact:true}).first().waitFor();return {ready:true}}`,70);
  await exportPage('04-checkout','https://travel.yandex.ru/avia/booking/',`page.context().pages().find(p=>p.url().includes('/avia/booking/'))`);
 }else{
  await browser(`async page=>{await page.getByText(${quote(scenario.number)},{exact:false}).first().waitFor({timeout:45000});return {ready:true}}`,60);
  await exportPage('02-results',resultsUrl);
  await invoke(['goto',detailsUrl]);
  await browser(`async page=>{await page.locator('svg g.Place_available:visible .Place__trigger').first().waitFor({timeout:45000});await page.getByRole('button',{name:'Указать пассажиров',exact:true}).waitFor();return {ready:true}}`,60);
  await exportPage('03-details',detailsUrl);
  selected=await browser(`async page=>{const seat=page.locator('svg g.Place_available:visible').first();const seatLabel=await seat.getAttribute('class');await seat.locator('.Place__trigger').click();await page.getByRole('button',{name:'Указать пассажиров',exact:true}).click();await page.waitForURL('**/trains/order/passengers/**');await page.locator('input:not([type=checkbox]):not([type=hidden]):visible').nth(2).waitFor({timeout:30000});return {seat:seatLabel}}`,60);
  await exportPage('04-checkout','https://travel.yandex.ru/trains/order/passengers/');
 }
 // Verify the exported HTML with remote network blocked before replacing any existing page.
 const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
 server=http.createServer(async(req,res)=>{try{const p=path.resolve(stage,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(stage+path.sep))throw Error();const f=(await fs.stat(p)).isDirectory()?path.join(p,'index.html'):p;res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Access-Control-Allow-Origin':'*'});res.end(await fs.readFile(f))}catch{res.writeHead(404);res.end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const local='http://127.0.0.1:'+server.address().port;
 await browser(`async page=>{await page.route('**/*',r=>r.request().url().startsWith(${quote(local)})?r.continue():r.abort());return {offlineCheck:true}}`);
 const checks=[];
 for(const slug of ['01-home','02-results','03-details','04-checkout']){
  await invoke(['goto',local+'/'+slug+'/']);
  const result=await browser(`async page=>{await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);return await page.evaluate(()=>({elements:document.querySelectorAll('*').length,fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family),brokenImages:[...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0&&(!i.complete||!i.naturalWidth)).length,theme:document.documentElement.className,external:performance.getEntriesByType('resource').filter(r=>/^https?:/.test(r.name)&&!r.name.startsWith(location.origin)).map(r=>r.name)}))}`);
  if(result.elements<100||!result.fonts.length||result.brokenImages||result.external.length||!result.theme.includes('theme_light'))throw Error(slug+': локальная проверка не пройдена: '+JSON.stringify(result));checks.push({page:slug,...result});
 }
 for(const slug of ['01-home','02-results','03-details','04-checkout']){const dest=path.join(outputRoot,slug),backup=dest+'.previous';await fs.rm(backup,{recursive:true,force:true});try{await fs.rename(dest,backup)}catch(e){if(e.code!=='ENOENT')throw e}try{await fs.cp(path.join(stage,slug),dest,{recursive:true});await fs.rm(backup,{recursive:true,force:true})}catch(e){await fs.rm(dest,{recursive:true,force:true});try{await fs.rename(backup,dest)}catch{}throw e}}
 const report={updatedAt:new Date().toISOString(),scenario:{mode,...scenario,when,...selected},checks,scope:'Статические реальные HTML. Нажатие финальной оплаты не выполнялось. Скрипты, отправка форм и внешняя сеть отключены.'};await fs.writeFile(path.join(outputRoot,'manifest.json'),JSON.stringify(report,null,2));
 console.log('Обновлены и проверены все четыре страницы. Бронирование и оплата не выполнялись.');
}catch(e){console.error('Обновление остановлено: '+e.message);process.exitCode=1}
finally{if(server)await new Promise(r=>server.close(r));if(opened){await call({operation:'close-session',session,cwd:temp,timeout:60});await call({operation:'cleanup',session,cwd:temp,timeout:30})}await fs.rm(temp,{recursive:true,force:true})}
