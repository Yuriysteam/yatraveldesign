/* Mobile coupe opt-in, Figma 19932:490299. Same eligibility and 20% demo
   discount as desktop, with an independent mobile presentation and state. */
(() => {
  const root = document.getElementById('mobile-carriages');
  const offer = window.SeatSelectionNonRefundable;
  if (!root || !offer || window.SeatSelectionSapsan) return;
  const cars = window.SeatSelectionPlatskart?.allCarriages || window.SeatSelectionData.carriages;
  const rows = cars.filter(car => offer.hasOffer(car)).flatMap(car => {
    const card = root.querySelector(`article[data-car-number="${car.number}"]`);
    if (!card) return [];
    const tile = document.createElement('div');
    tile.className = 'm-nonrefundable';
    tile.setAttribute('aria-hidden', 'true');
    tile.inert = true;
    const id = `m-fare-${car.number}`;
    // Reuse the project's Switch L subtree/states. The Figma Code Connect
    // implementation is Android Kotlin, not executable in this HTML prototype.
    tile.innerHTML = `<span class="m-nonrefundable__heading"><span class="m-nonrefundable__title" id="${id}-title">Невозвратный тариф</span><button type="button" class="m-nonrefundable__more" aria-label="Подробнее о невозвратном тарифе" aria-disabled="true"><span aria-hidden="true"></span></button></span>
      <span class="m-nonrefundable__saving" id="${id}-saving" data-fare-savings></span>
      <button type="button" class="switch switch--size-l switch--secondary" role="switch" aria-checked="false" aria-labelledby="${id}-title" aria-describedby="${id}-places ${id}-saving"><span class="switch__knob"></span></button>
      <span class="m-nonrefundable__places" id="${id}-places" data-fare-places></span>`;
    const control = tile.querySelector('[role="switch"]');
    control.addEventListener('click', () => {
      if (tile.inert || !eligible.length || activeCar !== car.number) return;
      enabled = !enabled;
      window.dispatchEvent(new Event('seat-fare-change'));
    });
    card.append(tile);
    return [{car:car.number, card, tile, control,
      placesLabel:tile.querySelector('[data-fare-places]'),
      savingsLabel:tile.querySelector('[data-fare-savings]')}];
  });
  let activeCar;
  let eligible = [];
  let enabled = false;
  const eligibleSeat = seat => offer.isEligible({number:seat.car}, seat.number);
  const saving = seat => eligibleSeat(seat) ? Math.round(seat.price * .2) : 0;
  const money = value => new Intl.NumberFormat('ru-RU').format(value);
  const discount = seat => enabled && seat.car === activeCar ? saving(seat) : 0;
  const getState = () => ({car: activeCar, enabled});
  const restoreState = state => {
    if (!state || typeof state !== 'object' || Array.isArray(state)
      || !Number.isInteger(state.car) || typeof state.enabled !== 'boolean'
      || !cars.some(car => car.number === state.car)) return;
    activeCar = state.car;
    enabled = state.enabled;
  };
  const sync = places => {
    const car = places[0]?.car;
    eligible = places.filter(eligibleSeat);
    if (car !== activeCar || !eligible.length) enabled = false;
    activeCar = car;
    for (const row of rows) {
      const visible = row.car === activeCar && eligible.length > 0;
      row.tile.inert = !visible;
      row.tile.setAttribute('aria-hidden', String(!visible));
      // Do not remove/rebuild the row: each transition can reverse immediately.
      // Bedding has its own visibility, so adding the fare never replays it.
      row.card.classList.toggle('has-mobile-fare', visible);
      if (visible) {
        row.placesLabel.textContent = `${eligible.length === 1 ? 'для места' : 'для мест'} ${eligible.map(seat => seat.number).sort((a,b) => a-b).join(', ')}`;
        row.savingsLabel.textContent = `−${money(eligible.reduce((sum,seat) => sum + saving(seat), 0))} ₽`;
      }
      const checked = visible && enabled;
      row.control.setAttribute('aria-checked', String(checked));
      row.control.classList.toggle('switch--checked', checked);
      row.control.classList.toggle('switch--checked-secondary', checked);
    }
  };
  window.SeatSelectionMobileFare = {sync, discount, getState, restoreState};
})();
