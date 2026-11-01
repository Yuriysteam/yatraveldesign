const copyIcon="<svg aria-hidden=\"true\" focusable=\"false\" width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g transform=\"matrix(3.25830542 0 0 3.25830542 -3128 -9505)\">\n<g id=\"Icons / 20 / CopyNewNew\">\n<g id=\"Vector_899\">\n<path d=\"M961.34 2919.63C961.116 2919.64 960.938 2919.83 960.938 2920.06V2921.94C960.938 2922.18 961.132 2922.37 961.371 2922.37H963.252C963.48 2922.37 963.667 2922.2 963.683 2921.97H964.198C964.182 2922.48 963.763 2922.89 963.252 2922.89H961.371C960.849 2922.89 960.424 2922.46 960.424 2921.94V2920.06C960.424 2919.55 960.832 2919.13 961.34 2919.11V2919.63Z\" fill=\"currentColor\"/>\n<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M964.786 2917.58C965.308 2917.58 965.734 2918 965.734 2918.53V2920.41C965.734 2920.93 965.308 2921.35 964.786 2921.35H962.906C962.384 2921.35 961.958 2920.93 961.958 2920.41V2918.53C961.958 2918 962.384 2917.58 962.906 2917.58H964.786ZM962.906 2918.09C962.667 2918.09 962.473 2918.29 962.473 2918.53V2920.41C962.473 2920.65 962.667 2920.84 962.906 2920.84H964.786C965.025 2920.84 965.219 2920.65 965.219 2920.41V2918.53C965.219 2918.29 965.025 2918.09 964.786 2918.09H962.906Z\" fill=\"currentColor\"/>\n</g>\n</g>\n</g>\n</svg>\n";
const copiedIcon="<svg aria-hidden=\"true\" focusable=\"false\" width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n<g transform=\"matrix(3.25830542 0 0 3.25830542 -3781 -11729)\">\n<g id=\"Icons / 20 / CheckBoldNew\">\n<path id=\"Vector_1018\" d=\"M1166.26 3601.11L1162.95 3604.41L1161.11 3602.57L1161.51 3602.16L1162.95 3603.6L1165.85 3600.7L1166.26 3601.11Z\" fill=\"currentColor\"/>\n</g>\n</g>\n</svg>\n";
const data={hotels:{title:'Бронирование отеля',description:'Поиск → выдача → отель и номера → оформление',pages:[['01-home','Главная / поиск','Направление, даты и гости'],['02-results','Выдача','Отели, фильтры и цены'],['03-hotel','Отель и номера','Карточка, номера и условия'],['04-checkout','Оформление','Данные гостя и итог поездки']]},avia:{title:'Покупка авиабилета',description:'Поиск → выдача → рейс и тариф → данные пассажира',prefix:'avia/',pages:[['01-home','Поиск авиабилетов','Маршрут, даты и пассажиры'],['02-results','Выдача','Рейсы, время и стоимость'],['03-details','Рейс и тариф','Перелёт, багаж и условия'],['04-checkout','Данные пассажира','Документы и выбранный тариф']]},trains:{title:'Покупка ж/д билета',description:'Поиск → выдача → вагон и место → данные пассажира',prefix:'trains/',pages:[['01-home','Поиск поездов','Станции, даты и пассажиры'],['02-results','Выдача','Поезда и расписание'],['03-details','Вагон и место','Схема вагона и свободные места'],['04-checkout','Данные пассажира','Документы, место и стоимость']]}};
function bindButtons(){document.querySelectorAll('.WvMZr').forEach(b=>{b.onpointerenter=()=>b.classList.add('r0y4G');b.onpointerleave=()=>b.classList.remove('r0y4G','zAwvi');b.onpointerdown=()=>b.classList.add('zAwvi');b.onpointerup=()=>b.classList.remove('zAwvi');b.onfocus=()=>b.classList.add('nAZcj');b.onblur=()=>b.classList.remove('nAZcj')})}
function show(){const mode=location.hash.slice(1) in data?location.hash.slice(1):'hotels',group=data[mode];document.querySelector('#catalog-content').setAttribute('aria-labelledby','tab-'+mode);document.querySelector('#route-title').textContent=group.title;document.querySelector('#route-description').textContent=group.description;document.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===mode;b.setAttribute('aria-selected',String(active));b.setAttribute('data-selected',String(active));b.tabIndex=active?0:-1;b.classList.toggle('tabs__item--selected',active)});document.querySelector('#cards').innerHTML=group.pages.map(([folder,title,description])=>{const base=(group.prefix||'')+folder+'/';return `<article class="page-card"><a class="preview-link" href="${base}index.html" tabindex="-1" aria-hidden="true"><div class="preview"><img src="${base}preview.png" alt="" loading="eager"></div></a><div class="card-content"><h3>${title}</h3><p class="card-description">${description}</p><div class="card-bottom"><a class="WvMZr mR5dx jNuum open-page" href="${base}index.html" aria-label="Открыть: ${title}"><span class="llji2"><span class="_44BiE"><span class="eh5Br i9Gsh">Открыть</span></span></span></a><div class="ui-kit-scope ui-kit-theme ui-surface ui-kit-density"><button type="button" class="button button--size-m button--icon-only button--secondary button--width-auto copy-page" data-source="${base}index.html" aria-label="Скопировать ссылку: ${title}" title="Скопировать ссылку"><span class="button__content">${copyIcon}</span></button></div><span class="copy-status" role="status"></span></div></div></article>`}).join('');bindButtons();bindCopyButtons();positionTabIndicator()}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{location.hash=b.dataset.mode});window.addEventListener('hashchange',show);show();

document.querySelectorAll('[role=tab]').forEach((tab,i)=>tab.addEventListener('keydown',e=>{const tabs=[...document.querySelectorAll('[role=tab]')];let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();tabs[next].focus();tabs[next].click()}}));

function bindCopyButtons(){
 document.querySelectorAll('.copy-page').forEach(button=>{
  button.onpointerenter=()=>button.classList.add('button--hovered');
  button.onpointerleave=()=>button.classList.remove('button--hovered','button--pressed');
  button.onpointerdown=()=>button.classList.add('button--pressed');
  button.onpointerup=()=>button.classList.remove('button--pressed');
  button.onclick=async()=>{
   const status=button.closest('.card-bottom').querySelector('.copy-status');
   button.disabled=true;
   try{
    const url=new URL(button.dataset.source,document.baseURI).href;
    await navigator.clipboard.writeText(url);
    button.querySelector('.button__content').innerHTML=copiedIcon;
    button.title='Скопировано';status.textContent='Ссылка скопирована';
    setTimeout(()=>{button.querySelector('.button__content').innerHTML=copyIcon;button.title='Скопировать ссылку';status.textContent=''},2000);
   }catch(error){status.textContent='Не удалось скопировать';button.title='Не удалось скопировать — попробуйте ещё раз'}
   finally{button.disabled=false}
  };
 });
}

function positionTabIndicator(){
 const list=document.querySelector('[role=tablist]'),tab=list.querySelector('[aria-selected=true]'),indicator=list.querySelector('.tabs__indicator');
 const a=tab.getBoundingClientRect(),b=list.getBoundingClientRect();
 Object.assign(indicator.style,{left:(a.left-b.left)+'px',top:(a.top-b.top)+'px',width:a.width+'px',height:a.height+'px'});
}
new ResizeObserver(positionTabIndicator).observe(document.querySelector('[role=tablist]'));
document.fonts.ready.then(positionTabIndicator);
