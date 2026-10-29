/* Booking explanation, Figma 20006:196235. Reuse our HTML Navbar Sheet,
   Secondary XL button and HomeBar (Code Connect targets Android components). */
(() => {
  const trigger = document.querySelector('.m-booking-informer__title button');
  if (!trigger) return;
  const sheet = document.createElement('dialog');
  sheet.id = 'm-booking-info';
  sheet.className = 'm-price-details m-amenities-sheet m-fare-info';
  sheet.dataset.nodeId = '20006:196235';
  sheet.setAttribute('aria-labelledby', 'm-booking-info-title');
  sheet.setAttribute('aria-describedby', 'm-booking-info-description');
  sheet.innerHTML = `<header class="m-amenities-sheet__header">
    <div class="m-amenities-sheet__titles"><h2 id="m-booking-info-title">Как это работает</h2></div>
    <button class="m-amenities-sheet__close" type="button" aria-label="Закрыть информацию о бронировании" autofocus><img src="./mobile/assets/gender-close.svg" width="24" height="24" alt=""></button>
  </header>
  <div class="m-fare-info__body">
    <p id="m-booking-info-description">Если вы не уверены в поездке, можете отложить покупку билета, но сделать бронь. Услуга бронирования стоит от 99 ₽, так вы точно не упустите нужную дату и удобные места. Опцию бронирования можно выбрать на этапе оплаты билета на поезд.</p>
  </div>
  <footer class="m-fare-info__footer">
    <div class="m-fare-info__actions"><button class="m-filter-sheet__apply m-fare-info__done" type="button">Понятно</button></div>
    <div class="m-amenities-sheet__homebar" aria-hidden="true"><img src="./mobile/assets/price-details-homebar.svg" width="375" height="34" alt=""></div>
  </footer>`;
  document.body.append(sheet);
  trigger.removeAttribute('aria-disabled');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', sheet.id);
  trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', () => {
    if (sheet.open) return;
    trigger.setAttribute('aria-expanded', 'true');
    window.SeatSelectionSheetMotion.open(sheet);
    sheet.querySelector('.m-fare-info__body').scrollTop = 0;
  });
  sheet.querySelector('.m-amenities-sheet__close').addEventListener('click', () => window.SeatSelectionSheetMotion.close(sheet));
  sheet.querySelector('.m-fare-info__done').addEventListener('click', () => window.SeatSelectionSheetMotion.close(sheet));
  sheet.addEventListener('click', event => {
    if (event.target !== sheet) return;
    const rect = sheet.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom || event.clientX < rect.left || event.clientX > rect.right) window.SeatSelectionSheetMotion.close(sheet);
  });
  sheet.addEventListener('close', () => {
    if (sheet.open) return;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus({preventScroll:true});
  });
})();
