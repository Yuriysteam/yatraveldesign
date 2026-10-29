/* One informational sheet for both mobile More entry points. It never applies
   a fare or changes the selection. ReDesign 19982:475369. */
(() => {
  const root = document.getElementById('mobile-carriages');
  const offer = window.SeatSelectionNonRefundable;
  if (!root || !offer || window.SeatSelectionSapsan) return;
  const cars = window.SeatSelectionPlatskart?.allCarriages || window.SeatSelectionData.carriages;
  const triggers = root.querySelectorAll('.m-nonrefundable__more, .nonrefundable-legend__more');
  if (!triggers.length) return;
  const sheet = document.createElement('dialog');
  sheet.id = 'm-fare-info';
  sheet.className = 'm-price-details m-amenities-sheet m-fare-info';
  sheet.dataset.nodeId = '19982:475369';
  sheet.setAttribute('aria-labelledby', 'm-fare-info-title');
  sheet.innerHTML = `<header class="m-amenities-sheet__header">
    <div class="m-amenities-sheet__titles"><h2 id="m-fare-info-title">Невозвратный тариф</h2></div>
    <button class="m-amenities-sheet__close" type="button" aria-label="Закрыть информацию о тарифе" autofocus><img src="./mobile/assets/gender-close.svg" width="24" height="24" alt=""></button>
  </header>
  <div class="m-fare-info__body">
    <p>Билет стоит дешевле, но если планы изменятся, стоимость проезда не вернётся.</p>
    <p>В отдельных случаях возможен частичный возврат — например, из-за внезапной болезни, но понадобятся подтверждающие документы.</p>
    <p>Если поезд отменят или задержат отправление, можно вернуть полную стоимость.</p>
    <button class="m-fare-info__rules" type="button" aria-disabled="true">Полные правила возврата</button>
  </div>
  <footer class="m-fare-info__footer">
    <div class="m-fare-info__actions"><button class="m-filter-sheet__apply m-fare-info__done" type="button">Понятно</button></div>
    <div class="m-amenities-sheet__homebar" aria-hidden="true"><img src="./mobile/assets/price-details-homebar.svg" width="375" height="34" alt=""></div>
  </footer>`;
  document.body.append(sheet);
  let opener;
  for (const trigger of triggers) {
    trigger.removeAttribute('aria-disabled');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', sheet.id);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('click', () => {
      const car = cars.find(item => item.number === Number(trigger.closest('[data-car-number]').dataset.carNumber));
      if (!car || !offer.hasOffer(car)) return;
      opener = trigger;
      trigger.setAttribute('aria-expanded', 'true');
      window.SeatSelectionSheetMotion.open(sheet);
      sheet.querySelector('.m-fare-info__body').scrollTop = 0;
    });
  }
  sheet.querySelector('.m-amenities-sheet__close').addEventListener('click', () => window.SeatSelectionSheetMotion.close(sheet));
  sheet.querySelector('.m-fare-info__done').addEventListener('click', () => window.SeatSelectionSheetMotion.close(sheet));
  sheet.addEventListener('click', event => {
    if (event.target !== sheet) return;
    const rect = sheet.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom || event.clientX < rect.left || event.clientX > rect.right) window.SeatSelectionSheetMotion.close(sheet);
  });
  sheet.addEventListener('close', () => {
    if (sheet.open) return;
    opener?.setAttribute('aria-expanded', 'false');
    opener?.focus({preventScroll:true});
  });
})();
