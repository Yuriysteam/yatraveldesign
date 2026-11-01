/* Preserve the original production DOM, CSS, columns and snippet structure. */
(() => {
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const el=h=>{const t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstElementChild;};
const filters=$('.IlVak'), cards=$$('[data-seo="hotel_snippet"]');
let work=location.hash.includes('work')||location.hash.includes('policy'), policy=location.hash.includes('policy');
const names=['AZIMUT Смоленская 4*','AZIMUT Смоленская 3*','Отель Арбат 4*','Панорама Москва 4*','Городской отель 3*'];
const prices=[34600,29600,23800,32400,21900];
const good=[false,true,true,false,true];
const parentState=()=>{try{if(parent!==window){parent.history.replaceState({},'','#'+(policy?'/policy/results':work?'/work/results':'/results'));parent.postMessage({type:'trip-state'},location.origin);}}catch{}};
$$('[data-payment-badges]').forEach(n=>n.remove());$$('button').filter(n=>/баллами плюса|До 15% баллами/.test(n.textContent)).forEach(n=>n.remove());
$('#payment-details-tooltip')?.remove();
const template=$('label',filters).cloneNode(true);
function nativeCheck(title,key){const l=template.cloneNode(true);$('.ob4ed',l).textContent=title;$('.u2K_4',l)?.remove();const i=$('input',l);i.checked=false;i.defaultChecked=false;i.setAttribute('aria-label',title);i.dataset.tripFilter=key;return l;}
const firstField=$('fieldset',filters), popular=$('[role="region"]',firstField).firstElementChild;
$('.aUmBg',firstField).textContent='Популярное';
const businessFilters=[['Корпоративный тариф','corporate'],['Включён завтрак','breakfast'],['Бесплатная отмена','cancel'],['В тревел-политике','policy'],['Wi-Fi','wifi']];
const leisureFilters=[['Кондиционер','aircon'],['Квартиры','apartments'],['Стиральная машина','washer'],['Вид на море','sea'],['Бассейн','pool']];
function renderPopular(){popular.replaceChildren(...(work?businessFilters:leisureFilters).map(([t,k])=>nativeCheck(t,k)));}
renderPopular();
const workRow=document.createElement('div');workRow.className='desktop-work-row';
const switchEl=el(UIKIT.switch).children[1].cloneNode(true);switchEl.classList.replace('switch--size-xl','switch--size-m');switchEl.setAttribute('role','switch');switchEl.setAttribute('tabindex','0');switchEl.setAttribute('aria-label','Еду по работе');
const label=document.createElement('span');label.className='kdDAS ry53s b9-76';label.textContent='Еду по работе';workRow.append(label,switchEl);firstField.before(workRow);
$$('fieldset',filters).forEach(f=>{if(/Скидки и бонусы/.test($('legend',f)?.textContent||''))f.remove();});
$$('label',filters).filter(l=>/Кешбэк Плюса|Постоплата на месте/.test(l.textContent)).forEach(l=>l.remove());
$$('input[type="checkbox"]',filters).forEach(i=>{if(!i.dataset.tripFilter){i.checked=false;i.defaultChecked=false;}});
$$('h1').forEach(h=>h.textContent='Отели и гостиницы Москвы');
$$('h2').filter(h=>h.textContent.includes('Квартиры посуточно')).forEach(h=>h.textContent='Отели Москвы на карте');
function textReplace(root,from,to){const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const arr=[];while(w.nextNode())if(w.currentNode.nodeValue.includes(from))arr.push(w.currentNode);arr.forEach(n=>n.nodeValue=n.nodeValue.replaceAll(from,to));}
textReplace(document.body,'Ещё 4476 вариантов без фильтра «Квартира»','Найдено 765 объектов');textReplace(document.body,'Снимите квартиру с кэшбеком до 15%','Выберите подходящий отель');textReplace(document.body,'2 взрослых','1 взрослый');textReplace(document.body,'2\u00a0взрослых','1\u00a0взрослый');textReplace(document.body,'17 сен','9 мар');textReplace(document.body,'24 сен','12 мар');textReplace(document.body,'7 ночей','3 ночи');textReplace(document.body,'7\u00a0ночей','3\u00a0ночи');textReplace(document.body,'Квартира целиком','Стандартный номер');
$$('.u2K_4',popular).forEach(n=>n.remove());
cards.forEach((c,i)=>{
 if(i>=5){(c.closest('li')||c).remove();return;}
 $$('.IAqgZ',c).forEach(n=>n.remove());
 c.dataset.policyGood=String(good[i]);c.dataset.tripId=['azimut','garden','arbat','panorama','center'][i];
 const a=$('h3 a',c);a.textContent=names[i];c.dataset.researchHotel=names[i];
 const price=$('[data-qa="price"]',c);price.textContent=new Intl.NumberFormat('ru-RU').format(prices[i])+' ₽';
 $$('span',c).filter(n=>n.children.length===0&&n.textContent.trim()==='Квартира').forEach(n=>n.textContent='Отель');
 const image=$('img.cRpSH',c);if(i<2&&image){image.src=i===0?'assets/hotel-figma.png':'assets/hotel-2b-figma.png';image.removeAttribute('srcset');}const oldPrices=$$('[data-qa="price"]',c);if(i===0&&oldPrices[1])oldPrices[1].textContent='40 000 ₽';textReplace(c,['3 825','4 590','4 391','4 100','3 360'][i],new Intl.NumberFormat('ru-RU').format(Math.round(prices[i]/3)));
 const badge=el(UIKIT.negative).firstElementChild.children[0].cloneNode(true);$('span',badge).textContent='Не в тревел-политике';badge.classList.add('desktop-policy-badge');badge.hidden=true;$('h3',c).parentElement.append(badge);
 c.setAttribute('role','link');c.setAttribute('tabindex','0');c.setAttribute('aria-label','Открыть '+names[i]);
 const openHotel=()=>{(parent!==window?parent:window).location.href=new URL('index.html',location.href).href+'#/'+(policy?'policy/':work?'work/':'')+'hotel/'+c.dataset.tripId;};
 c.addEventListener('click',e=>{if(e.target.closest('button,input,label,[data-payment-details]'))return;e.preventDefault();openHotel();});
 c.addEventListener('keydown',e=>{if(e.target===c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openHotel();}});
});
$$('input[type="checkbox"]',filters).forEach(i=>{if(!i.dataset.tripFilter){i.removeAttribute('checked');i.checked=false;i.defaultChecked=false;}});
// Remove the apartment-selection helper and its reset chip, preserving the source layout.
const selectedChipTemplate=$$('button').find(n=>n.textContent.trim()==='Квартира')?.cloneNode(true);
$$('button').filter(n=>n.textContent.trim()==='Квартира').forEach(n=>n.parentElement.remove());
const clearAll=$$('button').find(n=>n.textContent.trim()==='Сбросить все');
const clearRow=clearAll?.parentElement.parentElement;
const sidebarClear=$$('button',filters).find(n=>n.textContent.trim()==='Сбросить');
function syncReset(){
 const selected=$$('input',filters).filter(i=>i.type==='checkbox'?i.checked:i.type==='radio'?i.checked&&!i.defaultChecked:i.value!==i.defaultValue);
 const active=selected.length>0;
 if(clearRow&&selectedChipTemplate){
  $$('[data-selected-filter]',clearRow).forEach(n=>n.remove());
  selected.forEach(i=>{
   const chip=selectedChipTemplate.cloneNode(true);
   const title=(i.closest('label')?.querySelector('.ob4ed'))?.textContent.trim()||i.getAttribute('aria-label')||i.placeholder||'Цена';
   const caption=i.type==='checkbox'||i.type==='radio'?title:title+': '+i.value;
   $('.Lbpec',chip).textContent=caption;chip.setAttribute('aria-label','Убрать фильтр «'+caption+'»');
   chip.addEventListener('click',()=>{
    if(i.type==='checkbox')i.checked=false;
    else if(i.type==='radio'){const name=i.name;$$('input[type="radio"]',filters).filter(r=>r.name===name).forEach(r=>r.checked=r.defaultChecked);}
    else i.value=i.defaultValue;
    i.dispatchEvent(new Event('change',{bubbles:true}));
   });
   const wrap=clearAll.parentElement.cloneNode(false);wrap.dataset.selectedFilter='';wrap.append(chip);clearRow.insertBefore(wrap,clearAll.parentElement);
  });
 }
 if(clearAll)clearAll.hidden=!active;
 if(clearRow)clearRow.hidden=!active;
 if(sidebarClear)sidebarClear.disabled=!active;
}
function resetFilters(){
 $$('input',filters).forEach(i=>{if(i.type==='checkbox')i.checked=false;else if(i.type==='radio')i.checked=i.defaultChecked;else i.value=i.defaultValue;});
 policy=false;update();
}
clearAll?.addEventListener('click',resetFilters);
sidebarClear?.addEventListener('click',resetFilters);
filters.addEventListener('change',syncReset);
filters.addEventListener('input',syncReset);
function update(){
 switchEl.classList.toggle('switch--checked',work);switchEl.classList.toggle('switch--checked-contrast',work);switchEl.dataset.checked=String(work);switchEl.setAttribute('aria-checked',String(work));
 const pi=$('[data-trip-filter="policy"]');if(pi)pi.checked=policy;
 cards.filter(c=>c.isConnected).forEach((c,i)=>{(c.closest('li')||c).hidden=policy&&!good[i];$('.desktop-policy-badge',c).hidden=!work||good[i];});
 const counter=$$('span,div').find(n=>n.children.length===0&&/^Найдено \d+ объектов/.test(n.textContent));if(counter)counter.textContent='Найдено '+(policy?3:765)+' объектов';syncReset();parentState();
}
function toggle(){work=!work;policy=false;renderPopular();update();}
switchEl.addEventListener('click',toggle);switchEl.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();toggle();}});
popular.addEventListener('change',e=>{if(e.target.dataset.tripFilter==='policy'){policy=e.target.checked;if(policy)work=true;update();}});

update();
})();
