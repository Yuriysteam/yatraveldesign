/* Two-floor layout study: Figma 20183:284749 / 20183:284879.
   Route and fare anchors: 030У, 18 Nov 2026, observed 22 Oct 2026.
   Three-car inventory and counts are mocks. Floor blocks are deliberate
   placeholders, not real seating maps; there are no invented seat numbers. */
(() => {
  if (new URLSearchParams(location.search).get('screen') !== 'double-deck') return;
  const money = value => `${value.toLocaleString('ru-RU')} ₽`;
  const cars = [
    {number: 15, type: 'sitting', serviceClass: '2Р', availableCount: 38, prices: [2495, 2760],
      amenityIds: ['bio-toilet', 'air-conditioning', 'socket-220v', 'restaurant', 'wifi']},
    {number: 1, type: 'coupe', serviceClass: '2Ф', availableCount: 24, lowerCount: 10, upperCount: 14, prices: [5007, 6000],
      amenityIds: ['bio-toilet', 'air-conditioning', 'bedding', 'socket-220v', 'restaurant', 'pets']},
    {number: 2, type: 'coupe', serviceClass: '2Х', availableCount: 19, lowerCount: 7, upperCount: 12, prices: [5007, 6000],
      amenityIds: ['bio-toilet', 'air-conditioning', 'bedding', 'socket-220v', 'restaurant']},
  ].map(car => ({...car, doubleDeck: true, hasScheme: true, coupes: [], price: car.prices[0],
    availability: car.type === 'coupe' ? `${car.lowerCount} ниж, ${car.upperCount} верх` : '',
    legend: car.prices.map((price, i) => ({color: i ? 'purple' : 'green', price: money(price)})),
  }));
  const groups = [{key: 'sitting', label: 'Сидячий'}, {key: 'coupe', label: 'Купе'}];
  const renderScheme = (car, platform) => `<div class="double-deck-viewport"${platform === 'Mobile' ? ` tabindex="0" role="region" aria-label="Оба этажа ${car.number} вагона, прокручиваются вместе по горизонтали"` : ''}>
    <div class="double-deck-floors">${[1, 2].map(floor => `<div class="double-deck-floor" data-floor="${floor}"><span>Этаж ${floor}</span></div>`).join('')}</div>
  </div>`;
  window.SeatSelectionDoubleDeck = {
    carriages: cars, groups, filterTypes: groups.map(group => group.key), renderScheme,
    trip: {date: '18 ноября, ср', shortDate: '18 ноября', departure: '00:01', arrival: '09:32', duration: '9 ч 31 м'},
  };
  document.documentElement.dataset.screen = 'double-deck';
  const mobile = Boolean(document.querySelector('.m-page'));
  const prefix = mobile ? 'm' : 'exact';
  const set = (selector, value) => document.querySelectorAll(selector).forEach(node => node.textContent = value);
  set(`.${prefix}-trip__route`, 'Москва — Санкт-Петербург');
  if (!mobile) set('.exact-trip__date', '18 ноября, ср в 00:01 по местному');
  set(`.${prefix}-trip-details__train > span:first-child`, '030У Двухэтажный состав');
  document.querySelectorAll(`.${prefix}-trip-timeline__time`).forEach((node, i) => node.textContent = i ? '09:32' : '00:01');
  set(`.${prefix}-trip-timeline__duration`, '9 ч 31 м');
  document.querySelectorAll(`.${prefix}-trip-timeline__details > div`).forEach((node, i) => {
    node.children[0].textContent = '18 ноября, ср';
    node.children[1].textContent = i ? 'Московский вкз' : 'Восточный вкз';
  });
  // Reuse the established type-chip components and their event handlers.
  document.querySelectorAll('[data-filter="platskart"]').forEach(chip => chip.dataset.filter = 'sitting');
  document.querySelectorAll('[data-filter]').forEach(chip => {
    const group = groups.find(group => group.key === chip.dataset.filter);
    if (!group) return;
    const inventory = cars.filter(car => car.type === group.key);
    chip.querySelector('span > span').textContent = `${group.label} · ${inventory.reduce((sum, car) => sum + car.availableCount, 0)}`;
    chip.querySelector('small').textContent = `от ${money(Math.min(...inventory.map(car => car.price)))}`;
    chip.querySelector('.train-discount-badge')?.remove();
  });
})();
