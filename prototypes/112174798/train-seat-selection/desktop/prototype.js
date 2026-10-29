/* Layout prototype of Figma node 19345:243977 with shared seat selection. */
(() => {
  // Arrow-only accordion from Desktop-seat-drafts/train-info.js.
  const tripToggle = document.querySelector('.exact-trip__toggle');
  const tripDetails = document.getElementById('trip-details');
  tripToggle.addEventListener('click', () => {
    const expanded = tripToggle.getAttribute('aria-expanded') !== 'true';
    tripToggle.setAttribute('aria-expanded', String(expanded));
    tripToggle.setAttribute('aria-label', expanded ? 'Свернуть маршрут' : 'Развернуть маршрут');
    tripDetails.setAttribute('aria-hidden', String(!expanded));
    tripDetails.inert = !expanded;
    tripDetails.classList.toggle('is-open', expanded);
  });
  const asset = (name, className = '') => `<img${className ? ` class="${className}"` : ''} src="./desktop/assets/${name}" alt="">`;
  const sapsan = window.SeatSelectionSapsan;
  const sapsanUI = window.SeatSelectionSapsanDesktop;
  const platskart = window.SeatSelectionPlatskart;
  const nonRefundable = window.SeatSelectionNonRefundable;
  const { legend } = sapsan || window.SeatSelectionData;
  const carriages = sapsan?.carriages || platskart?.allCarriages || window.SeatSelectionData.carriages;
  const amenities = window.SeatSelectionAmenities.forCar;
  const amenity = item => `<span class="exact-car__amenity exact-car__amenity--extra" role="img" aria-label="${item.name}" title="${item.name}"><img src="${item.icon}" alt="" width="20" height="20"></span>`;
  const amenityPreview = car => {
    const items = amenities(car);
    const visibleCount = items.length > 8 ? 7 : items.length;
    const hiddenCount = items.length - visibleCount;
    return items.slice(0, visibleCount).map(amenity).join('')
      + (hiddenCount ? `<span class="exact-car__amenity-count" aria-label="Ещё удобств: ${hiddenCount}">+${hiddenCount}</span>` : '');
  };
  const berthWord = (count, singular, plural) => count % 10 === 1 && count % 100 !== 11 ? singular : plural;
  const card = car => {
    if (sapsanUI) return sapsanUI.renderCard(car, amenityPreview(car));
    const lower = car.lowerCount ?? [...car.coupes.flatMap(coupe => [coupe[1], coupe[3]]), ...(car.sides?.map(side => side[0]) || [])].filter(number => number !== null).length;
    const upper = car.upperCount ?? [...car.coupes.flatMap(coupe => [coupe[0], coupe[2]]), ...(car.sides?.map(side => side[1]) || [])].filter(number => number !== null).length;
    const total = car.availableCount ?? lower + upper;
    const placeWord = total % 100 >= 11 && total % 100 <= 14 ? 'мест' : total % 10 === 1 ? 'место' : total % 10 >= 2 && total % 10 <= 4 ? 'места' : 'мест';
    return window.SeatSelectionCarriageCard.render({
      platform: 'Desktop', car,
      availability: `${total} ${placeWord}${car.hasScheme === false || car.type === 'sitting' ? '' : ` · ${lower} ${berthWord(lower, 'нижнее', 'нижних')}, ${upper} ${berthWord(upper, 'верхнее', 'верхних')}`}`,
      amenities: amenityPreview(car),
      scheme: car.hasScheme === false ? '' : car.doubleDeck ? window.SeatSelectionDoubleDeck.renderScheme(car, 'Desktop') : car.type === 'platskart' ? platskart.renderScheme(car, 'Desktop') : window.SeatSelectionCarriageScheme.render({ platform: 'Desktop', type: 'Coupe', car }),
      legend: (car.legend || legend).map((item, index) => `<span class="exact-legend__price"><span class="scheme-legend-dot" data-color="${item.color || (index === 0 ? 'green' : 'purple')}" aria-hidden="true"></span><span>${item.price}</span></span>`).join('') + (nonRefundable?.renderLegend(car) || ''),
      bedding: window.SeatSelectionDesktopBedding?.render(car) || '',
    });
  };
  const informer = `<aside class="exact-informer" data-node-id="19345:244887"><div class="exact-informer__image"><img src="./mobile/assets/informer-calendar.png" alt=""></div><div class="exact-informer__copy"><strong>Забронируйте билеты</strong><span class="exact-informer__dot">·</span><div class="exact-informer__details"><span>Билеты сейчас — оплата потом</span><button class="exact-more" type="button" aria-label="Подробнее об оплате потом" aria-disabled="true">${asset('more.svg')}</button></div></div></aside>`;
  const carriageRoot = document.querySelector('.exact-carriages');
  carriageRoot.innerHTML = sapsanUI ? sapsanUI.renderGroups(card, informer)
    : platskart ? platskart.renderGroups(card, informer, 'Desktop') + '<p class="car-groups-empty" data-car-groups-empty hidden role="status">Нет подходящих вагонов</p>'
    : carriages.map((car, index) => card(car) + (index === 0 ? informer : '')).join('');
  if (platskart) {
    document.getElementById('coupe-category-title').hidden = true;
    carriageRoot.removeAttribute('aria-labelledby');
  }
  sapsanUI?.bindFilters(carriageRoot);

  // Figma 19377:307704: non-modal anchored popover, not a price-details modal.
  const amenitiesDialog = document.createElement('div');
  amenitiesDialog.id = 'exact-car-amenities';
  amenitiesDialog.className = 'exact-amenities-popover';
  amenitiesDialog.setAttribute('popover', 'auto');
  amenitiesDialog.setAttribute('role', 'dialog');
  amenitiesDialog.setAttribute('data-node-id', '19377:307704');
  amenitiesDialog.setAttribute('aria-labelledby', 'exact-car-amenities-title');
  amenitiesDialog.innerHTML = `<span class="exact-amenities-popover__tail" aria-hidden="true"></span><div class="exact-amenities-popover__body"><header><h2 id="exact-car-amenities-title">Удобства</h2><p class="exact-amenities-popover__meta">Класс 2Т, перевозчик ФПК</p></header><button class="exact-amenities-popover__close" type="button" aria-label="Закрыть удобства"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect width="24" height="24" rx="8" fill="#F2F2F2"/><path d="M16.9498 8.46443L15.5355 7.05022L12 10.5858L8.46445 7.05029L7.05024 8.4645L10.5858 12L7.05027 15.5355L8.46448 16.9497L12 13.4142L15.5355 16.9498L16.9497 15.5356L13.4142 12L16.9498 8.46443Z" fill="currentColor"/></svg></button><ul></ul><p class="exact-amenities-popover__description"></p></div>`;
  document.body.append(amenitiesDialog);
  let amenityTrigger = null;
  const positionAmenities = () => {
    if (!amenityTrigger || !amenitiesDialog.matches(':popover-open')) return;
    const rect = amenityTrigger.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) {
      amenitiesDialog.hidePopover();
      return;
    }
    const margin = 12;
    const width = amenitiesDialog.offsetWidth;
    const height = amenitiesDialog.offsetHeight;
    const left = Math.max(margin, Math.min(rect.right + 28 - width, window.innerWidth - width - margin));
    const below = window.innerHeight - rect.bottom - margin;
    const above = rect.top - margin;
    const placeAbove = below < height && above > below;
    amenitiesDialog.setAttribute('data-placement', placeAbove ? 'above' : 'below');
    amenitiesDialog.style.left = `${left}px`;
    amenitiesDialog.style.top = `${Math.max(margin, Math.min(placeAbove ? rect.top - height - 4 : rect.bottom + 4, window.innerHeight - height - margin))}px`;
    amenitiesDialog.style.setProperty('--amenities-tail-left', `${Math.max(24, Math.min(rect.right - 10 - left - 12, width - 48))}px`);
  };
  document.querySelector('.exact-carriages').addEventListener('click', event => {
    const trigger = event.target.closest('[data-amenities-car]');
    if (!trigger) return;
    event.preventDefault(); // Content/position are set here; suppress the native toggle.
    if (amenityTrigger === trigger && amenitiesDialog.matches(':popover-open')) {
      amenitiesDialog.hidePopover();
      return;
    }
    if (amenityTrigger) amenityTrigger.setAttribute('aria-expanded', 'false');
    amenityTrigger = trigger;
    const car = carriages.find(item => item.number === Number(trigger.dataset.amenitiesCar));
    const items = amenities(car);
    amenitiesDialog.querySelector('ul').replaceChildren(...items.map(entry => {
      const item = document.createElement('li');
      const icon = document.createElement('span');
      icon.className = 'exact-amenities-popover__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.style.setProperty('--amenity-icon', `url("${new URL(entry.icon, document.baseURI).href}")`);
      item.append(icon, window.SeatSelectionAmenities.copy(entry));
      return item;
    }));
    amenitiesDialog.querySelector('.exact-amenities-popover__meta').textContent = sapsan
      ? `Класс ${car.serviceClass}, перевозчик ДОСС` : `Класс ${car.serviceClass || '2Т'}, перевозчик ФПК`;
    amenitiesDialog.querySelector('.exact-amenities-popover__description').textContent = sapsan
      ? `Сидячий вагон, ${car.label.toLowerCase()}. Кондиционер, биотуалет и розетки в вагоне`
      : car.type === 'sitting' ? 'Сидячий двухэтажный вагон. Кондиционер, биотуалет и розетки в вагоне.'
      : car.type === 'sv' ? 'СВ' : car.type === 'platskart'
        ? 'Вагон открытого типа (плацкартный). Кондиционер и биотуалет в вагоне.'
          + (items.some(item => item.id === 'pets') ? ' Вагон с услугой перевозки животных' : '')
      : 'Вагон повышенной комфортности. 4-местные купе. Кондиционер, биотуалет в вагоне.'
        + (items.some(item => item.id === 'pets') ? '' : ' Провоз животных запрещен');
    amenitiesDialog.showPopover({ source: trigger });
    trigger.setAttribute('aria-expanded', 'true');
    positionAmenities();
    amenitiesDialog.querySelector('button').focus({ preventScroll: true });
  });
  amenitiesDialog.querySelector('button').addEventListener('click', () => {
    amenitiesDialog.hidePopover();
    amenityTrigger?.focus({ preventScroll: true });
  });
  amenitiesDialog.addEventListener('toggle', () => {
    if (amenityTrigger) amenityTrigger.setAttribute('aria-expanded', String(amenitiesDialog.matches(':popover-open')));
  });
  window.addEventListener('scroll', positionAmenities, true);
  window.addEventListener('resize', positionAmenities);
  document.querySelectorAll('[data-amenities-car]').forEach(trigger => {
    // Native invoker association keeps light-dismiss from reopening on a second click.
    trigger.setAttribute('popovertarget', amenitiesDialog.id);
  });

  const tooltip = document.createElement('div');
  tooltip.id = 'exact-seat-tooltip';
  tooltip.className = 'exact-seat-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  tooltip.innerHTML = `<div class="exact-seat-tooltip__bubble"><span class="exact-seat-tooltip__text"></span></div><img class="exact-seat-tooltip__arrow" src="./desktop/assets/seat-tooltip-bottom.svg" alt="">`;
  document.body.append(tooltip);
  const tooltipText = tooltip.querySelector('.exact-seat-tooltip__text');
  const tooltipArrow = tooltip.querySelector('.exact-seat-tooltip__arrow');
  let hoveredSeat = null;
  const positionTooltip = () => {
    if (!hoveredSeat) return;
    const seatRect = hoveredSeat.getBoundingClientRect();
    if (seatRect.bottom <= 0 || seatRect.top >= window.innerHeight) {
      tooltip.hidden = true;
      return;
    }
    const margin = 8;
    const gap = 4;
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    const above = seatRect.top - gap - margin;
    const below = window.innerHeight - seatRect.bottom - gap - margin;
    const placeBelow = above < tooltipHeight && below > above;
    tooltip.dataset.placement = placeBelow ? 'below' : 'above';
    tooltipArrow.src = `./desktop/assets/seat-tooltip-${placeBelow ? 'top' : 'bottom'}.svg`;
    const seatCenter = seatRect.left + seatRect.width / 2;
    const left = Math.max(margin, Math.min(seatCenter - tooltipWidth / 2, window.innerWidth - tooltipWidth - margin));
    const idealTop = placeBelow ? seatRect.bottom + gap : seatRect.top - tooltipHeight - gap;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(margin, Math.min(idealTop, window.innerHeight - tooltipHeight - margin))}px`;
    tooltip.style.setProperty('--arrow-left', `${Math.max(18, Math.min(seatCenter - left - 12, tooltipWidth - 42))}px`);
  };
  const hideSeatTooltip = () => {
    hoveredSeat?.removeAttribute('aria-describedby');
    hoveredSeat = null;
    tooltip.hidden = true;
  };
  const showSeatTooltip = place => {
      hoveredSeat?.removeAttribute('aria-describedby');
      hoveredSeat = place;
      const conflict = window.SeatSelectionDesktopGender?.conflict(place);
      tooltip.classList.toggle('exact-seat-tooltip--restriction', Boolean(conflict));
      tooltipText.textContent = place.dataset.seatPosition === 'occupied'
        ? 'Занято'
        : conflict || (sapsanUI ? sapsanUI.money(Number(place.dataset.seatPrice))
          : `${place.dataset.seatPosition === 'lower' ? 'Нижнее' : 'Верхнее'}, ${Number(place.dataset.seatPrice).toLocaleString('ru-RU')} ₽`);
      tooltip.hidden = false;
      place.setAttribute('aria-describedby', tooltip.id);
      positionTooltip();
  };
  document.querySelectorAll('.exact-seat').forEach(place => {
    place.addEventListener('pointerenter', () => showSeatTooltip(place));
    place.addEventListener('focus', () => showSeatTooltip(place));
    place.addEventListener('blur', () => { if (hoveredSeat === place) hideSeatTooltip(); });
    place.addEventListener('pointerleave', () => {
      if (hoveredSeat !== place) return;
      hideSeatTooltip();
    });
  });
  window.SeatSelectionDesktopSeatTooltip = {show:showSeatTooltip};
  window.addEventListener('seat-gender-change', () => { if (hoveredSeat) showSeatTooltip(hoveredSeat); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hideSeatTooltip(); });
  document.addEventListener('pointerdown', event => {
    if (hoveredSeat && !hoveredSeat.contains(event.target)) hideSeatTooltip();
  });
  window.addEventListener('scroll', positionTooltip, true);
  window.addEventListener('resize', positionTooltip);

  document.querySelectorAll('[data-counter]').forEach(counter => {
    const output = counter.querySelector('output');
    const minus = counter.querySelector('[data-delta="-1"]');
    const updateMinus = () => {
      minus.disabled = Number(output.value) <= Number(counter.dataset.min);
      minus.classList.toggle('button--disabled', minus.disabled);
    };
    updateMinus();
    counter.addEventListener('click', event => {
      const button = event.target.closest('[data-delta]');
      if (!button || button.disabled) return;
      const next = Number(output.value) + Number(button.dataset.delta);
      // Only demonstrate the visible counter, without claiming child tariff logic.
      output.value = String(Math.max(Number(counter.dataset.min), Math.min(10, next)));
      updateMinus();
      window.dispatchEvent(new Event('seat-passenger-change'));
    });
  });
  document.querySelectorAll('[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      if (platskart) window.SeatSelectionCarFilterMotion.change(carriageRoot, () =>
        platskart.applyTypes(carriageRoot, [...document.querySelectorAll('[data-filter][aria-pressed="true"]')].map(item => item.dataset.filter)));
    });
  });
})();
