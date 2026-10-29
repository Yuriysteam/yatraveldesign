/* Included bedding Tooltip, ReDesign 20003:94727.
   Reuse the existing HTML DS shell (the Figma Code Connect target is Android).
   This explanation never changes bedding, prices or seat selection. */
(() => {
  if (window.SeatSelectionSapsan) return;
  const triggers = document.querySelectorAll('.exact-bedding--included .exact-more');
  const existingClose = document.querySelector('#exact-car-amenities .exact-amenities-popover__close');
  if (!triggers.length || !existingClose) return;
  const popover = document.createElement('div');
  popover.id = 'exact-bedding-info';
  popover.className = 'exact-amenities-popover exact-bedding-info';
  popover.dataset.nodeId = '20003:94727';
  popover.setAttribute('popover', 'auto');
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-labelledby', 'exact-bedding-info-title');
  popover.setAttribute('aria-describedby', 'exact-bedding-info-description');
  popover.innerHTML = `<span class="exact-amenities-popover__tail" aria-hidden="true"></span>
    <div class="exact-amenities-popover__body">
      <header><h2 id="exact-bedding-info-title">Постельное бельё</h2>
        <p id="exact-bedding-info-description">В этом вагоне постельное бельё входит в стоимость билета. Убрать его из заказа не получится</p>
      </header>
    </div>`;
  const close = existingClose.cloneNode(true);
  close.setAttribute('aria-label', 'Закрыть информацию о постельном белье');
  close.insertAdjacentHTML('beforeend', '<img class="exact-bedding-info__close-asset" src="./desktop/assets/amenities-close.svg" width="24" height="24" alt="">');
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
    popover.style.removeProperty('--bedding-info-max-height');
    const naturalHeight = popover.offsetHeight;
    const above = rect.top - margin - gap;
    const below = innerHeight - rect.bottom - margin - gap;
    // Unlike amenities, bedding opens above whenever the whole tooltip fits.
    const placeAbove = above >= naturalHeight;
    popover.dataset.placement = placeAbove ? 'above' : 'below';
    popover.style.setProperty('--bedding-info-max-height', `${Math.max(60, (placeAbove ? above : below) - tail)}px`);
    const width = popover.offsetWidth, height = popover.offsetHeight;
    const center = rect.left + rect.width / 2;
    // Match amenities' right-side tail, keeping it aligned with More.
    const left = Math.max(margin, Math.min(rect.right + 28 - width, innerWidth - width - margin));
    popover.style.left = `${left}px`;
    popover.style.top = `${placeAbove ? rect.top - height - gap : rect.bottom + gap}px`;
    popover.style.setProperty('--amenities-tail-left', `${Math.max(24, Math.min(center - left - 12, width - 48))}px`);
  };
  for (const button of triggers) {
    button.removeAttribute('aria-disabled');
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', popover.id);
    button.setAttribute('aria-expanded', 'false');
    // Native invoker association prevents light-dismiss before the repeat click.
    button.setAttribute('popovertarget', popover.id);
    button.addEventListener('click', event => {
      event.preventDefault();
      if (button.closest('[inert], [hidden]')) return;
      if (isOpen() && trigger === button) { hide(true); return; }
      trigger?.setAttribute('aria-expanded', 'false');
      trigger = button;
      if (!isOpen()) popover.showPopover({source:button});
      button.setAttribute('aria-expanded', 'true');
      popover.querySelector('.exact-amenities-popover__body').scrollTop = 0;
      position();
      if (isOpen()) close.focus({preventScroll:true});
    });
    // Removing the last seat or switching carriage also removes its explanation.
    new MutationObserver(position).observe(button.closest('.exact-bedding'), {
      attributes:true, attributeFilter:['inert','hidden','class'],
    });
  }
  close.addEventListener('click', () => hide(true));
  popover.addEventListener('beforetoggle', event => {
    if (event.newState === 'closed') trigger?.setAttribute('aria-expanded', 'false');
  });
  window.addEventListener('scroll', position, true);
  window.addEventListener('resize', position);
  document.fonts.ready.then(position);
})();
