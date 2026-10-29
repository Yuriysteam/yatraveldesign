/* Figma 20155:238816 / 20155:238946. Reuse this prototype's More Primary,
   Tooltip and Navbar Sheet shells, including their light/dark token bindings. */
(() => {
  const data = window.SeatSelectionArrival;
  if (!data) return;
  const mobile = Boolean(document.querySelector('.m-page'));
  const prefix = mobile ? 'm' : 'exact';
  const template = document.getElementById(`${prefix}-booking-info`);
  if (!template) return;
  const overlay = template.cloneNode(true);
  // Cloning the existing shell keeps its complete typography, close control,
  // tail / footer / homebar. Only IDs and content belong to this new explanation.
  [overlay, ...overlay.querySelectorAll('*')].forEach(node => {
    for (const attribute of ['id', 'aria-labelledby', 'aria-describedby']) {
      if (node.hasAttribute(attribute)) node.setAttribute(attribute, node.getAttribute(attribute).replaceAll('booking-info', 'arrival-info'));
    }
    node.removeAttribute('data-node-id');
  });
  overlay.querySelector('h2').textContent = 'Почему другое время прибытия';
  overlay.querySelector(`#${prefix}-arrival-info-description`).textContent = 'В пути этот вагон прицепят к другому поезду, и дальше он поедет по его расписанию. Пересаживаться не нужно, вы останетесь в том же вагоне';
  const close = overlay.querySelector(mobile ? '.m-amenities-sheet__close' : '.exact-amenities-popover__close');
  close.setAttribute('aria-label', 'Закрыть пояснение о времени прибытия');
  document.body.append(overlay);
  let activeTrigger;
  const triggers = [];
  const isOpen = () => mobile ? overlay.open : overlay.matches(':popover-open');
  const hide = (focus = false) => {
    if (isOpen()) mobile ? window.SeatSelectionSheetMotion.close(overlay) : overlay.hidePopover();
    triggers.forEach(button => button.setAttribute('aria-expanded', 'false'));
    if (focus) activeTrigger?.focus({preventScroll:true});
  };
  const position = () => {
    if (mobile || !isOpen() || !activeTrigger) return;
    const rect = activeTrigger.getBoundingClientRect();
    if (activeTrigger.closest('[hidden], [inert]') || !rect.width || rect.bottom <= 0 || rect.top >= innerHeight) { hide(); return; }
    const margin = 12, gap = 4;
    overlay.style.removeProperty('--fare-info-max-height');
    const above = rect.top - margin - gap, below = innerHeight - rect.bottom - margin - gap;
    const placeAbove = above >= overlay.offsetHeight || above >= below;
    overlay.dataset.placement = placeAbove ? 'above' : 'below';
    overlay.style.setProperty('--fare-info-max-height', `${Math.max(60, (placeAbove ? above : below) - 8)}px`);
    const width = overlay.offsetWidth, height = overlay.offsetHeight;
    const center = rect.left + rect.width / 2;
    const left = Math.max(margin, Math.min(center - width / 2, innerWidth - width - margin));
    overlay.style.left = `${left}px`;
    overlay.style.top = `${placeAbove ? rect.top - height - gap : rect.bottom + gap}px`;
    overlay.style.setProperty('--amenities-tail-left', `${Math.max(24, Math.min(center - left - 12, width - 48))}px`);
  };
  for (const number of data.laterCars) {
    const card = document.querySelector(`article[data-car-number="${number}"]`);
    if (!card) continue;
    card.classList.add('has-arrival-time');
    const row = document.createElement('div');
    row.className = 'arrival-informer';
    row.dataset.nodeId = mobile ? '20155:238946' : '20155:238816';
    row.innerHTML = `<img src="./assets/arrival-info.svg" width="24" height="24" alt=""><div class="arrival-informer__content"><span>Этот вагон прибудет позже — в ${data.laterArrival}</span></div>`;
    const button = document.createElement('button');
    button.className = mobile ? 'm-car__more' : 'exact-more';
    button.type = 'button';
    button.innerHTML = `<img src="./${mobile ? 'mobile' : 'desktop'}/assets/more.svg" width="20" height="14" alt="">`;
    button.setAttribute('aria-label', `Почему ${number} вагон прибудет позже`);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', overlay.id);
    button.setAttribute('aria-expanded', 'false');
    if (!mobile) button.setAttribute('popovertarget', overlay.id);
    row.lastElementChild.append(button);
    card.querySelector('header').after(row);
    triggers.push(button);
    button.addEventListener('click', event => {
      event.preventDefault();
      if (isOpen() && activeTrigger === button) { hide(true); return; }
      if (isOpen()) hide();
      activeTrigger = button;
      button.setAttribute('aria-expanded', 'true');
      mobile ? window.SeatSelectionSheetMotion.open(overlay) : overlay.showPopover({source:button});
      overlay.querySelector(mobile ? '.m-fare-info__body' : '.exact-amenities-popover__body').scrollTop = 0;
      position();
      close.focus({preventScroll:true});
    });
  }
  close.addEventListener('click', () => hide(true));
  if (mobile) {
    overlay.querySelector('.m-fare-info__done').addEventListener('click', () => hide(true));
    overlay.addEventListener('click', event => {
      if (event.target !== overlay) return;
      const rect = overlay.getBoundingClientRect();
      if (event.clientY < rect.top || event.clientY > rect.bottom || event.clientX < rect.left || event.clientX > rect.right) hide(true);
    });
    overlay.addEventListener('close', () => {
      triggers.forEach(button => button.setAttribute('aria-expanded', 'false'));
      activeTrigger?.focus({preventScroll:true});
    });
  } else {
    overlay.addEventListener('beforetoggle', event => {
      if (event.newState === 'closed') triggers.forEach(button => button.setAttribute('aria-expanded', 'false'));
    });
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    document.fonts.ready.then(position);
  }
})();
