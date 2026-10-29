/* Shared seat-selection behavior for mobile and desktop carriage schemes. */
(() => {
  const carriages = document.getElementById('mobile-carriages') || document.querySelector('.exact-carriages');
  const isDesktop = carriages?.classList.contains('exact-carriages');
  const selectedClass = isDesktop ? 'exact-seat--selected' : 'is-selected';
  const panel = document.querySelector('.m-selection-panel');
  if (!carriages || !panel) return;

  const selected = new Map();
  const params = new URLSearchParams(location.search);
  const journeys = window.SeatSelectionJourneys || {};
  const journey = Object.hasOwn(journeys, params.get('scenario')) ? journeys[params.get('scenario')] : null;
  const roundTrip = Boolean(journey);
  const roundTripLeg = params.get('leg') === 'return' ? 'return' : 'outbound';
  let outboundRows = [];
  if (roundTrip && roundTripLeg === 'return') {
    try {
      const outbound = JSON.parse(params.get('rt-outbound') || 'null');
      if (Array.isArray(outbound?.rows)) outboundRows = outbound.rows;
    } catch { /* An incomplete preview URL still opens the current leg. */ }
  }
  const automatic = window.SeatSelectionAutomatic;
  const bedding = isDesktop ? window.SeatSelectionDesktopBedding : window.SeatSelectionMobileBedding;
  const fare = isDesktop ? window.SeatSelectionDesktopFare : window.SeatSelectionMobileFare;
  const gender = isDesktop ? window.SeatSelectionDesktopGender : window.SeatSelectionMobileGender;
  const seatTotal = seat => seat.price + (bedding?.extraPrice(seat) || 0) - (fare?.discount(seat) || 0);
  const priceNode = panel.querySelector('.exact-selection-panel__amount') || panel.querySelector('.m-selection-panel__price');
  const priceMoreButton = panel.querySelector('.m-selection-panel__price-more');
  const priceDetails = document.getElementById('m-price-details');
  const priceDetailsList = priceDetails.querySelector('.m-price-details__list');
  const priceDetailsTitle = priceDetails.querySelector('#m-price-details-title');
  const priceDetailsTotalRow = priceDetails.querySelector('.m-price-details__total');
  const priceDetailsTotal = priceDetails.querySelector('.m-price-details__total-price');
  const placesNode = panel.querySelector('.m-selection-panel__places');
  const placesAllButton = panel.querySelector('.m-selection-panel__places-all');
  const continueButton = panel.querySelector('.m-selection-panel__continue');
  const announcement = panel.querySelector('.m-selection-panel__announcement');
  const actions = document.createElement('div');
  actions.className = 'm-selection-panel__actions';
  continueButton.before(actions);
  actions.append(continueButton);
  const validation = document.createElement('div');
  validation.id = 'seat-selection-validation';
  validation.className = 'm-selection-panel__validation';
  validation.setAttribute('role', 'tooltip');
  validation.hidden = true;
  const validationText = document.createElement('span');
  const validationArrow = document.createElement('img');
  validationArrow.src = './desktop/assets/seat-tooltip-bottom.svg';
  validationArrow.alt = '';
  validation.append(validationText, validationArrow);
  actions.append(validation);
  let validationShown = false;
  let validationTimer;
  const validationTimeoutMs = 6000;
  const missingPlacesText = count => {
    const word = count % 100 >= 11 && count % 100 <= 14 ? 'мест'
      : count % 10 === 1 ? 'место' : count % 10 >= 2 && count % 10 <= 4 ? 'места' : 'мест';
    return `Выберите ещё ${count} ${word}`;
  };
  const hideValidation = () => {
    clearTimeout(validationTimer);
    validationTimer = undefined;
    validationShown = false;
    validation.hidden = true;
    continueButton.removeAttribute('aria-describedby');
  };
  const scheduleValidationDismiss = () => {
    clearTimeout(validationTimer);
    validationTimer = setTimeout(hideValidation, validationTimeoutMs);
  };
  const dismissValidationOutside = event => {
    if (validationShown && !validation.contains(event.target) && !continueButton.contains(event.target)) {
      hideValidation();
    }
  };
  const formatPrice = value => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
  const passengerCount = () => [...document.querySelectorAll('[data-counter="adults"] output, [data-counter="children"] output')]
    .reduce((sum, output) => sum + Number(output.value), 0);
  const seatLabel = (seat, compact = false) => {
    const position = ['left', 'right'].includes(seat.position) ? 'сидячее'
      : seat.position === 'lower' ? (compact ? 'ниж' : 'нижнее') : (compact ? 'верх' : 'верхнее');
    return `${seat.number}, ${position}`;
  };
  const detailsSnapshot = () => ({
    places:[...selected.values()],
    adults:Number(document.querySelector('[data-counter="adults"] output')?.value || 0),
    infants:Number(document.querySelector('[data-counter="infants"] output')?.value || 0),
    seatTotal,
    discount:seat => fare?.discount(seat) || 0,
    beddingPrice:seat => bedding?.extraPrice(seat) || 0,
    ...(journey ? {directions:journey.trains.map(train => train.direction), legIndex:roundTripLeg === 'return' ? 1 : 0} : {}),
    ...(roundTrip && roundTripLeg === 'return' && outboundRows.length ? {outboundRows} : {}),
  });
  const roundTripState = () => ({
    passengers: {
      adults:Number(document.querySelector('[data-counter="adults"] output')?.value || 0),
      children:Number(document.querySelector('[data-counter="children"] output')?.value || 0),
      infants:Number(document.querySelector('[data-counter="infants"] output')?.value || 0),
    },
    places:[...selected.values()].map(({car, number, position, price}) => ({car, number, position, price})),
    rows:window.SeatSelectionTicketDetails.buildRows(detailsSnapshot()),
    options: {bedding:bedding?.getState?.(), fare:fare?.getState?.(), genders:gender?.getState?.()},
  });
  const postRoundTrip = type => {
    if (!roundTrip || window.parent === window) return;
    window.parent.postMessage({type, leg:roundTripLeg, ...roundTripState()}, location.origin);
  };
  // The initial empty render must not erase a saved leg before its seats replay.
  let initialRoundTripRender = true;
  const notifyRoundTripUpdate = () => {
    if (!roundTrip) return;
    if (initialRoundTripRender) { initialRoundTripRender = false; return; }
    postRoundTrip('seat-selection-roundtrip-state');
  };
  const selectionLimit = () => passengerCount();
  // Both itineraries reflect the actual selection, never a sample Figma seat.
  const tripSelection = document.querySelector('[data-trip-selection]');
  const updateTripSelection = places => {
    if (!tripSelection) return;
    tripSelection.hidden = places.length === 0;
    if (!places.length) { tripSelection.textContent = ''; return; }
    const car = places[0].car;
    const type = window.SeatSelectionSapsan ? 'Сидячий'
      : window.SeatSelectionPlatskart?.allCarriages?.find(item => item.number === car)?.type === 'sv' ? 'СВ'
      : window.SeatSelectionPlatskart?.carriages.some(item => item.number === car) ? 'Плацкарт' : 'Купе';
    if (places[0].automatic) {
      tripSelection.textContent = `${car} вагон · ${type} · Автоподбор мест`;
      return;
    }
    const numbers = places.map(seat => seat.number).join(', ');
    tripSelection.textContent = `${car} вагон · ${type} · ${places.length === 1 ? 'Место' : 'Места'} ${numbers}`;
  };
  // The panel stays rendered during exit, retaining its last contents.
  // Re-selecting during exit cancels hiding and reverses the same transition.
  let panelVisible = false;
  let panelHideTimer;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finishPanelHide = () => {
    if (panelVisible) return;
    clearTimeout(panelHideTimer);
    panelHideTimer = undefined;
    panel.hidden = true;
    document.body.classList.remove('has-seat-selection');
  };
  const setPanelVisible = visible => {
    if (visible === panelVisible) return;
    panelVisible = visible;
    clearTimeout(panelHideTimer);
    panelHideTimer = undefined;
    panel.inert = !visible;
    if (visible) {
      document.body.classList.add('has-seat-selection');
      if (panel.hidden) {
        panel.hidden = false;
        // Commit the offscreen starting position before starting the transition.
        void panel.offsetHeight;
      }
      panel.classList.add('is-visible');
    } else {
      panel.classList.remove('is-visible');
      if (reducedMotion.matches) finishPanelHide();
      else {
        const duration = parseFloat(getComputedStyle(panel).getPropertyValue('--selection-panel-motion-duration')) || 320;
        panelHideTimer = setTimeout(finishPanelHide, duration + 50);
      }
    }
  };
  panel.addEventListener('transitionend', event => {
    if (event.target === panel && event.propertyName === 'transform') finishPanelHide();
  });
  reducedMotion.addEventListener('change', event => {
    if (event.matches) finishPanelHide();
  });
  const summary = document.createElement('div');
  summary.className = 'm-selection-panel__summary';
  placesNode.before(summary);
  summary.append(placesNode, placesAllButton);
  placesAllButton.replaceChildren(document.createElement('span'));

  const updateSummary = () => {
    const places = [...selected.values()];
    if (!places.length) return;
    placesNode.hidden = false;
    summary.classList.remove('m-selection-panel__summary--wrap');
    if (places[0].automatic) {
      const count = places.length;
      const word = count % 100 >= 11 && count % 100 <= 14 ? 'мест'
        : count % 10 === 1 ? 'место' : count % 10 >= 2 && count % 10 <= 4 ? 'места' : 'мест';
      placesNode.textContent = `${count} ${word}`;
      placesAllButton.hidden = true;
      return;
    }
    // Seated carriages need numbers, not a repeated description of their type.
    const seated = places.every(seat => ['left', 'right', 'sitting', 'seated'].includes(seat.position));
    const render = count => {
      const labels = places.slice(0, count).map(seat => seated ? seat.number : seatLabel(seat, !isDesktop));
      placesNode.textContent = seated
        ? `${places.length === 1 ? 'Место' : 'Места'} ${labels.join(', ')}`
        : labels.join(' · ');
      const remaining = places.length - count;
      placesAllButton.hidden = remaining === 0;
      placesAllButton.querySelector('span').textContent = `ещё ${remaining}`;
      placesAllButton.setAttribute('aria-label', `Ещё ${remaining}. Все выбранные места и стоимость`);
    };
    let visible = isDesktop ? Math.min(4, places.length) : places.length;
    render(visible);
    if (!isDesktop) {
      // Reserve the overflow link before any place labels reach the CTA.
      // Measuring it only after overflow hides several places at once.
      if (visible > 1) {
        placesAllButton.hidden = false;
        placesAllButton.querySelector('span').textContent = 'ещё 1';
        const needsLink = summary.scrollWidth > summary.clientWidth + 1;
        render(needsLink ? --visible : visible);
      }
      // Measure the final text together with the real “ещё N” link.
      while (visible > 1 && summary.scrollWidth > summary.clientWidth + 1) render(--visible);
      if (summary.scrollWidth > summary.clientWidth + 1) summary.classList.add('m-selection-panel__summary--wrap');
    }
  };

  const update = () => {
    const places = [...selected.values()];
    updateTripSelection(places);
    gender?.sync(places, selectionLimit());
    bedding?.sync(places);
    fare?.sync(places, panelVisible);
    if (isDesktop) window.SeatSelectionDesktopPriceDetails?.refresh();
    const needed = passengerCount();
    automatic?.sync(places, needed);
    setPanelVisible(places.length > 0);
    if (!places.length) {
      hideValidation();
      notifyRoundTripUpdate();
      return;
    }

    const total = places.reduce((sum, seat) => sum + seatTotal(seat), 0);
    priceNode.textContent = `${places.some(seat => seat.estimated) ? 'от ' : ''}${formatPrice(total)}`;
    const remaining = Math.max(0, needed - places.length);
    continueButton.disabled = false;
    continueButton.textContent = 'Далее';
    if (!remaining) hideValidation();
    else if (validationShown) validationText.textContent = missingPlacesText(remaining);
    announcement.textContent = `Выбрано мест: ${places.length} из ${needed}`;
    updateSummary();
    notifyRoundTripUpdate();
  };

  const deselectSeat = key => {
    selected.delete(key);
    const button = [...carriages.querySelectorAll('button[data-seat-number]')]
      .find(seat => `${seat.dataset.seatCar}:${seat.dataset.seatNumber}` === key);
    button?.classList.remove(selectedClass);
    button?.setAttribute('aria-pressed', 'false');
  };

  const rejectGenderConflict = button => {
    const message = gender?.conflict(button);
    if (!message) return false;
    announcement.textContent = message;
    gender.reject(button);
    return true;
  };

  const selectSeat = button => {
    if (selectionLimit() === 0) return;
    if (rejectGenderConflict(button)) return;
    const key = `${button.dataset.seatCar}:${button.dataset.seatNumber}`;
    const car = Number(button.dataset.seatCar);
    const currentCar = selected.values().next().value?.car;
    // One passenger replaces the seat atomically; keep the panel/options visible.
    if (selectionLimit() === 1 || (currentCar !== undefined && currentCar !== car)) {
      for (const selectedKey of selected.keys()) deselectSeat(selectedKey);
    }
    if (selected.size >= selectionLimit()) return;
    selected.set(key, {
      car,
      number: Number(button.dataset.seatNumber),
      position: button.dataset.seatPosition,
      price: Number(button.dataset.seatPrice),
    });
    button.classList.add(selectedClass);
    button.setAttribute('aria-pressed', 'true');
    update();
  };
  carriages.addEventListener('click', event => {
    const autoButton = event.target.closest('[data-auto-car]');
    if (autoButton && automatic) {
      if (autoButton.disabled) return;
      const car = Number(autoButton.dataset.autoCar);
      if (!automatic.proceed(car, passengerCount(), autoButton)) return;
      for (const key of selected.keys()) deselectSeat(key);
      update();
      return;
    }
    if (event.target.closest('.car-without-scheme')) return;
    const button = event.target.closest('button[data-seat-number]');
    if (!button) return;
    if (selectionLimit() === 0) {
      window.SeatSelectionPassengers?.focus();
      return;
    }
    const key = `${button.dataset.seatCar}:${button.dataset.seatNumber}`;
    if (selected.has(key)) {
      deselectSeat(key);
      update();
      return;
    }
    // Check before the passenger limit: an incompatible seat always explains why.
    if (rejectGenderConflict(button)) return;
    const currentCar = selected.values().next().value?.car;
    if (selectionLimit() > 1 && currentCar === Number(button.dataset.seatCar) && selected.size >= selectionLimit()) {
      announcement.textContent = 'Чтобы выбрать другое место, снимите одно из выбранных';
      return;
    }
    // Gender choice is transactional: dismissing the sheet preserves both
    // the current carriage and the selected seats; commit only after a choice.
    if (gender?.request(button, () => selectSeat(button))) return;
    selectSeat(button);
  });

  window.addEventListener('seat-passenger-change', () => {
    if (automatic && selected.values().next().value?.automatic) {
      const car = selected.values().next().value.car;
      selected.clear();
      automatic.placesFor(car, passengerCount()).forEach((seat, index) => selected.set(`${car}:auto:${index}`, seat));
    }
    while (selected.size > selectionLimit()) {
      const key = [...selected.keys()].at(-1);
      deselectSeat(key);
    }
    update();
  });

  continueButton.addEventListener('click', () => {
    if (passengerCount() === 0) {
      hideValidation();
      window.SeatSelectionPassengers?.focus();
      return;
    }
    const remaining = Math.max(0, passengerCount() - selected.size);
    if (remaining) {
      validationShown = true;
      validationText.textContent = missingPlacesText(remaining);
      validation.hidden = false;
      continueButton.setAttribute('aria-describedby', validation.id);
      announcement.textContent = validationText.textContent;
      scheduleValidationDismiss();
      return;
    }
    hideValidation();
    if (roundTrip) postRoundTrip(roundTripLeg === 'return' ? 'seat-selection-roundtrip-finish' : 'seat-selection-roundtrip-next');
    announcement.textContent = 'Следующий шаг пока не собран в этом прототипе';
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') hideValidation();
  });
  // Capture also covers clicks whose handlers stop propagation; the CTA itself
  // is excluded so a repeated click restarts the timer rather than dismissing it.
  document.addEventListener('click', dismissValidationOutside, true);
  validation.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') clearTimeout(validationTimer);
  });
  validation.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse' && validationShown) scheduleValidationDismiss();
  });
  window.addEventListener('pagehide', hideValidation);
  const openDetails = event => {
    hideValidation();
    if (isDesktop && window.SeatSelectionDesktopPriceDetails) {
      // The native invoker prevents pointer light-dismiss before this click;
      // suppress its default action because open() also handles close/reanchor.
      event.preventDefault();
      window.SeatSelectionDesktopPriceDetails.open(detailsSnapshot,event.currentTarget);
      return;
    }
    if (!isDesktop && window.SeatSelectionMobilePriceDetails) {
      window.SeatSelectionMobilePriceDetails.open(detailsSnapshot());
      return;
    }
    priceDetailsTitle.textContent = 'Выбранные места';
    priceDetailsTotalRow.hidden = false;
    priceDetailsList.replaceChildren();
    let total = 0;
    for (const seat of selected.values()) {
      total += seatTotal(seat);
      const row = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = `Вагон ${seat.car} · ${seatLabel(seat)}`;
      row.append(label);
      const price = document.createElement('span');
      price.className = 'm-price-details__amount';
      price.textContent = formatPrice(seatTotal(seat));
      row.append(price);
      priceDetailsList.append(row);
    }
    priceDetailsTotal.textContent = formatPrice(total);
    priceDetails.showModal();
  };
  priceMoreButton.addEventListener('click', openDetails);
  placesAllButton.addEventListener('click', openDetails);
  const closeDetails = () => {
    if (isDesktop && window.SeatSelectionDesktopPriceDetails) window.SeatSelectionDesktopPriceDetails.close();
    else if (!isDesktop && window.SeatSelectionMobilePriceDetails) window.SeatSelectionMobilePriceDetails.close();
    else priceDetails.close();
  };
  priceDetails.querySelector('.m-price-details__close').addEventListener('click', closeDetails);
  priceDetails.addEventListener('click', event => {
    if (event.target !== priceDetails) return;
    const bounds = priceDetails.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
      closeDetails();
    }
  });
  new ResizeObserver(updateSummary).observe(panel.querySelector('.m-selection-panel__details'));
  new ResizeObserver(() => {
    document.body.style.setProperty('--selection-panel-height', `${panel.offsetHeight}px`);
  }).observe(panel);
  document.fonts.ready.then(updateSummary);
  if (bedding) window.addEventListener('seat-bedding-change', update);
  if (fare) window.addEventListener('seat-fare-change', update);
  update();
})();
