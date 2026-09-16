const page = document.querySelector('.avia-confirmation-page')
const flightsRoot = document.querySelector('#confirmation-flights')
const passengersSection = document.querySelector('#confirmation-passengers-section')
const passengersRoot = document.querySelector('#confirmation-passenger-list')
const contactsSection = document.querySelector('#confirmation-contacts-section')
const errorState = document.querySelector('#confirmation-error')
const paymentTimer = document.querySelector('.confirmation-payment-timer')
const paymentCard = document.querySelector('.confirmation-payment')
const submitButton = document.querySelector('#confirmation-submit')
const announcer = document.querySelector('#confirmation-announcer')

if (!page || !flightsRoot || !passengersSection || !passengersRoot || !contactsSection || !errorState || !paymentTimer || !paymentCard || !submitButton || !announcer) {
  throw new Error('Не найдены обязательные элементы страницы подтверждения авиабилета')
}

const params = new URLSearchParams(window.location.search)
const confirmationStorageKey = 'business-trip-avia-confirmation-v2'
const bookingStorageKey = 'business-trip-avia-booking-v2'
const personalTripsStorageKey = 'personal-trip-bookings-v2'
const requestedScope = params.get('flightScope')?.trim()
const hasExplicitQueryScope = requestedScope === 'oneway' || requestedScope === 'roundtrip' || params.has('flightReturnDate')
const queryFlightScope = requestedScope === 'oneway'
  ? 'oneway'
  : requestedScope === 'roundtrip'
    ? 'roundtrip'
    : params.has('flightReturnDate') && !params.get('flightReturnDate')?.trim()
      ? 'oneway'
      : 'roundtrip'
const requestedTripSegment = ['outbound', 'return'].includes(params.get('segment')) ? params.get('segment') : ''
const isTripSegmentFlow = Boolean(requestedTripSegment)
const isExistingTripFlow = isTripSegmentFlow || (
  params.get('addToTrip') === '1'
  && params.get('tripKind') === 'existing'
  && Boolean(params.get('tripId')?.trim() || params.get('draftId')?.trim())
)
const returnParamNames = Object.freeze([
  'flightReturnDate',
  'returnAirline',
  'returnFlightNumber',
  'returnDepartTime',
  'returnArrivalTime',
  'returnDuration',
  'returnFromCode',
  'returnToCode',
  'returnFromAirport',
  'returnToAirport',
])

function segmentParamName(suffix) {
  if (!requestedTripSegment) return ''
  return `${requestedTripSegment === 'return' ? 'flightReturn' : 'flightOutbound'}${suffix}`
}

function queryBookingId() {
  return (isTripSegmentFlow ? params.get('flightFlowBookingId') : params.get('bookingId'))?.trim() || ''
}

function confirmationStorageKeyForBooking(bookingId) {
  return bookingId ? `${confirmationStorageKey}:${bookingId}` : confirmationStorageKey
}

const fareCatalog = Object.freeze({
  light: Object.freeze({
    title: 'Эконом Лайт',
    features: Object.freeze([
      'Ручная кладь 1 место, 10 кг, 55×40×25 см',
      'Без багажа',
      'Невозвратный',
      'Обмен с доплатой',
    ]),
  }),
  optimum: Object.freeze({
    title: 'Эконом Оптимум',
    features: Object.freeze([
      'Ручная кладь 1 место, 10 кг, 55×40×25 см',
      'Багаж 1 место, 23 кг',
      'Возврат со сбором',
      'Обмен с доплатой',
    ]),
  }),
  maximum: Object.freeze({
    title: 'Эконом Максимум',
    features: Object.freeze([
      'Ручная кладь 1 место, 10 кг, 55×40×25 см',
      'Багаж 1 место, 30 кг',
      'Возврат включён',
      'Обмен включён',
    ]),
  }),
})

const documentNames = Object.freeze({
  'passport-rf': 'Паспорт РФ',
  'foreign-passport': 'Загранпаспорт РФ',
  'foreign-document': 'Иностранный паспорт',
})

function readConfirmationSnapshot() {
  try {
    const requestedBookingId = queryBookingId()
    const raw = window.sessionStorage.getItem(confirmationStorageKeyForBooking(requestedBookingId))
      || window.sessionStorage.getItem(confirmationStorageKey)
    if (!raw) return null
    const value = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null

    const queryFlightId = params.get('flight')?.trim()
    const snapshotFlightId = value.flight?.id?.trim()
    const snapshotBookingId = value.bookingId?.trim()
    if (queryFlightId && snapshotFlightId && queryFlightId !== snapshotFlightId) return null
    if (requestedBookingId && snapshotBookingId && requestedBookingId !== snapshotBookingId) return null
    if (!Array.isArray(value.passengers) || value.passengers.length === 0) return null
    return value
  } catch {
    return null
  }
}

function numberValue(...values) {
  for (const value of values) {
    const number = Number(value)
    if (Number.isFinite(number) && number > 0) return number
  }
  return 0
}

function query(name, fallback = '') {
  const value = params.get(name)?.trim()
  return value || fallback
}

function makeBookingId() {
  if (window.crypto?.randomUUID) return `avia-${window.crypto.randomUUID()}`
  return `avia-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function formatPrice(value, withKopecks = false) {
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: withKopecks ? 2 : 0,
    maximumFractionDigits: withKopecks ? 2 : 0,
  }).format(value)
  return `${formatted} ₽`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function announce(message) {
  announcer.textContent = message
}

const snapshot = readConfirmationSnapshot()
const isDemo = !params.has('flight')
const isMissingSnapshot = !isDemo && !snapshot

function demoSnapshot() {
  return {
    version: 1,
    bookingId: 'avia-demo-fv6710',
    scope: 'roundtrip',
    route: {
      origin: 'Санкт-Петербург',
      destination: 'Москва',
      tripDepart: '24 сентября, вторник',
      tripReturning: '24 сентября, вторник',
      depart: '24 сентября, вторник',
      returning: '24 сентября, вторник',
      traveller: '2 взрослых',
      scope: 'roundtrip',
    },
    flight: {
      id: 'rossiya-demo',
      totalPrice: 3672,
      outbound: {
        airline: 'Россия',
        number: 'FV 6710',
        departTime: '00:00',
        arrivalTime: '00:00',
        duration: '1 ч 30 мин',
        fromCode: 'LED',
        toCode: 'SVO',
        fromAirport: 'Пулково',
        toAirport: 'Шереметьево',
      },
      returning: {
        airline: 'Россия',
        number: 'FV 6710',
        departTime: '00:00',
        arrivalTime: '00:00',
        duration: '1 ч 30 мин',
        fromCode: 'SVO',
        toCode: 'LED',
        fromAirport: 'Шереметьево',
        toAirport: 'Пулково',
      },
    },
    fare: {
      id: 'light',
      title: 'Эконом Лайт',
      price: 3672,
      features: [...fareCatalog.light.features],
    },
    passengers: [
      { surname: 'Добряков', givenName: 'Петр', middleName: 'Михайлович', birthDate: '17.08.1993', documentType: 'passport-rf', documentNumber: '2013 700517' },
      { surname: 'Добряков', givenName: 'Петр', middleName: 'Михайлович', birthDate: '17.08.1993', documentType: 'passport-rf', documentNumber: '2013 700517' },
    ],
    contact: { email: 'demo@example.test', phone: '+7 000 000-00-00' },
  }
}

function snapshotFromQuery() {
  const fareId = query('flightTariff', 'light')
  const catalogFare = fareCatalog[fareId] || fareCatalog.light
  const outboundFareId = query('flightOutboundTariff', fareId)
  const outboundCatalogFare = fareCatalog[outboundFareId] || catalogFare
  const returnFareId = query('flightReturnTariff', fareId)
  const returnCatalogFare = fareCatalog[returnFareId] || catalogFare
  return {
    version: 1,
    bookingId: queryBookingId() || makeBookingId(),
    scope: queryFlightScope,
    route: {
      origin: query('from', 'Москва'),
      destination: query('to', 'Санкт-Петербург'),
      tripDepart: query('depart', '11 июля'),
      tripReturning: query('return'),
      depart: query('flightOutboundDate', query('depart', '11 июля')),
      returning: queryFlightScope === 'roundtrip' ? query('flightReturnDate', query('return', '18 июля')) : '',
      traveller: query('traveller', '1 взрослый'),
      scope: queryFlightScope,
    },
    flight: {
      id: query('flight', 'selected-flight'),
      totalPrice: numberValue(query('flightTotalPrice'), query('flightPrice'), 3672),
      outbound: {
        airline: query('flightAirline', 'Аэрофлот'),
        number: query('flightNumber', 'SU 1000'),
        departTime: query('flightDepartTime', '15:20'),
        arrivalTime: query('flightArrivalTime', '17:30'),
        duration: query('flightDuration', '2 ч 10 мин'),
        fromCode: query('flightFromCode', 'SVO'),
        toCode: query('flightToCode', 'LED'),
        fromAirport: query('flightFromAirport', 'Шереметьево'),
        toAirport: query('flightToAirport', 'Пулково'),
      },
      returning: queryFlightScope === 'roundtrip' ? {
        airline: query('returnAirline', query('flightAirline', 'Аэрофлот')),
        number: query('returnFlightNumber', query('flightNumber', 'SU 1001')),
        departTime: query('returnDepartTime', '18:40'),
        arrivalTime: query('returnArrivalTime', '20:50'),
        duration: query('returnDuration', query('flightDuration', '2 ч 10 мин')),
        fromCode: query('returnFromCode', query('flightToCode', 'LED')),
        toCode: query('returnToCode', query('flightFromCode', 'SVO')),
        fromAirport: query('returnFromAirport', query('flightToAirport', 'Пулково')),
        toAirport: query('returnToAirport', query('flightFromAirport', 'Шереметьево')),
      } : null,
    },
    fare: {
      id: fareId,
      title: query('flightTariffName', catalogFare.title),
      price: numberValue(query('flightTotalPrice'), query('flightPrice'), 3672),
      features: [...catalogFare.features],
    },
    fares: {
      outbound: {
        id: outboundFareId,
        title: query('flightOutboundTariffName', outboundCatalogFare.title),
        price: numberValue(query('flightOutboundTotal'), query('flightTotalPrice'), query('flightPrice'), 3672),
        features: [...outboundCatalogFare.features],
      },
      ...(queryFlightScope === 'roundtrip' ? { returning: {
        id: returnFareId,
        title: query('flightReturnTariffName', returnCatalogFare.title),
        price: numberValue(query('flightReturnTotal'), query('flightTotalPrice'), query('flightPrice'), 3672),
        features: [...returnCatalogFare.features],
      } } : {}),
    },
    passengers: [],
    contact: {},
  }
}

const source = isDemo ? demoSnapshot() : (snapshot || snapshotFromQuery())
const fallbackQuery = snapshotFromQuery()
const sourceScope = hasExplicitQueryScope
  ? queryFlightScope
  : source.scope === 'oneway' || source.route?.scope === 'oneway' || (!source.route?.returning && source.flight?.returning == null)
    ? 'oneway'
    : 'roundtrip'
const route = {
  origin: source.route?.origin || fallbackQuery.route.origin,
  destination: source.route?.destination || fallbackQuery.route.destination,
  tripDepart: source.route?.tripDepart || fallbackQuery.route.tripDepart,
  tripReturning: source.route?.tripReturning || fallbackQuery.route.tripReturning,
  depart: source.route?.depart || fallbackQuery.route.depart,
  returning: sourceScope === 'roundtrip' ? (source.route?.returning || fallbackQuery.route.returning) : '',
  traveller: source.route?.traveller || fallbackQuery.route.traveller,
  scope: sourceScope,
}

const outbound = { ...fallbackQuery.flight.outbound, ...(source.flight?.outbound || {}) }
const returning = sourceScope === 'roundtrip' ? { ...fallbackQuery.flight.returning, ...(source.flight?.returning || {}) } : null
const fareId = source.fare?.id || fallbackQuery.fare.id
const catalogFare = fareCatalog[fareId] || fareCatalog.light
const fare = {
  id: fareId,
  title: source.fare?.title || fallbackQuery.fare.title || catalogFare.title,
  price: numberValue(source.fare?.price, source.flight?.totalPrice, fallbackQuery.fare.price, 3672),
  features: Array.isArray(source.fare?.features) && source.fare.features.length ? source.fare.features : [...catalogFare.features],
}
function normalizedSegmentFare(value, fallback) {
  const id = value?.id || fallback.id || 'light'
  const catalog = fareCatalog[id] || fareCatalog.light
  return {
    id,
    title: value?.title || fallback.title || catalog.title,
    price: numberValue(value?.price, fallback.price, fare.price),
    features: Array.isArray(value?.features) && value.features.length ? value.features : [...catalog.features],
  }
}
const fares = {
  outbound: normalizedSegmentFare(source.fares?.outbound, fallbackQuery.fares.outbound),
  ...(sourceScope === 'roundtrip' ? { returning: normalizedSegmentFare(source.fares?.returning, fallbackQuery.fares.returning || fallbackQuery.fares.outbound) } : {}),
}
const workTrip = isExistingTripFlow || (params.has('workTrip') ? params.get('workTrip') === '1' : source.workTrip === true)
const shouldAddToTrip = isExistingTripFlow || (workTrip && (params.has('addToTrip') ? params.get('addToTrip') === '1' : source.addToTrip === true))

const state = {
  isDemo,
  isMissingSnapshot,
  submitting: false,
  bookingId: source.bookingId || query('bookingId', makeBookingId()),
  flightScope: sourceScope,
  route,
  flight: {
    id: source.flight?.id || fallbackQuery.flight.id,
    outbound,
    returning,
  },
  fare,
  fares,
  passengers: Array.isArray(source.passengers) ? source.passengers : [],
  contact: source.contact && typeof source.contact === 'object' ? source.contact : {},
  workTrip,
  addToTrip: shouldAddToTrip,
  tripKind: isExistingTripFlow || params.get('tripKind') === 'existing' || source.tripKind === 'existing' ? 'existing' : 'new',
}

const expectedParticipantCount = Math.max(1, Number(params.get('adults')) || 1) + Math.max(0, Number(params.get('children')) || 0)
if (!state.isMissingSnapshot && state.passengers.length) {
  while (state.passengers.length < expectedParticipantCount) state.passengers.push({ ...state.passengers[state.passengers.length - 1] })
}

function featureIcon(feature) {
  const normalized = String(feature).toLocaleLowerCase('ru')
  if (/ручн/u.test(normalized)) return './assets/avia-confirmation/hand-luggage.svg'
  if (/без багажа/u.test(normalized)) return './assets/avia-confirmation/without-luggage.svg'
  if (/багаж/u.test(normalized)) return './assets/avia-booking/luggage-23.svg'
  if (/невозврат|возврат.*запрещ/u.test(normalized)) return './assets/avia-confirmation/no-return.svg'
  if (/обмен|возврат/u.test(normalized)) return './assets/avia-confirmation/paid-return.svg'
  return './assets/avia-confirmation/info-16.svg'
}

function segmentFeatureLabel(feature) {
  const value = String(feature)
  if (/^Ручная кладь\s/iu.test(value)) return value.replace(/^Ручная кладь\s*/iu, 'Ручная кладь: ')
  if (/^Невозвратный$/iu.test(value)) return 'Возврат: запрещен'
  if (/^Возврат запрещ/iu.test(value)) return 'Возврат: запрещен'
  if (/^Обмен с доплатой$/iu.test(value)) return 'Обмен: с доплатой'
  return value
}

function segmentFeatures(features) {
  const priorities = [
    /без багажа/iu,
    /ручн/iu,
    /невозврат|возврат/iu,
    /обмен/iu,
  ]
  const result = []
  priorities.forEach(pattern => {
    const match = features.find(feature => pattern.test(feature) && !result.includes(feature))
    if (match) result.push(match)
  })
  features.forEach(feature => {
    if (!result.includes(feature) && result.length < 4) result.push(feature)
  })
  return result.slice(0, 4)
}

function normalizeLeg(leg, from, to) {
  return {
    airline: leg.airline || 'Аэрофлот',
    number: leg.number || 'SU 1000',
    aircraft: leg.aircraft || (/россия/iu.test(leg.airline || '') ? 'Сухой Суперджет 100' : 'Самолет'),
    departTime: leg.departTime || leg.depart || '00:00',
    arrivalTime: leg.arrivalTime || leg.arrival || '00:00',
    duration: leg.duration || '1 ч 30 мин',
    fromCity: from,
    toCity: to,
    fromCode: leg.fromCode || '',
    toCode: leg.toCode || '',
    fromAirport: leg.fromAirport || `${from}, аэропорт`,
    toAirport: leg.toAirport || `${to}, аэропорт`,
  }
}

function renderSegment(rawLeg, from, to, fare = state.fare) {
  const leg = normalizeLeg(rawLeg, from, to)
  const rows = segmentFeatures(fare.features)
  return `
    <article class="confirmation-segment" aria-label="${escapeHtml(`${from} — ${to}, ${leg.departTime} — ${leg.arrivalTime}`)}">
      <div class="confirmation-segment__route">
        <div class="confirmation-segment__carrier">
          <div class="confirmation-segment__carrier-copy">
            <strong>${escapeHtml(leg.airline)}</strong>
            <span>Не более 5 мест в ряду</span>
            <span>${escapeHtml(leg.aircraft)}</span>
          </div>
          <div class="confirmation-segment__number">
            <span>${escapeHtml(leg.number)}</span>
            <img class="is-avia-icon" src="./assets/icons/transport-plane.svg" alt="" aria-hidden="true">
          </div>
        </div>
        <div class="confirmation-segment__travel">
          <div class="confirmation-segment__time">
            <span class="confirmation-time-side"><strong>${escapeHtml(leg.departTime)}</strong></span>
            <span class="confirmation-segment__duration">${escapeHtml(leg.duration)}</span>
            <span class="confirmation-time-side confirmation-time-side--arrival"><strong>${escapeHtml(leg.arrivalTime)}</strong></span>
          </div>
          <div class="confirmation-segment__locations">
            <span class="confirmation-location">
              <strong>${escapeHtml(leg.fromCity)}</strong>
              <span>${escapeHtml(leg.fromAirport)}</span>
              <small>${escapeHtml(leg.fromCode)}</small>
            </span>
            <span class="confirmation-location confirmation-location--arrival">
              <strong>${escapeHtml(leg.toCity)}</strong>
              <span>${escapeHtml(leg.toAirport)}</span>
              <small>${escapeHtml(leg.toCode)}</small>
            </span>
          </div>
        </div>
      </div>
      <div class="confirmation-segment__fare">
        <div class="confirmation-segment__fare-title">Тариф «${escapeHtml(fare.title.replace(/^Эконом\s+/iu, '').toLocaleUpperCase('ru'))}» <img src="./assets/avia-confirmation/info-16.svg" alt=""></div>
        <ul class="confirmation-segment__fare-list">
          ${rows.map(feature => `<li><img src="${escapeHtml(featureIcon(feature))}" alt=""><span>${escapeHtml(segmentFeatureLabel(feature))}</span></li>`).join('')}
        </ul>
      </div>
    </article>`
}

function renderFlight({ from, to, date, duration, leg, fare = state.fare, transfer = null, secondLeg = null }) {
  const segments = secondLeg ? 2 : 1
  const transferMeta = transfer
    ? `<span aria-hidden="true">•</span><span class="meta-transfer">Самостоятельная пересадка <img src="./assets/avia-confirmation/info-16.svg" alt=""></span>`
    : ''
  return `
    <section class="confirmation-flight">
      <div class="confirmation-flight__heading">
        <h2>${escapeHtml(from)} — ${escapeHtml(to)}</h2>
        <p class="confirmation-flight__meta"><span>${escapeHtml(date)}</span><span aria-hidden="true">•</span><span>${escapeHtml(duration)} в пути</span>${transferMeta}</p>
      </div>
      <div class="confirmation-flight-card" data-segments="${segments}">
        ${renderSegment(leg, leg.fromCity || from, leg.toCity || to, fare)}
        ${transfer ? `<div class="confirmation-transfer"><img src="./assets/avia-confirmation/connection.svg" alt=""><span>${escapeHtml(transfer)}</span></div>` : ''}
        ${secondLeg ? renderSegment(secondLeg, secondLeg.fromCity || from, secondLeg.toCity || to, fare) : ''}
      </div>
    </section>`
}

function renderFlights() {
  if (state.isMissingSnapshot) {
    flightsRoot.hidden = true
    passengersSection.hidden = true
    contactsSection.hidden = true
    errorState.hidden = false
    paymentCard.classList.add('is-unavailable')
    submitButton.disabled = true
    submitButton.textContent = 'Сначала проверьте данные'
    return
  }

  if (state.isDemo) {
    const demoSecond = {
      ...state.flight.outbound,
      fromCity: 'Санкт-Петербург',
      toCity: 'Москва',
    }
    const demoFlights = [renderFlight({
      from: 'Санкт-Петербург',
      to: 'Москва',
      date: '24 сентября, вторник',
      duration: '1 ч 30 мин',
      leg: state.flight.outbound,
    })]
    if (state.flightScope === 'roundtrip') {
      demoFlights.push(renderFlight({
        from: 'Москва',
        to: 'Санкт-Петербург',
        date: '24 сентября, вторник',
        duration: '1 ч 30 мин',
        leg: demoSecond,
        transfer: 'пересадка в Минеральных Водах - 4 ч 20 мин',
        secondLeg: demoSecond,
      }))
    }
    flightsRoot.innerHTML = demoFlights.join('')
    return
  }

  const flights = [renderFlight({
    from: state.route.origin,
    to: state.route.destination,
    date: state.route.depart,
    duration: state.flight.outbound.duration,
    leg: state.flight.outbound,
    fare: state.fares.outbound,
  })]
  if (state.flightScope === 'roundtrip' && state.flight.returning) {
    flights.push(renderFlight({
      from: state.route.destination,
      to: state.route.origin,
      date: state.route.returning,
      duration: state.flight.returning.duration,
      leg: state.flight.returning,
      fare: state.fares.returning,
    }))
  }
  flightsRoot.innerHTML = flights.join('')
}

function passengerName(passenger) {
  return [passenger.surname, passenger.givenName, passenger.noMiddleName ? '' : passenger.middleName]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(' ')
}

function renderPassengers() {
  if (state.isMissingSnapshot) return
  const passengerFare = state.isDemo ? 10299 : state.fare.price / Math.max(1, state.passengers.length)
  passengersRoot.innerHTML = state.passengers.map(passenger => {
    const documentName = documentNames[passenger.documentType] || 'Документ'
    return `
      <article class="confirmation-passenger">
        <div class="confirmation-passenger__identity">
          <strong>${escapeHtml(passengerName(passenger) || 'Пассажир')}</strong>
          <span>${escapeHtml(documentName)} ${escapeHtml(passenger.documentNumber || '')}&nbsp;&nbsp;•&nbsp;&nbsp;${escapeHtml(passenger.birthDate || 'Дата не указана')}</span>
        </div>
        <span class="confirmation-passenger__fare">${state.isDemo ? 'Полный тариф' : escapeHtml(state.fare.title)} — ${escapeHtml(formatPrice(passengerFare, true))}</span>
      </article>`
  }).join('')

  document.querySelector('#confirmation-email').textContent = state.contact.email || 'email@yandex.ru'
  document.querySelector('#confirmation-phone').textContent = state.contact.phone || '+7 981 859-90-23'
}

function renderPayment() {
  paymentTimer.hidden = state.workTrip || state.addToTrip
  const price = formatPrice(state.fare.price)
  document.querySelector('#confirmation-tariff').textContent = state.fare.title
  document.querySelector('#confirmation-price').textContent = price
  document.querySelector('#confirmation-total').textContent = price
  document.querySelector('#confirmation-features').replaceChildren(...state.fare.features.map(feature => {
    const item = document.createElement('li')
    item.textContent = feature
    return item
  }))

  const seller = document.querySelector('#confirmation-seller')
  const airline = state.flight.outbound.airline
  if (!state.isDemo && !/аэрофлот/iu.test(airline)) {
    seller.textContent = `Продавец билета — авиакомпания «${airline}». Реквизиты продавца будут указаны в подтверждении бронирования. Режим работы — круглосуточно.`
  }

  submitButton.textContent = state.addToTrip ? 'Добавить в командировку' : 'Оплатить'
}

function buildLink(path, status = 'awaiting-payment') {
  const target = Reflect.construct(window.URL, [path, window.location.href])
  params.forEach((value, name) => target.searchParams.set(name, value))
  target.searchParams.set('from', state.route.origin)
  target.searchParams.set('to', state.route.destination)
  target.searchParams.set('depart', state.route.tripDepart)
  if (state.route.tripReturning) target.searchParams.set('return', state.route.tripReturning)
  target.searchParams.set('traveller', state.route.traveller)
  target.searchParams.set('flightScope', state.flightScope)
  target.searchParams.set('flightOutboundDate', state.route.depart)
  if (state.flightScope === 'roundtrip' && state.route.returning) target.searchParams.set('flightReturnDate', state.route.returning)
  else if (!isTripSegmentFlow) returnParamNames.forEach(name => target.searchParams.delete(name))
  target.searchParams.set('flight', state.flight.id)
  target.searchParams.set('flightPrice', String(state.flight.totalPrice || state.fare.price))
  target.searchParams.set('flightAirline', state.flight.outbound.airline)
  target.searchParams.set('flightNumber', state.flight.outbound.number)
  target.searchParams.set('flightDepartTime', state.flight.outbound.departTime)
  target.searchParams.set('flightArrivalTime', state.flight.outbound.arrivalTime)
  target.searchParams.set('flightDuration', state.flight.outbound.duration)
  target.searchParams.set('flightFromCode', state.flight.outbound.fromCode)
  target.searchParams.set('flightToCode', state.flight.outbound.toCode)
  target.searchParams.set('flightFromAirport', state.flight.outbound.fromAirport)
  target.searchParams.set('flightToAirport', state.flight.outbound.toAirport)
  if (state.flightScope === 'roundtrip' && state.flight.returning) {
    target.searchParams.set('returnAirline', state.flight.returning.airline)
    target.searchParams.set('returnFlightNumber', state.flight.returning.number)
    target.searchParams.set('returnDepartTime', state.flight.returning.departTime)
    target.searchParams.set('returnArrivalTime', state.flight.returning.arrivalTime)
    target.searchParams.set('returnDuration', state.flight.returning.duration)
    target.searchParams.set('returnFromCode', state.flight.returning.fromCode)
    target.searchParams.set('returnToCode', state.flight.returning.toCode)
    target.searchParams.set('returnFromAirport', state.flight.returning.fromAirport)
    target.searchParams.set('returnToAirport', state.flight.returning.toAirport)
  }
  if (isTripSegmentFlow) {
    target.searchParams.set('flightFlowBookingId', state.bookingId)
    target.searchParams.set(segmentParamName('BookingId'), state.bookingId)
    target.searchParams.set(segmentParamName('Status'), status)
    if (!target.searchParams.has('bookingId')) target.searchParams.set('bookingId', state.bookingId)
    if (!target.searchParams.has('flightStatus')) target.searchParams.set('flightStatus', status)
  } else {
    target.searchParams.set('bookingId', state.bookingId)
    target.searchParams.set('flightStatus', status)
  }
  target.searchParams.set('flightTariff', state.fares.outbound.id)
  target.searchParams.set('flightTariffName', state.fare.title)
  target.searchParams.set('flightTotalPrice', String(state.fare.price))
  target.searchParams.set('flightOutboundTariff', state.fares.outbound.id)
  target.searchParams.set('flightOutboundTariffName', state.fares.outbound.title)
  target.searchParams.set('flightOutboundTotal', String(state.fares.outbound.price))
  if (state.fares.returning) {
    target.searchParams.set('flightReturnTariff', state.fares.returning.id)
    target.searchParams.set('flightReturnTariffName', state.fares.returning.title)
    target.searchParams.set('flightReturnTotal', String(state.fares.returning.price))
  }
  target.searchParams.set('flightScope', state.flightScope)
  if (state.workTrip) target.searchParams.set('workTrip', '1')
  else target.searchParams.delete('workTrip')
  if (state.addToTrip) target.searchParams.set('addToTrip', '1')
  else target.searchParams.delete('addToTrip')
  target.searchParams.set('tripKind', state.tripKind)
  return target
}

function saveBooking(status = 'awaiting-payment') {
  const booking = {
    version: 1,
    createdAt: new Date().toISOString(),
    bookingId: state.bookingId,
    status,
    scope: state.flightScope,
    route: {
      origin: state.route.origin,
      destination: state.route.destination,
      tripDepart: state.route.tripDepart,
      tripReturning: state.route.tripReturning,
      depart: state.route.depart,
      traveller: state.route.traveller,
      scope: state.flightScope,
      ...(state.flightScope === 'roundtrip' ? { returning: state.route.returning } : {}),
    },
    flight: {
      id: state.flight.id,
      totalPrice: state.fare.price,
      outbound: { ...state.flight.outbound },
      ...(state.flight.returning ? { returning: { ...state.flight.returning } } : {}),
    },
    fare: { ...state.fare, features: [...state.fare.features] },
    fares: {
      outbound: { ...state.fares.outbound, features: [...state.fares.outbound.features] },
      ...(state.fares.returning ? { returning: { ...state.fares.returning, features: [...state.fares.returning.features] } } : {}),
    },
    passengers: state.passengers.map(passenger => ({ ...passenger })),
    contact: { ...state.contact },
    workTrip: state.workTrip,
    addToTrip: state.addToTrip,
    tripKind: state.tripKind,
  }
  try {
    window.sessionStorage.setItem(bookingStorageKey, JSON.stringify(booking))
  } catch {
    // Навигация продолжает работать, даже если браузер запретил sessionStorage.
  }
  return booking
}

function readStoredTrips() {
  try {
    const value = JSON.parse(window.localStorage.getItem(personalTripsStorageKey) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function airlineLogo(airline) {
  const normalized = String(airline || '').toLocaleLowerCase('ru')
  if (/побед/u.test(normalized)) return './assets/avia/pobeda-tile.svg'
  if (/s7/u.test(normalized)) return './assets/avia/s7.svg'
  if (/росси/u.test(normalized)) return './assets/avia-confirmation/rossiya.png'
  return './assets/avia-booking/aeroflot.png'
}

function personalTripRecord(target) {
  const dates = state.route.tripReturning
    ? `${state.route.tripDepart} — ${state.route.tripReturning}`
    : state.route.tripDepart
  return {
    id: state.bookingId,
    state: 'upcoming',
    serviceCount: 1,
    paidServices: 1,
    city: state.route.destination,
    transport: 'avia',
    route: `${state.route.origin} — ${state.route.destination}`,
    dates,
    title: `Авиабилеты · ${state.flight.outbound.airline}`,
    detail: `${state.route.traveller}${state.workTrip ? ' · Рабочая поездка' : ''}`,
    status: 'Оплачено',
    hotelImage: airlineLogo(state.flight.outbound.airline),
    secondaryTitle: 'Авиабилеты',
    secondaryDetail: `${state.flight.outbound.number} · ${state.flight.outbound.departTime} — ${state.flight.outbound.arrivalTime}`,
    secondaryIcon: './assets/icons/trip-flight-filled.svg',
    secondaryType: 'avia',
    workTrip: state.workTrip,
    href: `./avia-success.html?${target.searchParams.toString()}`,
  }
}

function savePersonalTrip(target) {
  try {
    const trip = personalTripRecord(target)
    const remaining = readStoredTrips().filter(item => item?.id !== trip.id)
    window.localStorage.setItem(personalTripsStorageKey, JSON.stringify([trip, ...remaining].slice(0, 12)))
  } catch {
    // Оплата и переход остаются доступны, даже если браузер запретил localStorage.
  }
}

function addToTrip() {
  if (state.isMissingSnapshot || state.submitting) return
  state.submitting = true
  submitButton.disabled = true
  submitButton.classList.add('is-processing')
  submitButton.textContent = 'Добавляем…'
  announce('Добавляем авиабилеты в командировку')

  window.setTimeout(() => {
    saveBooking()
    const target = buildLink('./trip.html')
    target.searchParams.set('from', query('tripFrom', state.route.origin))
    target.searchParams.set('to', query('tripTo', state.route.destination))
    target.searchParams.set('workTrip', '1')
    const requestedSegment = params.get('segment')
    if (requestedSegment === 'outbound' || requestedSegment === 'return') {
      const isRoundTripSelection = state.flightScope === 'roundtrip'
        && Boolean(state.route.returning)
        && Boolean(state.flight.returning)

      if (isRoundTripSelection) {
        target.searchParams.set('flightFrom', state.route.origin)
        target.searchParams.set('flightTo', state.route.destination)
        target.searchParams.set('returnFrom', state.route.destination)
        target.searchParams.set('returnTo', state.route.origin)
        ;['flightOutbound', 'flightReturn'].forEach(prefix => {
          target.searchParams.set(`${prefix}Added`, '1')
          target.searchParams.set(`${prefix}Status`, 'awaiting-payment')
          target.searchParams.set(`${prefix}BookingId`, state.bookingId)
        })
        target.searchParams.set('flightOutboundTotal', String(state.fares.outbound.price))
        target.searchParams.set('flightReturnTotal', String(state.fares.returning?.price || 0))
        target.searchParams.set('bookingId', state.bookingId)
        target.searchParams.set('flightStatus', 'awaiting-payment')
        target.searchParams.set('flightAdded', '1')
        target.searchParams.set('flightScope', 'roundtrip')
        target.searchParams.delete('segment')
        ;['outboundRemoved', 'returnRemoved', 'flightOutboundRemoved', 'flightReturnRemoved'].forEach(name => {
          target.searchParams.delete(name)
        })
      } else {
        const prefix = requestedSegment === 'return' ? 'flightReturn' : 'flightOutbound'
        target.searchParams.set(`${prefix}Added`, '1')
        target.searchParams.set(`${prefix}Total`, String(state.fare.price))
        target.searchParams.set(`${prefix}Status`, 'awaiting-payment')
        target.searchParams.set(`${prefix}BookingId`, state.bookingId)
        target.searchParams.set('flightAdded', '0')
        target.searchParams.set('flightScope', 'oneway')
        if (requestedSegment === 'return') {
          target.searchParams.set('flightReturnDate', state.route.depart)
          target.searchParams.set('returnAirline', state.flight.outbound.airline)
          target.searchParams.set('returnFlightNumber', state.flight.outbound.number)
          target.searchParams.set('returnDepartTime', state.flight.outbound.departTime)
          target.searchParams.set('returnArrivalTime', state.flight.outbound.arrivalTime)
          target.searchParams.set('returnDuration', state.flight.outbound.duration)
          target.searchParams.set('returnFromCode', state.flight.outbound.fromCode)
          target.searchParams.set('returnToCode', state.flight.outbound.toCode)
          target.searchParams.set('returnFromAirport', state.flight.outbound.fromAirport)
          target.searchParams.set('returnToAirport', state.flight.outbound.toAirport)
        } else {
          target.searchParams.set('flightOutboundDate', state.route.depart)
        }
      }
      target.searchParams.delete('flightFlowBookingId')
    } else {
      target.searchParams.set('flightAdded', '1')
      target.searchParams.set('flightScope', state.flightScope)
    }
    if (state.tripKind === 'new') {
      target.searchParams.set('draft', '1')
      target.searchParams.set('draftId', state.bookingId)
      target.searchParams.delete('tripId')
    } else {
      const tripId = params.get('tripId')?.trim() || params.get('draftId')?.trim()
      if (tripId) target.searchParams.set('tripId', tripId)
    }
    const segments = target.searchParams.get('flightScope') === 'roundtrip' && target.searchParams.get('flightAdded') === '1'
      ? ['outbound', 'return']
      : requestedSegment === 'outbound' || requestedSegment === 'return'
        ? [requestedSegment]
        : ['outbound']
    if (!window.TripV2Bridge?.returnToTrip(target, { result: 'service-added', kind: 'avia', segments })) window.location.href = target.href
  }, 650)
}

function payBooking() {
  if (state.isMissingSnapshot || state.submitting) return
  state.submitting = true
  submitButton.disabled = true
  submitButton.classList.add('is-processing')
  submitButton.textContent = 'Оплачиваем…'
  announce('Оплачиваем авиабилеты')

  window.setTimeout(() => {
    saveBooking('paid')
    const target = buildLink('./avia-success.html', 'paid')
    target.searchParams.set('flightAdded', '1')
    target.searchParams.delete('addToTrip')
    savePersonalTrip(target)
    window.location.href = target.href
  }, 650)
}

function submitBooking() {
  if (state.addToTrip) addToTrip()
  else payBooking()
}

submitButton.addEventListener('click', submitBooking)

document.addEventListener('click', event => {
  const headerMessage = event.target.closest('[data-header-message]')
  if (headerMessage) {
    event.preventDefault()
    announce(`${headerMessage.dataset.headerMessage}: раздел пока не подключён`)
    return
  }

  const actionTarget = event.target.closest('[data-action]')
  const action = actionTarget?.dataset.action
  if (!action) return

  if (action === 'back-to-results') window.location.href = buildLink('./avia-search.html').href
  else if (action === 'back-to-passenger') window.location.href = buildLink('./avia-passengers.html').href
  else if (action === 'back-to-trip') {
    const target = buildLink('./trip.html')
    if (!window.TripV2Bridge?.returnToTrip(target)) window.location.href = target.href
  }
  else if (action === 'flight-details') announce(`${state.flight.outbound.airline}: ${state.route.origin} — ${state.route.destination}`)
  else if (action === 'legal') {
    event.preventDefault()
    announce('Юридический документ откроется в рабочей версии')
  }
})

renderFlights()
renderPassengers()
renderPayment()
page.setAttribute('data-ready', 'true')

window.AviaConfirmationPrototype = Object.freeze({
  state,
  fareCatalog,
  buildLink,
  saveBooking,
  addToTrip,
  payBooking,
})
