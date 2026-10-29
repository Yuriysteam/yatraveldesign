/* Mobile coupe (19932:490168) and paid platskart bedding (19932:490438).
   288 ₽ per selected seat is the same demo surcharge as on desktop. */
(() => {
  const root = document.getElementById('mobile-carriages');
  if (!root || window.SeatSelectionSapsan) return;
  const cars = window.SeatSelectionPlatskart?.allCarriages || window.SeatSelectionData.carriages;
  const price = 288;
  const surcharge = count => `+ ${new Intl.NumberFormat('ru-RU').format(price * count)} ₽`;
  const paidCars = new Set(cars.filter(car => car.type === 'platskart').map(car => car.number));
  let activeCar;
  let included = true;
  const rows = cars.filter(car => ['coupe', 'platskart', 'sv'].includes(car.type || 'coupe')).flatMap(car => {
    const card = root.querySelector(`article[data-car-number="${car.number}"]`);
    if (!card) return [];
    const row = document.createElement('div');
    const paid = paidCars.has(car.number);
    row.className = paid ? 'm-bedding m-bedding--paid' : 'm-bedding';
    row.dataset.beddingCar = String(car.number);
    row.setAttribute('aria-hidden', 'true');
    row.inert = true;
    // The included-bedding More is activated by mobile/bedding-info.js.
    row.innerHTML = paid ? `
      <span class="m-bedding__title" id="m-bedding-${car.number}-title">Постельное белье</span>
      <span class="m-bedding__price" id="m-bedding-${car.number}-price">${surcharge(1)}</span>
      <button class="switch switch--size-l switch--secondary switch--checked switch--checked-secondary"
        type="button" role="switch" aria-checked="true"
        aria-labelledby="m-bedding-${car.number}-title" aria-describedby="m-bedding-${car.number}-price">
        <span class="switch__knob"></span>
      </button>` : '<span>Белье включено в стоимость</span><button class="m-bedding__more" type="button" aria-label="Подробнее о постельном белье" aria-disabled="true"><span aria-hidden="true"></span></button>';
    const control = paid ? row.querySelector('[role="switch"]') : null;
    control?.addEventListener('click', () => {
      if (row.inert || activeCar !== car.number) return;
      included = !included;
      window.dispatchEvent(new Event('seat-bedding-change'));
    });
    card.classList.add('m-car--bedding');
    card.append(row);
    return [{card, row, control, car:car.number}];
  });
  const sync = places => {
    const selectedCar = places[0]?.car;
    if (selectedCar !== activeCar) {
      activeCar = selectedCar;
      included = true;
    }
    const selectedCount = places.filter(seat => seat.car === activeCar).length;
    for (const {card, row, control, car} of rows) {
      const visible = car === activeCar;
      row.inert = !visible;
      row.setAttribute('aria-hidden', String(!visible));
      card.classList.toggle('has-bedding', visible);
      if (control) {
        if (visible) row.querySelector('.m-bedding__price').textContent = surcharge(selectedCount);
        control.setAttribute('aria-checked', String(included));
        control.classList.toggle('switch--checked', included);
        control.classList.toggle('switch--checked-secondary', included);
      }
    }
  };
  const extraPrice = seat => included && seat.car === activeCar && paidCars.has(seat.car) ? price : 0;
  const getState = () => ({car: activeCar, included});
  const restoreState = state => {
    if (!state || typeof state !== 'object' || Array.isArray(state)
      || !Number.isInteger(state.car) || typeof state.included !== 'boolean'
      || !cars.some(car => car.number === state.car)) return;
    activeCar = state.car;
    included = state.included;
  };
  window.SeatSelectionMobileBedding = {sync, extraPrice, getState, restoreState};
})();
