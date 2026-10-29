/* Passenger notices: Figma 20146:219951 (desktop), 20148:222709 (mobile).
   Both notices reuse BaseAI feedback.informer.themes.info.
   Infants count as passengers, not as seats; the child notice is advisory. */
(() => {
  const discounts = document.querySelector('.exact-discounts, .m-discounts');
  if (!discounts) return;
  const counters = [...document.querySelectorAll('[data-counter]')];
  const slot = document.createElement('div');
  slot.className = 'passenger-informer-slot';
  slot.hidden = true;
  slot.innerHTML = `<div id="passenger-informer" class="passenger-informer flex informer__auto-017 informer__auto-025 informer__auto-009 informer__auto-010 informer__auto-022 informer__auto-007 ui-content ui-surface ui-kit-density" role="status" aria-live="polite" aria-atomic="true">
    <picture><img class="informer__auto-014 root_size_normal informer__auto-020" alt="" width="24" height="24" src="./assets/passenger-info.svg"></picture>
    <div class="informer__auto-019 text-body-m text--default ui__auto-062"></div>
  </div>`;
  discounts.before(slot);
  const text = slot.querySelector('.informer__auto-019');
  const update = () => {
    const count = name => Number(counters.find(counter => counter.dataset.counter === name)?.querySelector('output').value || 0);
    const noAdults = count('adults') === 0;
    const lockedForReturn = ['roundtrip', 'transfer'].includes(document.documentElement.dataset.scenario)
      && document.documentElement.dataset.leg === 'return';
    const infantPlus = counters.find(counter => counter.dataset.counter === 'infants')?.querySelector('[data-delta="1"]');
    if (infantPlus) {
      infantPlus.disabled = noAdults || lockedForReturn;
      infantPlus.classList.toggle('button--disabled', infantPlus.disabled);
    }
    const empty = counters.every(counter => Number(counter.querySelector('output').value) === 0);
    const message = empty ? 'Добавьте хотя бы одного пассажира'
      : noAdults && count('children') > 0 ? 'Ребёнка до 10 лет не пустят в поезд без взрослого' : '';
    slot.hidden = !message;
    if (text.textContent !== message) text.textContent = message;
  };
  const focus = () => {
    const counter = document.querySelector('[data-counter="adults"]');
    counter?.scrollIntoView({block:'center', behavior:'instant'});
    counter?.querySelector('[data-delta="1"]')?.focus({preventScroll:true});
  };
  window.SeatSelectionPassengers = {focus};
  window.addEventListener('seat-passenger-change', update);
  update();
})();
