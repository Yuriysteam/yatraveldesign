/* Desktop only: shared informational Tooltip for legend and basket-cap More.
   Figma 20003:94638. Opening it never changes the fare or seat selection. */
(() => {
  if (window.SeatSelectionSapsan) return;
  const triggers = document.querySelectorAll('.nonrefundable-legend__more, .exact-nonrefundable__more');
  const existingClose = document.querySelector('#exact-car-amenities .exact-amenities-popover__close');
  if (!triggers.length || !existingClose) return;
  const popover = document.createElement('div');
  popover.id = 'exact-fare-info';
  popover.className = 'exact-amenities-popover exact-fare-info';
  popover.dataset.nodeId = '20003:94638';
  popover.setAttribute('popover', 'auto');
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-labelledby', 'exact-fare-info-title');
  popover.innerHTML = `<span class="exact-amenities-popover__tail" aria-hidden="true"></span>
    <div class="exact-amenities-popover__body">
      <header><h2 id="exact-fare-info-title">Невозвратный тариф</h2>
        <div class="exact-fare-info__copy">
          <p>Билет стоит дешевле, но если планы изменятся, стоимость проезда не вернётся.</p>
          <p>В отдельных случаях возможен частичный возврат — например, из-за внезапной болезни, но понадобятся подтверждающие документы.</p>
          <p>Если поезд отменят или задержат отправление, можно вернуть полную стоимость.</p>
        </div>
      </header>
      <button class="exact-fare-info__rules" type="button" aria-disabled="true">Полные правила возврата</button>
    </div>`;
  const close = existingClose.cloneNode(true);
  close.setAttribute('aria-label', 'Закрыть информацию о тарифе');
  close.insertAdjacentHTML('beforeend', '<img class="exact-fare-info__close-asset" src="./desktop/assets/amenities-close.svg" width="24" height="24" alt="">');
  popover.querySelector('.exact-amenities-popover__body').append(close);
  document.body.append(popover);
  let trigger;
  const isOpen = () => popover.matches(':popover-open');
  const hide = (restoreFocus = false) => {
    if (isOpen()) popover.hidePopover();
    if (restoreFocus) trigger?.focus({preventScroll:true});
  };
  const position = () => {
    if (!isOpen() || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    if (trigger.closest('[inert], [hidden]') || !rect.width || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) { hide(); return; }
    const margin = 12, gap = 4, tail = 8;
    // Prefer above, as in the reference; flip only when there is not enough room.
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
  for (const button of triggers) {
    button.removeAttribute('aria-disabled');
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', popover.id);
    button.setAttribute('aria-expanded', 'false');
    // Register a native invoker so pointer light-dismiss doesn't close the
    // popover before our click handler and immediately reopen it on that click.
    button.setAttribute('popovertarget', popover.id);
    button.addEventListener('click', event => {
      event.preventDefault(); // This handler owns the toggle and positioning.
      if (isOpen() && trigger === button) { hide(true); return; }
      trigger?.setAttribute('aria-expanded', 'false');
      trigger = button;
      if (!isOpen()) popover.showPopover({source:button});
      button.setAttribute('aria-expanded', 'true');
      popover.querySelector('.exact-amenities-popover__body').scrollTop = 0;
      position();
      close.focus({preventScroll:true});
    });
  }
  close.addEventListener('click', () => hide(true));
  popover.addEventListener('beforetoggle', event => {
    if (event.newState === 'closed') trigger?.setAttribute('aria-expanded', 'false');
  });
  window.addEventListener('scroll', position, true);
  window.addEventListener('resize', position);
  // The basket cap moves when selection changes; keep the anchor synchronized.
  const panel = document.querySelector('.exact-selection-panel');
  if (panel) {
    new ResizeObserver(position).observe(panel);
    new MutationObserver(position).observe(panel, {attributes:true, subtree:true, attributeFilter:['class','inert','hidden']});
    panel.addEventListener('transitionend', position);
  }
  document.fonts.ready.then(position);
})();
