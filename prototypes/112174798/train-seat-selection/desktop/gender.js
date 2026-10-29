/* ReDesign 19967:439751: a nonmodal, seat-anchored Tooltip with Button XL choices. */
(() => {
  const root = document.querySelector('.exact-carriages');
  if (!root || window.SeatSelectionSapsan) return;
  const popover = document.createElement('div');
  popover.id = 'exact-gender-popover';
  popover.className = 'exact-amenities-popover exact-gender-popover';
  popover.dataset.nodeId = '19967:439751';
  popover.setAttribute('popover', 'auto');
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-labelledby', 'exact-gender-title');
  popover.setAttribute('aria-describedby', 'exact-gender-description');
  popover.innerHTML = `<span class="exact-amenities-popover__tail" aria-hidden="true"></span>
    <div class="exact-amenities-popover__body">
      <header><h2 id="exact-gender-title">Выберите тип купе</h2>
        <p id="exact-gender-description">Все места в купе пока свободны, поэтому вы можете выбрать его тип</p></header>
      <div class="exact-gender-popover__options">
        <button class="exact-gender-popover__option" type="button" data-gender="female">Женское</button>
        <button class="exact-gender-popover__option" type="button" data-gender="male">Мужское</button>
        <button class="exact-gender-popover__option" type="button" data-gender="mixed">Смешанное</button>
      </div>
    </div>`;
  // Reuse the existing DS Close control, including its light/dark token bindings.
  const close = document.querySelector('#exact-car-amenities .exact-amenities-popover__close').cloneNode(true);
  close.setAttribute('aria-label', 'Закрыть выбор типа купе');
  // Exact Figma asset in light mode; the existing DS control supplies dark tokens.
  close.insertAdjacentHTML('beforeend', '<img class="exact-gender-popover__close-asset" src="./desktop/assets/amenities-close.svg" width="24" height="24" alt="">');
  popover.querySelector('.exact-amenities-popover__body').append(close);
  document.body.append(popover);
  let trigger;
  const isOpen = () => popover.matches(':popover-open');
  const position = () => {
    if (!isOpen() || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    if (!rect.width || rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) {
      popover.hidePopover();
      return;
    }
    const margin = 12, gap = 4;
    const width = popover.offsetWidth, height = popover.offsetHeight;
    const center = rect.left + rect.width / 2;
    const left = Math.max(margin, Math.min(center - width / 2, window.innerWidth - width - margin));
    const below = window.innerHeight - rect.bottom - margin;
    const above = rect.top - margin;
    const placeAbove = below < height + gap && above > below;
    popover.dataset.placement = placeAbove ? 'above' : 'below';
    popover.style.left = `${left}px`;
    popover.style.top = `${Math.max(margin, Math.min(placeAbove ? rect.top - height - gap : rect.bottom + gap, window.innerHeight - height - margin))}px`;
    popover.style.setProperty('--amenities-tail-left', `${Math.max(24, Math.min(center - left - 12, width - 48))}px`);
  };
  const hide = () => {
    if (isOpen()) popover.hidePopover();
    trigger?.focus({preventScroll:true});
  };
  const flow = window.SeatSelectionGender.create({
    root,
    show(button, allowedType) {
      popover.querySelector('#exact-gender-description').textContent = allowedType
        ? window.SeatSelectionGender.conflictText
        : 'Все места в купе пока свободны, поэтому вы можете выбрать его тип';
      popover.querySelectorAll('[data-gender]').forEach(option => {
        option.disabled = Boolean(allowedType && option.dataset.gender !== allowedType);
      });
      trigger?.setAttribute('aria-expanded', 'false');
      trigger = button;
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-controls', popover.id);
      button.setAttribute('aria-expanded', 'true');
      if (!isOpen()) popover.showPopover({source:button});
      position();
      close.focus({preventScroll:true});
    },
    hide,
    reject:button => window.SeatSelectionDesktopSeatTooltip?.show(button),
  });
  close.addEventListener('click', hide);
  popover.addEventListener('click', event => {
    const option = event.target.closest('[data-gender]');
    if (option) flow.choose(option.dataset.gender);
  });
  // Native light-dismiss / Escape. Clear synchronously so a delayed toggle event
  // cannot cancel a new pending choice when the user clicks another seat.
  popover.addEventListener('beforetoggle', event => {
    if (event.newState !== 'closed') return;
    flow.cancel();
    trigger?.setAttribute('aria-expanded', 'false');
  });
  // Keyboard activation outside a nonmodal popover has no pointer light-dismiss.
  // Cancel before the shared seat handler runs, just as for an outside click.
  root.addEventListener('click', event => {
    if (isOpen() && event.target.closest('button[data-seat-number]')) popover.hidePopover();
  }, true);
  window.addEventListener('scroll', position, true);
  window.addEventListener('resize', position);
  window.SeatSelectionDesktopGender = flow;
})();
