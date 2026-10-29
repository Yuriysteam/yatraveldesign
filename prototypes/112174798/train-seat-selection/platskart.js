/* Platskart: Figma 19549:362964 (mobile), 19549:363625 (desktop).
   Three demo carriages; existing coupe/Sapsan inventory is not modified.
   Cars 10/11: availability observed on Yandex Travel, train 016А,
   Moscow–St Petersburg, 2026-11-19 (snapshot 2026-10-15). Car 12: mock.
   Geometry stays from Figma; these are fixtures, not live inventory.
   Side-seat upper/lower is shared across platforms, as confirmed by the user. */
(() => {
  if (window.SeatSelectionSapsan) return;
  const money = value => `${value.toLocaleString('ru-RU')} ₽`;
  const demoFare = 2452;
  const carriages = [
    { number: 10, available: [1,2,3,4,6,8,9,10,14,15,16,18,20,22,24,26,28,30,32,34,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54] },
    { number: 11, available: [2,4,14,22,26,28,30,32,34,37,38,40,42,54] },
    { number: 12, available: [1,2,3,4,7,8,10,12,15,16,18,20,21,22,25,26,28,30,33,34,36,39,40,43,44,47,50,54] },
  ].map(car => {
    const available = new Set(car.available);
    const place = number => available.has(number) ? number : null;
    const lower = car.available.filter(number => number % 2).length;
    return {
      ...car, type: 'platskart', node: '19549:362964', serviceClass: '3Б',
      // A single fare per carriage maps to green independently of other cars.
      // All three fixtures deliberately share the same fare for this prototype.
      price: demoFare, color: 'green',
      availability: `${lower} ниж, ${car.available.length - lower} верх`,
      coupes: Array.from({ length: 9 }, (_, i) => [4 * i + 2, 4 * i + 1, 4 * i + 4, 4 * i + 3].map(place)),
      sides: Array.from({ length: 9 }, (_, i) => [53 - 2 * i, 54 - 2 * i].map(place)),
      legend: [{ color: 'green', price: money(demoFare) }],
      // Train-wide restaurant/bedding mechanics are intentionally deferred.
      amenities: [
        ['./mobile/assets/car1-icons24-air-conditioner-new.svg', 'Кондиционер'],
        ['./mobile/assets/car1-icons24-bio-toilet-new.svg', 'Биотуалет'],
        ['./mobile/assets/car5-icons24-animal-new.svg', 'Можно с животными'],
      ],
    };
  });
  const groupDefinitions = window.SeatSelectionDoubleDeck?.groups || [{ key: 'platskart', label: 'Плацкарт' }, { key: 'coupe', label: 'Купе' }, { key: 'sv', label: 'СВ' }];
  // Train numbers are not category-local indices. Keep each original fixture
  // identity separate so renumbering cannot change its assets or amenities.
  const coupeNumbers = { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 };
  const allCarriages = window.SeatSelectionDoubleDeck?.carriages || [...carriages, ...window.SeatSelectionData.carriages.map(car => ({
    ...car, fixtureNumber: car.number, number: coupeNumbers[car.number] ?? car.number,
  })),
    // Mock inventory for the available-car / missing-map state, not a live offer.
    { number: 1, type: 'sv', serviceClass: '1Э', hasScheme: false, availableCount: 10,
      price: 18555, prices: [18555], coupes: [], legend: [] },
  ].filter(car => (car.availableCount ?? [...car.coupes.flat(), ...(car.sides?.flat() || [])].filter(number => number !== null).length) > 0)
    // Separate demo screen, not a change to the ordinary train inventory.
    .filter(car => !window.SeatSelectionArrival || (!car.type && car.fixtureNumber <= 3));
  const groups = groupDefinitions.filter(group => allCarriages.some(car => (car.type || 'coupe') === group.key));
  document.querySelectorAll('[data-filter]').forEach(chip => {
    if (!groups.some(group => group.key === chip.dataset.filter)) chip.remove();
  });
  if (window.SeatSelectionArrival) {
    const count = allCarriages.reduce((sum, car) => sum + car.coupes.flat().filter(n => n !== null).length, 0);
    document.querySelectorAll('[data-filter="coupe"] span > span').forEach(label => label.textContent = `Купе · ${count}`);
  }
  const renderScheme = (car, platform) => window.SeatSelectionCarriageScheme.render({ platform, type: 'Platskart', car });  const renderGroups = (render, informer, platform) => {
    const prefix = platform === 'Mobile' ? 'm' : 'exact';
    return groups.map(group => `<section class="${prefix}-car-group" data-car-group="${group.key}" aria-labelledby="${prefix}-group-${group.key}"><h2 class="${prefix}-car-category" id="${prefix}-group-${group.key}">${group.label}</h2><div class="${prefix}-car-group__cards">${allCarriages.filter(car => (car.type || 'coupe') === group.key).map((car, i) => render(car) + (group.key === 'coupe' && i === 0 ? informer : '')).join('')}</div></section>`).join('');
  };
  // Only type chips are connected here. Amenity filtering is a separate task.
  const applyTypes = (root, keys) => {
    const active = keys.filter(key => groups.some(group => group.key === key));
    root.querySelectorAll('[data-car-group]').forEach(group => {
      group.hidden = active.length > 0 && !active.includes(group.dataset.carGroup);
    });
    const empty = root.querySelector('[data-car-groups-empty]');
    if (empty) empty.hidden = Boolean(root.querySelector('[data-car-group]:not([hidden])'));
  };
  document.querySelectorAll('[data-filter="platskart"]').forEach(chip => {
    chip.querySelector('span > span').textContent = `Плацкарт · ${carriages.reduce((sum, car) => sum + car.available.length, 0)}`;
    chip.querySelector('small').textContent = `от ${money(Math.min(...carriages.map(car => car.price)))}`;
  });
  window.SeatSelectionPlatskart = { carriages, allCarriages, renderScheme, renderGroups, applyTypes };
})();
