const params=new URLSearchParams(location.search),number=params.get('id')||'87654321';document.querySelector('#orderNumber').textContent=number;document.title=`Заказ ${number} — Академ-Онлайн`;
const toast=text=>{const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');clearTimeout(window.orderToast);window.orderToast=setTimeout(()=>el.classList.remove('show'),1800)};
document.querySelectorAll('.order-tabs button').forEach(button=>button.addEventListener('click',()=>{const tab=button.dataset.orderTab;document.querySelectorAll('.order-tabs button').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-selected',String(active))});document.querySelectorAll('[data-order-panel]').forEach(panel=>{panel.hidden=panel.dataset.orderPanel!==tab})}));
document.querySelectorAll('.order-btn').forEach(button=>button.addEventListener('click',()=>{if(!['duplicateServiceButton','cancelServiceButton'].includes(button.id))toast(`Демо: ${button.textContent.trim()}`)}));

const duplicateServiceButton=document.querySelector('#duplicateServiceButton');
const duplicateServiceMenu=document.querySelector('#duplicateServiceMenu');
const closeDuplicateServiceMenu=()=>{duplicateServiceMenu.hidden=true;duplicateServiceButton.setAttribute('aria-expanded','false')};
duplicateServiceButton.addEventListener('click',event=>{
  event.stopPropagation();
  duplicateServiceMenu.hidden=!duplicateServiceMenu.hidden;
  duplicateServiceButton.setAttribute('aria-expanded',String(!duplicateServiceMenu.hidden));
});
duplicateServiceMenu.addEventListener('click',event=>{
  const option=event.target.closest('button');
  if(!option)return;
  closeDuplicateServiceMenu();
  toast(option.textContent.trim()==='В текущий заказ'?'Услуга продублирована':'Создан новый заказ с копией услуги');
});
document.addEventListener('click',event=>{if(!event.target.closest('.duplicate-service'))closeDuplicateServiceMenu()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDuplicateServiceMenu()});

const cancelServiceModal=document.querySelector('#cancelServiceModal');
const openCancelServiceModal=()=>{cancelServiceModal.hidden=false;document.body.classList.add('modal-open');document.querySelector('#keepServiceButton').focus()};
const closeCancelServiceModal=()=>{cancelServiceModal.hidden=true;document.body.classList.remove('modal-open');document.querySelector('#cancelServiceButton').focus()};
document.querySelector('#cancelServiceButton').addEventListener('click',openCancelServiceModal);
document.querySelector('#closeCancelServiceModal').addEventListener('click',closeCancelServiceModal);
document.querySelector('.cancel-modal__backdrop').addEventListener('click',closeCancelServiceModal);
document.querySelector('#keepServiceButton').addEventListener('click',closeCancelServiceModal);
document.querySelector('#confirmCancelServiceButton').addEventListener('click',()=>{
  cancelServiceModal.hidden=true;
  document.body.classList.remove('modal-open');
  const status=document.querySelector('.order-service-card .status');
  status.textContent='Аннулировано со штрафом';
  status.classList.remove('progress');
  status.classList.add('cancelled');
  document.querySelector('.order-summary__price b').textContent='0 ₽';
  document.querySelector('.order-summary__price em').textContent='0 ₽';
  document.querySelector('.order-summary__price span:last-child').textContent='Доп. выгода 0 ₽';
  const servicePrice=document.querySelector('.order-page-service .price');
  servicePrice.firstChild.nodeValue='5 604 ₽';
  document.querySelector('.service-actions').hidden=true;
  document.querySelector('#cancelledServiceNote').hidden=false;
  toast('Услуга отменена со штрафом');
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!cancelServiceModal.hidden)closeCancelServiceModal()});

const buyerControls=document.querySelector('#buyerControls');
const buyerSelectButton=document.querySelector('#buyerSelectButton');
const buyerSelectMenu=document.querySelector('#buyerSelectMenu');

document.querySelectorAll('[name="useBuyer"]').forEach(radio=>radio.addEventListener('change',()=>{
  const enabled=document.querySelector('[name="useBuyer"]:checked').value==='yes';
  buyerControls.hidden=!enabled;
  if(!enabled){buyerSelectMenu.hidden=true;buyerSelectButton.setAttribute('aria-expanded','false')}
}));

buyerSelectButton.addEventListener('click',event=>{
  event.stopPropagation();
  buyerSelectMenu.hidden=!buyerSelectMenu.hidden;
  buyerSelectButton.setAttribute('aria-expanded',String(!buyerSelectMenu.hidden));
});

buyerSelectMenu.addEventListener('click',event=>{
  const option=event.target.closest('button');
  if(!option)return;
  buyerSelectMenu.querySelectorAll('button').forEach(item=>item.classList.toggle('selected',item===option));
  buyerSelectButton.querySelector('span').textContent=option.dataset.value;
  buyerSelectMenu.hidden=true;
  buyerSelectButton.setAttribute('aria-expanded','false');
});

document.addEventListener('click',event=>{
  if(!event.target.closest('.buyer-select')){buyerSelectMenu.hidden=true;buyerSelectButton.setAttribute('aria-expanded','false')}
});

const bindSpecialInput=(name,inputSelector)=>{
  const input=document.querySelector(inputSelector);
  document.querySelectorAll(`[name="${name}"]`).forEach(radio=>radio.addEventListener('change',()=>{
    input.hidden=document.querySelector(`[name="${name}"]:checked`).value!=='special';
    if(!input.hidden)input.focus();
  }));
};
bindSpecialInput('invoiceRoom','#invoiceRoomText');
bindSpecialInput('notificationRoom','#notificationRoomText');

const newBuyerModal=document.querySelector('#newBuyerModal');
const newBuyerForm=document.querySelector('#newBuyerForm');
const closeBuyerModal=()=>{
  newBuyerModal.hidden=true;
  document.body.classList.remove('modal-open');
  newBuyerForm.reset();
  newBuyerForm.querySelectorAll('.field-invalid').forEach(input=>{input.classList.remove('field-invalid');input.setAttribute('aria-invalid','false')});
  newBuyerForm.querySelectorAll('.field-error').forEach(error=>error.hidden=true);
  newBuyerModal.querySelectorAll('.modal-select__menu').forEach(menu=>menu.hidden=true);
  newBuyerModal.querySelectorAll('.modal-select>button').forEach(button=>button.setAttribute('aria-expanded','false'));
};
const openBuyerModal=()=>{
  newBuyerModal.hidden=false;
  document.body.classList.add('modal-open');
  requestAnimationFrame(()=>document.querySelector('#buyerShortName').focus());
};
document.querySelector('.add-buyer-button').addEventListener('click',openBuyerModal);
document.querySelector('#closeBuyerModal').addEventListener('click',closeBuyerModal);
document.querySelector('.buyer-modal__backdrop').addEventListener('click',closeBuyerModal);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!newBuyerModal.hidden)closeBuyerModal()});

document.querySelectorAll('.modal-select>button').forEach(button=>button.addEventListener('click',event=>{
  event.stopPropagation();
  const select=button.closest('.modal-select');
  const menu=select.querySelector('.modal-select__menu');
  newBuyerModal.querySelectorAll('.modal-select__menu').forEach(item=>{if(item!==menu)item.hidden=true});
  menu.hidden=!menu.hidden;
  button.setAttribute('aria-expanded',String(!menu.hidden));
}));
document.querySelectorAll('.modal-select__menu').forEach(menu=>menu.addEventListener('click',event=>{
  const option=event.target.closest('button');
  if(!option)return;
  const select=menu.closest('.modal-select');
  select.querySelector(':scope>button span').textContent=option.textContent.trim();
  menu.hidden=true;
  select.querySelector(':scope>button').setAttribute('aria-expanded','false');
}));
document.addEventListener('click',event=>{
  if(event.target.closest('.modal-select'))return;
  newBuyerModal.querySelectorAll('.modal-select__menu').forEach(menu=>menu.hidden=true);
  newBuyerModal.querySelectorAll('.modal-select>button').forEach(button=>button.setAttribute('aria-expanded','false'));
});
newBuyerForm.addEventListener('submit',event=>{
  event.preventDefault();
  const name=document.querySelector('#buyerShortName').value.trim();
  const inn=document.querySelector('#buyerInn').value.trim();
  const validations=[
    {input:document.querySelector('#buyerShortName'),error:document.querySelector('#buyerShortNameError'),valid:Boolean(name),message:'Заполните поле'},
    {input:document.querySelector('#buyerInn'),error:document.querySelector('#buyerInnError'),valid:/^\d{10}$/.test(inn),message:inn?'Введите 10 цифр':'Заполните поле'}
  ];
  validations.forEach(({input,error,valid,message})=>{input.classList.toggle('field-invalid',!valid);input.setAttribute('aria-invalid',String(!valid));error.textContent='';if(!valid){const icon=document.createElement('i');icon.textContent='!';error.append(icon,document.createTextNode(message))}error.hidden=valid});
  const firstInvalid=validations.find(item=>!item.valid);
  if(firstInvalid){firstInvalid.input.focus();return}
  const value=`${name}${inn?`, ИНН ${inn}`:''}`;
  const option=document.createElement('button');
  option.type='button';option.setAttribute('role','option');option.dataset.value=value;option.textContent=value;
  buyerSelectMenu.append(option);
  buyerSelectButton.querySelector('span').textContent=value;
  buyerSelectMenu.querySelectorAll('button').forEach(item=>item.classList.toggle('selected',item===option));
  newBuyerForm.reset();
  closeBuyerModal();
  toast('Покупатель добавлен');
});
['#buyerShortName','#buyerInn'].forEach(selector=>document.querySelector(selector).addEventListener('input',event=>{
  const input=event.currentTarget;
  if(!input.classList.contains('field-invalid'))return;
  const valid=input.id==='buyerInn'?/^\d{10}$/.test(input.value.trim()):Boolean(input.value.trim());
  if(valid){input.classList.remove('field-invalid');input.setAttribute('aria-invalid','false');input.nextElementSibling.hidden=true}
}));
document.querySelector('#documentSettingsForm').addEventListener('submit',event=>{event.preventDefault();toast('Настройки документов сохранены')});
const serviceDescriptionToggle=document.querySelector('#serviceDescriptionToggle');
serviceDescriptionToggle.addEventListener('click',()=>{
  const description=document.querySelector('#serviceDescription');
  const expanded=serviceDescriptionToggle.getAttribute('aria-expanded')==='true';
  serviceDescriptionToggle.setAttribute('aria-expanded',String(!expanded));
  description.hidden=expanded;
});
