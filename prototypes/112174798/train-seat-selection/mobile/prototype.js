/* Layout interactions plus the trip accordion reused from mobile passenger details. */
(() => {
  const tripToggle = document.querySelector('.m-trip__toggle');
  const tripDetails = document.getElementById('mobile-trip-details');
  tripToggle.addEventListener('touchstart', () => {}, { passive: true });
  tripToggle.addEventListener('click', () => {
    const expanded = tripToggle.getAttribute('aria-expanded') !== 'true';
    tripToggle.setAttribute('aria-expanded', String(expanded));
    tripToggle.setAttribute('aria-label', expanded ? 'Свернуть маршрут' : 'Развернуть маршрут');
    tripDetails.setAttribute('aria-hidden', String(!expanded));
    tripDetails.inert = !expanded;
    tripDetails.classList.toggle('is-open', expanded);
  });
  const tripDate = document.querySelector('.m-trip__date');
  const fullDate = tripDate.querySelector('[data-date-full]');
  const shortDate = tripDate.querySelector('[data-date-short]');
  const trip = window.SeatSelectionSapsan?.trip || window.SeatSelectionArrival?.trip || window.SeatSelectionDoubleDeck?.trip;
  const departureLabel = `${trip?.date || '24 апреля, пт'} в ${trip?.departure || '05:30'}`;
  fullDate.textContent = `${departureLabel} по местному`;
  shortDate.textContent = `${departureLabel} по местн.`;
  const fitTripDate = () => {
    fullDate.hidden = false;
    shortDate.hidden = true;
    const needsShort = fullDate.getBoundingClientRect().width > tripDate.clientWidth;
    fullDate.hidden = needsShort;
    shortDate.hidden = !needsShort;
  };
  new ResizeObserver(fitTripDate).observe(tripDate);
  document.fonts.ready.then(fitTripDate);
  fitTripDate();
  const counters = [...document.querySelectorAll('[data-counter]')];
  counters.forEach(counter => {
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
      output.value = String(Math.max(Number(counter.dataset.min), Math.min(10, Number(output.value) + Number(button.dataset.delta))));
      updateMinus();
      window.dispatchEvent(new Event('seat-passenger-change'));
    });
  });
})();
