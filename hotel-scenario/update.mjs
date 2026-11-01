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
const scenario=JSON.parse(await fs.readFile(path.join(root,'scenario.json'),'utf8'));
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const addDays=n=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const checkin=addDays(scenario.checkinOffsetDays),checkout=addDays(scenario.checkinOffsetDays+scenario.nights);
const query=new URLSearchParams({checkinDate:checkin,checkoutDate:checkout,adults:String(scenario.adults)});
const resultsUrl=`https://travel.yandex.ru/hotels/${scenario.citySlug}/?${query}`;
const hotelPath=`/hotels/${scenario.citySlug}/${scenario.hotelSlug}/`;
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
 const manifest=JSON.parse(await fs.readFile(path.join(dest,'source.json'),'utf8'));if(manifest.failures.length)throw Error(slug+': не загружены '+manifest.failures.length+' ресурсов. Прежние страницы сохранены.');manifest.capturedAt=info.capturedAt;manifest.title=info.title;await fs.writeFile(path.join(dest,'source.json'),JSON.stringify(manifest,null,2));
 console.log(slug+': HTML и '+manifest.resourceCount+' ресурсов');
}
try{
 const config=JSON.parse(await fs.readFile(path.join(skill,'assets/chromium-headless.json'),'utf8'));Object.assign(config.browser.contextOptions,{colorScheme:'light',viewport:{width:1440,height:1000}});const configPath=path.join(temp,'browser.json');await fs.writeFile(configPath,JSON.stringify(config),{mode:0o600});
 await invoke(['open','about:blank','--config='+configPath]);opened=true;
 await invoke(['goto','https://travel.yandex.ru/']);await browser(`async page=>{await page.locator('h1').first().waitFor();return {ready:true}}`);await exportPage('01-home','https://travel.yandex.ru/');
 await invoke(['goto',resultsUrl]);await browser(`async page=>{await page.locator('a').filter({hasText:${quote(scenario.hotelName)}}).first().waitFor({timeout:45000});return {hotelFound:true};}`,60);await exportPage('02-results',resultsUrl);
 await browser(`async page=>{const link=page.locator('a[href*=${quote(hotelPath)}]').filter({hasText:${quote(scenario.hotelName)}}).first();const popup=page.context().waitForEvent('page',{timeout:5000}).catch(()=>null);await link.click();const p=await popup;const target=p||page;await target.locator('h1').waitFor();return {hotelOpened:true}}`);
 const hotelExpression=`page.context().pages().find(p=>p.url().includes(${quote(hotelPath)}))`;
 await browser(`async page=>{const hotel=${hotelExpression};await hotel.getByRole('button',{name:'Забронировать',exact:true}).first().waitFor({timeout:45000});const dates=await hotel.evaluate(()=>({checkin:new URL(location.href).searchParams.get('checkinDate'),checkout:new URL(location.href).searchParams.get('checkoutDate'),adults:new URL(location.href).searchParams.get('adults')}));if(dates.checkin!==${quote(checkin)}||dates.checkout!==${quote(checkout)}||Number(dates.adults)!==${scenario.adults})throw Error('Параметры отеля не совпадают с выдачей');return {consistent:true}}`,60);
 await exportPage('03-hotel','https://travel.yandex.ru'+hotelPath+'?'+query,hotelExpression);
 await browser(`async page=>{const hotel=${hotelExpression};await hotel.getByRole('button',{name:'Забронировать',exact:true}).first().click();return {checkoutRequested:true}}`);
 const checkoutExpression=`page.context().pages().find(p=>p.url().includes('/hotels/book/'))`;
 const selected=await browser(`async page=>{let target=${checkoutExpression};if(!target){await page.waitForURL('**/hotels/book/**',{timeout:30000});target=page}await target.getByRole('button',{name:/Оплатить/}).waitFor({timeout:45000});const room=await target.locator('h2').first().textContent();const pay=await target.getByRole('button',{name:/Оплатить/}).first().textContent();if(!(await target.locator('body').textContent()).includes(${quote(scenario.hotelName)}))throw Error('В оформлении другой отель');return {room,paymentButton:pay}}`,70);
 await exportPage('04-checkout','https://travel.yandex.ru/hotels/book/',checkoutExpression);
 // Verify the exported HTML with remote network blocked before replacing any existing page.
 const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
 server=http.createServer(async(req,res)=>{try{const p=path.resolve(stage,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(stage+path.sep))throw Error();const f=(await fs.stat(p)).isDirectory()?path.join(p,'index.html'):p;res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Access-Control-Allow-Origin':'*'});res.end(await fs.readFile(f))}catch{res.writeHead(404);res.end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const local='http://127.0.0.1:'+server.address().port;
 await browser(`async page=>{await page.route('**/*',r=>r.request().url().startsWith(${quote(local)})?r.continue():r.abort());return {offlineCheck:true}}`);
 const checks=[];
 for(const slug of ['01-home','02-results','03-hotel','04-checkout']){
  await invoke(['goto',local+'/'+slug+'/']);
  const result=await browser(`async page=>{await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);return await page.evaluate(()=>({elements:document.querySelectorAll('*').length,fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family),brokenImages:[...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0&&(!i.complete||!i.naturalWidth)).length,theme:document.documentElement.className,external:performance.getEntriesByType('resource').filter(r=>/^https?:/.test(r.name)&&!r.name.startsWith(location.origin)).map(r=>r.name)}))}`);
  if(result.elements<100||!result.fonts.length||result.brokenImages||result.external.length||!result.theme.includes('theme_light'))throw Error(slug+': локальная проверка не пройдена: '+JSON.stringify(result));checks.push({page:slug,...result});
 }
 for(const slug of ['01-home','02-results','03-hotel','04-checkout']){const dest=path.join(root,slug),backup=dest+'.previous';await fs.rm(backup,{recursive:true,force:true});try{await fs.rename(dest,backup)}catch(e){if(e.code!=='ENOENT')throw e}try{await fs.cp(path.join(stage,slug),dest,{recursive:true});await fs.rm(backup,{recursive:true,force:true})}catch(e){await fs.rm(dest,{recursive:true,force:true});try{await fs.rename(backup,dest)}catch{}throw e}}
 const report={updatedAt:new Date().toISOString(),scenario:{...scenario,checkin,checkout,...selected},checks,scope:'Статические реальные HTML. Нажатие финальной оплаты не выполнялось. Скрипты, отправка форм и внешняя сеть отключены.'};await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(report,null,2));
 console.log('Обновлены и проверены все четыре страницы. Бронирование и оплата не выполнялись.');
}catch(e){console.error('Обновление остановлено: '+e.message);process.exitCode=1}
finally{if(server)await new Promise(r=>server.close(r));if(opened){await call({operation:'close-session',session,cwd:temp,timeout:60});await call({operation:'cleanup',session,cwd:temp,timeout:30})}await fs.rm(temp,{recursive:true,force:true})}
