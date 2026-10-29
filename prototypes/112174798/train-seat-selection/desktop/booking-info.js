/* Desktop booking informer, Figma 20006:182863. Reuse the HTML Tooltip
   shell: the Code Connect mapping in Figma targets Android, not this app. */
(() => {
  const button = document.querySelector('.exact-informer .exact-more');
  const existingClose = document.querySelector('#exact-car-amenities .exact-amenities-popover__close');
  if (!button || !existingClose) return;
  const popover = document.createElement('div');
  popover.id = 'exact-booking-info';
  popover.className = 'exact-amenities-popover exact-fare-info';
  popover.dataset.nodeId = '20006:182863';
  popover.setAttribute('popover', 'auto');
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-labelledby', 'exact-booking-info-title');
  popover.setAttribute('aria-describedby', 'exact-booking-info-description');
  popover.innerHTML = `<span class="exact-amenities-popover__tail" aria-hidden="true"></span>
    <div class="exact-amenities-popover__body">
      <header><h2 id="exact-booking-info-title">Как это работает</h2>
        <p id="exact-booking-info-description">Если вы не уверены в поездке, можете отложить покупку билета, но сделать бронь. Услуга бронирования стоит от 99 ₽, так вы точно не упустите нужную дату и удобные места. Опцию бронирования можно выбрать на этапе оплаты билета на поезд.</p>
      </header>
    </div>`;
  const close = existingClose.cloneNode(true);
  close.setAttribute('aria-label', 'Закрыть информацию о бронировании');
  close.insertAdjacentHTML('beforeend', '<img class="exact-fare-info__close-asset" src="./desktop/assets/amenities-close.svg" width="24" height="24" alt="">');
  popover.querySelector('.exact-amenities-popover__body').append(close);
  document.body.append(popover);
  const isOpen = () => popover.matches(':popover-open');
  const hide = (restoreFocus = false) => {
    if (isOpen()) popover.hidePopover();
    if (restoreFocus) button.focus({preventScroll:true});
  };
  const position = () => {
    if (!isOpen()) return;
    const rect = button.getBoundingClientRect();
    if (button.closest('[hidden], [inert]') || !rect.width || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) { hide(); return; }
    const margin = 12, gap = 4, tail = 8;
    popover.style.removeProperty('--fare-info-max-height');
    const naturalHeight = popover.offsetHeight;
    const above = rect.top - margin - gap;
    const below = innerHeight - rect.bottom - margin - gap;
    const placeAbove = above >= naturalHeight || above >= below;
    popover.dataset.placement = placeAbove ? 'above' : 'below';
    popover.style.setProperty('--fare-info-max-height', `${Math.max(60, (placeAbove ? above : below) - tail)}px`);
    const width = popover.offsetWidth, height = popover.offsetHeight;
    const center = rect.left + rect.width / 2;
    const left = Math.max(margin, Math.min(center - width / 2, innerWidth - width - margin));
    popover.style.left = `${left}px`;
    popover.style.top = `${placeAbove ? rect.top - height - gap : rect.bottom + gap}px`;
    popover.style.setProperty('--amenities-tail-left', `${Math.max(24, Math.min(center - left - 12, width - 48))}px`);
  };
  button.removeAttribute('aria-disabled');
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', popover.id);
  button.setAttribute('aria-expanded', 'false');
  // Native invoker association prevents light-dismiss from reopening on repeat click.
  button.setAttribute('popovertarget', popover.id);
  button.addEventListener('click', event => {
    event.preventDefault();
    if (isOpen()) { hide(true); return; }
    popover.showPopover({source:button});
    button.setAttribute('aria-expanded', 'true');
    popover.querySelector('.exact-amenities-popover__body').scrollTop = 0;
    position();
    if (isOpen()) close.focus({preventScroll:true});
  });
  close.addEventListener('click', () => hide(true));
  popover.addEventListener('beforetoggle', event => {
    if (event.newState === 'closed') button.setAttribute('aria-expanded', 'false');
  });
  window.addEventListener('scroll', position, true);
  window.addEventListener('resize', position);
  // Filters move this same informer node; keep an open explanation anchored.
  new MutationObserver(position).observe(document.querySelector('.exact-carriages'), {
    subtree:true, childList:true, attributes:true, attributeFilter:['hidden'],
  });
  document.fonts.ready.then(position);
})();
