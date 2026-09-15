const page = document.querySelector('.avia-search-page')
const searchForm = document.querySelector('#avia-search-form')
const filtersForm = document.querySelector('#avia-filters-form')
const sortSelect = document.querySelector('#avia-sort')
const flightList = document.querySelector('#flight-list')
const emptyState = document.querySelector('#avia-empty')
const calendarPopover = document.querySelector('#avia-calendar')
const announcer = document.querySelector('#avia-announcer')

if (!page || !searchForm || !filtersForm || !sortSelect || !flightList || !emptyState || !calendarPopover || !announcer) {
  throw new Error('Не найдены обязательные элементы страницы поиска авиабилетов')
}

const params = new URLSearchParams(window.location.search)
const calendarMonthNames = Object.freeze(['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'])
const calendarMonthShort = Object.freeze(['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'])
const calendarToday = new Date()
calendarToday.setHours(0, 0, 0, 0)
const calendarBaseYear = calendarToday.getFullYear()
const calendarMinimumMonth = new Date(calendarBaseYear, calendarToday.getMonth(), 1)
const requestedScope = params.get('flightScope')?.trim()
const tripDepart = params.get('depart')?.trim() || '29 сентября'
const tripReturn = params.get('return')?.trim() || ''
const requestedOutbound = params.get('flightOutboundDate')?.trim() || tripDepart
const requestedReturn = params.get('flightReturnDate')?.trim() || tripReturn
const initialFlightScope = requestedScope === 'oneway'
  ? 'oneway'
  : requestedScope === 'roundtrip'
    ? 'roundtrip'
    : params.has('flightReturnDate') && !params.get('flightReturnDate')?.trim()
      ? 'oneway'
      : 'roundtrip'

const returnParamNames = Object.freeze([
  'flightReturnDate',
  'returnAirline',
  'returnFlightNumber',
  'returnDepartTime',
  'returnArrivalTime',
  'returnDuration',
  'returnFromCode',
  'returnToCode',
  'returnFrom',
  'returnTo',
  'returnFromAirport',
  'returnToAirport',
])

const airportCatalog = Object.freeze({
  'Москва': Object.freeze({ primary: Object.freeze({ name: 'Внуково', code: 'VKO' }), secondary: Object.freeze({ name: 'Шереметьево', code: 'SVO' }) }),
  'Стамбул': Object.freeze({ primary: Object.freeze({ name: 'Новый аэропорт Стамбул', code: 'IST' }), secondary: Object.freeze({ name: 'Сабиха Гёкчен', code: 'SAW' }) }),
  'Санкт-Петербург': Object.freeze({ primary: Object.freeze({ name: 'Пулково', code: 'LED' }), secondary: Object.freeze({ name: 'Пулково', code: 'LED' }) }),
  'Казань': Object.freeze({ primary: Object.freeze({ name: 'Казань', code: 'KZN' }), secondary: Object.freeze({ name: 'Казань', code: 'KZN' }) }),
  'Сочи': Object.freeze({ primary: Object.freeze({ name: 'Адлер', code: 'AER' }), secondary: Object.freeze({ name: 'Адлер', code: 'AER' }) }),
  'Екатеринбург': Object.freeze({ primary: Object.freeze({ name: 'Кольцово', code: 'SVX' }), secondary: Object.freeze({ name: 'Кольцово', code: 'SVX' }) }),
})

const cityCases = Object.freeze({
  'Москва': Object.freeze({ from: 'Москвы', to: 'Москву' }),
  'Стамбул': Object.freeze({ from: 'Стамбула', to: 'Стамбул' }),
  'Санкт-Петербург': Object.freeze({ from: 'Санкт-Петербурга', to: 'Санкт-Петербург' }),
  'Казань': Object.freeze({ from: 'Казани', to: 'Казань' }),
  'Сочи': Object.freeze({ from: 'Сочи', to: 'Сочи' }),
  'Екатеринбург': Object.freeze({ from: 'Екатеринбурга', to: 'Екатеринбург' }),
})

function travellerFromParams() {
  const existing = params.get('traveller')?.trim()
  if (existing && /\d/u.test(existing)) return existing
  const adults = Math.max(1, Number(params.get('adults')) || 1)
  const children = Math.max(0, Number(params.get('children')) || 0)
  const adultWord = adults % 10 === 1 && adults % 100 !== 11 ? 'взрослый' : 'взрослых'
  return `${adults} ${adultWord}${children ? `, ${children} ${children === 1 ? 'ребёнок' : 'детей'}` : ''}`
}

function lockTripParticipantCount(control) {
  const limit = Math.max(0, Number(params.get('tripAdults') || params.get('adults')) || 0) + Math.max(0, Number(params.get('tripChildren') || params.get('children')) || 0)
  if (!(params.get('workTrip') === '1' || params.get('addToTrip') === '1' || params.get('draft') === '1') || !limit) return
  const count = value => [...String(value).matchAll(/\d+/gu)].reduce((total, match) => total + Number(match[0]), 0)
  ;[...control.options].forEach(option => { option.disabled = count(option.value) > limit })
}

const state = {
  origin: params.get('from')?.trim() || 'Москва',
  destination: params.get('to')?.trim() || 'Стамбул',
  tripDepart,
  tripReturning: tripReturn,
  depart: requestedOutbound,
  returning: initialFlightScope === 'roundtrip' ? (requestedReturn || '30 сентября') : '',
  flightScope: initialFlightScope,
  traveller: travellerFromParams(),
  sort: 'popular',
  directChip: false,
  baggageChip: false,
  selectedFlightId: null,
}

const airportPopover = document.querySelector('#avia-airport-popover')
let airportField = null

const calendarState = {
  triggerField: null,
  mode: 'range',
  phase: 'start',
  month: 0,
  year: calendarBaseYear,
  depart: null,
  returning: null,
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function parseCalendarDate(value) {
  const months = { янв: 0, январ: 0, фев: 1, март: 2, мар: 2, апр: 3, май: 4, мая: 4, июн: 5, июл: 6, авг: 7, сен: 8, сент: 8, окт: 9, ноя: 10, дек: 11 }
  const match = String(value).toLocaleLowerCase('ru').match(/(\d{1,2})\s+([а-яё]+)/u)
  if (!match) return null
  const monthKey = Object.keys(months).find(key => match[2].startsWith(key))
  if (!monthKey) return null
  const month = months[monthKey]
  const year = month < calendarToday.getMonth() ? calendarBaseYear + 1 : calendarBaseYear
  return new Date(year, month, Number(match[1]))
}

function formatCalendarDate(date) {
  return `${date.getDate()} ${calendarMonthShort[date.getMonth()]}`
}

function isSameCalendarDate(first, second) {
  return Boolean(first && second
    && first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate())
}

function syncCalendarFromInputs() {
  const depart = parseCalendarDate(searchForm.elements.depart.value)
  const returning = parseCalendarDate(searchForm.elements.return.value)
  if (depart && returning && returning < depart) returning.setFullYear(returning.getFullYear() + 1)
  calendarState.depart = depart
  calendarState.returning = returning
}

function renderCalendarMonths() {
  const months = []
  for (let offset = 0; offset < 13; offset += 1) {
    const date = new Date(calendarMinimumMonth.getFullYear(), calendarMinimumMonth.getMonth() + offset, 1)
    const active = date.getMonth() === calendarState.month && date.getFullYear() === calendarState.year
    const showYear = date.getMonth() === 0
    months.push(`
      <button class="calendar-month${active ? ' is-active' : ''}" type="button" data-calendar-action="change-month" data-month="${date.getMonth()}" data-year="${date.getFullYear()}"${active ? ' aria-current="date"' : ''}>
        ${escapeHtml(calendarMonthNames[date.getMonth()])}${showYear ? ` ${date.getFullYear()}` : ''}
      </button>`)
  }
  return months.join('')
}

function renderCalendarDays() {
  const first = new Date(calendarState.year, calendarState.month, 1)
  const daysInMonth = new Date(calendarState.year, calendarState.month + 1, 0).getDate()
  const mondayIndex = (first.getDay() + 6) % 7
  const cells = []
  for (let index = 0; index < mondayIndex; index += 1) {
    cells.push('<span class="calendar-day is-muted" aria-hidden="true"></span>')
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(calendarState.year, calendarState.month, day)
    const weekday = (date.getDay() + 6) % 7
    const isStart = isSameCalendarDate(date, calendarState.depart)
    const isEnd = isSameCalendarDate(date, calendarState.returning)
    const isInRange = Boolean(calendarState.depart && calendarState.returning && date > calendarState.depart && date < calendarState.returning)
    const isDisabled = date < calendarToday
    const classes = [
      'calendar-day',
      weekday >= 5 ? 'is-weekend' : '',
      isInRange ? 'is-in-range' : '',
      isStart ? 'is-range-start is-selected' : '',
      isEnd ? 'is-range-end is-selected' : '',
    ].filter(Boolean).join(' ')
    cells.push(`<button class="${classes}" type="button" data-calendar-action="select-date" data-day="${day}" aria-label="${day} ${calendarMonthNames[calendarState.month].toLocaleLowerCase('ru')} ${calendarState.year}" aria-selected="${isStart || isEnd}" aria-disabled="${isDisabled}"${isDisabled ? ' disabled' : ''}>${day}</button>`)
  }
  return cells.join('')
}

function renderCalendar() {
  calendarPopover.innerHTML = `
    <div class="calendar-months">${renderCalendarMonths()}</div>
    <div class="calendar-main">
      <div class="calendar-weekdays" aria-hidden="true"><span>пн</span><span>вт</span><span>ср</span><span>чт</span><span>пт</span><span>сб</span><span>вс</span></div>
      <button class="calendar-one-way" type="button" data-calendar-action="oneway">Без обратного билета</button>
      <h3 class="calendar-title">${calendarMonthNames[calendarState.month]} ${calendarState.year}</h3>
      <div class="calendar-days" role="grid" aria-label="${calendarMonthNames[calendarState.month]} ${calendarState.year}">${renderCalendarDays()}</div>
    </div>`
}

function syncCalendarFieldState() {
  const isOpen = !calendarPopover.hidden
  searchForm.querySelectorAll('[data-calendar-field]').forEach(input => {
    const isActive = isOpen && input.dataset.calendarField === calendarState.triggerField
    input.setAttribute('aria-expanded', String(isActive))
    input.closest('[data-calendar-field-shell]')?.classList.toggle('is-calendar-open', isActive)
  })
}

function syncPendingFlightScope() {
  const scope = searchForm.elements.return.value.trim() ? 'roundtrip' : 'oneway'
  const returnField = document.querySelector('#avia-return-field')
  returnField.classList.toggle('is-oneway', scope === 'oneway')
  document.querySelector('#avia-return-caption').textContent = scope === 'oneway' ? 'В одну сторону' : 'Обратно'
}

function closeCalendar(options = {}) {
  const previousField = calendarState.triggerField
  calendarState.triggerField = null
  calendarState.phase = 'start'
  calendarPopover.hidden = true
  syncPendingFlightScope()
  syncCalendarFieldState()
  if (options.restoreFocus && previousField) searchForm.elements[previousField]?.focus()
}

function openCalendar(field) {
  if (!['depart', 'return'].includes(field)) return
  syncCalendarFromInputs()
  calendarState.triggerField = field
  calendarState.mode = 'range'
  calendarState.phase = field === 'return' && calendarState.depart ? 'end' : 'start'
  const selectedDate = field === 'return'
    ? calendarState.returning || calendarState.depart
    : calendarState.depart || calendarState.returning
  const visibleDate = selectedDate && selectedDate >= calendarToday ? selectedDate : calendarToday
  calendarState.month = visibleDate.getMonth()
  calendarState.year = visibleDate.getFullYear()
  calendarPopover.hidden = false
  renderCalendar()
  syncCalendarFieldState()
}

function chooseCalendarDate(day) {
  if (calendarPopover.hidden || !Number.isInteger(day)) return
  const selectedDate = new Date(calendarState.year, calendarState.month, day)
  if (selectedDate < calendarToday) return
  if (calendarState.phase === 'start') {
    calendarState.depart = selectedDate
    calendarState.returning = null
    searchForm.elements.depart.value = formatCalendarDate(selectedDate)
    searchForm.elements.return.value = ''
    calendarState.phase = 'end'
    calendarState.triggerField = 'return'
    renderCalendar()
    syncCalendarFieldState()
    announce('Дата вылета выбрана. Выберите дату обратно')
    return
  }
  if (!calendarState.depart || selectedDate < calendarState.depart) {
    calendarState.depart = selectedDate
    calendarState.returning = null
    searchForm.elements.depart.value = formatCalendarDate(selectedDate)
    searchForm.elements.return.value = ''
    calendarState.triggerField = 'return'
    renderCalendar()
    syncCalendarFieldState()
    announce('Выбрана новая дата вылета. Теперь выберите дату обратно')
    return
  }
  calendarState.returning = selectedDate
  searchForm.elements.return.value = formatCalendarDate(selectedDate)
  closeCalendar({ restoreFocus: true })
  announce('Даты перелёта выбраны')
}

function formatPrice(value) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

function minutesFromTime(value) {
  const [hours, minutes] = String(value).split(':').map(Number)
  return hours * 60 + minutes
}

function formatMinutes(value) {
  const minutes = Math.max(0, Math.min(1439, Number(value) || 0))
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function airport(city, variant = 'primary') {
  const fallback = { primary: { name: `Аэропорт ${city}`, code: city.slice(0, 3).toLocaleUpperCase('ru') }, secondary: { name: `Аэропорт ${city}`, code: city.slice(0, 3).toLocaleUpperCase('ru') } }
  return (airportCatalog[city] || fallback)[variant]
}

function airportChoices(query) {
  const normalized = String(query || '').trim().toLocaleLowerCase('ru')
  return Object.entries(airportCatalog).flatMap(([city, airports]) => [airports.primary, airports.secondary]
    .filter((item, index, array) => array.findIndex(candidate => candidate.code === item.code) === index)
    .map(item => ({ city, ...item })))
    .filter(item => !normalized || `${item.city} ${item.name} ${item.code}`.toLocaleLowerCase('ru').includes(normalized))
}

function closeAirportPopover() {
  if (!airportPopover) return
  airportPopover.hidden = true
  airportField = null
}

function openAirportPopover(field, showAll = false) {
  if (!airportPopover) return
  airportField = field
  const input = searchForm.elements[field]
  const bounds = input.getBoundingClientRect()
  const choices = airportChoices(showAll ? '' : input.value)
  airportPopover.style.left = `${Math.round(bounds.left)}px`
  airportPopover.style.top = `${Math.round(bounds.bottom + 8)}px`
  airportPopover.style.width = `${Math.max(280, Math.round(bounds.width))}px`
  airportPopover.innerHTML = choices.length
    ? choices.map(item => `<button class="avia-airport-option" type="button" role="option" data-airport-choice="${escapeHtml(field)}" data-city="${escapeHtml(item.city)}"><span><strong>${escapeHtml(item.city)}</strong><small>${escapeHtml(item.name)}</small></span><b>${escapeHtml(item.code)}</b></button>`).join('')
    : '<span class="avia-airport-option"><span><strong>Аэропорт не найден</strong><small>Измените запрос</small></span></span>'
  airportPopover.hidden = false
}

function cityCase(city, direction) {
  return cityCases[city]?.[direction] || city
}

function buildFlights() {
  const originPrimary = airport(state.origin)
  const originSecondary = airport(state.origin, 'secondary')
  const destinationPrimary = airport(state.destination)
  const destinationSecondary = airport(state.destination, 'secondary')
  const isRoundTrip = state.flightScope === 'roundtrip'
  const flights = [
    {
      id: 'pobeda-ajet',
      best: true,
      price: isRoundTrip ? 21967 : 12640,
      popularity: 100,
      stops: 0,
      overnight: false,
      hasBaggage: false,
      totalMinutes: isRoundTrip ? 565 : 315,
      handLuggage: { positive: true, dimensions: '36×30×27 см' },
      outbound: { airline: 'Победа', logo: 'pobeda', number: 'DP 993', depart: '06:40', duration: '5 ч 15 м', arrival: '11:55', from: originPrimary, to: destinationPrimary },
      returning: isRoundTrip ? { airline: 'S7', logo: 's7', number: 'S7 1002', depart: '00:40', duration: '4 ч 10 м', arrival: '04:50', from: destinationSecondary, to: originPrimary } : null,
    },
    {
      id: 'southwind-ajet',
      best: false,
      price: isRoundTrip ? 22626 : 13180,
      popularity: 82,
      stops: 0,
      overnight: false,
      hasBaggage: false,
      totalMinutes: isRoundTrip ? 475 : 225,
      handLuggage: { positive: false, dimensions: '' },
      outbound: { airline: 'Россия', logo: 'rossiya', number: 'FV 6012', depart: '15:05', duration: '3 ч 45 м', arrival: '18:50', from: originSecondary, to: destinationPrimary },
      returning: isRoundTrip ? { airline: 'S7', logo: 's7', number: 'S7 1002', depart: '00:40', duration: '4 ч 10 м', arrival: '04:50', from: destinationSecondary, to: originPrimary } : null,
    },
    {
      id: 'rossiya-direct', price: isRoundTrip ? 24480 : 14220, popularity: 76, stops: 0, overnight: false, hasBaggage: true, totalMinutes: isRoundTrip ? 500 : 250,
      handLuggage: { positive: true, dimensions: '55×40×20 см' },
      outbound: { airline: 'Россия', logo: 'rossiya', number: 'FV 6105', depart: '08:20', duration: '4 ч 10 м', arrival: '12:30', from: originPrimary, to: destinationSecondary },
      returning: isRoundTrip ? { airline: 'Россия', logo: 'rossiya', number: 'FV 6106', depart: '19:10', duration: '4 ч 05 м', arrival: '23:15', from: destinationSecondary, to: originPrimary } : null,
    },
    {
      id: 's7-direct', price: isRoundTrip ? 26790 : 15380, popularity: 68, stops: 0, overnight: false, hasBaggage: true, totalMinutes: isRoundTrip ? 455 : 225,
      handLuggage: { positive: true, dimensions: '55×40×23 см' },
      outbound: { airline: 'S7', logo: 's7', number: 'S7 1011', depart: '11:35', duration: '3 ч 45 м', arrival: '15:20', from: originSecondary, to: destinationPrimary },
      returning: isRoundTrip ? { airline: 'S7', logo: 's7', number: 'S7 1012', depart: '17:10', duration: '3 ч 50 м', arrival: '21:00', from: destinationPrimary, to: originSecondary } : null,
    },
    {
      id: 'pobeda-evening', price: isRoundTrip ? 28960 : 16450, popularity: 55, stops: 0, overnight: false, hasBaggage: false, totalMinutes: isRoundTrip ? 530 : 270,
      handLuggage: { positive: true, dimensions: '36×30×27 см' },
      outbound: { airline: 'Победа', logo: 'pobeda', number: 'DP 981', depart: '18:25', duration: '4 ч 30 м', arrival: '22:55', from: originPrimary, to: destinationPrimary },
      returning: isRoundTrip ? { airline: 'Победа', logo: 'pobeda', number: 'DP 982', depart: '07:15', duration: '4 ч 20 м', arrival: '11:35', from: destinationPrimary, to: originPrimary } : null,
    },
  ]
  const priceShift = [...`${state.origin}|${state.destination}|${state.depart}|${state.returning}`].reduce((sum, char) => sum + char.codePointAt(0), 0) % 1700
  return flights.map((flight, index) => ({ ...flight, price: flight.price + priceShift + index * 230 }))
}

function airlineLogo(logo) {
  if (logo === 'pobeda') return '<span class="airline-logo airline-logo--pobeda"><img src="./assets/avia/pobeda-tile.svg" alt=""><img src="./assets/avia/pobeda-dots.svg" alt=""></span>'
  if (logo === 'rossiya') return '<span class="airline-logo"><img src="./assets/avia-confirmation/rossiya.png" alt=""></span>'
  return '<span class="airline-logo"><img src="./assets/avia/s7.svg" alt=""></span>'
}

function renderLeg(leg) {
  return `
    <div class="flight-leg">
      <div class="flight-airline">${airlineLogo(leg.logo)}<span>${escapeHtml(leg.airline)}</span></div>
      <div class="flight-schedule">
        <div class="flight-time-row">
          <strong class="flight-time">${escapeHtml(leg.depart)}</strong>
          <span class="flight-progress"><span>${escapeHtml(leg.duration)}</span></span>
          <strong class="flight-time">${escapeHtml(leg.arrival)}</strong>
        </div>
        <div class="flight-location-row">
          <span class="flight-airport"><span>${escapeHtml(leg.from.name)}</span><span>${escapeHtml(leg.from.code)}</span></span>
          <span class="flight-direct">прямой</span>
          <span class="flight-airport flight-airport--arrival"><span>${escapeHtml(leg.to.name)}</span><span>${escapeHtml(leg.to.code)}</span></span>
        </div>
      </div>
    </div>`
}

function renderFlight(flight) {
  const positiveClass = flight.handLuggage.positive ? ' flight-benefit--positive' : ''
  const carryOnIcon = flight.handLuggage.positive ? 'carry-on-green.svg' : 'carry-on-black.svg'
  return `
    <article class="flight-card${flight.best ? ' flight-card--best' : ''}" data-flight-id="${escapeHtml(flight.id)}">
      ${flight.best ? '<span class="flight-best-badge">лучшая цена</span>' : ''}
      <div class="flight-card__content">
        <div class="flight-route">${renderLeg(flight.outbound)}${flight.returning ? renderLeg(flight.returning) : ''}</div>
        <aside class="flight-fare">
          <div class="flight-fare__inner">
            <div class="flight-benefit${positiveClass}"><img src="./assets/avia/${carryOnIcon}" alt=""><span><span>Ручная кладь</span>${flight.handLuggage.dimensions ? `<small>${escapeHtml(flight.handLuggage.dimensions)}</small>` : ''}</span></div>
            <div class="flight-benefit"><img src="./assets/avia/no-baggage.svg" alt=""><span>Без багажа</span></div>
            <button class="flight-share" type="button" data-action="share" data-flight-id="${escapeHtml(flight.id)}" aria-label="Поделиться рейсом"><img src="./assets/avia/share.svg" alt=""></button>
            <button class="flight-price-button" type="button" data-action="select-flight" data-flight-id="${escapeHtml(flight.id)}">${escapeHtml(formatPrice(flight.price))}</button>
            <span class="flight-fare__caption">выбрать тариф</span>
          </div>
        </aside>
      </div>
    </article>`
}

function currentFilters() {
  const data = new FormData(filtersForm)
  return {
    stops: String(data.get('stops') || 'one'),
    noNight: data.has('noNight'),
    transferMax: Number(data.get('transferMax')) || 460,
    departMax: Number(data.get('departMax')) || 1439,
    arrivalMax: Number(data.get('arrivalMax')) || 1439,
    returnMax: Number(data.get('returnMax')) || 1439,
    returnArrivalMax: Number(data.get('returnArrivalMax')) || 1439,
    airlines: data.getAll('airline').map(String),
    airports: data.getAll('airport').map(String),
  }
}

function filteredFlights() {
  const filter = currentFilters()
  let flights = buildFlights().filter(flight => {
    if ((state.directChip || filter.stops === 'direct') && flight.stops !== 0) return false
    if (filter.stops === 'one' && flight.stops > 1) return false
    if (filter.noNight && flight.overnight) return false
    if (state.baggageChip && !flight.hasBaggage) return false
    if (minutesFromTime(flight.outbound.depart) > filter.departMax) return false
    if (minutesFromTime(flight.outbound.arrival) > filter.arrivalMax) return false
    if (flight.returning && minutesFromTime(flight.returning.depart) > filter.returnMax) return false
    if (flight.returning && minutesFromTime(flight.returning.arrival) > filter.returnArrivalMax) return false
    const flightAirlines = [flight.outbound, flight.returning].filter(Boolean).map(leg => leg.airline)
    if (filter.airlines.length && !flightAirlines.some(name => filter.airlines.includes(name))) return false
    if (filter.airports.length) {
      const routeAirports = [flight.outbound, flight.returning].filter(Boolean).flatMap(leg => [leg.from.code, leg.to.code])
      if (!filter.airports.some(code => routeAirports.includes(code))) return false
    }
    return true
  })
  if (state.sort === 'cheap') flights.sort((a, b) => a.price - b.price)
  else if (state.sort === 'fast') flights.sort((a, b) => a.totalMinutes - b.totalMinutes)
  else flights.sort((a, b) => b.popularity - a.popularity)
  return flights
}

function renderFlights() {
  const flights = filteredFlights()
  flightList.innerHTML = flights.map(renderFlight).join('')
  flightList.hidden = flights.length === 0
  emptyState.hidden = flights.length > 0
}

let flightRefreshTimer = 0
function refreshFlights() {
  window.clearTimeout(flightRefreshTimer)
  flightList.hidden = false
  emptyState.hidden = true
  flightList.innerHTML = '<div class="search-results-loader" role="status">Обновляем цены и варианты…</div>'
  flightRefreshTimer = window.setTimeout(renderFlights, 360)
}

function setSearchValues() {
  searchForm.elements.origin.value = state.origin
  searchForm.elements.destination.value = state.destination
  searchForm.elements.depart.value = state.depart
  searchForm.elements.return.value = state.returning
  page.dataset.flightScope = state.flightScope
  const returnField = document.querySelector('#avia-return-field')
  returnField.classList.toggle('is-oneway', state.flightScope === 'oneway')
  document.querySelector('#avia-return-caption').textContent = state.flightScope === 'oneway' ? 'В одну сторону' : 'Обратно'
  const passengers = searchForm.elements.passengers
  if (![...passengers.options].some(option => option.value === state.traveller)) passengers.add(new Option(state.traveller, state.traveller))
  lockTripParticipantCount(passengers)
  passengers.value = state.traveller
  document.querySelector('#avia-origin-code').textContent = airport(state.origin).code
  document.querySelector('#avia-destination-code').textContent = airport(state.destination).code
  document.querySelector('#depart-from-label').textContent = `Вылет из ${cityCase(state.origin, 'from')}`
  document.querySelector('#arrival-to-label').textContent = `Прибытие в ${cityCase(state.destination, 'to')}`
  document.querySelector('#return-from-label').textContent = `Вылет из ${cityCase(state.destination, 'from')}`
  document.querySelector('#return-arrival-label').textContent = `Прибытие в ${cityCase(state.origin, 'to')}`
  document.querySelector('[data-filter-chip="direct"] span').textContent = state.flightScope === 'oneway' ? 'от 12 640 ₽' : 'от 21 939 ₽'
  document.querySelector('[data-filter-chip="baggage"] span').textContent = state.flightScope === 'oneway' ? 'от 15 490 ₽' : 'от 26 334 ₽'
  document.querySelector('#airport-options').innerHTML = [airport(state.origin), airport(state.origin, 'secondary'), airport(state.destination), airport(state.destination, 'secondary')]
    .filter((item, index, array) => array.findIndex(candidate => candidate.code === item.code) === index)
    .map(item => `<label><input type="checkbox" name="airport" value="${escapeHtml(item.code)}"><span>${escapeHtml(item.name)} · ${escapeHtml(item.code)}</span></label>`).join('')
}

function applyFlightScope(target) {
  target.searchParams.set('flightScope', state.flightScope)
  target.searchParams.set('flightOutboundDate', state.depart)
  if (state.flightScope === 'roundtrip' && state.returning) {
    target.searchParams.set('flightReturnDate', state.returning)
    return
  }
  returnParamNames.forEach(name => target.searchParams.delete(name))
}

function syncQuery() {
  const target = new URL (window.location.href)
  target.searchParams.set('from', state.origin)
  target.searchParams.set('to', state.destination)
  target.searchParams.set('depart', state.tripDepart)
  if (state.tripReturning) target.searchParams.set('return', state.tripReturning)
  target.searchParams.set('traveller', state.traveller)
  applyFlightScope(target)
  window.history.replaceState(null, '', target)
}

function announce(message) {
  announcer.textContent = message
}

function updateRangeCopies() {
  document.querySelector('#transfer-max-copy').textContent = `${Math.floor(filtersForm.elements.transferMax.value / 60)} ч ${filtersForm.elements.transferMax.value % 60} мин`
  ;['departMax', 'arrivalMax', 'returnMax', 'returnArrivalMax'].forEach(name => {
    document.querySelector(`#${name.replace('Max', '-max').replace('returnArrival', 'return-arrival')}-copy`)?.replaceChildren(formatMinutes(filtersForm.elements[name].value))
  })
}

function resetFilters() {
  filtersForm.reset()
  state.directChip = false
  state.baggageChip = false
  state.sort = 'popular'
  sortSelect.value = 'popular'
  document.querySelectorAll('[data-filter-chip]').forEach(button => button.setAttribute('aria-pressed', 'false'))
  updateRangeCopies()
  renderFlights()
  announce('Фильтры сброшены')
}

function buildTripLink() {
  const target = new URL ('./trip.html', window.location.href)
  params.forEach((value, name) => target.searchParams.set(name, value))
  target.searchParams.set('from', params.get('tripFrom')?.trim() || state.origin)
  target.searchParams.set('to', params.get('tripTo')?.trim() || state.destination)
  target.searchParams.set('depart', state.tripDepart)
  if (state.tripReturning) target.searchParams.set('return', state.tripReturning)
  target.searchParams.set('traveller', state.traveller)
  applyFlightScope(target)
  return target
}

function buildPassengerLink(flightId) {
  const flight = buildFlights().find(item => item.id === flightId) || buildFlights()[0]
  const target = new URL ('./avia-passengers.html', window.location.href)
  params.forEach((value, name) => target.searchParams.set(name, value))
  target.searchParams.set('from', state.origin)
  target.searchParams.set('to', state.destination)
  target.searchParams.set('depart', state.tripDepart)
  if (state.tripReturning) target.searchParams.set('return', state.tripReturning)
  target.searchParams.set('traveller', state.traveller)
  applyFlightScope(target)
  target.searchParams.set('flight', flight.id)
  target.searchParams.set('flightPrice', String(flight.price))
  target.searchParams.set('flightAirline', flight.outbound.airline)
  target.searchParams.set('flightNumber', flight.outbound.number)
  target.searchParams.set('flightDepartTime', flight.outbound.depart)
  target.searchParams.set('flightArrivalTime', flight.outbound.arrival)
  target.searchParams.set('flightDuration', flight.outbound.duration)
  target.searchParams.set('flightFromCode', flight.outbound.from.code)
  target.searchParams.set('flightToCode', flight.outbound.to.code)
  target.searchParams.set('flightFromAirport', flight.outbound.from.name)
  target.searchParams.set('flightToAirport', flight.outbound.to.name)
  if (flight.returning) {
    target.searchParams.set('returnAirline', flight.returning.airline)
    target.searchParams.set('returnFlightNumber', flight.returning.number)
    target.searchParams.set('returnDepartTime', flight.returning.depart)
    target.searchParams.set('returnArrivalTime', flight.returning.arrival)
    target.searchParams.set('returnDuration', flight.returning.duration)
    target.searchParams.set('returnFromCode', flight.returning.from.code)
    target.searchParams.set('returnToCode', flight.returning.to.code)
    target.searchParams.set('returnFromAirport', flight.returning.from.name)
    target.searchParams.set('returnToAirport', flight.returning.to.name)
  }
  return target
}

calendarPopover.addEventListener('click', event => {
  event.stopPropagation()
  const target = event.target.closest('[data-calendar-action]')
  if (!target) return
  if (target.dataset.calendarAction === 'change-month') {
    calendarState.month = Number(target.dataset.month)
    calendarState.year = Number(target.dataset.year)
    renderCalendar()
    return
  }
  if (target.dataset.calendarAction === 'select-date') {
    chooseCalendarDate(Number(target.dataset.day))
    return
  }
  if (target.dataset.calendarAction === 'oneway') {
    calendarState.returning = null
    searchForm.elements.return.value = ''
    closeCalendar({ restoreFocus: true })
    announce('Поиск изменён на перелёт в одну сторону')
  }
})

;['origin', 'destination'].forEach(field => {
  const input = searchForm.elements[field]
  input.addEventListener('focus', () => openAirportPopover(field, true))
  input.addEventListener('input', () => openAirportPopover(field))
})

searchForm.addEventListener('submit', event => {
  event.preventDefault()
  const data = new FormData(searchForm)
  state.origin = String(data.get('origin') || '').trim() || 'Москва'
  state.destination = String(data.get('destination') || '').trim() || 'Стамбул'
  state.depart = String(data.get('depart') || '').trim() || '29 сентября'
  state.returning = String(data.get('return') || '').trim()
  state.flightScope = state.returning ? 'roundtrip' : 'oneway'
  state.traveller = String(data.get('passengers') || '').trim() || '1 взрослый'
  setSearchValues()
  syncQuery()
  refreshFlights()
  announce('Рейсы обновлены')
})

sortSelect.addEventListener('change', () => {
  state.sort = sortSelect.value
  refreshFlights()
})

filtersForm.addEventListener('input', () => {
  updateRangeCopies()
  refreshFlights()
})

document.addEventListener('click', event => {
  const airportChoice = event.target.closest('[data-airport-choice]')
  if (airportChoice) {
    const field = airportChoice.dataset.airportChoice
    state[field] = airportChoice.dataset.city
    setSearchValues()
    syncQuery()
    refreshFlights()
    closeAirportPopover()
    announce(`Выбран аэропорт: ${airportChoice.textContent.trim()}`)
    return
  }

  const airportInput = event.target.closest('#avia-origin, #avia-destination')
  if (airportInput) {
    openAirportPopover(airportInput.name, true)
    return
  }

  if (!airportPopover.hidden && !airportPopover.contains(event.target)) closeAirportPopover()

  const calendarFieldShell = event.target.closest('[data-calendar-field-shell]')
  if (calendarFieldShell) {
    event.preventDefault()
    const input = calendarFieldShell.querySelector('[data-calendar-field]')
    if (input) {
      input.focus()
      openCalendar(input.dataset.calendarField)
    }
    return
  }

  if (!calendarPopover.hidden && !calendarPopover.contains(event.target) && !searchForm.contains(event.target)) closeCalendar()

  const headerMessage = event.target.closest('[data-header-message]')
  if (headerMessage) {
    event.preventDefault()
    announce(`${headerMessage.dataset.headerMessage}: раздел пока не подключён`)
    return
  }

  const chip = event.target.closest('[data-filter-chip]')
  if (chip) {
    const active = chip.getAttribute('aria-pressed') !== 'true'
    chip.setAttribute('aria-pressed', String(active))
    if (chip.dataset.filterChip === 'direct') {
      state.directChip = active
      if (active) filtersForm.elements.stops.value = 'direct'
    } else state.baggageChip = active
    renderFlights()
    return
  }

  const collapse = event.target.closest('[data-collapse]')
  if (collapse) {
    const content = document.querySelector(`#${CSS.escape(collapse.dataset.collapse)}`)
    const expanded = collapse.getAttribute('aria-expanded') === 'true'
    collapse.setAttribute('aria-expanded', String(!expanded))
    content.hidden = expanded
    return
  }

  const actionTarget = event.target.closest('[data-action]')
  const action = actionTarget?.dataset.action
  if (!action) return
  if (action === 'swap') {
    ;[state.origin, state.destination] = [state.destination, state.origin]
    setSearchValues()
    syncQuery()
    renderFlights()
    announce('Направления поменялись местами')
  } else if (action === 'select-flight') {
    state.selectedFlightId = actionTarget.dataset.flightId
    renderFlights()
    announce('Рейс выбран')
    const target = buildPassengerLink(state.selectedFlightId)
    window.setTimeout(() => { window.location.href = target.href }, 180)
  } else if (action === 'share') {
    navigator.clipboard?.writeText(window.location.href)
      .then(() => announce('Ссылка на рейс скопирована'))
      .catch(() => announce('Ссылка на рейс готова в адресной строке'))
  } else if (action === 'back-to-trip') window.location.href = buildTripLink().href
  else if (action === 'reset-filters') resetFilters()
  else if (action === 'details') announce('Показали полные условия в прототипе')
})

document.addEventListener('keydown', event => {
  const calendarInput = event.target.closest('[data-calendar-field]')
  if (calendarInput && ['Enter', ' ', 'ArrowDown'].includes(event.key)) {
    event.preventDefault()
    openCalendar(calendarInput.dataset.calendarField)
    return
  }
  if (event.key === 'Escape' && !calendarPopover.hidden) {
    event.preventDefault()
    closeCalendar({ restoreFocus: true })
  }
})

setSearchValues()
updateRangeCopies()
renderFlights()
page.setAttribute('data-ready', 'true')

window.AviaSearchPrototype = Object.freeze({ state, airportCatalog, cityCases, buildFlights, filteredFlights, renderFlights, resetFilters, buildTripLink, buildPassengerLink })
