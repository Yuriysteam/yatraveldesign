/* Two-train journey presentation shared by Desktop, Touch and App.
   The settings shell owns navigation and persists the two leg snapshots. */
(() => {
  const params = new URLSearchParams(location.search);
  const scenario = params.get('scenario');
  const journeys = window.SeatSelectionJourneys || {};
  if (!Object.hasOwn(journeys, scenario)) return;
  const journey = journeys[scenario];

  const leg = params.get('leg') === 'return' ? 'return' : 'outbound';
  const mobile = Boolean(document.querySelector('.m-page'));
  const surface = params.get('surface') === 'touch' ? 'touch' : 'app';
  const parse = (name, fallback) => {
    try { return JSON.parse(params.get(name)) || fallback; }
    catch { return fallback; }
  };
  const passengers = parse('pax', {adults: 1, children: 0, infants: 0});
  const saved = parse(leg === 'return' ? 'rt-return' : 'rt-outbound', null);
  const legIndex = leg === 'outbound' ? 0 : 1;
  const stepLabels = journey.steps;
  const activeStep = journey.firstSeatStep + legIndex;
  const trains = journey.trains;
  const currentTrain = trains[legIndex];
  const summaryTrain = journey.route ? trains[0] : currentTrain;
  document.documentElement.dataset.scenario = scenario;
  document.documentElement.dataset.leg = leg;
  document.title = `${journey.appTitles[legIndex]} · ${journey.name}`;

  const sendBack = () => parent.postMessage({type: 'seat-selection-roundtrip-back'}, location.origin);
  const bindBack = node => {
    node.setAttribute('role', 'button');
    node.tabIndex = 0;
    node.setAttribute('aria-label', journey.backLabel);
    node.addEventListener('click', sendBack);
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sendBack(); }
    });
  };

  if (mobile) {
    if (surface === 'touch') {
      const nav = document.querySelector('.m-touch-breadcrumbs');
      nav.replaceChildren();
      stepLabels.forEach((label, index) => {
        if (index) {
          const arrow = document.createElement('img');
          arrow.src = './BaseAI/icons/16/arrow-right-new.svg';
          arrow.width = 16;
          arrow.height = 16;
          arrow.alt = '';
          nav.append(arrow);
        }
        const item = document.createElement('span');
        item.textContent = label;
        if (index === activeStep) {
          item.classList.add('is-current');
          item.setAttribute('aria-current', 'step');
        } else if (index > activeStep) item.classList.add('is-upcoming');
        if (leg === 'return' && index === journey.firstSeatStep) bindBack(item);
        nav.append(item);
      });
      const revealCurrent = () => {
        const current = nav.querySelector('.is-current');
        nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
      };
      requestAnimationFrame(revealCurrent);
      document.fonts.ready.then(revealCurrent);
    } else {
      const title = document.querySelector('.m-navbar__title');
      title.querySelector('strong').textContent = journey.appTitles[legIndex];
      title.querySelector('span').textContent = `${leg === 'outbound' ? 1 : 2} из 4`;
      document.documentElement.style.setProperty('--roundtrip-progress', leg === 'outbound' ? '25%' : '50%');
      if (leg === 'return') {
        const back = document.querySelector('.m-back');
        back.removeAttribute('aria-disabled');
        back.addEventListener('click', sendBack);
      }
    }
    document.querySelector('.m-journey h1').textContent = journey.headings[legIndex];
  } else {
    const nav = document.querySelector('.exact-steps__inner');
    nav.replaceChildren();
    stepLabels.forEach((label, index) => {
      if (index) {
        const arrow = document.createElement('img');
        arrow.src = './desktop/assets/header-step-arrow.svg';
        arrow.alt = '';
        nav.append(arrow);
      }
      const item = document.createElement('span');
      item.className = 'exact-steps__item';
      item.textContent = label;
      if (index === activeStep) {
        item.classList.add('exact-steps__item--current');
        item.setAttribute('aria-current', 'step');
      } else if (index > activeStep) item.classList.add('exact-steps__item--pending');
      if (leg === 'return' && index === journey.firstSeatStep) bindBack(item);
      nav.append(item);
    });
    document.querySelector('.exact-title').textContent = journey.headings[legIndex];
  }

  const route = document.querySelector(mobile ? '.m-trip__route' : '.exact-trip__route');
  route.textContent = journey.route || currentTrain.direction;
  if (mobile) {
    const date = document.querySelector('.m-trip__date');
    const full = date.querySelector('[data-date-full]');
    const short = date.querySelector('[data-date-short]');
    full.textContent = `${summaryTrain.departureDate} в ${summaryTrain.departure} по местному`;
    short.textContent = `${summaryTrain.departureDate} в ${summaryTrain.departure} по местн.`;
    const fit = () => {
      full.hidden = false;
      short.hidden = true;
      if (full.getBoundingClientRect().width > date.clientWidth) {
        full.hidden = true;
        short.hidden = false;
      }
    };
    requestAnimationFrame(fit);
    document.fonts.ready.then(fit);
  } else {
    document.querySelector('.exact-trip__date').textContent = `${summaryTrain.departureDate} в ${summaryTrain.departure} по местному`;
  }

  const card = train => {
    const prefix = mobile ? 'm' : 'exact';
    const badgeClass = mobile
      ? 'ui__auto-051 pill-badge__auto-017 pill-badge__auto-011 pill-badge__auto-016 pill-badge__auto-004 ui-kit-scope ui__auto-099'
      : 'ui__auto-051 pill-badge__auto-017 yp_WR pill-badge__auto-016 pill-badge__auto-004 ui__auto-216 ui__auto-030';
    return `<article class="${prefix}-trip-details__card" aria-label="${train.direction}">
      <div class="roundtrip-direction ui-kit-scope"><div class="${badgeClass}"><span class="${mobile ? 'text--compact' : 'text-body-s'} text--default">${train.direction}</span></div></div>
      <div class="roundtrip-train">
      <div class="${prefix}-trip-details__train"><span>${train.name}</span><span>${mobile ? 'Эл. рег.' : 'Эл. регистрация'}</span></div>
      <div class="${prefix}-trip-timeline">
        <div class="${prefix}-trip-timeline__row">
          <span class="${prefix}-trip-timeline__time">${train.departure}</span>
          <span class="${prefix}-trip-timeline__line" aria-hidden="true"></span>
          <span class="${prefix}-trip-timeline__duration">${train.duration}</span>
          <span class="${prefix}-trip-timeline__line" aria-hidden="true"></span>
          <span class="${prefix}-trip-timeline__time">${train.arrival}</span>
        </div>
        <div class="${prefix}-trip-timeline__details">
          <div><span>${train.departureDate}</span><span>${train.departureStation}</span></div>
          <div><span>${train.arrivalDate}</span><span>${train.arrivalStation}</span></div>
        </div>
      </div>
      </div>
    </article>`;
  };
  const transfer = journey.transfer ? `<div class="journey-transfer">
    <span class="journey-transfer__illustration" aria-hidden="true"><img class="journey-transfer__icon" src="./assets/transfer-connection.svg" width="16" height="16" alt=""></span>
    <span class="journey-transfer__text">${journey.transfer}</span>
  </div>` : '';
  document.querySelector(mobile ? '.m-trip-details__inset' : '.exact-trip-details__inset').innerHTML = card(trains[0]) + transfer + card(trains[1]);

  for (const counter of document.querySelectorAll('[data-counter]')) {
    const key = counter.dataset.counter;
    const output = counter.querySelector('output');
    output.value = String(Math.max(0, Math.min(10, Number(passengers[key]) || 0)));
    if (leg !== 'return') {
      const minus = counter.querySelector('[data-delta="-1"]');
      minus.disabled = Number(output.value) <= Number(counter.dataset.min);
      minus.classList.toggle('button--disabled', minus.disabled);
      continue;
    }
    for (const button of counter.querySelectorAll('[data-delta]')) {
      button.disabled = true;
      button.classList.add('button--disabled');
    }
  }
  if (mobile && leg === 'return') document.querySelector('#passenger-title').textContent = 'Количество пассажиров';

  if (saved?.places?.length) {
    // Selection handlers and carriage buttons are mounted later in this document.
    window.addEventListener('load', () => {
      const carriages = document.querySelector(mobile ? '#mobile-carriages' : '.exact-carriages');
      const gender = mobile ? window.SeatSelectionMobileGender : window.SeatSelectionDesktopGender;
      for (const seat of saved.places) {
        gender?.restoreState?.(saved.options?.genders);
        const button = [...carriages.querySelectorAll('button[data-seat-number]')].find(node =>
          Number(node.dataset.seatCar) === Number(seat.car) && Number(node.dataset.seatNumber) === Number(seat.number));
        if (button && button.getAttribute('aria-pressed') !== 'true') button.click();
      }
      const bedding = mobile ? window.SeatSelectionMobileBedding : window.SeatSelectionDesktopBedding;
      const fare = mobile ? window.SeatSelectionMobileFare : window.SeatSelectionDesktopFare;
      bedding?.restoreState?.(saved.options?.bedding);
      fare?.restoreState?.(saved.options?.fare);
      if (saved.options) window.dispatchEvent(new Event('seat-bedding-change'));
    }, {once: true});
  }
})();
