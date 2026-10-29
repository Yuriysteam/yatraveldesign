/* Desktop platskart (19869:503758) and coupe (19880:60243).
   Switch subtree: BaseAI snippets/controls/switch/switch-sizes-l-2.html.
   288 ₽ is the demo price per selected seat, not a live tariff. */
(() => {
  const price = 288;
  const surcharge = count => `+ ${new Intl.NumberFormat('ru-RU').format(price * count)} ₽`;
  let activeCar;
  let included = true;
  const hideTimers = new WeakMap();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const setVisible = (row, visible) => {
    clearTimeout(hideTimers.get(row));
    row.inert = !visible;
    row.setAttribute('aria-hidden', String(!visible));
    if (visible) {
      if (row.hidden) {
        row.hidden = false;
        // Commit the initial opacity before entering; the 28px row never moves.
        void row.offsetWidth;
      }
      row.classList.add('is-visible');
    } else {
      row.classList.remove('is-visible');
      if (reducedMotion.matches) row.hidden = true;
      else if (!row.hidden) hideTimers.set(row, setTimeout(() => { row.hidden = true; }, 160));
    }
  };
  const render = car => {
    if (['coupe', 'sv'].includes(car.type || 'coupe')) return `
    <div class="exact-bedding exact-bedding--included" data-bedding-car="${car.number}" hidden>
      <span>Белье включено в стоимость</span>
      <button class="exact-more" type="button" aria-label="Подробнее о постельном белье" aria-disabled="true"><img src="./desktop/assets/more.svg" alt=""></button>
    </div>`;
    if (car.type !== 'platskart') return '';
    return `
    <div class="exact-bedding" data-bedding-car="${car.number}" hidden>
      <span id="bedding-label-${car.number}">Постельное белье <strong class="exact-bedding__price">${surcharge(1)}</strong></span>
      <div class="ui__auto-051 switch switch--checked switch--checked-default switch--size-l switch--default"
        role="switch" tabindex="0" aria-checked="true" aria-labelledby="bedding-label-${car.number}"
        data-checked="true" data-disabled="false"><div class="switch__knob"></div></div>
    </div>`;
  };
  const sync = places => {
    const car = places[0]?.car;
    if (car !== activeCar) {
      activeCar = car;
      included = true;
    }
    const selectedCount = places.filter(seat => seat.car === activeCar).length;
    document.querySelectorAll('[data-bedding-car]').forEach(row => {
      const visible = Number(row.dataset.beddingCar) === activeCar;
      setVisible(row, visible);
      const control = row.querySelector('[role="switch"]');
      if (!control) return; // Included bedding is informational; no surcharge or toggle.
      if (visible) row.querySelector('.exact-bedding__price').textContent = surcharge(selectedCount);
      control.setAttribute('aria-checked', String(included));
      control.dataset.checked = String(included);
      control.classList.toggle('switch--checked', included);
      control.classList.toggle('switch--checked-default', included);
    });
  };
  const extraPrice = seat => included && seat.car === activeCar
    && window.SeatSelectionPlatskart?.carriages.some(car => car.number === seat.car) ? price : 0;
  const getState = () => ({car: activeCar, included});
  const restoreState = state => {
    if (!state || typeof state !== 'object' || Array.isArray(state)
      || !Number.isInteger(state.car) || typeof state.included !== 'boolean') return;
    const cars = window.SeatSelectionPlatskart?.allCarriages
      || window.SeatSelectionData?.carriages || window.SeatSelectionPlatskart?.carriages || [];
    if (!cars.some(car => car.number === state.car)) return;
    activeCar = state.car;
    included = state.included;
  };
  const toggle = event => {
    const control = event.target.closest('.exact-bedding [role="switch"]');
    if (!control || control.closest('[data-bedding-car]').hidden) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    included = !included;
    window.dispatchEvent(new Event('seat-bedding-change'));
  };
  document.addEventListener('click', toggle);
  document.addEventListener('keydown', toggle);
  window.SeatSelectionDesktopBedding = { render, sync, extraPrice, getState, restoreState };
})();
