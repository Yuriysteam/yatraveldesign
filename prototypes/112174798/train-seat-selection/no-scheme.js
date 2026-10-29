/* Figma 20127:115645. Optional preview mode; never assign fictitious numbers.
   Existing available inventory supplies counts and an indicative lower price.
   Button/Informer subtrees: BaseAI 1.0.0, Plain M / neutral with-one-button. */
(() => {
  const forceAutomatic = new URLSearchParams(location.search).get('scheme') === 'auto';
  if (forceAutomatic) document.documentElement.dataset.scheme = 'auto';
  const inventory = window.SeatSelectionSapsan?.carriages || window.SeatSelectionPlatskart?.allCarriages || window.SeatSelectionData.carriages;
  const root = document.querySelector('.exact-carriages, #mobile-carriages');
  if (!root) return;
  const desktop = root.classList.contains('exact-carriages');
  const money = value => `${new Intl.NumberFormat('ru-RU', {useGrouping:Math.abs(value) >= 10000}).format(value)} ₽`;
  const records = new Map();
  root.querySelectorAll('article[data-car-number]').forEach(card => {
    const number = Number(card.dataset.carNumber);
    const car = inventory.find(car => car.number === number);
    if (!forceAutomatic && car?.hasScheme !== false) return;
    // Unmapped inventory has capacity and fares, never invented seat numbers.
    const seats = car?.hasScheme === false || car?.doubleDeck
      ? Array.from({length:car.availableCount}, (_, index) => ({price:(car.prices || [car.price])[index % (car.prices?.length || 1)], position:'automatic'}))
      : [...card.querySelectorAll('button[data-seat-number]:not(:disabled)')]
      .map(button => ({price:Number(button.dataset.seatPrice), position:button.dataset.seatPosition}))
      .filter(seat => Number.isFinite(seat.price) && seat.price > 0);
    const prices = [...new Set(seats.map(seat => seat.price))].sort((a,b) => a-b);
    const record = {number, card, seats, price:prices[0] || 0, estimated:prices.length > 1, bookingPrice:car?.bookingPrice};
    records.set(number, record);
    card.classList.add('car-without-scheme');
    card.dataset.cardState = 'No scheme';
    card.dataset.cardVariant = window.SeatSelectionCarriageCard.variants[desktop ? 'Desktop' : 'Mobile']['No scheme'];
    // Keep the original DOM/data intact for shared services, but inaccessible.
    card.querySelectorAll('.exact-scheme, .p-scheme, .d-sapsan-map, .m-scheme__viewport, .m-sapsan-viewport, .m-sapsan-direction, .double-deck-viewport').forEach(scheme => {
      scheme.hidden = true;
      scheme.inert = true;
    });
    const informer = document.createElement('div');
    informer.className = 'no-scheme-informer flex informer__auto-017 informer__auto-021 informer__auto-009 informer__auto-010';
    informer.innerHTML = `<div class="informer__auto-019 no-scheme-copy">
      <strong id="no-scheme-title-${number}">Для этого вагона нет схемы</strong>
      <p id="no-scheme-description-${number}">Места подберутся автоматически, выбрать конкретные номера не получится</p>
    </div><div class="no-scheme-action"><button type="button" class="button button--size-m ui__auto-450 button--width-auto"
      data-auto-car="${number}" aria-describedby="no-scheme-description-${number}">
      <span class="button__content"><span class="button__text-stack"><span class="button__label text-label-m text--primary">Выбрать этот вагон</span></span></span>
    </button></div>`;
    card.querySelector('header').after(informer);
    record.button = informer.querySelector('button');
    record.button.addEventListener('pointerenter', () => record.button.classList.add('gmsji'));
    record.button.addEventListener('pointerleave', () => record.button.classList.remove('gmsji'));
    const legend = card.querySelector('.exact-legend, .m-car__legend');
    // Preserve bedding and its existing motion/info controls, replace only prices.
    legend.querySelectorAll('.exact-legend__price, .m-car__price, .nonrefundable-legend').forEach(node => node.remove());
    const range = document.createElement('div');
    range.className = 'no-scheme-prices';
    const rangeText = values => {
      const unique = [...new Set(values)].sort((a,b) => a-b);
      return `${unique.length > 1 ? 'от ' : ''}${money(unique[0])}`;
    };
    const lower = seats.filter(seat => seat.position === 'lower');
    const upper = seats.filter(seat => seat.position === 'upper');
    const labels = prices.length > 1 && lower.length && upper.length
      ? [`Верхние ${rangeText(upper.map(s => s.price))}`, `Нижние ${rangeText(lower.map(s => s.price))}`]
      : [seats.length ? `${rangeText(seats.map(s => s.price))} за место` : 'Нет свободных мест'];
    if (car?.bookingPrice) labels.splice(0, labels.length, `${money(car.bookingPrice)} за всё купе`);
    labels.forEach(label => { const span = document.createElement('span'); span.textContent = label; range.append(span); });
    legend.prepend(range);
    // CSS grid interpolates the actual bedding height without shifting the legend.
    if (!desktop) {
      const bedding = card.querySelector('.m-bedding');
      if (bedding) {
        const reveal = document.createElement('div');
        reveal.className = 'no-scheme-bedding-reveal';
        const clip = document.createElement('div');
        clip.className = 'no-scheme-bedding-clip';
        bedding.before(reveal);
        reveal.append(clip);
        clip.append(bedding);
      }
    }
  });
  const placesFor = (car, count) => {
    const record = records.get(Number(car));
    if (!record || count < 1 || record.seats.length < count) return [];
    return Array.from({length:count}, (_, index) => ({car:Number(car), number:null, position:'automatic',
      automatic:true, price:record.bookingPrice
        ? (Math.floor(record.bookingPrice * 100 / count) + (index < record.bookingPrice * 100 % count ? 1 : 0)) / 100
        : record.price, estimated:record.estimated}));
  };
  const sync = (_places, count) => {
    for (const {button, seats} of records.values()) {
      button.disabled = count < 1 || seats.length < count;
      button.classList.toggle('button--disabled', button.disabled);
      button.title = count < 1 ? 'Укажите количество пассажиров'
        : button.disabled ? `В вагоне недостаточно мест для ${count} пассажиров` : '';
    }
  };
  const proceed = (car, count, trigger) => {
    const record = records.get(Number(car));
    if (!record || count < 1 || record.seats.length < count || !window.SeatSelectionPassengerPlaceholder) return false;
    window.SeatSelectionPassengerPlaceholder.open({car:Number(car), passengers:count, trigger});
    return true;
  };
  if (records.size) window.SeatSelectionAutomatic = {placesFor, sync, proceed};
})();
