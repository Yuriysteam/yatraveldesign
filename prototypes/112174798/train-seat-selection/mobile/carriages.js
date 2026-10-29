/* Layout: ReDesign 19081:115567. Existing carriage/seat data stays independent. */
(() => {
  const target = document.getElementById('mobile-carriages');
  if (!target) return;

  const sapsan = window.SeatSelectionSapsan;
  const sapsanUI = window.SeatSelectionSapsanUI;
  const platskart = window.SeatSelectionPlatskart;
  const nonRefundable = window.SeatSelectionNonRefundable;
  const { legend } = sapsan || window.SeatSelectionData;
  const carriages = sapsan?.carriages || platskart?.allCarriages || window.SeatSelectionData.carriages;
  const amenities = window.SeatSelectionAmenities.forCar;
  // Base 2.0 IconContainer, L · 20: the slot controls the rendered size of
  // Travel.Styles 24px glyphs. Keep the catalogue and full amenities sheet intact.
  const previewIcons = {
    'bio-toilet': 'bio-toilet-wc-new', 'air-conditioning': 'air-conditioner-new',
    bedding: 'bedding-new', 'socket-220v': 'socket-new', 'socket-usb': 'usb-socket-new',
    wifi: 'wifi-new', restaurant: 'dining-car-new', pets: 'animal-new',
  };
  const amenity = item => {
    const icon = previewIcons[item.id] ? `./BaseAI/icons/24/${previewIcons[item.id]}.svg` : item.icon;
    return `<span class="icon-slot m-car__amenity" data-component="IconContainer" data-component-key="565f42a03d6e6865fc1e566e8fea27b1a520696c" data-size="L · 20" role="img" aria-label="${item.name}"><span class="m-car__amenity-glyph" style="--amenity-icon:url('${new URL(icon, document.baseURI).href}')"><img src="${icon}" width="24" height="24" alt="" draggable="false"></span></span>`;
  };
  const amenityPreview = car => {
    const items = amenities(car);
    const visibleCount = items.length > 5 ? 4 : items.length;
    const hiddenCount = items.length - visibleCount;
    return items.slice(0, visibleCount).map(amenity).join('')
      + (hiddenCount ? `<span class="m-car__amenity-count" aria-label="Ещё удобств: ${hiddenCount}">+${hiddenCount}</span>` : '');
  };
  const availablePlaces = car => {
    const count = car.availableCount ?? (sapsan ? sapsan.availableCount(car) : [...car.coupes.flat(), ...(car.sides?.flat() || [])].filter(number => number !== null).length);
    const word = count % 100 >= 11 && count % 100 <= 14 ? 'мест'
      : count % 10 === 1 ? 'место' : count % 10 >= 2 && count % 10 <= 4 ? 'места' : 'мест';
    return sapsan || car.hasScheme === false || car.type === 'sitting' ? `${count} ${word}` : `${count} ${word} · ${car.availability}`;
  };

  const render = car => window.SeatSelectionCarriageCard.render({
    platform: 'Mobile', car, sapsan: Boolean(sapsan),
    availability: availablePlaces(car), amenities: amenityPreview(car),
    scheme: car.hasScheme === false ? '' : car.doubleDeck ? window.SeatSelectionDoubleDeck.renderScheme(car, 'Mobile') : sapsan ? sapsanUI.renderScheme(car) : car.type === 'platskart' ? platskart.renderScheme(car, 'Mobile') : window.SeatSelectionCarriageScheme.render({ platform: 'Mobile', type: 'Coupe', car }),
    legend: (car.legend || legend).map((item, index) => `<span class="m-car__price"><span class="scheme-legend-dot" data-color="${item.color || (index === 0 ? 'green' : 'purple')}" aria-hidden="true"></span><span>${sapsan ? sapsanUI.money(item.price) : item.price}</span></span>`).join('') + (nonRefundable?.renderLegend(car) || ''),
  });

  const informer = `<aside class="m-booking-informer" data-node-id="18300:288924" aria-label="Бронирование с оплатой потом">
    <div class="m-booking-informer__image"><img src="./mobile/assets/informer-calendar.png" alt=""></div>
    <div class="m-booking-informer__copy">
      <div class="m-booking-informer__title"><strong>Забронируйте билеты</strong><button type="button" aria-label="Подробнее об оплате потом" aria-disabled="true"><img src="./mobile/assets/more.svg" alt=""></button></div>
      <p>Билеты сейчас — оплата потом</p>
    </div>
  </aside>`;
  target.innerHTML = sapsan
    ? sapsan.groups.map(group => `<section class="m-sapsan-group" data-car-group="${group.key}" aria-labelledby="group-${group.key}"><h2 class="m-car-category" id="group-${group.key}">${group.label}</h2>${carriages.filter(car => car.group === group.key).map(render).join('')}</section>`).join('')
      + informer + '<section class="m-sapsan-empty" hidden role="status"><h3>Нет подходящих вагонов</h3><p>Попробуйте изменить фильтры</p><button type="button" data-reset-filters>Сбросить фильтры</button></section>'
    : platskart ? platskart.renderGroups(render, informer, 'Mobile') + '<p class="car-groups-empty" data-car-groups-empty hidden role="status">Нет подходящих вагонов</p>'
    : '<h2 class="m-car-category">Купе</h2>' + carriages.map((car, index) => render(car) + (index === 0 ? informer : '')).join('');
  if (platskart) window.addEventListener('seat-filters-change', event =>
    window.SeatSelectionCarFilterMotion.change(target, () => platskart.applyTypes(target, event.detail)));
  if (sapsan) window.addEventListener('seat-filters-change', event => {
    const applied = new Set(event.detail);
    const classes = sapsan.filterTypes.filter(key => applied.has(key));
    window.SeatSelectionCarFilterMotion.change(target, () => {
      carriages.forEach(car => {
        target.querySelector(`[data-car-number="${car.number}"]`).hidden = classes.length > 0 && !classes.includes(car.group);
      });
      target.querySelectorAll('[data-car-group]').forEach(group => group.hidden = !group.querySelector('.m-car:not([hidden])'));
      target.querySelector('.m-sapsan-empty').hidden = Boolean(target.querySelector('.m-car:not([hidden])'));
    });
  });

  // The same catalogue entries feed both the card preview and the full list.
  const sheet = document.createElement('dialog');
  sheet.id = 'm-car-amenities';
  sheet.className = 'm-price-details m-amenities-sheet';
  sheet.setAttribute('data-node-id', '19377:301766');
  sheet.setAttribute('aria-labelledby', 'm-car-amenities-title');
  sheet.setAttribute('aria-describedby', 'm-car-amenities-subtitle');
  sheet.innerHTML = `<header class="m-amenities-sheet__header">
    <div class="m-amenities-sheet__titles"><h2 id="m-car-amenities-title">Удобства</h2>
    <p id="m-car-amenities-subtitle"><span data-car-number></span><span class="m-amenities-sheet__meta"> · класс 2Т, перевозчик ФПК</span></p></div>
    <button class="m-amenities-sheet__close" type="button" aria-label="Закрыть удобства"><img src="./mobile/assets/amenities-close.svg" alt=""></button>
  </header><ul class="m-amenities-sheet__list"></ul>
  <p class="m-amenities-sheet__description"></p>
  <div class="m-amenities-sheet__homebar" aria-hidden="true"><img src="./mobile/assets/amenities-homebar.svg" alt=""></div>`;
  document.body.append(sheet);
  target.addEventListener('click', event => {
    const button = event.target.closest('[data-amenities-car]');
    if (!button) return;
    const car = carriages.find(item => item.number === Number(button.dataset.amenitiesCar));
    const items = amenities(car);
    sheet.querySelector('[data-car-number]').textContent = `Вагон ${car.number}`;
    sheet.querySelector('.m-amenities-sheet__meta').textContent = sapsan
      ? ` · ${car.label}, класс ${car.serviceClass}, перевозчик ДОСС`
      : ` · класс ${car.serviceClass || '2Т'}, перевозчик ФПК`;
    sheet.querySelector('ul').replaceChildren(...items.map(entry => {
      const item = document.createElement('li');
      const iconSlot = document.createElement('span');
      iconSlot.className = 'm-amenities-sheet__icon';
      iconSlot.setAttribute('aria-hidden', 'true');
      const icon = document.createElement('img');
      icon.alt = '';
      // The sheet uses native 24px DS assets, not the smaller card/filter icons.
      icon.src = entry.icon;
      icon.width = 24;
      icon.height = 24;
      iconSlot.append(icon);
      item.append(iconSlot, window.SeatSelectionAmenities.copy(entry));
      return item;
    }));
    sheet.querySelector('.m-amenities-sheet__description').textContent = sapsan
      ? `Сидячие места. ${car.pets ? 'Зоны для пассажиров с животными отмечены на схеме.' : 'Без зоны для пассажиров с животными.'}`
      : car.type === 'sitting' ? 'Сидячий двухэтажный вагон. Кондиционер, биотуалет и розетки в вагоне.'
      : car.type === 'sv' ? 'СВ' : car.type === 'platskart'
        ? 'Вагон открытого типа (плацкартный). Кондиционер и биотуалет в вагоне.'
          + (items.some(item => item.id === 'pets') ? ' Вагон с услугой перевозки животных' : '')
      : 'Вагон повышенной комфортности. 4-местные купе. Кондиционер, биотуалет в вагоне.'
      + (items.some(item => item.id === 'pets') ? '' : ' Провоз животных запрещен');
    window.SeatSelectionSheetMotion.open(sheet);
    button.setAttribute('aria-expanded', 'true');
    sheet.scrollTop = 0;
  });
  sheet.addEventListener('close', () => {
    target.querySelectorAll('[data-amenities-car]').forEach(button => button.setAttribute('aria-expanded', 'false'));
  });
  sheet.querySelector('button').addEventListener('click', () => window.SeatSelectionSheetMotion.close(sheet));
  sheet.addEventListener('click', event => {
    const rect = sheet.getBoundingClientRect();
    if (event.target === sheet && (event.clientY < rect.top || event.clientY > rect.bottom || event.clientX < rect.left || event.clientX > rect.right)) window.SeatSelectionSheetMotion.close(sheet);
  });
})();
