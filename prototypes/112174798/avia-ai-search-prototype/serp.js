(() => {
  'use strict';

  // Demo values only. Screen geometry, assets and typography follow the iOS views.
  const demoTickets = [
    { id: 'demo-1', price: 5890, company: 'Победа', from: 'VKO', to: 'AER', depart: '06:40', arrive: '10:20', minutes: 220, stops: 0, baggage: false, handLuggage: true, badges: ['Лучшая цена', 'Продаёт авиакомпания'] },
    { id: 'demo-2', price: 6790, company: 'Россия', from: 'SVO', to: 'AER', depart: '09:15', arrive: '12:55', minutes: 220, stops: 0, baggage: true, handLuggage: true, badges: ['Популярный'] },
    { id: 'demo-3', price: 7340, company: 'S7 Airlines', from: 'DME', to: 'AER', depart: '11:30', arrive: '17:20', minutes: 350, stops: 1, transfer: 'Санкт-Петербург', transferCode: 'LED', transferMinutes: 80, nightTransfer: false, airportChange: false, baggage: true, handLuggage: true, handWeight: 10 },
    { id: 'demo-4', price: 8120, company: 'Аэрофлот', from: 'SVO', to: 'AER', depart: '14:05', arrive: '17:45', minutes: 220, stops: 0, baggage: true, handLuggage: true },
    { id: 'demo-5', price: 6290, company: 'Уральские авиалинии', from: 'DME', to: 'AER', depart: '18:40', arrive: '23:50', minutes: 310, stops: 1, transfer: 'Минеральные Воды', transferCode: 'MRV', transferMinutes: 70, nightTransfer: true, airportChange: false, baggage: false, handLuggage: true },
  ];
  // Mock round-trip fares for 10–17 November. Each scenario fixes these dates
  // explicitly; return legs use the same carrier and bag allowance.
  const roundTripTickets = demoTickets.map((ticket, index) => ({
    ...ticket,
    id: `round-trip-${index + 1}`,
    price: [11780, 13580, 14680, 16240, 12580][index],
    returnFlight: { from: ticket.to, to: ticket.from, depart: '14:10', arrive: '17:50', minutes: 220, stops: 0 },
  }));
  // Illustrative weekend fares for the home-page suggestion, not live offers.
  const petersburgWeekendTickets = [
    { id: 'petersburg-1', price: 6438, company: 'Победа', from: 'VKO', to: 'LED', depart: '06:50', arrive: '08:15', minutes: 85, stops: 0, baggage: false, handLuggage: true, badges: ['Лучшая цена'] },
    { id: 'petersburg-2', price: 7820, company: 'Россия', from: 'SVO', to: 'LED', depart: '09:15', arrive: '10:45', minutes: 90, stops: 0, baggage: true, handLuggage: true, badges: ['Популярный'] },
    { id: 'petersburg-3', price: 8350, company: 'S7 Airlines', from: 'DME', to: 'LED', depart: '11:30', arrive: '13:05', minutes: 95, stops: 0, baggage: true, handLuggage: true, handWeight: 10 },
    { id: 'petersburg-4', price: 9620, company: 'Аэрофлот', from: 'SVO', to: 'LED', depart: '14:05', arrive: '15:30', minutes: 85, stops: 0, baggage: true, handLuggage: true },
    { id: 'petersburg-5', price: 7160, company: 'Победа', from: 'VKO', to: 'LED', depart: '18:40', arrive: '20:10', minutes: 90, stops: 0, baggage: false, handLuggage: true },
  ].map(ticket => ({
    ...ticket,
    returnFlight: { from: 'LED', to: ticket.from, depart: '18:10', arrive: '19:40', minutes: 90, stops: 0 },
  }));
  // Scenario-only mock departures: two match every requested condition,
  // while another airport and the original flights exercise manual filtering.
  const supportedFilterTickets = [
    ...demoTickets,
    { ...demoTickets[1], id: 'filters-svo-1010', depart: '10:10', arrive: '13:50' },
    { ...demoTickets[3], id: 'filters-svo-1045', depart: '10:45', arrive: '14:25' },
    { ...demoTickets[3], id: 'filters-dme-1030', from: 'DME', depart: '10:30', arrive: '14:10' },
  ];
  // Scenario 9 replaces a completed Moscow–Sochi search. Fares below are
  // illustrative per-adult values, with and without baggage/transfers, so
  // the demo makes it visible that the previous filters are not inherited.
  const kazanTickets = [
    { id: 'kazan-1', price: 4590, company: 'Победа', from: 'LED', to: 'KZN', depart: '07:20', arrive: '09:40', minutes: 140, stops: 0, baggage: false, handLuggage: true, badges: ['Лучшая цена'] },
    { id: 'kazan-2', price: 5790, company: 'Россия', from: 'LED', to: 'KZN', depart: '10:15', arrive: '12:35', minutes: 140, stops: 0, baggage: true, handLuggage: true, badges: ['Популярный'] },
    { id: 'kazan-3', price: 6340, company: 'S7 Airlines', from: 'LED', to: 'KZN', depart: '11:30', arrive: '16:40', minutes: 310, stops: 1, transfer: 'Москва', transferCode: 'DME', transferMinutes: 110, nightTransfer: false, airportChange: false, baggage: true, handLuggage: true, handWeight: 10 },
    { id: 'kazan-4', price: 7120, company: 'Аэрофлот', from: 'LED', to: 'KZN', depart: '14:05', arrive: '16:25', minutes: 140, stops: 0, baggage: true, handLuggage: true },
    { id: 'kazan-5', price: 6890, company: 'Аэрофлот', from: 'LED', to: 'KZN', depart: '18:40', arrive: '23:20', minutes: 280, stops: 1, transfer: 'Москва', transferCode: 'SVO', transferMinutes: 80, nightTransfer: false, airportChange: false, baggage: false, handLuggage: true },
  ];
  // Explicit scenario fixture, not live availability or a general rule for
  // relaxing filters. These mock London results contain no nonstop flights.
  // Displayed times are local: Moscow is three hours ahead in November.
  const londonTickets = [
    { id: 'london-1', price: 38490, company: 'Air Serbia', from: 'SVO', to: 'LHR', depart: '07:10', arrive: '12:30', minutes: 500, stops: 1, transfer: 'Белград', transferCode: 'BEG', transferMinutes: 85, nightTransfer: false, airportChange: false, baggage: false, handLuggage: true, badges: ['Лучшая цена'] },
    { id: 'london-2', price: 42790, company: 'Turkish Airlines', from: 'VKO', to: 'LGW', depart: '09:10', arrive: '16:00', minutes: 590, stops: 1, transfer: 'Стамбул', transferCode: 'IST', transferMinutes: 120, nightTransfer: false, airportChange: false, baggage: true, handLuggage: true, badges: ['Популярный'] },
    { id: 'london-3', price: 44950, company: 'Turkish Airlines', from: 'VKO', to: 'LHR', depart: '10:40', arrive: '17:15', minutes: 575, stops: 1, transfer: 'Стамбул', transferCode: 'IST', transferMinutes: 105, nightTransfer: false, airportChange: false, baggage: true, handLuggage: true },
    { id: 'london-4', price: 41200, company: 'Air Serbia', from: 'SVO', to: 'LHR', depart: '13:40', arrive: '18:40', minutes: 480, stops: 1, transfer: 'Белград', transferCode: 'BEG', transferMinutes: 90, nightTransfer: false, airportChange: false, baggage: true, handLuggage: true },
    { id: 'london-5', price: 46300, company: 'Turkish Airlines', from: 'VKO', to: 'LHR', depart: '14:00', arrive: '21:00', minutes: 600, stops: 1, transfer: 'Стамбул', transferCode: 'IST', transferMinutes: 150, nightTransfer: false, airportChange: false, baggage: true, handLuggage: true },
  ];
  // Illustrative Paris connections for the home suggestion, not live fares.
  // Reuse the connecting-flight durations with Paris-local arrival times.
  const parisTickets = londonTickets.map((ticket, index) => ({
    ...ticket, id: `paris-${index + 1}`, to: 'CDG',
    arrive: ['13:30', '17:00', '18:15', '19:40', '22:00'][index],
    price: [34990, 38790, 40950, 37200, 42300][index],
  }));
  // Scenario 7 fixes London and 10–17 November as demo choices within the
  // requested country/month. Both legs connect; prices cover the round trip.
  const londonReturnTimes = [
    { depart: '12:30', arrive: '23:40', minutes: 490 },
    { depart: '09:30', arrive: '22:10', minutes: 580 },
    { depart: '10:10', arrive: '22:30', minutes: 560 },
    { depart: '11:20', arrive: '22:30', minutes: 490 },
    { depart: '08:15', arrive: '21:45', minutes: 630 },
  ];
  const londonRoundTripTickets = londonTickets.map((ticket, index) => ({
    ...ticket,
    id: `london-round-trip-${index + 1}`,
    price: [74980, 82790, 86950, 79200, 90300][index],
    returnFlight: {
      from: ticket.to, to: ticket.from, ...londonReturnTimes[index],
      stops: 1, transfer: ticket.transfer, transferCode: ticket.transferCode,
      transferMinutes: ticket.transferMinutes, nightTransfer: false, airportChange: false,
    },
  }));
  // Scenario-only Manchester fares. Reuse the illustrative connecting-flight
  // timings/allowances; these are not a live timetable or a fare calculation.
  const manchesterTickets = londonTickets.map((ticket, index) => ({
    ...ticket, id: `manchester-${index + 1}`, to: 'MAN',
    price: [40290, 45690, 47850, 42900, 49300][index],
  }));
  const manchesterRoundTripTickets = manchesterTickets.map((ticket, index) => ({
    ...ticket, id: `manchester-round-trip-${index + 1}`,
    price: [78980, 88790, 92950, 83200, 96300][index],
    returnFlight: { ...londonRoundTripTickets[index].returnFlight, from: 'MAN' },
  }));
  // Illustrative Sydney fares, intentionally unordered by duration. They are
  // not a timetable. Arrival times include an eight-hour demo timezone offset.
  const sydneyTickets = [
    { id: 'sydney-1', price: 85490, depart: '09:00', arrive: '19:40', minutes: 1600, transferMinutes: 445, arrivalDayOffset: 1 },
    { id: 'sydney-2', price: 112790, depart: '17:20', arrive: '23:50', minutes: 1350, transferMinutes: 195, arrivalDayOffset: 1 },
    { id: 'sydney-3', price: 97850, depart: '07:50', arrive: '15:55', minutes: 1445, transferMinutes: 290, arrivalDayOffset: 1 },
    { id: 'sydney-4', price: 81200, depart: '13:40', arrive: '04:40', minutes: 1860, transferMinutes: 705, arrivalDayOffset: 2, badges: ['Лучшая цена'] },
    { id: 'sydney-5', price: 104300, depart: '19:00', arrive: '04:15', minutes: 1515, transferMinutes: 360, arrivalDayOffset: 2 },
  ].map(ticket => ({ ...ticket, company: 'Emirates', from: 'DME', to: 'SYD', stops: 1, transfer: 'Дубай', transferCode: 'DXB', baggage: true, handLuggage: true, nightTransfer: false, airportChange: false }));
  let tickets = demoTickets;
  // Original CDN SVGs and brand colors from iOS UITestsHelper/aviaSearchResult-success.json.
  const airlineAssets = {
    'Победа': ['pobeda', '#0598d5'],
    'Россия': ['rossiya', '#cf0a2c'],
    'S7 Airlines': ['s7', '#b8cf53'],
    'Аэрофлот': ['aeroflot', '#004993'],
    'Уральские авиалинии': ['ural', '#e30421'],
    // Original CDN vectors/colors from portal/integration/tests/common/avia/serp/
    // __imposters__/serp-search-by-airports.testplane.428b315.imposter.json.
    'Air Serbia': ['air-serbia', '#174578'],
    'Turkish Airlines': ['turkish', '#d71d07'],
    'Emirates': ['emirates', '#db2f34'],
  };
  const $ = (selector) => document.querySelector(selector);
  const asset = (name) => `./assets/app-${name}.svg`;
  const money = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
  const timeMinutes = value => value.split(':').reduce((hours, minutes) => Number(hours) * 60 + Number(minutes));
  const clockTime = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(Math.round(minutes % 60)).padStart(2, '0')}`;
  function boundsFor(values) { return values.length ? { min: Math.min(...values), max: Math.max(...values) } : { min: 0, max: 0 }; }
  function searchTimeBounds() {
    return {
      ...Object.fromEntries(['depart', 'arrive'].map(key => [key, boundsFor(tickets.map(ticket => timeMinutes(ticket[key])))])),
      transfer: boundsFor(tickets.filter(ticket => ticket.stops).map(ticket => ticket.transferMinutes)),
    };
  }
  let timeBounds = searchTimeBounds();
  const transferAirportReference = [{ code: 'LED', title: 'Санкт-Петербург, Пулково' }, { code: 'MRV', title: 'Минеральные Воды' }, { code: 'BEG', title: 'Белград, Никола Тесла' }, { code: 'IST', title: 'Стамбул, Новый аэропорт' }, { code: 'SVO', title: 'Москва, Шереметьево' }, { code: 'DME', title: 'Москва, Домодедово' }, { code: 'DXB', title: 'Дубай, Международный' }];
  let transferAirports;
  // Demo reference data; native airport titles include the city inline when it
  // matches the settlement of the selected route (AviaFilterResponse+Mapping).
  const routeAirportReference = {
    airports: [{ code: 'SVO', title: 'Шереметьево', city: 'Москва' }, { code: 'DME', title: 'Домодедово', city: 'Москва' }, { code: 'VKO', title: 'Внуково', city: 'Москва' }, { code: 'LED', title: 'Пулково', city: 'Санкт-Петербург' }],
    arrivalAirports: [{ code: 'AER', title: 'Сочи', city: 'Сочи' }, { code: 'LED', title: 'Пулково', city: 'Санкт-Петербург' }, { code: 'CDG', title: 'Шарль-де-Голль', city: 'Париж' }, { code: 'LHR', title: 'Хитроу', city: 'Лондон' }, { code: 'LGW', title: 'Гатвик', city: 'Лондон' }, { code: 'MAN', title: 'Манчестер', city: 'Манчестер' }, { code: 'KZN', title: 'Казань', city: 'Казань' }, { code: 'SYD', title: 'Кингсфорд Смит', city: 'Сидней' }],
  };
  let routeAirports;
  let companyOptions;
  function configureFilterOptions() {
    timeBounds = searchTimeBounds();
    transferAirports = transferAirportReference.filter(airport => tickets.some(ticket => ticket.transferCode === airport.code));
    routeAirports = Object.fromEntries([['airports', 'from'], ['arrivalAirports', 'to']].map(([key, field]) => [key, routeAirportReference[key].filter(airport => tickets.some(ticket => ticket[field] === airport.code))]));
    companyOptions = Object.keys(airlineAssets).filter(company => tickets.some(ticket => ticket.company === company));
  }
  configureFilterOptions();
  const rangeTime = (key, value) => key === 'transfer' ? `${Math.floor(value / 60)} ч ${value % 60} мин` : clockTime(value);
  const defaults = () => ({ direct: false, baggage: false, sort: 'recommended', transferLimit: null, noNightTransfers: false, noAirportChange: false, transferAirports: [], transferMin: timeBounds.transfer.min, transferMax: timeBounds.transfer.max, airports: [], arrivalAirports: [], companies: [], companyCombinations: false, departMin: timeBounds.depart.min, departMax: timeBounds.depart.max, arriveMin: timeBounds.arrive.min, arriveMax: timeBounds.arrive.max });
  const cloneFilters = value => ({ ...value, airports: [...value.airports], arrivalAirports: [...value.arrivalAirports], companies: [...value.companies], transferAirports: [...value.transferAirports] });
  // AviaSearchSort.allCases order and Localizable.strings, not a web sort menu.
  const sortOptions = [
    ['recommended', 'Сначала рекомендуемые'],
    ['price', 'Сначала дешёвые'],
    ['expensive', 'Сначала дорогие'],
    ['departure', 'По времени отправления'],
    ['arrival', 'По времени прибытия'],
    ['duration', 'По времени в пути'],
  ];
  const sortTitle = () => sortOptions.find(([value]) => value === filters.sort)[1];
  let filters = defaults();
  let section = 'root';
  let selection = 'sort';
  let appliedFilters = null;
  let closeTimer;
  let drag = null;
  let selectionCloseTimer;
  let selectionDrag = null;
  const mockSearchDelay = 1800; // Demo latency only; not a production timeout.
  let loading = false;
  let pendingQueryFailure = false;
  let loadTimer;
  let loadVersion = 0;
  let searchDirection = 'oneWay';
  let mockRoute = { from: 'Москва', fromGenitive: 'Москвы', to: 'Сочи', date: '12 октября', travellers: 1 };
  let searchExplanation = '';

  function filteredTickets(activeFilters = filters) {
    const result = tickets.filter((ticket) => {
      const departHour = timeMinutes(ticket.depart);
      const arriveHour = timeMinutes(ticket.arrive);
      return (!activeFilters.direct || ticket.stops === 0)
        && (!activeFilters.baggage || ticket.baggage)
        && (activeFilters.transferLimit === null || ticket.stops <= activeFilters.transferLimit)
        && (!activeFilters.noNightTransfers || !ticket.nightTransfer)
        && (!activeFilters.noAirportChange || !ticket.airportChange)
        && (!ticket.stops || (ticket.transferMinutes >= activeFilters.transferMin && ticket.transferMinutes <= activeFilters.transferMax
          && (!activeFilters.transferAirports.length || activeFilters.transferAirports.includes(ticket.transferCode))))
        && (!activeFilters.airports.length || activeFilters.airports.includes(ticket.from))
        && (!activeFilters.arrivalAirports.length || activeFilters.arrivalAirports.includes(ticket.to))
        && (!activeFilters.companies.length || activeFilters.companies.includes(ticket.company))
        && departHour >= activeFilters.departMin && departHour <= activeFilters.departMax
        && arriveHour >= activeFilters.arriveMin && arriveHour <= activeFilters.arriveMax;
    });
    if (activeFilters.sort === 'price') result.sort((a, b) => a.price - b.price);
    if (activeFilters.sort === 'expensive') result.sort((a, b) => b.price - a.price);
    if (activeFilters.sort === 'duration') result.sort((a, b) => (a.minutes + (a.returnFlight?.minutes ?? 0)) - (b.minutes + (b.returnFlight?.minutes ?? 0)) || a.price - b.price);
    if (activeFilters.sort === 'departure') result.sort((a, b) => a.depart.localeCompare(b.depart));
    if (activeFilters.sort === 'arrival') result.sort((a, b) => a.arrive.localeCompare(b.arrive));
    return result;
  }

  function canRefine(changes) {
    // A transfer-specific prompt is irrelevant when only nonstop flights remain.
    if (changes.noNightTransfers && !filteredTickets().some(ticket => ticket.stops > 0)) return false;
    return Object.entries(changes).some(([key, value]) => filters[key] !== value)
      && filteredTickets({ ...filters, ...changes }).length > 0;
  }

  function activeCount() {
    return transferCount() + Number(filters.baggage) + Number(filters.sort !== 'recommended')
      + airportCount() + companyCount()
      + Number(filters.departMin !== timeBounds.depart.min || filters.departMax !== timeBounds.depart.max)
      + Number(filters.arriveMin !== timeBounds.arrive.min || filters.arriveMax !== timeBounds.arrive.max);
  }

  function transferCount() {
    return Number(filters.direct) + Number(filters.transferLimit !== null) + Number(filters.noNightTransfers) + Number(filters.noAirportChange)
      + filters.transferAirports.length + Number(filters.transferMin !== timeBounds.transfer.min || filters.transferMax !== timeBounds.transfer.max);
  }
  function resetTransfers() {
    const clean = defaults();
    ['direct', 'transferLimit', 'noNightTransfers', 'noAirportChange', 'transferAirports', 'transferMin', 'transferMax'].forEach(key => { filters[key] = clean[key]; });
  }
  const airportCount = () => filters.airports.length + filters.arrivalAirports.length;
  function resetAirports() { filters.airports = []; filters.arrivalAirports = []; }
  const companyCount = () => filters.companies.length + Number(filters.companyCombinations);
  function resetCompanies() { filters.companies = []; filters.companyCombinations = false; }

  function makeCard(ticket) {
    const card = document.createElement('article');
    card.className = 'serp-card';
    card.dataset.ticket = ticket.id;
    const badges = ticket.badges?.length ? `<div class="serp-badges">${ticket.badges.map(label => `<span data-tone="${label === 'Лучшая цена' ? 'positive' : 'info'}">${label}</span>`).join('')}</div>` : '';
    const bag = (included, kind, weight = 0) => {
      const icon = kind === 'hand'
        ? (included ? (weight ? 'ic24HandbaggageNosize' : 'ic24HandbagNosize') : 'ic24HandbaggageWithout')
        : (included ? 'ic24BaggageNosize' : 'ic24BaggageWithout');
      const label = kind === 'hand' ? 'Ручная кладь' : 'Багаж';
      return `<span class="serp-bag ${included ? 'serp-bag--included' : ''}" role="img" aria-label="${label}: ${included ? (weight ? `${weight} кг` : 'включён') : 'не включён'}" style="--bag-icon: url('${asset(icon)}')"><img src="${asset(icon)}" alt="">${weight ? `<span class="serp-bag-weight" aria-hidden="true">${weight}</span>` : ''}</span>`;
    };
    const duration = total => [Math.floor(total / 60) ? `${Math.floor(total / 60)} ч` : '', total % 60 ? `${total % 60} мин` : ''].filter(Boolean).join(' ');
    // AviaSnippetView stacks forward/backward FlightInfoView with the same
    // 12 pt gap. Company and total price are shared; no extra visual labels.
    const flightRow = (flight, label) => `<div class="serp-flight-row" role="group" aria-label="${label}"><div class="serp-flight-route"><span class="serp-flight-time">${flight.depart} – ${flight.arrive}</span><span class="serp-flight-airports">${flight.from} → ${flight.to}</span></div><div class="serp-flight-details"><span class="serp-flight-duration">${flight.arrivalDateLabel ? `<span class="serp-flight-arrival-date">${flight.arrivalDateLabel},&nbsp;</span>` : ''}<span>${duration(flight.minutes)}</span></span><span class="${flight.stops ? 'serp-flight-transfer' : 'serp-flight-direct'}">${flight.stops ? `${flight.transfer} ${duration(flight.transferMinutes)}` : 'Прямой'}</span></div></div>`;
    const [logo, logoColor] = airlineAssets[ticket.company];
    card.innerHTML = `${badges}
      <div class="serp-card-head"><strong class="serp-card-price">${money(ticket.price)}</strong><div class="serp-card-bags">${bag(ticket.handLuggage, 'hand', ticket.handWeight)}${bag(ticket.baggage, 'checked')}</div></div>
      <div class="serp-card-company"><span class="serp-company-logos" aria-hidden="true"><img class="serp-company-logo" src="./assets/airline-${logo}.svg" style="background:${logoColor}" alt=""></span><span>${ticket.company}</span></div>
      ${flightRow(ticket, 'Туда')}
      ${ticket.returnFlight ? flightRow(ticket.returnFlight, 'Обратно') : ''}`;
    const tripLabel = ticket.returnFlight ? 'туда и обратно' : 'в одну сторону';
    const passengerLabel = mockRoute.travellers === 1 ? 'одного взрослого' : 'двоих взрослых';
    card.querySelector('.serp-card-price').setAttribute('aria-label', `${money(ticket.price)} за перелёт ${tripLabel} для ${passengerLabel}`);
    return card;
  }

  function renderResults() {
    // Publish interpreted search parameters together with the finished results.
    // While AI search is loading, both summary rows remain skeletons.
    $('#serp-route').textContent = `${mockRoute.from} — ${mockRoute.to}`;
    $('#serp-dates').textContent = mockRoute.date;
    $('#serp-travellers').textContent = mockRoute.travellers;
    $('#serp-travellers').setAttribute('aria-label', mockRoute.travellers === 1 ? '1 взрослый, эконом' : '2 взрослых, эконом');
    const list = filteredTickets();
    const cards = $('#serp-cards');
    cards.replaceChildren();
    if (list.length) list.forEach((ticket) => cards.append(makeCard(ticket)));
    else {
      const empty = document.createElement('div');
      empty.className = 'serp-empty';
      empty.innerHTML = '<strong>Подходящих билетов нет</strong><span>Попробуйте изменить фильтры</span><button type="button" id="serp-empty-reset">Сбросить фильтры</button>';
      cards.append(empty);
    }
    $('#serp-direct').setAttribute('aria-pressed', String(filters.direct));
    $('#serp-baggage').setAttribute('aria-pressed', String(filters.baggage));
    $('#serp-filter-dot').hidden = activeCount() === 0;
    $('#serp-open-filters').dataset.active = String(activeCount() > 0);
    $('#serp-open-filters').setAttribute('aria-label', activeCount() ? `Все фильтры, выбрано ${activeCount()}` : 'Все фильтры');
    // AviaQuickFiltersView: keep unavailable chips visible, disabled, with
    // the native "Нет рейсов" subtitle instead of a minimum price.
    [['direct', ticket => !ticket.stops], ['baggage', ticket => ticket.baggage]].forEach(([key, matches]) => {
      const matching = tickets.filter(matches);
      $(`#serp-${key}`).disabled = matching.length === 0;
      $(`#serp-${key}-price`).textContent = matching.length ? `от ${money(Math.min(...matching.map(ticket => ticket.price)))}` : 'Нет рейсов';
    });
    renderInformer(list.length);
  }

  function renderInformer(resultCount = filteredTickets().length) {
    $('#serp-informer-text').textContent = searchExplanation;
    $('#serp-informer').hidden = loading || !searchExplanation || resultCount === 0;
  }

  // Native geometry: 130 / 198, identical contents independent of tickets.
  // Five cards for oneWay fill the preview; twoWays retains the native four.
  function makeSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'serp-skeleton-card';
    card.innerHTML = '<div class="serp-skeleton-content"><div class="serp-skeleton-company"><span class="serp-skeleton-item serp-skeleton-logo"></span><span class="serp-skeleton-item serp-skeleton-name"></span></div><span class="serp-skeleton-item serp-skeleton-price"></span><div class="serp-skeleton-route"><span class="serp-skeleton-item"></span><span class="serp-skeleton-item"></span></div></div>';
    return card;
  }
  function setSearchDirection(direction) {
    searchDirection = direction === 'twoWays' ? 'twoWays' : 'oneWay';
    $('#serp-skeleton-cards').dataset.direction = searchDirection;
    $('#serp-skeleton-cards').lastElementChild.hidden = searchDirection === 'twoWays';
  }
  function setLoading(value) {
    loading = value;
    $('#serp-screen').dataset.loading = String(value);
    $('#serp-feed').setAttribute('aria-busy', String(value));
    $('#serp-quick-filters').hidden = value;
    $('#serp-header-skeleton').hidden = !value;
    $('#serp-summary-skeleton').hidden = !value;
    $('#serp-summary').hidden = value;
    $('#serp-loading-progress').hidden = !value;
    $('#serp-cards').hidden = value;
    $('#serp-skeleton-cards').hidden = !value;
    renderInformer();
  }
  function cancelLoading() {
    clearTimeout(loadTimer);
    loadVersion += 1;
    setLoading(false);
    $('#serp-loading-status').textContent = '';
  }
  function finishLoading(version = loadVersion) {
    if (!loading || version !== loadVersion) return;
    clearTimeout(loadTimer);
    if (pendingQueryFailure) {
      $('#serp-feed').setAttribute('aria-busy', 'false');
      $('#serp-loading-status').textContent = 'Ошибка на странице';
      window.dispatchEvent(new CustomEvent('avia:query-failed'));
      return;
    }
    renderResults();
    setLoading(false);
    $('#serp-loading-status').textContent = `Загрузка завершена. Вариантов: ${filteredTickets().length}`;
  }
  function startLoading() {
    cancelLoading();
    const version = loadVersion;
    setLoading(true);
    $('#serp-loading-status').textContent = 'Ищем авиабилеты';
    loadTimer = setTimeout(() => finishLoading(version), mockSearchDelay);
  }

  const disclosure = (label, key, count, subtitle = '') => `<div class="serp-disclosure-row"><button type="button" class="serp-disclosure" data-filter-section="${key}"><span>${label}</span><span class="serp-disclosure-trailing">${subtitle ? `<small>${subtitle}</small>` : ''}<img src="${asset('ic12Arrowright')}" alt=""></span></button>${count ? `<button type="button" class="serp-filter-counter" data-reset-group="${key}" aria-label="${label}: сбросить ${count}"><img src="${asset('ic16CloseCircle')}" alt=""><span>${count}</span></button>` : ''}</div>`;
  function range(label, key) {
    const { min, max } = timeBounds[key];
    return `<div class="serp-range-block" data-range-block="${key}"><h3>${label}</h3><div class="serp-range-values"><span>${rangeTime(key, min)}</span><span>${rangeTime(key, max)}</span><div class="serp-range-current" hidden><span></span><button type="button" data-reset-range="${key}" aria-label="${label}: сбросить время"><img src="${asset('icV212Close')}" alt=""></button></div></div><div class="serp-range-pair"><div class="serp-range-track"></div><input aria-label="${label}: начало" type="range" min="${min}" max="${max}" value="${filters[`${key}Min`]}" data-range="${key}Min"><input aria-label="${label}: конец" type="range" min="${min}" max="${max}" value="${filters[`${key}Max`]}" data-range="${key}Max"></div><div class="serp-range-ticks" aria-hidden="true">${(key === 'transfer' ? [] : [.25,.5,.75]).map(ratio => `<span style="left:${ratio * 100}%">${clockTime(Math.round(min + (max - min) * ratio))}</span>`).join('')}</div></div>`;
  }

  function updateRange(key) {
    const block = $(`[data-range-block="${key}"]`);
    if (!block) return;
    const { min, max } = timeBounds[key];
    const lower = filters[`${key}Min`], upper = filters[`${key}Max`];
    const start = (lower - min) / (max - min || 1), end = (upper - min) / (max - min || 1);
    const changed = [lower !== min ? rangeTime(key, lower) : '', upper !== max ? rangeTime(key, upper) : ''].filter(Boolean);
    block.style.setProperty('--range-start', `${start * 100}%`);
    block.style.setProperty('--range-end', `${end * 100}%`);
    block.style.setProperty('--range-bubble', lower === min ? end : upper === max ? start : (start + end) / 2);
    const bubble = block.querySelector('.serp-range-current');
    bubble.hidden = !changed.length;
    bubble.querySelector('span').textContent = changed.join(' — ');
    block.querySelectorAll('input').forEach(input => {
      input.value = filters[input.dataset.range];
      input.setAttribute('aria-valuetext', rangeTime(key, Number(input.value)));
      input.style.zIndex = input.dataset.range.endsWith('Min') ? (start > .5 ? 3 : 2) : 2;
    });
    $('#serp-filter-reset').hidden = activeCount() === 0;
  }

  function renderFilterBody() {
    const body = $('#serp-filter-body');
    const title = { root: 'Фильтры', airports: 'Аэропорты', companies: 'Авиакомпании' }[section];
    $('#serp-filter-sheet').dataset.section = section;
    $('#serp-filter-title').textContent = title;
    $('#serp-filter-nav-back').hidden = section === 'root';
    $('#serp-filter-reset').hidden = activeCount() === 0;
    if (section === 'root') {
      body.innerHTML = `<div class="serp-filter-main"><div class="serp-filter-main-quick"><button type="button" class="serp-chip" data-toggle="direct" aria-pressed="${filters.direct}"><strong>Без пересадок</strong><span>${$('#serp-direct-price').textContent}</span></button><button type="button" class="serp-chip" data-toggle="baggage" aria-pressed="${filters.baggage}"><strong>С багажом</strong><span>${$('#serp-baggage-price').textContent}</span></button></div>${disclosure('Сортировка', 'sort', 0, sortTitle().toLocaleLowerCase('ru-RU'))}${disclosure('Пересадки', 'transfers', transferCount())}${disclosure('Аэропорты', 'airports', airportCount())}${disclosure('Авиакомпании', 'companies', companyCount())}</div><div class="serp-filter-intervals">${range(`Вылет из ${mockRoute.fromGenitive}`, 'depart')}<hr class="serp-filter-divider">${range(`Прибытие в ${mockRoute.to}`, 'arrive')}</div>`;
      ['direct', 'baggage'].forEach(key => { $(`[data-toggle="${key}"]`).disabled = $(`#serp-${key}`).disabled; });
      updateRange('depart');
      updateRange('arrive');
    }
  }

  function update() {
    if (appliedFilters) renderFilterBody();
    else renderResults();
  }
  function renderSortSelection() {
    $('#serp-sort-options').querySelectorAll('input').forEach(input => { input.checked = input.value === filters.sort; });
    $('#serp-selection-reset').hidden = filters.sort === 'recommended';
    renderFilterBody();
  }
  const transferCheckbox = (key, title, subtitle = '', code = '') => `<label class="serp-transfer-option"><input type="checkbox" ${code ? `data-transfer-airport="${code}"` : `data-transfer="${key}"`} aria-label="${title}"><span class="serp-transfer-label"><span>${title}</span>${subtitle ? `<small>${subtitle}</small>` : ''}</span>${code ? `<span class="serp-transfer-code">${code}</span>` : ''}</label>`;
  function transferContent() {
    return `<div class="serp-transfer-conditions">${transferCheckbox('direct', 'Без пересадок')}<hr class="serp-filter-divider"><div>${transferCheckbox('oneTransfer', 'Не более одной пересадки')}${transferCheckbox('noNightTransfers', 'Без ночных пересадок')}${transferCheckbox('noAirportChange', 'Без смены аэропорта', 'Пересадка в том же аэропорту')}</div></div><div class="serp-transfer-block">${range('Длительность пересадки', 'transfer')}</div><div class="serp-transfer-block serp-transfer-airports"><h3>Аэропорты пересадок</h3>${transferCheckbox('allAirports', 'Все аэропорты')}<div>${transferAirports.map(airport => transferCheckbox('', airport.title, '', airport.code)).join('')}</div></div>`;
  }
  function renderTransferSelection() {
    $('#serp-selection-body').querySelectorAll('[data-transfer], [data-transfer-airport]').forEach(input => {
      const key = input.dataset.transfer;
      if (key === 'direct') input.disabled = !tickets.some(ticket => ticket.stops === 0);
      input.checked = input.dataset.transferAirport ? filters.transferAirports.includes(input.dataset.transferAirport)
        : key === 'allAirports' ? filters.transferAirports.length === transferAirports.length
          : key === 'oneTransfer' ? filters.transferLimit === 1 : filters[key];
    });
    $('#serp-selection-reset').hidden = transferCount() === 0;
    updateRange('transfer');
    renderFilterBody();
  }
  function airportContent() {
    const rows = key => routeAirports[key].map(airport => `<label class="serp-choice-option"><input type="checkbox" data-airport-group="${key}" value="${airport.code}" aria-label="${airport.title}, ${airport.code}"><span class="serp-airport-content"><span class="serp-airport-name"><span>${airport.title},</span><small>${airport.city}</small></span><small>${airport.code}</small></span></label>`).join('');
    return `<div class="serp-airport-block"><label class="serp-choice-option"><input type="checkbox" data-all-route-airports><span>Все аэропорты</span></label><div class="serp-airport-direction"><h3>Туда</h3><h4>Вылет из ${mockRoute.fromGenitive}</h4><div>${rows('airports')}</div><h4>Прибытие в ${mockRoute.to}</h4><div>${rows('arrivalAirports')}</div></div></div>`;
  }
  function renderAirportSelection() {
    $('#serp-selection-body').querySelectorAll('[data-airport-group]').forEach(input => { input.checked = filters[input.dataset.airportGroup].includes(input.value); });
    $('[data-all-route-airports]').checked = Object.entries(routeAirports).every(([key, airports]) => airports.every(airport => filters[key].includes(airport.code)));
    $('#serp-selection-reset').hidden = airportCount() === 0;
    renderFilterBody();
  }
  function companyContent() {
    const rows = companyOptions.map(company => `<label class="serp-choice-option"><input type="checkbox" data-company="${company}" aria-label="${company}"><span class="serp-company-option-content"><img src="./assets/airline-${airlineAssets[company][0]}.svg" alt=""><span>${company}</span></span></label>`).join('');
    return `<div class="serp-company-options"><label class="serp-choice-option"><input type="checkbox" data-all-companies><span>Все авиакомпании</span></label><label class="serp-choice-option"><input type="checkbox" data-company-combinations aria-label="Несколько авиакомпаний в билете" aria-describedby="serp-combinations-hint"><span class="serp-transfer-label"><span>Несколько авиакомпаний в билете</span><small id="serp-combinations-hint">Включая выбранные</small></span></label><div>${rows}</div></div>`;
  }
  function renderCompanySelection() {
    $('#serp-selection-body').querySelectorAll('[data-company]').forEach(input => { input.checked = filters.companies.includes(input.dataset.company); });
    $('[data-all-companies]').checked = companyOptions.every(company => filters.companies.includes(company));
    $('[data-company-combinations]').checked = filters.companyCombinations;
    $('#serp-selection-reset').hidden = companyCount() === 0;
    renderFilterBody();
  }
  function openSelection(type) {
    const screen = $('#serp-screen'), layer = $('#serp-selection-layer');
    if (screen.dataset.selectionPresentation === 'open') return;
    clearTimeout(selectionCloseTimer);
    selection = type;
    $('#serp-selection-title').textContent = { sort: 'Сортировка', transfers: 'Пересадки', airports: 'Аэропорты', companies: 'Авиакомпании' }[type];
    const body = $('#serp-selection-body');
    body.className = { sort: 'serp-sort-body', transfers: 'serp-transfer-body', airports: 'serp-airport-body', companies: 'serp-company-body' }[type];
    if (type === 'sort') {
      body.innerHTML = `<div id="serp-sort-options" role="radiogroup" aria-label="Сортировка билетов">${sortOptions.map(([value, label]) => `<label class="serp-sort-option"><input type="radio" name="avia-sort" value="${value}"><span>${label}</span></label>`).join('')}</div>`;
      renderSortSelection();
    } else if (type === 'transfers') {
      body.innerHTML = transferContent();
      renderTransferSelection();
    } else if (type === 'airports') {
      body.innerHTML = airportContent();
      renderAirportSelection();
    } else if (type === 'companies') {
      body.innerHTML = companyContent();
      renderCompanySelection();
    }
    body.scrollTop = 0;
    layer.hidden = false;
    screen.dataset.selectionPresentation = 'open';
    $('#serp-filter-sheet').inert = true;
    $('#serp-filter-sheet').setAttribute('aria-modal', 'false');
    void $('#serp-selection-sheet').offsetHeight;
    screen.style.setProperty('--selection-progress', 1);
    $('#serp-selection-done').focus({ preventScroll: true });
  }
  function finishSelectionClosing(returnFocus = true) {
    const screen = $('#serp-screen');
    if (screen.dataset.selectionPresentation !== 'closing') return;
    clearTimeout(selectionCloseTimer);
    $('#serp-selection-layer').hidden = true;
    delete screen.dataset.selectionPresentation;
    $('#serp-filter-sheet').inert = false;
    $('#serp-filter-sheet').setAttribute('aria-modal', 'true');
    if (returnFocus && screen.dataset.filterPresentation === 'open') $(`[data-filter-section="${selection}"]`).focus({ preventScroll: true });
  }
  function closeSelection({ immediate = false, returnFocus = true } = {}) {
    if ($('#serp-selection-layer').hidden) return;
    const screen = $('#serp-screen');
    // Native selection mutates the shared filter draft. Dismissing only this
    // sheet keeps that draft; the outer filter sheet owns submit / rollback.
    selectionDrag = null;
    delete screen.dataset.selectionDragging;
    screen.dataset.selectionPresentation = 'closing';
    screen.style.setProperty('--selection-progress', 0);
    clearTimeout(selectionCloseTimer);
    if (immediate || matchMedia('(prefers-reduced-motion: reduce)').matches) finishSelectionClosing(returnFocus);
    else selectionCloseTimer = setTimeout(finishSelectionClosing, 550);
  }
  $('#serp-selection-sheet').addEventListener('transitionend', event => {
    if (event.target === $('#serp-selection-sheet') && event.propertyName === 'transform') finishSelectionClosing();
  });
  $('#serp-selection-body').addEventListener('change', event => {
    const input = event.target.closest('input[name="avia-sort"]');
    if (input) { filters.sort = input.value; renderSortSelection(); return; }
    const company = event.target.closest('[data-company], [data-all-companies], [data-company-combinations]');
    if (company) {
      const name = company.dataset.company;
      if (name) filters.companies = company.checked ? [...filters.companies, name] : filters.companies.filter(value => value !== name);
      else if (company.hasAttribute('data-all-companies')) filters.companies = company.checked ? [...companyOptions] : [];
      else filters.companyCombinations = company.checked;
      // All five current demo tickets have a single carrier. This independent
      // native flag is retained in the draft; mixed-carrier search needs backend data.
      renderCompanySelection();
      return;
    }
    const airport = event.target.closest('[data-airport-group], [data-all-route-airports]');
    if (airport) {
      const key = airport.dataset.airportGroup;
      if (key) filters[key] = airport.checked ? [...filters[key], airport.value] : filters[key].filter(code => code !== airport.value);
      else Object.entries(routeAirports).forEach(([group, airports]) => { filters[group] = airport.checked ? airports.map(item => item.code) : []; });
      renderAirportSelection();
      return;
    }
    const checkbox = event.target.closest('[data-transfer], [data-transfer-airport]');
    if (!checkbox) return;
    const { transfer: key, transferAirport: code } = checkbox.dataset;
    if (code) filters.transferAirports = checkbox.checked ? [...filters.transferAirports, code] : filters.transferAirports.filter(value => value !== code);
    else if (key === 'allAirports') filters.transferAirports = checkbox.checked ? transferAirports.map(a => a.code) : [];
    else if (key === 'oneTransfer') filters.transferLimit = checkbox.checked ? 1 : null;
    else filters[key] = checkbox.checked;
    renderTransferSelection();
  });
  $('#serp-selection-body').addEventListener('input', event => {
    const input = event.target.closest('[data-range]');
    if (!input) return;
    const key = input.dataset.range, value = Number(input.value);
    filters[key] = key.endsWith('Min') ? Math.min(value, filters.transferMax) : Math.max(value, filters.transferMin);
    renderTransferSelection();
  });
  $('#serp-selection-body').addEventListener('click', event => {
    if (!event.target.closest('[data-reset-range="transfer"]')) return;
    filters.transferMin = timeBounds.transfer.min;
    filters.transferMax = timeBounds.transfer.max;
    renderTransferSelection();
    $('[data-range="transferMin"]').focus({ preventScroll: true });
  });
  $('#serp-selection-reset').addEventListener('click', () => {
    if (selection === 'sort') { filters.sort = 'recommended'; renderSortSelection(); }
    else if (selection === 'airports') { resetAirports(); renderAirportSelection(); }
    else if (selection === 'companies') { resetCompanies(); renderCompanySelection(); }
    else { resetTransfers(); renderTransferSelection(); }
    $('#serp-selection-done').focus({ preventScroll: true });
  });
  ['#serp-selection-done', '#serp-selection-apply', '#serp-selection-shade'].forEach(selector => $(selector).addEventListener('click', () => closeSelection()));
  function openFilters() {
    if (loading) return;
    const screen = $('#serp-screen'), layer = $('#serp-filter-layer');
    if (screen.dataset.filterPresentation === 'open') return;
    clearTimeout(closeTimer);
    section = 'root';
    appliedFilters = cloneFilters(filters);
    screen.dataset.filterPresentation = 'open';
    layer.hidden = false;
    $('#serp-page').inert = true;
    $('#serp-open-filters').setAttribute('aria-expanded', 'true');
    renderFilterBody();
    $('#serp-filter-body').scrollTop = 0;
    // Establish the offscreen position before starting the reversible transition.
    void $('#serp-filter-sheet').offsetHeight;
    screen.style.setProperty('--filter-progress', 1);
    $('#serp-filter-done').focus({ preventScroll: true });
  }
  function finishClosing() {
    const screen = $('#serp-screen');
    if (screen.dataset.filterPresentation !== 'closing') return;
    clearTimeout(closeTimer);
    $('#serp-filter-layer').hidden = true;
    delete screen.dataset.filterPresentation;
    $('#serp-page').inert = false;
    section = 'root';
    if (!screen.hidden) $('#serp-open-filters').focus({ preventScroll: true });
  }
  function closeFilters({ apply = false, immediate = false } = {}) {
    const screen = $('#serp-screen');
    closeSelection({ immediate: true, returnFocus: false });
    if ($('#serp-filter-layer').hidden) return;
    if (appliedFilters) {
      if (!apply) filters = cloneFilters(appliedFilters);
      appliedFilters = null;
      renderResults();
    }
    drag = null;
    delete screen.dataset.filterDragging;
    screen.dataset.filterPresentation = 'closing';
    screen.style.setProperty('--filter-progress', 0);
    $('#serp-open-filters').setAttribute('aria-expanded', 'false');
    clearTimeout(closeTimer);
    if (immediate || screen.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) finishClosing();
    else closeTimer = setTimeout(finishClosing, 550);
  }
  $('#serp-filter-sheet').addEventListener('transitionend', event => {
    if (event.target === $('#serp-filter-sheet') && event.propertyName === 'transform') finishClosing();
  });
  function configureSearch(scenarioId) {
    const formatDate = date => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date);
    const dateValueInDays = days => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date;
    };
    const dateInDays = days => formatDate(dateValueInDays(days));
    const saturday = new Date();
    saturday.setDate(saturday.getDate() + (6 - saturday.getDay() + 7) % 7);
    const sunday = new Date(saturday);
    sunday.setDate(sunday.getDate() + 1);
    const weekendDates = saturday.getMonth() === sunday.getMonth()
      ? `${saturday.getDate()}–${formatDate(sunday)}`
      : `${formatDate(saturday)} — ${formatDate(sunday)}`;
    const searchFixtures = {
      'exact-one-way': { date: '10 ноября', travellers: 1, direction: 'oneWay' },
      'exact-round-trip': { date: '10–17 ноября', travellers: 1, direction: 'twoWays' },
      'exact-two-passengers': { date: '10 ноября', travellers: 2, direction: 'oneWay' },
      // Exact home suggestion fixtures. Relative dates follow the calendar;
      // November choices below are fixed demo assumptions, not search rules.
      'home-paris-week': { to: 'Париж', date: dateInDays(7), travellers: 1, direction: 'oneWay', tickets: parisTickets },
      'home-sea-autumn': {
        date: '10 ноября', travellers: 1, direction: 'oneWay',
        informer: 'Для поездки к морю выбрали направление и\u00a0дату вылета, вот какие варианты нашлись',
      },
      'home-petersburg-weekend': {
        to: 'Санкт-Петербург', date: weekendDates, travellers: 1, direction: 'twoWays', tickets: petersburgWeekendTickets,
        informer: 'Для поездки на выходные выбрали даты, вот какие варианты нашлись',
      },
      'home-london-two': {
        to: 'Лондон', date: dateInDays(7), travellers: 2, direction: 'oneWay', tickets: londonTickets,
        informer: 'Для поездки в Лондон выбрали дату вылета, вот какие варианты нашлись',
      },
      'home-sydney-cheaper': {
        to: 'Сидней', date: dateInDays(14), departureDate: dateValueInDays(14),
        travellers: 1, direction: 'oneWay', tickets: sydneyTickets, filters: { sort: 'price' },
        informer: 'Для поездки в Сидней выбрали дату вылета, вот какие варианты нашлись',
      },
      'home-sochi-filtered': {
        date: '10 ноября', travellers: 1, direction: 'oneWay', filters: { baggage: true },
        informer: 'Для поездки в Сочи выбрали дату вылета, вот какие варианты нашлись',
      },
      'new-search-from-results': {
        from: 'Санкт-Петербург', fromGenitive: 'Санкт-Петербурга', to: 'Казань',
        date: '20 ноября', travellers: 2, direction: 'oneWay', tickets: kazanTickets,
        // A full new query follows configureSearch, which resets all filters
        // and the previous informer instead of patching the current search.
      },
      // Completed baseline for the destination-change example; no informer.
      'exact-london-one-way': { date: '10 ноября', travellers: 1, direction: 'oneWay', to: 'Лондон', tickets: londonTickets },
      'exact-supported-filters': {
        date: '10 ноября', travellers: 1, direction: 'oneWay',
        tickets: supportedFilterTickets,
        filters: { direct: true, baggage: true, airports: ['SVO'], departMin: 600, departMax: 660 },
      },
      // Sochi and this November week are demo choices, not a ranking rule.
      'sea-week-november': {
        date: '10–17 ноября', travellers: 1, direction: 'twoWays',
        informer: 'Для поездки к морю выбрали направление и\u00a0даты, вот какие варианты нашлись',
      },
      'london-no-direct': {
        date: '10 ноября', travellers: 1, direction: 'oneWay', to: 'Лондон',
        tickets: londonTickets,
        // Only this fixture drops the explicitly requested nonstop condition.
        // Route and date stay exact, so no clarification message is needed.
        filters: { direct: false },
        informer: 'Часть условий пришлось убрать, чтобы было из чего выбрать',
      },
      'uk-week-no-direct': {
        date: '10–17 ноября', travellers: 1, direction: 'twoWays', to: 'Лондон',
        tickets: londonRoundTripTickets,
        // A country and a month require concrete demo values; the requested
        // nonstop condition has no matches in this explicit mock scenario.
        filters: { direct: false },
        informer: 'Для поездки в Великобританию выбрали направление и\u00a0даты, часть условий пришлось убрать, вот какие варианты нашлись',
      },
    };
    const search = searchFixtures[scenarioId] ?? { date: '12 октября', travellers: 1, direction: 'oneWay' };
    const sourceTickets = search.tickets ?? (search.direction === 'twoWays' ? roundTripTickets : demoTickets);
    // Mock totals for the full party; no live fare calculation is performed.
    tickets = sourceTickets.map(ticket => {
      let arrivalDateLabel = '';
      if (ticket.arrivalDayOffset && search.departureDate) {
        const arrivalDate = new Date(search.departureDate);
        arrivalDate.setDate(arrivalDate.getDate() + ticket.arrivalDayOffset);
        arrivalDateLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(arrivalDate).replace(/\.$/, '');
      }
      return { ...ticket, price: ticket.price * search.travellers, arrivalDateLabel };
    });
    configureFilterOptions();
    filters = { ...defaults(), ...search.filters };
    searchExplanation = search.informer ?? '';
    mockRoute = { from: search.from ?? 'Москва', fromGenitive: search.fromGenitive ?? 'Москвы', to: search.to ?? 'Сочи', date: search.date, travellers: search.travellers };
    setSearchDirection(search.direction);
  }

  function show({ direction, scenarioId, refinement, loadResults = true, queryFailure = false } = {}) {
    pendingQueryFailure = queryFailure;
    closeFilters({ immediate: true });
    if (queryFailure) {
      // Preserve the previous trip type for returning from an invalid query.
    } else if (refinement) {
      const { destination, ...filterChanges } = refinement;
      if (destination === 'Манчестер' && mockRoute.to === 'Лондон') {
        // Explicit destination replacement keeps the current departure city,
        // dates, party and direction. London's arrival-airport selection no
        // longer applies; the other filters stay unchanged for these fixtures.
        const fares = searchDirection === 'twoWays' ? manchesterRoundTripTickets : manchesterTickets;
        tickets = fares.map(ticket => ({ ...ticket, price: ticket.price * mockRoute.travellers }));
        mockRoute = { ...mockRoute, to: destination };
        filters.arrivalAirports = [];
        configureFilterOptions();
        searchExplanation = '';
      }
      // Refinements keep the current route, fares and all unchanged filters.
      filters = { ...filters, ...filterChanges };
    } else if (scenarioId !== undefined) configureSearch(scenarioId);
    if (direction) setSearchDirection(direction);
    $('#serp-screen').hidden = false;
    $('#serp-feed').scrollTop = 0;
    if (loadResults) startLoading();
    else { cancelLoading(); renderResults(); }
  }
  function reset() { closeFilters({ immediate: true }); configureSearch(null); cancelLoading(); renderResults(); }

  $('#serp-direct').addEventListener('click', () => { filters.direct = !filters.direct; update(); });
  $('#serp-baggage').addEventListener('click', () => { filters.baggage = !filters.baggage; update(); });
  $('#serp-open-filters').addEventListener('click', openFilters);
  $('#serp-filter-shade').addEventListener('click', () => closeFilters());
  $('#serp-filter-done').addEventListener('click', () => { if (section === 'root') closeFilters({ apply: true }); else { section = 'root'; renderFilterBody(); } });
  $('#serp-filter-nav-back').addEventListener('click', () => { section = 'root'; renderFilterBody(); });
  $('#serp-filter-apply').addEventListener('click', () => closeFilters({ apply: true }));
  $('#serp-filter-reset').addEventListener('click', () => { filters = defaults(); update(); $('#serp-filter-done').focus({ preventScroll: true }); });
  $('#serp-back').addEventListener('click', () => window.dispatchEvent(new Event('avia:back-home')));
  $('#serp-cards').addEventListener('click', (event) => { if (event.target.closest('#serp-empty-reset')) { filters = defaults(); update(); } });
  $('#serp-filter-body').addEventListener('click', (event) => {
    const resetGroup = event.target.closest('[data-reset-group]');
    if (resetGroup) {
      const key = resetGroup.dataset.resetGroup;
      if (key === 'transfers') resetTransfers();
      else if (key === 'airports') resetAirports();
      else if (key === 'companies') resetCompanies();
      else filters[key] = [];
      update();
      $(`[data-filter-section="${key}"]`).focus({ preventScroll: true });
      return;
    }
    const resetRange = event.target.closest('[data-reset-range]');
    if (resetRange) {
      const key = resetRange.dataset.resetRange;
      filters[`${key}Min`] = timeBounds[key].min;
      filters[`${key}Max`] = timeBounds[key].max;
      updateRange(key);
      $(`[data-range="${key}Min"]`).focus({ preventScroll: true });
      return;
    }
    const disclosureButton = event.target.closest('[data-filter-section]');
    if (disclosureButton) {
      openSelection(disclosureButton.dataset.filterSection);
      return;
    }
    const toggle = event.target.closest('[data-toggle]');
    if (toggle) { const key = toggle.dataset.toggle; filters[key] = !filters[key]; update(); $(`[data-toggle="${key}"]`).focus({ preventScroll: true }); return; }
    const button = event.target.closest('[data-option]');
    if (!button) return;
    const { option: key, value } = button.dataset;
    if (key === 'sort') filters.sort = value;
    else if (key === 'direct') filters.direct = !filters.direct;
    else if (key === 'transferLimit') filters.transferLimit = filters.transferLimit === 1 ? null : 1;
    else {
      const choices = filters[key];
      filters[key] = choices.includes(value) ? choices.filter(item => item !== value) : [...choices, value];
    }
    update();
  });
  $('#serp-filter-body').addEventListener('input', (event) => {
    const input = event.target.closest('[data-range]');
    if (!input) return;
    const key = input.dataset.range;
    const value = Number(input.value);
    if (key.endsWith('Min')) filters[key] = Math.min(value, filters[key.replace('Min', 'Max')]);
    else filters[key] = Math.max(value, filters[key.replace('Max', 'Min')]);
    input.value = filters[key];
    updateRange(key.startsWith('depart') ? 'depart' : 'arrive');
  });
  // A pull on the navigation bar dismisses the root sheet, like the system sheet.
  // Keep its progress coupled to the results scale and dimming, including cancellation.
  const filterNav = $('.serp-filter-nav');
  filterNav.addEventListener('pointerdown', event => {
    if (section !== 'root' || event.target.closest('button') || event.button !== 0) return;
    const scale = $('#phone').getBoundingClientRect().height / $('#phone').offsetHeight;
    drag = { start: event.clientY, distance: 0, at: performance.now(), scale, pointer: event.pointerId };
    filterNav.setPointerCapture(event.pointerId);
  });
  filterNav.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    drag.distance = Math.max(0, (event.clientY - drag.start) / drag.scale);
    if (drag.distance < 3) return;
    $('#serp-screen').dataset.filterDragging = 'true';
    $('#serp-screen').style.setProperty('--filter-progress', Math.max(0, 1 - drag.distance / $('#serp-filter-sheet').offsetHeight));
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.pointer) return;
    const dismiss = event.type !== 'pointercancel' && (drag.distance > 110 || (drag.distance > 24 && drag.distance / (performance.now() - drag.at) > .65));
    drag = null;
    delete $('#serp-screen').dataset.filterDragging;
    if (dismiss) closeFilters();
    else $('#serp-screen').style.setProperty('--filter-progress', 1);
  }
  filterNav.addEventListener('pointerup', endDrag);
  filterNav.addEventListener('pointercancel', endDrag);
  const selectionNav = $('#serp-selection-nav');
  selectionNav.addEventListener('pointerdown', event => {
    if (event.target.closest('button') || event.button !== 0) return;
    const scale = $('#phone').getBoundingClientRect().height / $('#phone').offsetHeight;
    selectionDrag = { start: event.clientY, distance: 0, at: performance.now(), scale, pointer: event.pointerId };
    selectionNav.setPointerCapture(event.pointerId);
  });
  selectionNav.addEventListener('pointermove', event => {
    if (!selectionDrag || event.pointerId !== selectionDrag.pointer) return;
    selectionDrag.distance = Math.max(0, (event.clientY - selectionDrag.start) / selectionDrag.scale);
    if (selectionDrag.distance < 3) return;
    $('#serp-screen').dataset.selectionDragging = 'true';
    $('#serp-screen').style.setProperty('--selection-progress', Math.max(0, 1 - selectionDrag.distance / $('#serp-selection-sheet').offsetHeight));
  });
  function endSelectionDrag(event) {
    if (!selectionDrag || event.pointerId !== selectionDrag.pointer) return;
    const dismiss = event.type !== 'pointercancel' && (selectionDrag.distance > 110 || (selectionDrag.distance > 24 && selectionDrag.distance / (performance.now() - selectionDrag.at) > .65));
    selectionDrag = null;
    delete $('#serp-screen').dataset.selectionDragging;
    if (dismiss) closeSelection();
    else $('#serp-screen').style.setProperty('--selection-progress', 1);
  }
  selectionNav.addEventListener('pointerup', endSelectionDrag);
  selectionNav.addEventListener('pointercancel', endSelectionDrag);
  window.addEventListener('keydown', (event) => {
    if ($('#serp-filter-layer').hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!$('#serp-selection-layer').hidden) closeSelection();
      else if (section === 'root') closeFilters();
      else { section = 'root'; renderFilterBody(); }
    }
    const activeSheet = $('#serp-selection-layer').hidden ? $('#serp-filter-sheet') : $('#serp-selection-sheet');
    if (event.key === 'Tab' && activeSheet.contains(document.activeElement)) {
      const focusables = [...activeSheet.querySelectorAll('button, input')].filter(el => !el.disabled && el.getClientRects().length && (el.type !== 'radio' || el.checked));
      const current = focusables.indexOf(document.activeElement);
      if ((!event.shiftKey && current === focusables.length - 1) || (event.shiftKey && current === 0)) {
        event.preventDefault();
        focusables[event.shiftKey ? focusables.length - 1 : 0].focus();
      }
    }
  });

  $('#serp-skeleton-cards').replaceChildren(...Array.from({ length: 5 }, makeSkeletonCard));
  setSearchDirection(searchDirection);
  renderResults();
  window.aviaSerp = Object.freeze({ show, closeFilters, cancelLoading, reset, canRefine, getState: () => ({ loading, searchDirection, filters: JSON.parse(JSON.stringify(filters)), route: { ...mockRoute }, count: filteredTickets().length }) });
})();
