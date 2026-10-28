// Use the approved second widget layout in the main collection as well.
document.body.classList.add('collection-detail-page--open');
document.querySelectorAll('.selection-card').forEach(card=>{
  card.classList.add('selection-card--open');
  card.querySelector('.selected-room__stock')?.remove();
  const offers=[...card.querySelectorAll(':scope > .collection-offer-host')];
  if(offers.length){const group=document.createElement('div');group.className='collection-offers-open';offers[0].before(group);group.append(...offers);}
});
document.querySelectorAll('.collection-offer-host').forEach(host=>{
  HotelOfferWidget.render(host,host.dataset.offer);
  host.querySelector('.offer-toolbar')?.remove();
  const action=host.querySelector('.offer-booking');
  action.innerHTML='<button class="collection-offer-delete" type="button" aria-label="Удалить предложение из подборки"><img src="assets/collections/trash.svg" alt=""></button>';
  action.querySelector('button').addEventListener('click',()=>host.remove());
});

const selectedCollection=new URLSearchParams(location.search).get('collection');
if(selectedCollection&&window.Favorites){
  const items=Favorites.read().filter(item=>(item.collectionId||'москва|20 дек — 21 дек 2026')===selectedCollection);
  if(items.length){
    const title=document.querySelector('.collection-detail-title h1');
    title.textContent=items[0].collectionTitle||`Город ${items[0].city||'Москва'}, Россия, ${items[0].dates||'20 дек — 21 дек 2026'}`;
    document.querySelector('.collection-detail-title p').textContent=`${items.length} ${items.length===1?'предложение':'предложения'}`;
    const cards=[...document.querySelectorAll('.selection-card')];
    cards.slice(items.length).forEach(card=>card.remove());
    items.slice(0,cards.length).forEach((item,index)=>{
      const card=cards[index];
      const name=card.querySelector('.hotel-summary h2');
      if(name) name.childNodes[0].textContent=`${item.hotel} `;
      const room=card.querySelector('.selected-room h3');if(room)room.textContent=item.room;
      const hotelPhoto=card.querySelector('.hotel-summary>img');if(hotelPhoto)hotelPhoto.src=item.photo;
      const roomPhoto=card.querySelector('.selected-room__photo');if(roomPhoto)roomPhoto.src=item.photo;
    });
  }
}

const bindSegment=segment=>{
  const buttons=[...segment.querySelectorAll('button')];
  buttons.forEach(button=>button.addEventListener('click',()=>{
    buttons.forEach(item=>item.classList.toggle('active',item===button));
  }));
};

document.querySelectorAll('.segment,.format').forEach(bindSegment);

const priceButton=document.querySelector('.price-view');
const priceMenu=document.querySelector('.price-menu');
const closePriceMenu=()=>{
  priceMenu.hidden=true;
  priceButton.setAttribute('aria-expanded','false');
};

priceButton.addEventListener('click',event=>{
  event.stopPropagation();
  const willOpen=priceMenu.hidden;
  priceMenu.hidden=!willOpen;
  priceButton.setAttribute('aria-expanded',String(willOpen));
});
priceMenu.addEventListener('click',event=>event.stopPropagation());
document.addEventListener('click',closePriceMenu);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape') closePriceMenu();
});

const exportPanel=document.querySelector('.collection-export');
const noteButton=exportPanel.querySelector('.note');
const noteField=exportPanel.querySelector('.note-field');
const noteText=noteButton.querySelector('span');

noteButton.addEventListener('click',()=>{
  const isOpen=!exportPanel.classList.contains('is-note-open');
  exportPanel.classList.toggle('is-note-open',isOpen);
  noteField.hidden=!isOpen;
  noteButton.setAttribute('aria-expanded',String(isOpen));
  noteText.textContent=isOpen?'Скрыть примечание к подборке':'Написать примечание к подборке';
  document.body.style.paddingBottom=isOpen?'260px':'154px';
  if(isOpen) noteField.querySelector('textarea').focus();
});
