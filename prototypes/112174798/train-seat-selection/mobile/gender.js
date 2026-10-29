/* ReDesign 19960:161190. Mobile presentation of the shared compartment choice. */
(() => {
  const root = document.getElementById('mobile-carriages');
  if (!root || window.SeatSelectionSapsan) return;
  const sheet = document.createElement('dialog');
  sheet.id = 'm-gender-sheet';
  sheet.className = 'm-price-details m-gender-sheet';
  sheet.dataset.nodeId = '19960:161190';
  sheet.setAttribute('aria-labelledby', 'm-gender-sheet-title');
  sheet.setAttribute('aria-describedby', 'm-gender-sheet-description');
  sheet.innerHTML = `<header class="m-amenities-sheet__header">
    <div class="m-amenities-sheet__titles"><h2 id="m-gender-sheet-title">Выберите тип купе</h2></div>
    <button class="m-amenities-sheet__close" type="button" aria-label="Закрыть выбор типа купе" autofocus><img src="./mobile/assets/gender-close.svg" alt=""></button>
  </header>
  <div class="m-gender-sheet__body">
    <p id="m-gender-sheet-description">Все места в купе пока свободны, поэтому вы можете выбрать его тип</p>
    <div class="m-gender-sheet__options">
      <button class="m-filter-sheet__apply m-gender-sheet__option" type="button" data-gender="female">Женское</button>
      <button class="m-filter-sheet__apply m-gender-sheet__option" type="button" data-gender="male">Мужское</button>
      <button class="m-filter-sheet__apply m-gender-sheet__option" type="button" data-gender="mixed">Смешанное</button>
    </div>
  </div>
  <div class="m-amenities-sheet__homebar" aria-hidden="true"><img src="./mobile/assets/gender-homebar.svg" alt=""></div>`;
  document.body.append(sheet);
  // Reuse the same Base tooltip treatment as the “choose more seats” validation.
  const feedback = document.createElement('div');
  feedback.id = 'm-gender-restriction';
  feedback.className = 'm-selection-panel__validation m-gender-restriction';
  feedback.setAttribute('role', 'tooltip');
  feedback.hidden = true;
  feedback.innerHTML = '<span></span><img src="./desktop/assets/seat-tooltip-bottom.svg" alt="">';
  document.body.append(feedback);
  let feedbackSeat, feedbackTimer;
  const hideFeedback = () => {
    clearTimeout(feedbackTimer);
    feedback.hidden = true;
    feedbackSeat?.removeAttribute('aria-describedby');
    feedbackSeat = undefined;
  };
  const showFeedback = (button, message) => {
    hideFeedback();
    feedbackSeat = button;
    feedback.querySelector('span').textContent = message;
    feedback.hidden = false;
    const rect = button.getBoundingClientRect();
    const width = feedback.offsetWidth, height = feedback.offsetHeight;
    const margin = 12, gap = 4;
    const center = rect.left + rect.width / 2;
    const left = Math.max(margin, Math.min(center - width / 2, window.innerWidth - width - margin));
    const below = rect.top < height + gap + margin;
    feedback.dataset.placement = below ? 'below' : 'above';
    feedback.querySelector('img').src = `./desktop/assets/seat-tooltip-${below ? 'top' : 'bottom'}.svg`;
    feedback.style.left = `${left}px`;
    feedback.style.top = `${Math.max(margin, Math.min(below ? rect.bottom + gap : rect.top - height - gap, window.innerHeight - height - margin))}px`;
    feedback.style.setProperty('--gender-tail-left', `${Math.max(16, Math.min(center - left - 12, width - 40))}px`);
    button.setAttribute('aria-describedby', feedback.id);
    feedbackTimer = setTimeout(hideFeedback, 6000);
  };
  document.addEventListener('pointerdown', event => {
    if (!feedback.contains(event.target)) hideFeedback();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hideFeedback(); });
  window.addEventListener('scroll', hideFeedback, true);
  window.addEventListener('resize', hideFeedback);
  window.addEventListener('seat-gender-change', hideFeedback);
  const flow = window.SeatSelectionGender.create({
    root,
    show:(_button, allowedType) => {
      hideFeedback();
      sheet.querySelector('#m-gender-sheet-description').textContent = allowedType
        ? window.SeatSelectionGender.conflictText
        : 'Все места в купе пока свободны, поэтому вы можете выбрать его тип';
      sheet.querySelectorAll('[data-gender]').forEach(option => {
        option.disabled = Boolean(allowedType && option.dataset.gender !== allowedType);
      });
      if (!sheet.open) window.SeatSelectionSheetMotion.open(sheet);
    },
    hide:() => window.SeatSelectionSheetMotion.close(sheet),
    reject:showFeedback,
  });
  sheet.querySelector('.m-amenities-sheet__close').addEventListener('click', () => window.SeatSelectionSheetMotion.close(sheet));
  sheet.addEventListener('click', event => {
    const option = event.target.closest('[data-gender]');
    if (option) {
      flow.choose(option.dataset.gender);
      return;
    }
    if (event.target !== sheet) return;
    const rect = sheet.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom || event.clientX < rect.left || event.clientX > rect.right) window.SeatSelectionSheetMotion.close(sheet);
  });
  // A native dialog handles Escape, focus trapping and focus restoration.
  // Ignore an old close event if the sheet was already opened again.
  sheet.addEventListener('close', () => { if (!sheet.open) flow.cancel(); });
  window.SeatSelectionMobileGender = flow;
})();
