/* Isolated mock screen. Reuse three existing coupe fixtures and all controls.
   Route timing illustrates the researched 305Я case; inventory is NOT live. */
(() => {
  if (new URLSearchParams(location.search).get('screen') !== 'arrival-times') return;
  window.SeatSelectionArrival = Object.freeze({
    trip: {date:'11 ноября, ср', shortDate:'11 ноября', departure:'15:31', arrival:'01:14', duration:'9 ч 43 м'},
    laterCars: [3, 5], laterArrival:'02:29',
  });
  document.documentElement.dataset.screen = 'arrival-times';
  const mobile = Boolean(document.querySelector('.m-page'));
  const prefix = mobile ? 'm' : 'exact';
  const set = (selector, value) => document.querySelectorAll(selector).forEach(node => node.textContent = value);
  set(`.${prefix}-trip__route`, 'Усинск — Ухта');
  if (!mobile) set('.exact-trip__date', '11 ноября, ср в 15:31 по местному');
  set(`.${prefix}-trip-details__train > span:first-child`, '305Я');
  document.querySelector(`.${prefix}-trip-details__card`).setAttribute('aria-label', 'Маршрут Усинск — Ухта');
  document.querySelectorAll(`.${prefix}-trip-timeline__time`).forEach((node, i) => node.textContent = i ? '01:14' : '15:31');
  set(`.${prefix}-trip-timeline__duration`, '9 ч 43 м');
  document.querySelectorAll(`.${prefix}-trip-timeline__details > div`).forEach((node, i) => {
    node.children[0].textContent = i ? '12 ноября, чт' : '11 ноября, ср';
    node.children[1].textContent = i ? 'Ухта' : 'Усинск';
  });
})();
