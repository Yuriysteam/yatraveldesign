/* Included bedding explanation, ReDesign 19982:477110.
   Only the mobile coupe More opens it; pricing and selection stay untouched. */
(() => {
  const root = document.getElementById('mobile-carriages');
  if (!root || window.SeatSelectionSapsan) return;
  const triggers = root.querySelectorAll('.m-bedding:not(.m-bedding--paid) .m-bedding__more');
  if (!triggers.length) return;
  const sheet = document.createElement('dialog');
  sheet.id = 'm-bedding-info';
  sheet.className = 'm-price-details m-amenities-sheet m-bedding-info';
  sheet.dataset.nodeId = '19982:477110';
  sheet.setAttribute('aria-labelledby', 'm-bedding-info-title');
  sheet.setAttribute('aria-describedby', 'm-bedding-info-description');
  sheet.innerHTML = `<header class="m-amenities-sheet__header">
    <div class="m-amenities-sheet__titles"><h2 id="m-bedding-info-title">Постельное бельё</h2></div>
    <button class="m-amenities-sheet__close" type="button" aria-label="Закрыть информацию о постельном белье" autofocus><img src="./mobile/assets/gender-close.svg" width="24" height="24" alt=""></button>
  </header>
  <div class="m-bedding-info__body">
    <p id="m-bedding-info-description">В этом вагоне постельное бельё входит в стоимость билета. Убрать его из заказа не получится</p>
  </div>
  <footer class="m-bedding-info__footer">
    <div class="m-bedding-info__actions"><button class="m-filter-sheet__apply m-bedding-info__done" type="button">Понятно</button></div>
    <div class="m-amenities-sheet__homebar" aria-hidden="true"><img src="./mobile/assets/price-details-homebar.svg" width="375" height="34" alt=""></div>
  </footer>`;
  document.body.append(sheet);
  let opener;
  const close = () => window.SeatSelectionSheetMotion.close(sheet);
  for (const trigger of triggers) {
    trigger.removeAttribute('aria-disabled');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', sheet.id);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('click', () => {
      if (trigger.closest('.m-bedding').inert) return;
      opener?.setAttribute('aria-expanded', 'false');
      opener = trigger;
      window.SeatSelectionSheetMotion.open(sheet);
      trigger.setAttribute('aria-expanded', 'true');
      sheet.querySelector('.m-bedding-info__body').scrollTop = 0;
    });
  }
  sheet.querySelector('.m-amenities-sheet__close').addEventListener('click', close);
  sheet.querySelector('.m-bedding-info__done').addEventListener('click', close);
  sheet.addEventListener('click', event => {
    if (event.target !== sheet) return;
    const rect = sheet.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom || event.clientX < rect.left || event.clientX > rect.right) close();
  });
  sheet.addEventListener('close', () => {
    if (sheet.open) return;
    opener?.setAttribute('aria-expanded', 'false');
    if (opener && !opener.closest('.m-bedding').inert) opener.focus({preventScroll:true});
  });
})();
