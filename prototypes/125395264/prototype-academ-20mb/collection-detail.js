document.querySelectorAll('.collection-offer-host').forEach(host=>{
  HotelOfferWidget.render(host,host.dataset.offer);
});

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
