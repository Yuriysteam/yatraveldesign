document.querySelectorAll('.heart').forEach((button)=>{const icon=button.querySelector('img');const updateIcon=()=>{icon.src=button.classList.contains('selected')?'assets/hotel/heart-fill-new-16.svg':'assets/hotel/heart-new-16.svg'};updateIcon();button.addEventListener('click',()=>{button.classList.toggle('selected');button.setAttribute('aria-pressed',button.classList.contains('selected'));updateIcon()})});
const roomCard=document.querySelector('.room-card');
const roomTariffs=roomCard?.querySelector('.room-tariffs');
const secondaryCard=document.querySelectorAll('.room-card')[1];
const legacySecondaryOffer=secondaryCard?.querySelector('.room-offer');
const secondaryTariffs=document.createElement('div');
secondaryTariffs.className='room-tariffs room-tariffs--secondary';
secondaryTariffs.setAttribute('aria-live','polite');
legacySecondaryOffer?.replaceWith(secondaryTariffs);
const widgetSettings=document.createElement('div');widgetSettings.className='widget-settings';widgetSettings.innerHTML='<label><span>Вариант тарифного виджета</span><select id="offerVariant" aria-label="Вариант тарифного виджета"></select></label>';roomCard?.before(widgetSettings);
const offerVariant=document.querySelector('#offerVariant');
const offerVariants={
  'full-penalty':{penalty:'Отмена за 18 000 ₽',details:['до 1 дек 2026 15:00','далее — за 2000 ₽'],meal:'Без питания',mealCaption:'Можно докупить<br>за 2000 ₽'},
  'split-penalty':{penalty:'Отмена за 18 000 ₽',meal:'Без питания',mealCaption:'Можно докупить<br>за 2000 ₽'},
  'free-cancel':{penalty:'Отмена бесплатно',details:['до 20 дек 2026 15:00','далее — за 2000 ₽'],meal:'Без питания',mealCaption:'Можно докупить<br>за 2000 ₽'},
  'no-food-long':{penalty:'Отмена за 18 000 ₽',details:['до 1 дек 2026 15:00','далее — за 2000 ₽'],meal:'Без питания',mealCaption:'Можно докупить<br>за 2000 ₽'},
  'with-food':{penalty:'Отмена бесплатно',details:['до 20 дек 2026 15:00','далее — за 2000 ₽'],meal:'Завтрак «Европейский шведский стол»',food:true},
  special:{penalty:'Отмена за 18 000 ₽',details:['до 1 дек 2026 15:00','далее — за 2000 ₽'],meal:'Без питания',mealCaption:'Можно докупить<br>за 2000 ₽',special:true,price:'10 130 400 ₽'},
  'no-commission':{penalty:'Отмена бесплатно',details:['до 20 дек 2026 15:00','далее — за 2000 ₽'],meal:'Без питания',mealCaption:'Можно докупить<br>за 2000 ₽',commission:false},
  'no-vat-commission':{penalty:'Отмена за 18 000 ₽',meal:'Без питания',mealCaption:'Можно докупить<br>за 2000 ₽',vat:false,commission:false},
  'price-only':{penalty:'Отмена за 18 000 ₽',meal:'Без питания',mealCaption:'Можно докупить<br>за 2000 ₽',rack:false,vat:false,commission:false}
};
const offerMarkup=(variant,overrides={})=>{const data={price:'33 000 ₽',rack:true,vat:true,commission:true,...offerVariants[variant],...overrides};const mealIcon=data.food?'assets/breakfast.svg':'assets/hotel/breakfast-no-new-24.svg';return `<div class="room-offer${data.special?' is-special':''}" data-offer-variant="${variant}"><div class="offer-toolbar"><span></span><div><button class="offer-favorite" type="button" aria-label="Добавить предложение в подборку" aria-pressed="false"><img src="assets/hotel/heart-new-16.svg" alt=""></button><button type="button" aria-label="Скопировать предложение"><img src="assets/hotel/copy-new-24.svg" alt=""></button></div></div><div class="offer-grid"><div class="offer-penalty"><img src="assets/hotel/payment-card-new-24.svg" alt=""><div><b>${data.penalty}</b>${(data.details||[]).map(line=>`<small>${line}</small>`).join('')}</div></div><div class="offer-meal"><img src="${mealIcon}" alt=""><span>${data.meal}${data.mealCaption?`<small>${data.mealCaption}</small>`:''}</span></div><div class="offer-prices"><strong>${data.price}</strong>${data.rack?'<span><img src="assets/hotel/info-new-16.svg" alt="">Rack 4 200 ₽</span>':''}${data.vat||data.commission?`<div>${data.vat?'<span>НДС 350 ₽</span>':''}${data.commission?'<b><img src="assets/hotel/coins-new-16.svg" alt="">350 ₽</b>':''}</div>`:''}</div><div class="offer-booking"><button type="button">Выбрать</button><small>В наличии: 4</small></div></div></div>`};
const bindOfferActions=()=>{roomTariffs?.querySelectorAll('.offer-favorite').forEach(button=>button.addEventListener('click',()=>{const selected=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(selected));button.querySelector('img').src=selected?'assets/hotel/heart-fill-new-16.svg':'assets/hotel/heart-new-16.svg'}))};
if(offerVariant&&window.HotelOfferWidget)offerVariant.innerHTML=HotelOfferWidget.variants.map(item=>`<option value="${item.id}">${item.title}</option>`).join('');
const renderRoomWidget=()=>{if(!roomTariffs)return;const variant=offerVariant?.value||'full-penalty';if(window.HotelOfferWidget){HotelOfferWidget.render(roomTariffs,variant);if(secondaryCard)HotelOfferWidget.render(secondaryTariffs,{...HotelOfferWidget.get(variant),price:'12 200 ₽'});return}roomTariffs.innerHTML=offerMarkup(variant);if(secondaryCard)secondaryTariffs.innerHTML=offerMarkup(variant,{price:'12 200 ₽'});bindOfferActions()};
offerVariant?.addEventListener('change',renderRoomWidget);
renderRoomWidget();

const firstMoreButton=roomCard?.querySelector('.room-more');
if(firstMoreButton&&window.HotelOfferWidget){
  const extraOffers=document.createElement('div');
  extraOffers.className='extra-offers';
  extraOffers.hidden=true;
  const extraData=[
    {...HotelOfferWidget.get('with-food'),price:'10 000 000 ₽',special:true},
    {...HotelOfferWidget.get('full-penalty'),price:'14 900 ₽'},
    {...HotelOfferWidget.get('with-food'),price:'19 000 ₽',special:true},
    {...HotelOfferWidget.get('full-penalty'),price:'21 900 ₽'}
  ];
  extraOffers.innerHTML=extraData.map(item=>HotelOfferWidget.markup(item)).join('');
  HotelOfferWidget.bind(extraOffers);
  roomTariffs.after(extraOffers);
  firstMoreButton.addEventListener('click',()=>{
    const opening=extraOffers.hidden;
    extraOffers.hidden=!opening;
    firstMoreButton.classList.toggle('is-open',opening);
    firstMoreButton.querySelector('span').textContent=opening?'Скрыть предложения':'Показать ещё 4 предложения';
  });
}
const secondMoreButton=secondaryCard?.querySelector('.room-more');
const secondaryVisibleTariffs=secondaryCard?.querySelector('.room-tariffs');
if(secondMoreButton&&secondaryVisibleTariffs&&window.HotelOfferWidget){
  const extraOffers=document.createElement('div');
  extraOffers.className='extra-offers';
  extraOffers.hidden=true;
  const extraData=[
    {...HotelOfferWidget.get('with-food'),price:'13 400 ₽'},
    {...HotelOfferWidget.get('special'),price:'19 000 ₽'},
    {...HotelOfferWidget.get('full-penalty'),price:'21 900 ₽'},
    {...HotelOfferWidget.get('free-cancel'),price:'24 500 ₽'},
    {...HotelOfferWidget.get('with-food'),price:'27 000 ₽'}
  ];
  extraOffers.innerHTML=extraData.map(item=>HotelOfferWidget.markup(item)).join('');
  HotelOfferWidget.bind(extraOffers);
  secondaryVisibleTariffs.after(extraOffers);
  secondMoreButton.addEventListener('click',()=>{
    const opening=extraOffers.hidden;
    extraOffers.hidden=!opening;
    secondMoreButton.classList.toggle('is-open',opening);
    secondMoreButton.querySelector('span').textContent=opening?'Скрыть предложения':'Показать ещё 5 предложений';
  });
}

const facilitiesButton=document.querySelector('.facilities .section-button');
if(facilitiesButton){
  const facilitiesModal=document.createElement('div');
  facilitiesModal.className='facilities-modal';
  facilitiesModal.hidden=true;
  facilitiesModal.innerHTML=`<div class="facilities-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="facilitiesModalTitle"><div class="facilities-modal__head"><h2 id="facilitiesModalTitle">Все удобства</h2><button class="facilities-modal__close" type="button" aria-label="Закрыть"><img src="assets/close-16.svg" alt=""></button></div><div class="facilities-modal__grid"><p><img src="assets/hotel/wifi.svg" alt="">Wi‑Fi во всех номерах</p><p><img src="assets/hotel/area.svg" alt="">Душевая кабина во всех номерах</p><p><img src="assets/hotel/bath.svg" alt="">Сауна</p><p><img src="assets/hotel/parking.svg" alt="">Бесплатная парковка</p><p><img src="assets/hotel/cash.svg" alt="">Сейф на стойке регистрации</p><p><img src="assets/hotel/bed.svg" alt="">Гипоаллергенное постельное бельё</p><p><img src="assets/hotel/cash.svg" alt="">Банкомат</p><p><img src="assets/hotel/wifi.svg" alt="">Кондиционер</p><p><img src="assets/hotel/area.svg" alt="">Рабочая зона</p><p><img src="assets/hotel/cash.svg" alt="">Аптечный пункт</p><p><img src="assets/hotel/train.svg" alt="">Лифт</p><p><img src="assets/hotel/bed.svg" alt="">Размещение с домашними животными</p><p><img src="assets/hotel/bath.svg" alt="">Доставка еды в номер,<br>ресторан, холодильник</p><p><img src="assets/hotel/area.svg" alt="">Телевизор в номере</p><p><span class="facility-check">✓</span>Круглосуточная регистрация</p><p><img src="assets/hotel/bath.svg" alt="">Терраса и веранда</p><p><img src="assets/hotel/bath.svg" alt="">Джакузи</p><p><span class="facility-check">✓</span>Мангал</p><p><img src="assets/hotel/area.svg" alt="">Караоке</p><p><img src="assets/hotel/bath.svg" alt="">Хамам</p><p><span class="facility-check">✓</span>Столы для пинг-понга</p></div></div>`;
  document.body.append(facilitiesModal);
  const closeFacilities=()=>{facilitiesModal.hidden=true;document.body.classList.remove('modal-open');facilitiesButton.focus()};
  facilitiesButton.addEventListener('click',()=>{facilitiesModal.hidden=false;document.body.classList.add('modal-open');facilitiesModal.querySelector('.facilities-modal__close').focus()});
  facilitiesModal.querySelector('.facilities-modal__close').addEventListener('click',closeFacilities);
  facilitiesModal.addEventListener('click',event=>{if(event.target===facilitiesModal)closeFacilities()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!facilitiesModal.hidden)closeFacilities()});
}

const priceButton=document.querySelector('.hotel-price-button');
if(priceButton){
  const priceModal=document.createElement('div');
  priceModal.className='price-modal';
  priceModal.hidden=true;
  priceModal.innerHTML=`<div class="price-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="priceModalTitle"><div class="price-modal__head"><h2 id="priceModalTitle">Ценовое предложение</h2><button class="price-modal__close" type="button" aria-label="Закрыть"><img src="assets/close-16.svg" alt=""></button></div><p>Введите адрес электронной почты, чтобы получить ценовое предложение по отелю Москва Холидей Инн в формате таблицы Excel</p><input type="email" value="info@ascase.ru" aria-label="Адрес электронной почты"><div class="price-modal__actions"><button type="button">Отправить на почту</button></div></div>`;
  document.body.append(priceModal);
  const closePriceModal=()=>{priceModal.hidden=true;document.body.classList.remove('modal-open');priceButton.focus()};
  priceButton.addEventListener('click',()=>{priceModal.hidden=false;document.body.classList.add('modal-open');priceModal.querySelector('input').focus()});
  priceModal.querySelector('.price-modal__close').addEventListener('click',closePriceModal);
  priceModal.addEventListener('click',event=>{if(event.target===priceModal)closePriceModal()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!priceModal.hidden)closePriceModal()});
}

const galleryMap=document.querySelector('.gallery-map');
if(galleryMap){
  galleryMap.setAttribute('role','button');
  galleryMap.setAttribute('tabindex','0');
  galleryMap.setAttribute('aria-label','Открыть карту отеля');
  const mapModal=document.createElement('div');
  mapModal.className='hotel-map-modal';
  mapModal.hidden=true;
  mapModal.innerHTML=`<div class="hotel-map-modal__dialog" role="dialog" aria-modal="true" aria-label="Отель на карте"><img class="hotel-map-modal__map" src="assets/hotel-figma/image-5.png" alt="Карта Казани"><button class="hotel-map-modal__close" type="button" aria-label="Закрыть">×</button><div class="hotel-map-modal__zoom"><button type="button" aria-label="Приблизить">+</button><button type="button" aria-label="Отдалить">−</button><button type="button" aria-label="Моё местоположение">⌁</button></div><span class="map-pin p1">48 600 ₽</span><span class="map-pin p2">23 000 ₽</span><span class="map-pin p3">190 600 ₽</span><span class="map-pin p4">55 200 ₽</span><span class="map-pin p5">34 400 ₽</span><span class="map-pin p6 is-active">48 600 ₽</span><span class="map-pin p7">27 200 ₽</span><span class="map-pin p8">12 600 ₽</span><span class="map-pin p9">18 000 ₽</span><article class="hotel-map-card"><img src="assets/hotel-figma/image-1.png" alt="Номер отеля"><div><div class="hotel-map-card__stars">★★★★★</div><b>Хилтон Голден Инн</b><strong>от 48 600 ₽</strong></div><button type="button" aria-label="Закрыть карточку">×</button></article></div>`;
  document.body.append(mapModal);
  const closeMap=()=>{mapModal.hidden=true;document.body.classList.remove('modal-open');galleryMap.focus()};
  const openMap=()=>{mapModal.hidden=false;document.body.classList.add('modal-open');mapModal.querySelector('.hotel-map-modal__close').focus()};
  const mapDialog=mapModal.querySelector('.hotel-map-modal__dialog');
  const mapImage=mapModal.querySelector('.hotel-map-modal__map');
  const mapCanvas=document.createElement('div');
  mapCanvas.className='hotel-map-modal__canvas';
  mapDialog.insertBefore(mapCanvas,mapImage);
  mapCanvas.append(mapImage,...mapModal.querySelectorAll('.map-pin'),mapModal.querySelector('.hotel-map-card'));
  const mapCard=mapCanvas.querySelector('.hotel-map-card');
  const activePin=mapCanvas.querySelector('.map-pin.is-active');
  const zoomButtons=mapModal.querySelectorAll('.hotel-map-modal__zoom button');
  let mapScale=1;
  const setMapScale=value=>{mapScale=Math.max(1,Math.min(2.5,value));mapCanvas.style.transform=`scale(${mapScale})`;zoomButtons[0].disabled=mapScale>=2.5;zoomButtons[1].disabled=mapScale<=1};
  zoomButtons[0].addEventListener('click',()=>setMapScale(mapScale+.25));
  zoomButtons[1].addEventListener('click',()=>setMapScale(mapScale-.25));
  zoomButtons[2].addEventListener('click',()=>setMapScale(1));
  mapDialog.addEventListener('wheel',event=>{event.preventDefault();setMapScale(mapScale+(event.deltaY<0?.15:-.15))},{passive:false});
  mapDialog.addEventListener('dblclick',event=>{if(!event.target.closest('button'))setMapScale(mapScale+.25)});
  mapCard.querySelector('button').addEventListener('click',()=>{mapCard.hidden=true});
  activePin.addEventListener('click',event=>{event.stopPropagation();mapCard.hidden=false});
  galleryMap.addEventListener('click',openMap);
  galleryMap.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openMap()}});
  mapModal.querySelector('.hotel-map-modal__close').addEventListener('click',closeMap);
  mapModal.addEventListener('click',event=>{if(event.target===mapModal)closeMap()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!mapModal.hidden)closeMap()});
}

const galleryMain=document.querySelector('.gallery-main');
const galleryCount=document.querySelector('.gallery-stack>div');
if(galleryMain&&galleryCount){
  const galleryImages=['image-3.png','image-1.png','image-4.png','image-6.png','image-9.png','image-10.png','image-2.png','image-7.png'].map(name=>`assets/hotel-figma/${name}`);
  const photoModal=document.createElement('div');
  photoModal.className='photo-gallery-modal';
  photoModal.hidden=true;
  photoModal.innerHTML=`<div class="photo-gallery-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="photoGalleryTitle"><header><h2 id="photoGalleryTitle">Хилтон Голден Инн</h2><button class="photo-gallery-modal__close" type="button" aria-label="Закрыть галерею">×</button></header><div class="photo-gallery-modal__viewer"><img class="photo-gallery-modal__hero" src="${galleryImages[0]}" alt="Фото отеля 1"><button class="photo-gallery-modal__prev" type="button" aria-label="Предыдущее фото">‹</button><button class="photo-gallery-modal__next" type="button" aria-label="Следующее фото">›</button></div><div class="photo-gallery-modal__thumbs">${galleryImages.map((src,index)=>`<button type="button" class="${index===0?'is-active':''}" aria-label="Показать фото ${index+1}"><img src="${src}" alt=""></button>`).join('')}</div></div>`;
  document.body.append(photoModal);
  const hero=photoModal.querySelector('.photo-gallery-modal__hero');
  const thumbs=[...photoModal.querySelectorAll('.photo-gallery-modal__thumbs button')];
  let photoIndex=0;
  const showPhoto=index=>{photoIndex=(index+galleryImages.length)%galleryImages.length;hero.src=galleryImages[photoIndex];hero.alt=`Фото отеля ${photoIndex+1}`;thumbs.forEach((thumb,i)=>thumb.classList.toggle('is-active',i===photoIndex));thumbs[photoIndex].scrollIntoView({block:'nearest',inline:'center'})};
  const closePhotos=()=>{photoModal.hidden=true;document.body.classList.remove('modal-open');galleryMain.focus()};
  const openPhotos=index=>{showPhoto(index);photoModal.hidden=false;document.body.classList.add('modal-open');photoModal.querySelector('.photo-gallery-modal__close').focus()};
  galleryMain.setAttribute('tabindex','0');galleryMain.setAttribute('role','button');galleryMain.setAttribute('aria-label','Открыть галерею отеля');
  galleryCount.setAttribute('tabindex','0');galleryCount.setAttribute('role','button');galleryCount.setAttribute('aria-label','Открыть все фотографии отеля');
  galleryMain.addEventListener('click',()=>openPhotos(0));galleryCount.addEventListener('click',()=>openPhotos(2));
  [galleryMain,galleryCount].forEach((target,index)=>target.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openPhotos(index?2:0)}}));
  photoModal.querySelector('.photo-gallery-modal__close').addEventListener('click',closePhotos);
  photoModal.querySelector('.photo-gallery-modal__prev').addEventListener('click',()=>showPhoto(photoIndex-1));
  photoModal.querySelector('.photo-gallery-modal__next').addEventListener('click',()=>showPhoto(photoIndex+1));
  thumbs.forEach((thumb,index)=>thumb.addEventListener('click',()=>showPhoto(index)));
  document.addEventListener('keydown',event=>{if(photoModal.hidden)return;if(event.key==='Escape')closePhotos();if(event.key==='ArrowLeft')showPhoto(photoIndex-1);if(event.key==='ArrowRight')showPhoto(photoIndex+1)});
}

const hotelDateButton=document.querySelector('#hotelDateButton');
const hotelDatePopover=document.querySelector('#hotelDatePopover');
if(hotelDateButton&&hotelDatePopover){
  const monthNames=['Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь','Январь 2027','Февраль','Март','Апрель','Май','Июнь'];
  const first=(new Date(2026,11,1).getDay()+6)%7;
  const days=Array.from({length:31},(_,index)=>{const day=index+1;const weekday=(first+index)%7;const classes=[day===20?'range-start':'',day===21?'range-end':'',weekday===0?'week-start':'',weekday===6?'week-end':'',day===1?'month-start':'',day===31?'month-end':'',weekday>=5?'weekend':''].filter(Boolean).join(' ');return `<button type="button" class="${classes}"><span>${day}</span></button>`}).join('');
  hotelDatePopover.innerHTML=`<div class="calendar-picker"><div class="calendar-months">${monthNames.map(name=>`<button type="button" class="${name==='Декабрь'?'selected':''}">${name}</button>`).join('')}</div><div class="calendar-main"><div class="calendar-week"><span>пн</span><span>вт</span><span>ср</span><span>чт</span><span>пт</span><span class="weekend">сб</span><span class="weekend">вс</span></div><div class="calendar-scroll"><section><b>Декабрь 2026</b><div class="calendar-days">${'<i></i>'.repeat(first)}${days}</div></section></div></div></div>`;
  hotelDateButton.addEventListener('click',()=>{const open=hotelDatePopover.hidden;hotelDatePopover.hidden=!open;hotelDateButton.setAttribute('aria-expanded',String(open))});
  document.addEventListener('click',event=>{if(!event.target.closest('.hotel-date-control')){hotelDatePopover.hidden=true;hotelDateButton.setAttribute('aria-expanded','false')}});
}

const hotelPageParams=new URLSearchParams(location.search);
const hotelGuestState={adults:Math.max(1,Number(hotelPageParams.get('adults'))||2),children:Math.max(0,Number(hotelPageParams.get('children'))||0),rooms:Math.max(1,Number(hotelPageParams.get('rooms'))||1)};
const hotelGuestsButton=document.querySelector('#hotelGuestsButton');
const hotelGuestsPopover=document.querySelector('#hotelGuestsPopover');
const hotelGuestsLabel=document.querySelector('#hotelGuestsLabel');
if(hotelGuestsButton&&hotelGuestsPopover&&hotelGuestsLabel){
  const stepper=hotelGuestsPopover.querySelector('.hotel-stepper');
  const output=stepper.querySelector('output');
  const minus=stepper.querySelector('[data-step="-1"]');
  const plus=stepper.querySelector('[data-step="1"]');
  let adults=hotelGuestState.adults;
  let children=hotelGuestState.children;
  const adultTitle=value=>value===1?'взрослый':'взрослых';
  const childTitle=value=>value===1?'ребёнок':'детей';
  const update=()=>{hotelGuestState.adults=adults;hotelGuestState.children=children;output.value=String(adults);output.textContent=String(adults);minus.disabled=adults<=1;plus.disabled=adults>=9;hotelGuestsLabel.textContent=children?`${adults} ${adultTitle(adults)} • ${children} ${childTitle(children)}`:`${adults} ${adultTitle(adults)}`};
  stepper.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();adults=Math.max(1,Math.min(9,adults+Number(button.dataset.step)));update()}));
  hotelGuestsButton.addEventListener('click',()=>{const open=hotelGuestsPopover.hidden;if(hotelDatePopover){hotelDatePopover.hidden=true;hotelDateButton.setAttribute('aria-expanded','false')}hotelGuestsPopover.hidden=!open;hotelGuestsButton.setAttribute('aria-expanded',String(open))});
  const addChild=()=>{const child=document.createElement('div');child.className='hotel-child';child.innerHTML=`<span>Ребёнок: меньше года</span><button type="button" aria-label="Удалить ребёнка"><img src="assets/hotel/close-circle-bg-24.svg" alt=""></button>`;child.querySelector('button').addEventListener('click',()=>{child.remove();children-=1;update()});hotelGuestsPopover.querySelector('.hotel-add-child').before(child)};
  for(let index=0;index<children;index+=1)addChild();
  hotelGuestsPopover.querySelector('.hotel-add-child').addEventListener('click',()=>{if(children>=4)return;children+=1;addChild();update()});
  document.addEventListener('click',event=>{if(!event.target.closest('.hotel-guests-control')){hotelGuestsPopover.hidden=true;hotelGuestsButton.setAttribute('aria-expanded','false')}});
  update();
}

document.addEventListener('click',event=>{const choose=event.target.closest('.offer-booking button');if(!choose)return;event.stopImmediatePropagation();const params=new URLSearchParams({hotel:document.querySelector('.hotel-name h1').textContent.trim(),address:document.querySelector('.hotel-address').textContent.replace(/\s+/g,' ').trim(),price:choose.closest('.hotel-offer-widget').querySelector('.offer-price-main strong,.offer-prices>strong').textContent.trim(),adults:String(hotelGuestState.adults),children:String(hotelGuestState.children),rooms:String(hotelGuestState.rooms)});window.location.href=`booking.html?${params}`},true);
