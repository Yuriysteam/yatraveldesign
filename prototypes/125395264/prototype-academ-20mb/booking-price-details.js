// Static prototype adapter for Arcadia UI Kit Drawer (direction_right).
(() => {
  const card=document.querySelector('.price-card');
  const trigger=card.querySelector('.price-more');
  const totalRow=trigger.closest('.price-line');
  const services=document.createElement('div');services.className='booking-services';totalRow.before(services);
  const layer=document.createElement('div');layer.className='booking-drawer-layer';layer.id='bookingPriceDetails';layer.hidden=true;
  layer.innerHTML=`<button class="booking-drawer-backdrop" type="button" aria-label="Закрыть детализацию"></button><div class="booking-drawer-shell"><button class="booking-drawer-close" type="button" aria-label="Закрыть детализацию цены"><img src="assets/profile-close-24.svg" alt=""></button><aside class="booking-drawer price-details-drawer" role="dialog" aria-modal="true" aria-labelledby="priceDetailsTitle" tabindex="-1"><h2 id="priceDetailsTitle"></h2><p class="price-details-subtitle"></p><section class="price-details-section"><div class="price-details-heading"><h3>Детализация цены</h3><select aria-label="Вид детализации"><option value="daily">По дням</option><option value="total">Итого</option></select></div><table class="price-details-table"><thead><tr><th>Дата</th><th>Rack</th><th>Проживание</th><th>Комиссия агента</th><th>Включая НДС</th></tr></thead><tbody></tbody><tfoot></tfoot></table><div class="price-details-promo"><b>ЛОНГ-СТЕЙ</b><span>Скидка действует при бронировании проживания на 5 и более ночей</span></div></section><section class="price-details-section"><h3>Условия изменений и отмены</h3><div class="cancellation-schedule"><p></p><small>по местному времени объекта проживания</small><div class="cancellation-timeline"><div><span class="cancel-until"></span><br>Бесплатная отмена<i></i></div><div><span class="cancel-from"></span><br><span class="cancel-penalty"></span><i></i></div></div></div></section><section class="price-details-section"><h3>Дополнительное питание</h3><div class="price-details-meals"><article><b>Завтрак «Сити»</b><span>от 1 500 ₽ <em>за день</em></span><span>от 4 500 ₽ <em>за период</em></span></article><article><b>Обед по меню</b><span>от 1 500 ₽ <em>за день</em></span><span>от 4 500 ₽ <em>за период</em></span></article><article><b>Ужин по меню</b><span>от 1 500 ₽ <em>за день</em></span><span>от 4 500 ₽ <em>за период</em></span></article></div><small>Цены указаны на 1 человека</small></section><section class="price-details-section"><h3>Описание тарифа</h3><p>Гость может бесплатно отменить бронирование до указанного срока. При изменении или сокращении срока проживания после этого срока применяется штраф согласно условиям отмены.</p><p>В тариф включено: безлимитный Wi-Fi на территории отеля; круглосуточный room-service; камера хранения; завтрак; консьерж-услуги.</p></section></aside></div>`;
  document.body.append(layer);
  const amount=text=>Number(text.replace(/[^\d,.]/g,'').replace(',','.'))||0;
  function sync(){
    services.replaceChildren();let extra=0;
    function line(label,value){if(!value)return;extra+=value;const row=document.createElement('div');row.className='price-line';const title=document.createElement('span');title.textContent=label;const price=document.createElement('b');price.textContent=formatWhole(value);row.append(title,price);services.append(row);}
    document.querySelectorAll('#addedMeals .food-card__item').forEach(row=>line('Доп. питание',Number(row.dataset.mealPrice)*Number(row.dataset.mealDays)*Number(row.querySelector('[data-added-count]').textContent)));
    line('Ранний заезд',Number(document.querySelector('[data-extra-stay="checkin"]').dataset.extraPrice||0));
    line('Поздний выезд',Number(document.querySelector('[data-extra-stay="checkout"]').dataset.extraPrice||0));
    totalRow.querySelector('b').textContent=formatWhole(incomingPrice+extra);
    layer.querySelector('h2').textContent=document.querySelector('.booking-title h1').textContent;
    layer.querySelector('.price-details-subtitle').textContent=`${document.querySelector('.booking-title>p').textContent} · ${document.querySelector('.selected-room__copy h2').textContent}`;
    const nights=Number(card.querySelectorAll('.price-line')[1].querySelector('span').textContent.match(/·\s*(\d+)/)?.[1])||4;
    const rack=amount(card.querySelector('s').textContent);
    layer.querySelector('tbody').innerHTML=Array.from({length:nights},(_,i)=>`<tr><td>${20+i} дек 2026</td><td>${formatWhole(rack/nights)}</td><td>${formatWhole(incomingPrice/nights)}</td><td>${formatWhole(500/nights)}</td><td>${formatWhole(404.92/nights)}</td></tr>`).join('');
    layer.querySelector('tfoot').innerHTML=`<tr><td>Итого</td><td>${formatWhole(rack)}</td><td>${formatWhole(incomingPrice)}</td><td>500 ₽</td><td>404,92 ₽</td></tr>`;
    const copy=card.querySelector('.cancel-copy');layer.querySelector('.cancellation-schedule p').textContent=copy.querySelector('b').textContent+' '+copy.querySelector('span').textContent;
    const deadline=copy.querySelector('b').textContent.match(/до (.+?) по/)?.[1]||'01.12.2026 12:00';
    layer.querySelector('.cancel-until').textContent=`До ${deadline}`;layer.querySelector('.cancel-from').textContent=`С ${deadline}`;layer.querySelector('.cancel-penalty').textContent=copy.querySelector('span').textContent;
    layer.querySelector('tbody').hidden=layer.querySelector('select').value==='total';
  }
  window.addEventListener('booking-price-updated',sync);
  new MutationObserver(()=>updateBookingTotal()).observe(document.querySelector('#addedMeals'),{childList:true,subtree:true,characterData:true});
  const close=()=>{layer.hidden=true;document.body.classList.remove('drawer-open');trigger.setAttribute('aria-expanded','false');trigger.focus()};
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',layer.id);
  trigger.addEventListener('click',()=>{sync();layer.hidden=false;document.body.classList.add('drawer-open');trigger.setAttribute('aria-expanded','true');layer.querySelector('.booking-drawer-close').focus()});
  layer.querySelectorAll('.booking-drawer-close,.booking-drawer-backdrop').forEach(button=>button.addEventListener('click',close));
  layer.querySelector('select').addEventListener('change',sync);
  layer.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close()}if(event.key==='Tab'){const items=[...layer.querySelectorAll('button,select')];const first=items[1],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});
  sync();
})();
