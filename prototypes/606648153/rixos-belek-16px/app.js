const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const sheet=$('#sheet'),gallery=$('#gallery');let lastFocus=null,toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2200)}
function openSheet(title,body){lastFocus=document.activeElement;$('#sheet-title').textContent=title;$('#sheet-body').innerHTML=body;sheet.showModal();document.body.classList.add('modal-open')}
function restore(){if(!sheet.open&&!gallery.open)document.body.classList.remove('modal-open');lastFocus?.focus({preventScroll:true})}
[sheet,gallery].forEach(d=>{d.addEventListener('close',restore);d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}})});
$('#close-sheet').onclick=()=>sheet.close();$('#close-gallery').onclick=()=>gallery.close();
const photos={hotel:['imgImageBlock1.webp','imgContentCard2.webp','imgImage2.webp','imgImage3.webp'],room:['imgContentCard2.webp'],pool:['imgImageBlock1.webp']};let galleryIndex=0;
function openGallery(kind,start=0){lastFocus=document.activeElement;let list=photos[kind]||photos.hotel;$('#gallery-slides').innerHTML=list.map((f,i)=>`<img src="assets/${f}" alt="Фотография ${i+1}">`).join('');galleryIndex=Math.min(start,list.length-1);$('#gallery-counter').textContent=`${galleryIndex+1} / ${list.length}`;gallery.showModal();document.body.classList.add('modal-open');$('#gallery-slides').scrollLeft=galleryIndex*$('#gallery-slides').clientWidth;$('.gallery-controls').style.display=list.length<2?'none':'flex'}
const slides=$('#gallery-slides');slides.addEventListener('scroll',()=>{galleryIndex=Math.round(slides.scrollLeft/slides.clientWidth);$('#gallery-counter').textContent=`${galleryIndex+1} / ${slides.children.length}`});
function stepGallery(direction){let next=(galleryIndex+direction+slides.children.length)%slides.children.length;slides.scrollTo({left:next*slides.clientWidth,behavior:'smooth'})}
$('#gallery-prev').onclick=()=>stepGallery(-1);$('#gallery-next').onclick=()=>stepGallery(1);gallery.addEventListener('keydown',e=>{if(e.key==='ArrowRight')stepGallery(1);if(e.key==='ArrowLeft')stepGallery(-1)});
document.addEventListener('click',e=>{let b=e.target.closest('[data-gallery]');if(b)openGallery(b.dataset.gallery,Number(b.dataset.galleryIndex||0));let s=e.target.closest('[data-scroll]');if(s)$('#'+s.dataset.scroll).scrollIntoView({behavior:'smooth',block:'start'});if(e.target.closest('[data-room]'))openRoom();let v=e.target.closest('[data-service]');if(v)openService(v.dataset.service)});
$('#back').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
let saved=false;try{saved=localStorage.getItem('rixos-favorite')==='true'}catch{}
function renderSaved(){$('#favorite').setAttribute('aria-pressed',String(saved));$('#favorite').setAttribute('aria-label',saved?'Удалить из избранного':'Добавить в избранное')}
renderSaved();$('#favorite').onclick=()=>{saved=!saved;try{localStorage.setItem('rixos-favorite',saved)}catch{}renderSaved();toast(saved?'Добавлено в избранное':'Удалено из избранного')};
$('#share').onclick=async()=>{try{if(navigator.share)await navigator.share({title:'Rixos Premium Belek The Land Of Legends',url:location.href});else{await navigator.clipboard.writeText(location.href);toast('Ссылка скопирована')}}catch(e){if(e.name!=='AbortError')openSheet('Поделиться',`<label class="field">Ссылка на страницу<input readonly value="${location.href}"></label>`)}};
$('#reviews').onclick=()=>openSheet('Отзывы гостей','<div class="reviews" style="width:100%;margin:0 0 20px"><span class="rating">4.9</span><span class="review-copy"><strong>Превосходно</strong><small>3 562 отзыва</small></span></div><p>Этот вариант особенно любят гости с детьми.</p>');
$('#open-map').onclick=()=>openSheet('Где находится','<div class="sheet-map">'+$('#open-map').outerHTML.replace('id="open-map"','').replace('<button','<div').replace('</button>','</div>')+'</div><div style="margin-top:20px">'+$('.location-rows').innerHTML+'</div>');
let guests=3;
$('#guests-open').onclick=()=>{openSheet('Гости',`<div class="stepper"><span>Взрослые</span><div><button id="minus" aria-label="Убрать взрослого">−</button><span id="guest-count">${guests}</span><button id="plus" aria-label="Добавить взрослого">+</button></div></div><button class="primary" id="save-guests">Готово</button>`);let draft=guests;function update(){$('#guest-count').textContent=draft;$('#minus').disabled=draft<=1}$('#minus').onclick=()=>{draft=Math.max(1,draft-1);update()};$('#plus').onclick=()=>{draft++;update()};update();$('#save-guests').onclick=()=>{guests=draft;$('#guests-open').textContent=guests+' '+(guests%10===1&&guests%100!==11?'взрослый':'взрослых');sheet.close()}};
let arrival='2026-09-29',departure='2026-10-30';
$('#dates-open').onclick=()=>{openSheet('Даты поездки',`<form id="date-form"><label class="field">Заезд<input type="date" name="arrival" required value="${arrival}"></label><label class="field">Выезд<input type="date" name="departure" required value="${departure}"></label><button class="primary" type="submit">Применить</button></form>`);const form=$('#date-form');form.elements.departure.min=form.elements.arrival.value;form.elements.arrival.onchange=()=>{form.elements.departure.min=form.elements.arrival.value};form.onsubmit=e=>{e.preventDefault();if(form.elements.departure.value<=form.elements.arrival.value){form.elements.departure.setCustomValidity('Выберите дату после заезда');form.elements.departure.reportValidity();form.elements.departure.oninput=()=>form.elements.departure.setCustomValidity('');return}arrival=form.elements.arrival.value;departure=form.elements.departure.value;const f=x=>new Intl.DateTimeFormat('ru',{day:'numeric',month:'short'}).format(new Date(x+'T12:00:00')).replace('.','');let value=f(arrival)+' – '+f(departure);$('#dates-open').textContent=value;$('#booking-dates').textContent=value;sheet.close()}};
$$('.date-card').forEach(b=>b.onclick=()=>{$$('.date-card').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b))});$('#dates-open').textContent=$('span',b).textContent});
$('#all-rooms').onclick=()=>openSheet('Доступно 2 номера',$('.room-rail').innerHTML);
function openRoom(){openSheet('Улучшенный семейный номер','<img src="assets/imgContentCard2.webp" alt="Семейный номер" style="width:100%;border-radius:24px;margin-bottom:20px"><p>1 кинг-сайз кровать, 2 односпальные кровати</p><p><strong>от 30 480 ₽</strong><small>за 3 ночи, 2 номера</small></p>')}
$('#about-open').onclick=()=>openSheet('Об этом месте',$('.about-copy').innerHTML);
$('#all-amenities').onclick=()=>openSheet('Удобства','<div class="icon-row"><span class="icon"><img src="assets/extra3-0.svg" alt=""></span><div>Бассейн<small>С соленой водой</small></div></div>'+$('.amenities-list').innerHTML);
function openService(kind){let spa=kind==='spa';openSheet(spa?'СПА–комплекс':'Проживание с животными',`<img src="assets/${spa?'imgImage2.webp':'imgImage3.webp'}" alt="${spa?'СПА–комплекс':'Проживание с животными'}" style="width:100%;border-radius:24px;margin-bottom:20px"><p>1 000 ₽ <span class="muted">· За все ночи</span></p>`)}
// Sections added from the extended Figma concept.
photos.guests=['2603-405151-imgFrame2131327634.webp','2603-405151-imgFrame2131327636.webp','2603-405151-imgFrame2131327637.webp','2603-405151-imgFrame2131327638.webp'];
photos.review=['2603-405162-imgPhoto.webp','2603-405162-imgPhoto1.webp'];
$('#reviews').onclick=()=>$('#guest-reviews').scrollIntoView({behavior:'smooth',block:'start'});
$('#read-reviews').onclick=()=>openSheet('Отзывы гостей',$('.review-card-rail').innerHTML);
document.addEventListener('click',e=>{
 const vote=e.target.closest('[data-vote]');if(vote){const pressed=vote.getAttribute('aria-pressed')==='true';const card=vote.closest('.guest-review-card');$$('[data-vote]',card).forEach(b=>{b.setAttribute('aria-pressed','false');$('[data-count]',b).textContent=$('[data-count]',b).dataset.count});if(!pressed){vote.setAttribute('aria-pressed','true');$('[data-count]',vote).textContent=Number($('[data-count]',vote).dataset.count)+1}}
 const category=e.target.closest('[data-review-category]');if(category)$('#review-feed').scrollIntoView({behavior:'smooth',block:'start'});
 const chip=e.target.closest('[data-category]');if(chip){$$('.similar-chip').forEach(b=>b.setAttribute('aria-pressed',String(b===chip)));chip.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'})}
 const favorite=e.target.closest('[data-property-favorite]');if(favorite){const pressed=favorite.getAttribute('aria-pressed')!=='true';favorite.setAttribute('aria-pressed',String(pressed));try{localStorage.setItem('rixos-similar-'+favorite.dataset.propertyFavorite,String(pressed))}catch{}toast(pressed?'Добавлено в избранное':'Удалено из избранного')}
 const property=e.target.closest('[data-property-open]');if(property){const card=property.closest('.similar-card');const photo=$('.property-open>img',card).getAttribute('src');openSheet($('h3',card).textContent,`<img src="${photo}" alt="" style="width:100%;border-radius:24px;margin-bottom:20px"><p>${$('.property-rating',card).textContent}</p><p><strong>48 900 ₽</strong> <span class="muted">3 ночи</span></p>`)}
 const collection=e.target.closest('[data-collection]');if(collection){const src=$('.collection-photo img',collection).getAttribute('src');openSheet(collection.dataset.collection,`<img src="${src}" alt="${collection.dataset.collection}" style="width:100%;border-radius:24px">`)}
});
$$('[data-property-favorite]').forEach(b=>{try{b.setAttribute('aria-pressed',String(localStorage.getItem('rixos-similar-'+b.dataset.propertyFavorite)==='true'))}catch{}});

const heroElement=document.querySelector('.hero');
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let heroHeight=heroElement.offsetHeight,scrollFrame=null;
function updateScrollEffects(){
 scrollFrame=null;
 const scrollTop=Math.max(0,window.scrollY);
 document.documentElement.classList.toggle('header-scrolled',scrollTop>4);
 const shift=reducedMotion.matches?0:Math.min(scrollTop,heroHeight)*0.38;
 heroElement.style.setProperty('--hero-shift',shift.toFixed(2)+'px');
}
function scheduleScrollEffects(){if(scrollFrame===null)scrollFrame=requestAnimationFrame(updateScrollEffects)}
window.addEventListener('scroll',scheduleScrollEffects,{passive:true});
window.addEventListener('resize',()=>{heroHeight=heroElement.offsetHeight;scheduleScrollEffects()});
window.addEventListener('pageshow',scheduleScrollEffects);
reducedMotion.addEventListener('change',scheduleScrollEffects);
updateScrollEffects();
