/* Desktop Sapsan adapter. Geometry: ReDesign 18397:58198.
   Reuses the mobile inventory, shared Seat, selection panel and main-page controls. */
(() => {
  const data = window.SeatSelectionSapsan;
  if (!data) return;
  document.documentElement.dataset.train = 'sapsan';
  document.title = 'Выбор мест · Сапсан · Десктоп';
  const money = value => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
  const renderScheme = car => window.SeatSelectionCarriageScheme.render({ platform: 'Desktop', type: 'Sapsan', car });  const placeWord = n => n % 100 >= 11 && n % 100 <= 14 ? 'мест' : n % 10 === 1 ? 'место' : n % 10 >= 2 && n % 10 <= 4 ? 'места' : 'мест';
  const renderCard = (car, amenityPreview) => window.SeatSelectionCarriageCard.render({
    platform: 'Desktop', car, sapsan: true,
    availability: `${data.availableCount(car)} ${placeWord(data.availableCount(car))}`,
    amenities: amenityPreview,
    scheme: car.hasScheme === false ? '' : renderScheme(car),
    legend: car.legend.map(item => `<span class="exact-legend__price"><span class="scheme-legend-dot" data-color="${item.color}" aria-hidden="true"></span><span>${money(item.price)}</span></span>`).join(''),
  });
  const renderGroups = (card, informer) => data.groups.map((group,index) => `<section class="d-sapsan-group" data-group="${group.key}" aria-labelledby="sapsan-${group.key}"><h2 class="exact-car-category" id="sapsan-${group.key}">${group.label}</h2><div class="d-sapsan-group__cars">${data.carriages.filter(car => car.group === group.key).map((car,carIndex) => card(car) + (index === 0 && carIndex === 0 ? informer : '')).join('')}</div></section>`).join('');
  const bindFilters = root => {
    // Hide, never rebuild, so selection and event handlers survive filtering.
    document.querySelector('.exact-filters').addEventListener('click', event => {
      const button = event.target.closest('[data-sapsan-group]');
      if (!button) return;
      button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
      const selected = Array.from(document.querySelectorAll('[data-sapsan-group][aria-pressed="true"]'), chip => chip.dataset.sapsanGroup);
      window.SeatSelectionCarFilterMotion.change(root, () => {
        root.querySelectorAll('[data-group]').forEach(group => group.hidden = selected.length > 0 && !selected.includes(group.dataset.group));
      });
    });
  };
  window.SeatSelectionSapsanDesktop = { renderScheme, renderCard, renderGroups, bindFilters, money };

  const filters = document.querySelector('.exact-filters');
  filters.setAttribute('aria-label', 'Классы обслуживания');
  filters.innerHTML = data.groups.map(group => {
    const count = data.carriages.filter(car => car.group === group.key).reduce((sum,car) => sum + data.availableCount(car),0);
    return `<button class="exact-chip" type="button" data-sapsan-group="${group.key}" aria-pressed="false"><span class="exact-chip__copy"><span>${group.label} · ${count}</span><small>от ${money(group.fares[0])}</small></span></button>`;
  }).join('');
  document.querySelector('#coupe-category-title').hidden = true;
  document.querySelector('.exact-carriages').removeAttribute('aria-labelledby');
  const trip = data.trip;
  document.querySelector('.exact-trip__date').textContent = `${trip.date} в ${trip.departure} по местному`;
  document.querySelector('[data-trip-train]').textContent = '754А Сапсан';
  document.querySelectorAll('.exact-trip-timeline__time').forEach((node,i) => node.textContent = i ? trip.arrival : trip.departure);
  document.querySelector('.exact-trip-timeline__duration').textContent = trip.duration;
  document.querySelectorAll('.exact-trip-timeline__details > div > span:first-child').forEach(node => node.textContent = trip.date);
  document.querySelector('[data-counter="adults"] output').value = '2';
})();
