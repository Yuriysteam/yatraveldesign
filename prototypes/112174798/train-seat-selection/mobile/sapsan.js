/* Sapsan visual adapter. Shared controls, selection and tokens are not duplicated. */
(() => {
  const data = window.SeatSelectionSapsan;
  if (!data) return;
  document.documentElement.dataset.train = 'sapsan';
  const money = value => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
  const renderScheme = car => '<p class="m-sapsan-direction">направление движения<span aria-hidden="true"></span></p>'
    + window.SeatSelectionCarriageScheme.render({ platform: 'Mobile', type: 'Sapsan', car });  window.SeatSelectionSapsanUI = { money, renderScheme };

  const quick = document.querySelector('.m-filters');
  quick.setAttribute('aria-label', 'Классы обслуживания');
  quick.querySelectorAll('[data-filter]').forEach(chip => chip.remove());
  quick.insertAdjacentHTML('beforeend', data.groups.map(group => {
    const cars = data.carriages.filter(car => car.group === group.key);
    const count = cars.reduce((sum,car) => sum + data.availableCount(car), 0);
    return `<button class="m-chip" type="button" data-filter="${group.key}" aria-pressed="false"><span class="m-chip__copy"><span>${group.label} · ${count}</span><small>от ${money(group.fares[0])}</small></span></button>`;
  }).join(''));
  quick.setAttribute('aria-label', 'Классы обслуживания');
  const trip = data.trip;
  document.querySelector('[data-counter="adults"] output').value = '2';
  document.querySelector('.m-trip-details__train > span').textContent = '754А Сапсан';
  document.querySelectorAll('.m-trip-timeline__time').forEach((node,i) => node.textContent = i ? trip.arrival : trip.departure);
  document.querySelector('.m-trip-timeline__duration').textContent = trip.duration;
  document.querySelectorAll('.m-trip-timeline__details > div > span:first-child').forEach(node => node.textContent = trip.date);
})();
