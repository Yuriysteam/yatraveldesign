/* Anchored price detail view: native light-dismiss and Escape, shared live data. */
(() => {
  const popover = document.querySelector('.exact-ticket-details');
  if (!popover) return;
  const body = popover.querySelector('.exact-amenities-popover__body');
  const scroll = popover.querySelector('.exact-ticket-details__scroll');
  // Reuse the existing Close's dark-theme bindings, with the exact light asset.
  const close = document.querySelector('#exact-car-amenities .exact-amenities-popover__close').cloneNode(true);
  close.classList.add('m-price-details__close');
  close.setAttribute('aria-label','Закрыть детализацию');
  if (['roundtrip', 'transfer'].includes(document.documentElement?.dataset.scenario)) {
    close.innerHTML = '<span class="roundtrip-details-close-icon" aria-hidden="true"></span>';
  } else {
    close.insertAdjacentHTML('beforeend','<img class="exact-ticket-details__close-asset" src="./desktop/assets/amenities-close.svg" width="24" height="24" alt="">');
  }
  body.append(close);
  let trigger, getData;
  const isOpen = () => popover.matches(':popover-open');
  const hide = (restoreFocus = false) => {
    if (isOpen()) popover.hidePopover();
    if (restoreFocus) trigger?.focus({preventScroll:true});
  };
  const position = () => {
    if (!isOpen() || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    if (!rect.width || rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) { hide(); return; }
    const margin = 12, gap = 4, tail = 8;
    const above = rect.top - margin - gap;
    const below = window.innerHeight - rect.bottom - margin - gap;
    // Prefer above the basket; constrain a long list, not the header or close.
    const placeAbove = above >= below;
    const available = Math.max(80, (placeAbove ? above : below) - tail);
    popover.style.setProperty('--ticket-details-max-height',`${available}px`);
    popover.dataset.placement = placeAbove ? 'above' : 'below';
    const width = popover.offsetWidth, height = popover.offsetHeight;
    const center = rect.left + rect.width / 2;
    const left = Math.max(margin,Math.min(center - width / 2, window.innerWidth - width - margin));
    popover.style.left = `${left}px`;
    popover.style.top = `${placeAbove ? Math.max(margin,rect.top - height - gap) : rect.bottom + gap}px`;
    popover.style.setProperty('--amenities-tail-left',`${Math.max(24,Math.min(center - left - 12,width - 48))}px`);
  };
  const refresh = () => {
    if (!isOpen() || !getData) return;
    const data = getData();
    if (!data.places.length) { hide(); return; }
    window.SeatSelectionTicketDetails.render(popover,data);
    position();
  };
  const open = (snapshot, source) => {
    if (isOpen() && trigger === source) { hide(true); return; }
    trigger?.setAttribute('aria-expanded','false');
    trigger = source;
    getData = snapshot;
    window.SeatSelectionTicketDetails.render(popover,getData());
    if (!isOpen()) popover.showPopover({source});
    trigger.setAttribute('aria-expanded','true');
    scroll.scrollTop = 0;
    position();
    close.focus({preventScroll:true});
  };
  popover.addEventListener('beforetoggle',event => {
    if (event.newState === 'closed') trigger?.setAttribute('aria-expanded','false');
  });
  window.addEventListener('scroll',position,true);
  window.addEventListener('resize',position);
  new ResizeObserver(position).observe(document.querySelector('.exact-selection-panel'));
  document.fonts.ready.then(position);
  window.SeatSelectionDesktopPriceDetails = {open,close:() => hide(true),refresh};
})();
