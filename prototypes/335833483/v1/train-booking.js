const page = document.querySelector('.rail-seat-page')
const journeyLegs = document.querySelector('#journey-legs')
const coachTypes = document.querySelector('#coach-types')
const carriages = document.querySelector('#carriages')
const priceBreakdown = document.querySelector('#price-breakdown')
const nextButton = document.querySelector('#rail-next')
const announcer = document.querySelector('#rail-seat-announcer')

if (!page || !journeyLegs || !coachTypes || !carriages || !priceBreakdown || !nextButton || !announcer) {
  throw new Error('Не найдены обязательные элементы выбора мест в поезде')
}

const params = new URLSearchParams(window.location.search)
const requestedTripSegment = params.get('tripSegment') || params.get('segment')
const hasExistingTripReference = Boolean(params.get('tripId')?.trim() || params.get('draftId')?.trim())
const isExistingTripFlow = Boolean(
  requestedTripSegment === 'outbound'
  || requestedTripSegment === 'return'
  || (params.get('addToTrip') === '1' && params.get('tripKind') === 'existing' && hasExistingTripReference)
)
const canonicalFrom = params.get('from')?.trim() || 'Москва'
const canonicalTo = params.get('to')?.trim() || 'Санкт-Петербург'
const baseDepartDate = params.get('depart')?.trim() || '29 сентября'
const baseReturnDate = params.get('return')?.trim() || ''
const tripSegment = requestedTripSegment === 'return'
  ? 'return'
  : requestedTripSegment === 'outbound' ? 'outbound' : null
const isSingleReturn = tripSegment === 'return'
const outboundDate = params.get('railOutboundDate')?.trim() || baseDepartDate
const returnDate = params.get('railScope') === 'oneway'
  ? (isSingleReturn
      ? params.get('railReturnDate')?.trim() || params.get('railDate')?.trim() || params.get('railOutboundDate')?.trim() || baseReturnDate
      : '')
  : params.get('railReturnDate')?.trim() || baseReturnDate
const hasReturnRequest = params.get('railScope') !== 'oneway' && hasReturnValue(returnDate)
const hasOutboundTrain = Boolean(params.get('railOutboundTrainId')?.trim() || params.get('railOutboundTrainNumber')?.trim())
const hasReturnTrain = Boolean(params.get('railReturnTrainId')?.trim() || params.get('railReturnTrainNumber')?.trim())
const hasReturn = hasReturnRequest
const activeSegment = tripSegment || (params.get('railSeatSegment') === 'return' && hasReturnRequest ? 'return' : 'outbound')
const journeySegments = tripSegment ? [tripSegment] : activeSegment === 'return' ? ['outbound', 'return'] : ['outbound']
const resetSegments = new Set(
  (params.get('railResetSegment') || '')
    .split(',')
    .filter(segment => segment === 'outbound' || segment === 'return'),
)
const bookingId = params.get('railBookingId') || (window.crypto?.randomUUID?.() || `rail-${Date.now().toString(36)}`)
const storageKey = `rail-booking:${bookingId}`

function applyExistingTripContext(target) {
  if (!isExistingTripFlow) return target
  target.searchParams.set('workTrip', '1')
  target.searchParams.set('addToTrip', '1')
  target.searchParams.set('tripKind', 'existing')
  return target
}

function renderTripContext() {
  page.dataset.tripContext = isExistingTripFlow ? 'existing' : 'standalone'
}

function hasReturnValue(value) {
  const normalized = String(value ?? '').trim()
  return Boolean(normalized) && !/^(?:нет|без|—|-|one[\s-]?way)$/iu.test(normalized)
}

function positiveInteger(value, fallback = 0) {
  const number = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

function nonNegativeNumber(value, fallback = 0) {
  const number = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

function countsFromParams() {
  const traveller = params.get('traveller') || ''
  const travellerNumbers = [...traveller.matchAll(/\d+/gu)].map(match => Number(match[0]))
  const adults = Math.max(1, positiveInteger(params.get('adults'), travellerNumbers[0] || 1))
  const childWithSeat = positiveInteger(
    params.get('childWithSeat') ?? params.get('childrenWithSeat') ?? params.get('children'),
    travellerNumbers[1] || 0,
  )
  const childWithoutSeat = positiveInteger(params.get('childWithoutSeat'), travellerNumbers[2] || 0)
  return { adults, childWithSeat, childWithoutSeat }
}

function readStoredBooking() {
  try {
    return JSON.parse(window.sessionStorage.getItem(storageKey) || '{}')
  } catch {
    return {}
  }
}

const storedBooking = readStoredBooking()
const storedBedding = storedBooking.bedding
const legacyBedding = typeof storedBedding === 'boolean' ? storedBedding : true
const completedSeatSelection = params.get('railSeatComplete') === '1'
const userSelectedSeatSegments = new Set(
  Array.isArray(storedBooking.userSelectedSeatSegments)
    ? storedBooking.userSelectedSeatSegments.filter(segment => segment === 'outbound' || segment === 'return')
    : [],
)

if (completedSeatSelection) {
  ;['outbound', 'return'].forEach(segment => {
    if (parseSeats(params.get(`${prefixFor(segment)}Seats`))) userSelectedSeatSegments.add(segment)
  })
}

resetSegments.forEach(segment => userSelectedSeatSegments.delete(segment))

function restoredSeatsFor(segment) {
  if (resetSegments.has(segment)) return []
  const canRestore = completedSeatSelection || segment !== activeSegment || userSelectedSeatSegments.has(segment)
  if (!canRestore) return []
  return parseSeats(params.get(`${prefixFor(segment)}Seats`)) || storedBooking.seats?.[segment] || []
}

const state = {
  counts: countsFromParams(),
  bedding: {
    outbound: resetSegments.has('outbound') ? true : storedBedding?.outbound ?? legacyBedding,
    return: resetSegments.has('return') ? true : storedBedding?.return ?? legacyBedding,
  },
  seats: {
    outbound: restoredSeatsFor('outbound'),
    return: restoredSeatsFor('return'),
  },
  coach: {
    outbound: resetSegments.has('outbound') ? 'platz' : params.get('railOutboundCoach') || storedBooking.coach?.outbound || 'platz',
    return: resetSegments.has('return') ? 'coupe' : params.get('railReturnCoach') || storedBooking.coach?.return || 'coupe',
  },
  totals: {
    outbound: resetSegments.has('outbound') ? 0 : nonNegativeNumber(params.get('railOutboundTotal'), 0),
    return: resetSegments.has('return') ? 0 : nonNegativeNumber(params.get('railReturnTotal'), 0),
  },
  complete: completedSeatSelection,
}

const coachCatalog = Object.freeze({
  platz: Object.freeze({ label: 'Плацкарт', places: 90, price: 3672, childPrice: 2834.71, className: '3Э' }),
  coupe: Object.freeze({ label: 'Купе', places: 12, price: 5672, childPrice: 4254, className: '2Э' }),
  sv: Object.freeze({ label: 'СВ', places: 15, price: 13672, childPrice: 10254, className: '1Э' }),
  lux: Object.freeze({ label: 'Люкс', places: 6, price: 33672, childPrice: 25254, className: '1А' }),
})

const cityStations = Object.freeze({
  'Москва': 'Ленинградский вокзал',
  'Санкт-Петербург': 'Московский вокзал',
  'Казань': 'Казань-Пасс.',
  'Сочи': 'Сочи',
  'Екатеринбург': 'Екатеринбург-Пасс.',
})

function parseSeats(value) {
  if (!value) return null
  const seats = String(value).split(',').map(item => item.trim().replace('-', ':')).filter(item => /^\d+:\d+$/u.test(item))
  return seats.length ? seats : null
}

function shortDate(value) {
  const monthMap = {
    января: 'янв', февраля: 'фев', марта: 'мар', апреля: 'апр', мая: 'мая', июня: 'июн',
    июля: 'июл', августа: 'авг', сентября: 'сен', октября: 'окт', ноября: 'ноя', декабря: 'дек',
  }
  const match = String(value).toLocaleLowerCase('ru').match(/(\d{1,2})\s+([а-яё]+)/u)
  if (!match) return String(value)
  return `${match[1]} ${monthMap[match[2]] || match[2].slice(0, 3)}`
}

function formatMoney(value) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: Number(value) % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(Number(value)).replaceAll('\u00a0', ' ') + ' ₽'
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function routeFor(segment) {
  const prefix = prefixFor(segment)
  const fallback = segment === 'return'
    ? { from: canonicalTo, to: canonicalFrom, date: returnDate }
    : { from: canonicalFrom, to: canonicalTo, date: outboundDate }
  return {
    from: params.get(`${prefix}From`)?.trim() || fallback.from,
    to: params.get(`${prefix}To`)?.trim() || fallback.to,
    date: params.get(`${prefix}Date`)?.trim() || fallback.date,
  }
}

function prefixFor(segment) {
  return segment === 'return' ? 'railReturn' : 'railOutbound'
}

function trainFor(segment) {
  const prefix = prefixFor(segment)
  const route = routeFor(segment)
  const fallback = segment === 'return'
    ? { carrier: 'Тверской экспресс', number: '020У', brand: '«Мегаполис»', depart: '00:20', arrival: '09:01' }
    : { carrier: 'РЖД/ФПК', number: '119А', brand: '', depart: '00:12', arrival: '09:52' }
  return {
    carrier: params.get(`${prefix}Carrier`) || fallback.carrier,
    number: params.get(`${prefix}TrainNumber`) || fallback.number,
    brand: params.get(`${prefix}Brand`) || fallback.brand,
    depart: params.get(`${prefix}DepartTime`) || fallback.depart,
    arrival: params.get(`${prefix}ArrivalTime`) || fallback.arrival,
    duration: params.get(`${prefix}Duration`) || '9 ч 40 мин',
    fromStation: params.get(`${prefix}FromStation`) || cityStations[route.from] || `${route.from}, вокзал`,
    toStation: params.get(`${prefix}ToStation`) || cityStations[route.to] || `${route.to}, вокзал`,
    ...route,
  }
}

function requiredSeatCount() {
  return state.counts.adults + state.counts.childWithSeat
}

function allAvailableSeats() {
  const seats = []
  for (const car of [4, 9]) {
    for (let number = 2; number <= 54; number += 1) {
      if (number !== 1) seats.push(`${car}:${number}`)
    }
  }
  return seats
}

function ensureSeatCount(segment) {
  const required = requiredSeatCount()
  const normalized = [...new Set((state.seats[segment] || []).filter(key => /^\d+:\d+$/u.test(key)))]
  while (normalized.length > required) normalized.pop()
  state.seats[segment] = normalized
}

function travellerLabel() {
  const parts = []
  const adultWord = state.counts.adults % 10 === 1 && state.counts.adults % 100 !== 11 ? 'взрослый' : 'взрослых'
  parts.push(`${state.counts.adults} ${adultWord}`)
  const children = state.counts.childWithSeat + state.counts.childWithoutSeat
  if (children) {
    const childWord = children % 10 === 1 && children % 100 !== 11 ? 'ребёнок' : 'детей'
    parts.push(`${children} ${childWord}`)
  }
  return parts.join(', ')
}

function currentFare(segment = activeSegment) {
  return coachCatalog[state.coach[segment]] || coachCatalog.platz
}

function priceFor(segment = activeSegment) {
  const ticketPrice = ticketPriceFor(segment)
  const bedding = state.bedding[segment] ? requiredSeatCount() * 229.75 : 0
  return state.counts.adults * ticketPrice + state.counts.childWithSeat * Math.round(ticketPrice * .75 * 100) / 100 + bedding
}

function ticketPriceFor(segment) {
  const fare = currentFare(segment)
  const prefix = prefixFor(segment)
  return params.get(`${prefix}Coach`) === state.coach[segment]
    ? nonNegativeNumber(params.get(`${prefix}Price`), fare.price)
    : fare.price
}

function stateForJourney(source) {
  return Object.fromEntries(journeySegments.map(segment => [segment, source[segment]]))
}

function mergeJourneyState(existing, source) {
  const saved = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {}
  return { ...saved, ...stateForJourney(source) }
}

function saveSession() {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify({
      ...storedBooking,
      counts: state.counts,
      bedding: mergeJourneyState(storedBooking.bedding, state.bedding),
      coach: mergeJourneyState(storedBooking.coach, state.coach),
      seats: mergeJourneyState(storedBooking.seats, state.seats),
      userSelectedSeatSegments: [...userSelectedSeatSegments],
      totals: mergeJourneyState(storedBooking.totals, state.totals),
      activeSegment,
      route: {
        ...(storedBooking.route || {}),
        from: canonicalFrom,
        to: canonicalTo,
        depart: baseDepartDate,
        return: baseReturnDate,
        ...(tripSegment !== 'return' ? { railOutboundDate: outboundDate } : {}),
        ...(tripSegment !== 'outbound' ? { railReturnDate: returnDate } : {}),
      },
      trains: {
        ...(storedBooking.trains || {}),
        ...Object.fromEntries(journeySegments.map(segment => [segment, trainFor(segment)])),
      },
      updatedAt: new Date().toISOString(),
    }))
  } catch {
    announcer.textContent = 'Выбор сохранён в адресе страницы'
  }
}

function syncAddress(extra = {}) {
  const target = Reflect.construct(window.URL, [window.location.href])
  target.searchParams.set('railBookingId', bookingId)
  target.searchParams.set('railSeatSegment', activeSegment)
  target.searchParams.set('adults', String(state.counts.adults))
  target.searchParams.set('childWithSeat', String(state.counts.childWithSeat))
  target.searchParams.set('childWithoutSeat', String(state.counts.childWithoutSeat))
  target.searchParams.set('children', String(state.counts.childWithSeat + state.counts.childWithoutSeat))
  target.searchParams.set('traveller', travellerLabel())
  target.searchParams.set('railScope', hasReturn ? 'roundtrip' : 'oneway')
  if (!isSingleReturn) target.searchParams.set('railOutboundDate', outboundDate)
  if (isSingleReturn || hasReturn) target.searchParams.set('railReturnDate', returnDate)
  target.searchParams.delete('railResetSegment')
  for (const segment of journeySegments) {
    const prefix = prefixFor(segment)
    if (state.seats[segment].length) target.searchParams.set(`${prefix}Seats`, state.seats[segment].map(key => key.replace(':', '-')).join(','))
    else target.searchParams.delete(`${prefix}Seats`)
    target.searchParams.set(`${prefix}Coach`, state.coach[segment])
    if (state.totals[segment]) target.searchParams.set(`${prefix}Total`, String(state.totals[segment]))
    else target.searchParams.delete(`${prefix}Total`)
  }
  if (!hasReturn && !tripSegment && !isExistingTripFlow) {
    ;[...target.searchParams.keys()].filter(key => key.startsWith('railReturn')).forEach(key => target.searchParams.delete(key))
  }
  Object.entries(extra).forEach(([key, value]) => {
    if (value === null) target.searchParams.delete(key)
    else target.searchParams.set(key, String(value))
  })
  applyExistingTripContext(target)
  window.history.replaceState(null, '', target)
}

function buildLink(path, extra = {}) {
  const target = Reflect.construct(window.URL, [path, window.location.href])
  new URLSearchParams(window.location.search).forEach((value, key) => target.searchParams.set(key, value))
  Object.entries(extra).forEach(([key, value]) => {
    if (value === null) target.searchParams.delete(key)
    else target.searchParams.set(key, String(value))
  })
  return applyExistingTripContext(target)
}

function renderJourney() {
  document.querySelector('#journey-route').textContent = `${canonicalFrom} — ${canonicalTo}`
  document.querySelector('#journey-dates').textContent = isSingleReturn
    ? `обратно, ${shortDate(returnDate)}`
    : hasReturn
      ? `туда и обратно, ${shortDate(outboundDate)} — ${shortDate(returnDate)}`
      : `туда, ${shortDate(outboundDate)}`
  journeyLegs.innerHTML = journeySegments.map(segment => {
    const train = trainFor(segment)
    const segmentLabel = segment === 'return' ? 'обратно' : 'туда'
    return `
      <article class="journey-leg${segment === activeSegment ? ' is-active' : ''}" data-journey-segment="${segment}">
        <div class="journey-leg__content">
          <div class="journey-leg__train">
            <strong>${escapeHtml(train.carrier)}</strong>
            <p>Поезд ${escapeHtml(train.number)}, ${escapeHtml(train.from)} — ${escapeHtml(train.to)}${train.brand ? `<em>${escapeHtml(train.brand)}</em>` : ''}</p>
          </div>
          <div class="journey-leg__time">
            <div>
              <div class="journey-leg__date-row"><span>${escapeHtml(shortDate(train.date))}</span><em>Время местное</em><span>${escapeHtml(shortDate(train.date))}</span></div>
              <div class="journey-leg__timeline"><strong>${escapeHtml(train.depart)}</strong><i></i><span>${escapeHtml(train.duration)}</span><i></i><strong>${escapeHtml(train.arrival)}</strong></div>
            </div>
            <div class="journey-leg__station-row"><span>${escapeHtml(train.fromStation)}</span><span>${escapeHtml(train.toStation)}</span></div>
          </div>
        </div>
        <button class="journey-leg__change" type="button" data-action="change-train" data-segment="${segment}">Изменить поезд ${segmentLabel}</button>
      </article>`
  }).join('')
}

function renderCounters() {
  document.querySelectorAll('[data-counter]').forEach(counter => {
    const kind = counter.dataset.counter
    counter.querySelector('output').textContent = String(state.counts[kind])
    const minus = counter.querySelector('[data-delta="-1"]')
    const plus = counter.querySelector('[data-delta="1"]')
    minus.disabled = kind === 'adults' ? state.counts[kind] <= 1 : state.counts[kind] <= 0
    const totalSeats = requiredSeatCount()
    plus.disabled = (kind !== 'childWithoutSeat' && totalSeats >= 6) || (kind === 'childWithoutSeat' && state.counts[kind] >= state.counts.adults)
  })
}

function renderCoachTypes() {
  coachTypes.innerHTML = Object.entries(coachCatalog).map(([key, coach]) => {
    const hasDiscount = activeSegment === 'return' && key === 'coupe'
    return `
      <button class="coach-type${hasDiscount ? ' has-discount' : ''}" type="button" role="radio" aria-checked="${state.coach[activeSegment] === key}" data-action="coach" data-coach="${key}">
        ${hasDiscount ? '<span class="coach-discount" aria-label="Есть скидка">%</span>' : ''}
        <span class="coach-type__label">${escapeHtml(coach.label)} — ${coach.places}</span>
        <strong>от ${escapeHtml(formatMoney(coach.price))}</strong>
      </button>`
  }).join('')
}

function renderSeat(number, car) {
  if (number === null) return '<span class="seat-button" aria-hidden="true">•</span>'
  const key = `${car}:${number}`
  const selected = state.seats[activeSegment].includes(key)
  const compact = activeSegment === 'return' && state.coach[activeSegment] === 'coupe'
  const unavailable = !compact && (number === 1 || (car === 9 && [7, 18, 33].includes(number)))
  const priceTone = compact ? (number % 2 === 0 ? ' is-price-high' : ' is-price-low') : ''
  return `<button class="seat-button${priceTone}${selected ? ' is-selected' : ''}" type="button" data-action="seat" data-seat="${number}" data-car="${car}" aria-pressed="${selected}" ${unavailable ? 'disabled' : ''} aria-label="Вагон ${car}, место ${number}">${number}</button>`
}

function renderPlan(car) {
  const compact = activeSegment === 'return' && state.coach[activeSegment] === 'coupe'
  const compartments = []
  for (let group = 0; group < 9; group += 1) {
    const topLeft = 2 + group * 4
    const topRight = 4 + group * 4
    const bottomLeft = group === 0 ? null : 1 + group * 4
    const bottomRight = 3 + group * 4
    compartments.push(`<div class="berth-compartment">${renderSeat(topLeft, car)}${renderSeat(topRight, car)}${renderSeat(bottomLeft, car)}${renderSeat(bottomRight, car)}</div>`)
  }
  const sides = []
  if (!compact) {
    for (let group = 0; group < 9; group += 1) {
      const upper = 54 - group * 2
      sides.push(`<div class="side-pair">${renderSeat(upper, car)}${renderSeat(upper - 1, car)}</div>`)
    }
  }
  return `
    <div class="carriage-scroll" tabindex="0" aria-label="Схема вагона ${car}">
      <div class="carriage-plan${compact ? ' carriage-plan--compact' : ''}">
        <div class="carriage-plan__labels"><span>верхние</span><span>нижние</span>${compact ? '' : '<span>боковые верхние</span><span>боковые нижние</span>'}</div>
        <div class="berth-compartments">${compartments.join('')}</div>
        ${compact ? '<div class="cabin-labels" aria-hidden="true"><span>СМЕШАННОЕ<br>КУПЕ</span><span>ЖЕНСКОЕ<br>КУПЕ</span></div>' : `<div class="side-berths">${sides.join('')}</div>`}
      </div>
    </div>`
}

function renderCarriages() {
  const fare = currentFare()
  const compact = activeSegment === 'return' && state.coach[activeSegment] === 'coupe'
  page.dataset.coach = state.coach[activeSegment]
  carriages.innerHTML = [4, 9].map(car => `
    <section class="carriage${compact ? ' carriage--compact' : ''}" aria-labelledby="carriage-${car}">
      <div class="carriage__info">
        <h3 id="carriage-${car}">${car} вагон</h3>
        <div class="carriage__facts">
          <div class="carriage__advantages"><span><img src="./assets/rail/air-conditioning.svg" alt="">Кондиционер</span><span><img src="./assets/rail/bio-toilet.svg" alt="">Биотуалет</span>${compact ? '<span><img src="./assets/rail/gender-cabin.svg" alt="">Женское/мужское купе</span>' : ''}</div>
          <button class="carriage__details" type="button" data-announce="В вагоне работают кондиционер и биотуалет">Подробнее</button>
          <span>${compact ? 'Кондиционер, биотуалет в вагоне. Белье входит в стоимость проезда. Вагон с услугой перевозки животных' : 'Кондиционер, биотуалет в вагоне'}</span>
          <span>Перевозчик: ФПК</span>
        </div>
        <span class="carriage__class">Класс ${escapeHtml(fare.className)}</span>
      </div>
      ${compact ? '<div class="seat-price-legend" aria-label="Легенда цен"><span><i></i>Места по 1 500 ₽</span><span><i></i>Места по 5 500 ₽</span></div>' : ''}
      ${compact && car === 4 ? '<div class="carriage-discount"><span>%</span><b>В этом вагоне есть скидка на невозвратный тариф</b><img src="./assets/rail/info.svg" alt=""></div>' : ''}
      ${renderPlan(car)}
    </section>
  `).join('')
}

function selectedSeatNumbers(segment = activeSegment) {
  return state.seats[segment].map(key => Number(key.split(':')[1]))
}

function priceLegMarkup(segment) {
  const route = routeFor(segment)
  const ticketPrice = ticketPriceFor(segment)
  const childTicketPrice = Math.round(ticketPrice * .75 * 100) / 100
  const seats = selectedSeatNumbers(segment)
  const lines = []
  for (let index = 0; index < state.counts.adults; index += 1) {
    lines.push({ label: 'Взрослый', seat: seats[index], price: ticketPrice })
  }
  for (let index = 0; index < state.counts.childWithSeat; index += 1) {
    lines.push({ label: 'Ребёнок до 10 лет', seat: seats[state.counts.adults + index], price: childTicketPrice })
  }
  for (let index = 0; index < state.counts.childWithoutSeat; index += 1) {
    lines.push({ label: 'Ребёнок до 5 лет, без места', seat: null, price: 0 })
  }
  const passengerLines = lines.map(line => `
    <div class="price-line">
      <span>${escapeHtml(line.label)}${line.seat ? `, место ${line.seat}` : line.price ? ', место не выбрано' : ''}<small>Тариф Полный</small></span>
      <strong>${escapeHtml(line.price ? formatMoney(line.price) : 'Бесплатно')}</strong>
    </div>
  `).join('')
  const beddingCount = requiredSeatCount()
  const beddingPrice = state.bedding[segment] ? beddingCount * 229.75 : 0
  return `
    <section class="price-leg" data-price-segment="${segment}">
      <div class="price-card__route">${escapeHtml(route.from)} — ${escapeHtml(route.to)}</div>
      <div class="price-lines">${passengerLines}</div>
      <label class="bedding-line">
        <input type="checkbox" data-bedding-segment="${segment}" ${state.bedding[segment] ? 'checked' : ''}>
        <span class="check-mark" aria-hidden="true"></span>
        <span>Постельное белье <b>${beddingCount}</b> шт.</span>
        <strong>${escapeHtml(formatMoney(beddingPrice))}</strong>
      </label>
    </section>`
}

function renderPrice() {
  const pricedSegments = isSingleReturn ? ['return'] : activeSegment === 'return' ? ['return', 'outbound'] : ['outbound']
  priceBreakdown.innerHTML = pricedSegments.map(priceLegMarkup).join('')
  pricedSegments.forEach(segment => {
    state.totals[segment] = priceFor(segment)
  })
  const total = pricedSegments.reduce((sum, segment) => sum + priceFor(segment), 0)
  document.querySelector('#price-total').textContent = formatMoney(total)
  const enoughSeats = state.seats[activeSegment].length === requiredSeatCount()
  nextButton.disabled = !enoughSeats || (activeSegment === 'return' && state.complete)
  nextButton.textContent = activeSegment === 'return' && state.complete
    ? 'Места выбраны'
    : activeSegment === 'return' || !hasReturn ? 'Указать пассажиров' : 'Далее'
}

function renderProgress() {
  document.querySelectorAll('[data-return-only]').forEach(element => {
    element.hidden = !hasReturn
  })
  document.querySelectorAll('[data-step-segment]').forEach(step => {
    const segment = step.dataset.stepSegment
    const isActive = segment === activeSegment
    if (isActive) step.setAttribute('aria-current', 'step')
    else step.removeAttribute('aria-current')
    step.disabled = segment === 'return' && !hasReturn
    step.classList.toggle('is-muted', segment === 'return' && activeSegment === 'outbound')
  })
}

function renderAll() {
  page.dataset.segment = activeSegment
  page.dataset.tripScope = hasReturn ? 'roundtrip' : 'oneway'
  renderTripContext()
  renderJourney()
  renderCounters()
  renderCoachTypes()
  renderCarriages()
  renderPrice()
  renderProgress()
  syncAddress()
  saveSession()
  page.dataset.ready = 'true'
}

function updateAfterSeatChange(message) {
  renderCarriages()
  renderPrice()
  syncAddress()
  saveSession()
  announcer.textContent = message
}

document.addEventListener('click', event => {
  const announceControl = event.target.closest('[data-announce]')
  if (announceControl) {
    event.preventDefault()
    announcer.textContent = announceControl.dataset.announce
    return
  }

  const actionControl = event.target.closest('[data-action]')
  if (!actionControl) {
    const placeholderLink = event.target.closest('a[href="#"]')
    if (placeholderLink) event.preventDefault()
    return
  }

  const action = actionControl.dataset.action
  if (action === 'counter') {
    const kind = actionControl.dataset.kind
    const delta = Number(actionControl.dataset.delta)
    const minimum = kind === 'adults' ? 1 : 0
    state.counts[kind] = Math.max(minimum, state.counts[kind] + delta)
    if (kind === 'childWithoutSeat') state.counts[kind] = Math.min(state.counts[kind], state.counts.adults)
    for (const segment of journeySegments) ensureSeatCount(segment)
    renderCounters()
    renderCarriages()
    renderPrice()
    syncAddress()
    saveSession()
    announcer.textContent = `Пассажиров: ${travellerLabel()}`
    return
  }

  if (action === 'coach') {
    const coach = actionControl.dataset.coach
    if (!coachCatalog[coach] || state.coach[activeSegment] === coach) return
    state.coach[activeSegment] = coach
    state.seats[activeSegment] = []
    userSelectedSeatSegments.delete(activeSegment)
    renderCoachTypes()
    updateAfterSeatChange(`Выбран вагон: ${coachCatalog[coach].label}. Выберите новое место`)
    return
  }

  if (action === 'seat') {
    const key = `${actionControl.dataset.car}:${actionControl.dataset.seat}`
    const number = actionControl.dataset.seat
    const selected = state.seats[activeSegment]
    userSelectedSeatSegments.add(activeSegment)
    if (selected.includes(key)) {
      state.seats[activeSegment] = selected.filter(item => item !== key)
      updateAfterSeatChange(`Место ${number} снято`)
      return
    }
    const withoutSameNumber = selected.filter(item => item.split(':')[1] !== number)
    if (withoutSameNumber.length >= requiredSeatCount()) withoutSameNumber.pop()
    withoutSameNumber.push(key)
    state.seats[activeSegment] = withoutSameNumber
    updateAfterSeatChange(`Выбрано место ${number}, вагон ${actionControl.dataset.car}`)
    return
  }

  if (action === 'change-train') {
    event.preventDefault()
    const segment = actionControl.dataset.segment === 'return' ? 'return' : 'outbound'
    if (segment === 'return' && !hasReturnRequest) return
    window.location.assign(buildLink('./train-search.html', { railSegment: segment }).href)
    return
  }

  if (action === 'switch-seat-segment') {
    const segment = actionControl.dataset.segment
    if (segment === activeSegment || (segment === 'return' && !hasReturn)) return
    window.location.assign(buildLink('./train-booking.html', { railSeatSegment: segment, railSeatComplete: null }).href)
    return
  }

  if (action === 'next') {
    if (nextButton.disabled) return
    state.totals[activeSegment] = priceFor()
    syncAddress()
    saveSession()
    if (activeSegment === 'outbound' && hasReturn) {
      window.location.assign(buildLink('./train-search.html', {
        railSegment: 'return',
        railSeatSegment: 'return',
        railSeatComplete: null,
      }).href)
      return
    }
    state.complete = true
    syncAddress({ railSeatComplete: '1' })
    saveSession()
    window.location.assign(buildLink('./train-passengers.html', { railSeatComplete: '1' }).href)
  }
})

document.addEventListener('change', event => {
  const beddingToggle = event.target.closest('[data-bedding-segment]')
  if (!beddingToggle) return
  const segment = beddingToggle.dataset.beddingSegment === 'return' ? 'return' : 'outbound'
  if (!journeySegments.includes(segment)) return
  state.bedding[segment] = beddingToggle.checked
  renderPrice()
  syncAddress()
  saveSession()
  announcer.textContent = state.bedding[segment] ? 'Постельное бельё добавлено' : 'Постельное бельё убрано'
})

document.querySelectorAll('[data-preserve-query]').forEach(link => {
  const href = link.getAttribute('href')
  if (!href || href === '#') return
  link.href = buildLink(href).href
})

const missingTrainSegment = isSingleReturn
  ? (!hasReturnTrain ? 'return' : null)
  : !hasOutboundTrain
    ? 'outbound'
    : activeSegment === 'return' && !hasReturnTrain ? 'return' : null

if (missingTrainSegment) {
  window.location.replace(buildLink('./train-search.html', { railSegment: missingTrainSegment, railSeatSegment: null }).href)
} else {
  journeySegments.forEach(ensureSeatCount)
  renderAll()
}

window.businessTripRailSeatPrototype = {
  getState: () => JSON.parse(JSON.stringify({ ...state, activeSegment, bookingId, isExistingTripFlow })),
  buildLink,
}
