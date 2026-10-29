/* Figma 19879:518706. Desktop opt-in only; demo discount is 20% per eligible seat,
   rounded to whole rubles. Bedding and ordinary seats are not discounted. */
(() => {
  const panel = document.querySelector('.exact-selection-panel');
  const cap = panel?.querySelector('.exact-nonrefundable');
  if (!cap) return;
  const control = cap.querySelector('[role="switch"]');
  const placesLabel = cap.querySelector('[data-fare-places]');
  const savingsLabel = cap.querySelector('[data-fare-savings]');
  let enabled = false;
  let activeCar;
  let eligible = [];
  const eligibleSeat = seat => Boolean(window.SeatSelectionNonRefundable?.isEligible({ number: seat.car }, seat.number));
  const saving = seat => eligibleSeat(seat) ? Math.round(seat.price * .2) : 0;
  const discount = seat => enabled && seat.car === activeCar ? saving(seat) : 0;
  const getState = () => ({car: activeCar, enabled});
  const restoreState = state => {
    if (!state || typeof state !== 'object' || Array.isArray(state)
      || !Number.isInteger(state.car) || typeof state.enabled !== 'boolean') return;
    const cars = window.SeatSelectionPlatskart?.allCarriages || window.SeatSelectionData?.carriages || [];
    if (!cars.some(car => car.number === state.car)) return;
    activeCar = state.car;
    enabled = state.enabled;
  };
  const sync = (places, panelVisible) => {
    const car = places[0]?.car;
    eligible = places.filter(eligibleSeat);
    if (car !== activeCar || !eligible.length) enabled = false;
    activeCar = car;
    const visible = eligible.length > 0;
    cap.inert = !visible;
    cap.setAttribute('aria-hidden', String(!visible));
    // When the final seat is removed, retain the silhouette during the entire
    // panel's exit. On first entry set the cap before the outer slide starts.
    if (places.length || !panelVisible) panel.classList.toggle('has-nonrefundable', visible);
    if (visible) {
      placesLabel.textContent = `${eligible.length === 1 ? 'для места' : 'для мест'} ${eligible.map(s => s.number).sort((a,b) => a-b).join(', ')}`;
      savingsLabel.textContent = `−${new Intl.NumberFormat('ru-RU').format(eligible.reduce((sum,s) => sum + saving(s), 0))} ₽`;
    }
    control.setAttribute('aria-checked', String(enabled));
    control.dataset.checked = String(enabled);
    control.classList.toggle('switch--checked', enabled);
    control.classList.toggle('switch--checked-secondary', enabled);
  };
  const toggle = event => {
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    if (!eligible.length || cap.inert) return;
    event.preventDefault();
    enabled = !enabled;
    window.dispatchEvent(new Event('seat-fare-change'));
  };
  control.addEventListener('click', toggle);
  control.addEventListener('keydown', toggle);
  window.SeatSelectionDesktopFare = { sync, discount, getState, restoreState };
})();
