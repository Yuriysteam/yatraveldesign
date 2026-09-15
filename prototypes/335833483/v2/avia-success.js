const page = document.querySelector('.avia-success-page')

if (!page) {
  throw new Error('Не найдена страница успешной оплаты авиабилетов')
}

const params = new URLSearchParams(window.location.search)
const confirmationStorageKey = 'business-trip-avia-confirmation-v2'

function query(...names) {
  for (const name of names) {
    const value = params.get(name)?.trim()
    if (value) return value
  }
  return ''
}

function setText(selector, value) {
  const element = document.querySelector(selector)
  if (element) element.textContent = value
}

function numberValue(...values) {
  for (const value of values) {
    const amount = Number(String(value || '').replace(/[^\d.,]/gu, '').replace(',', '.'))
    if (Number.isFinite(amount) && amount > 0) return amount
  }
  return 21967
}

function formatPrice(value) {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value)} ₽`
}

function wordForm(value, forms) {
  const mod100 = value % 100
  const mod10 = value % 10
  if (mod100 >= 11 && mod100 <= 19) return forms[2]
  if (mod10 === 1) return forms[0]
  if (mod10 >= 2 && mod10 <= 4) return forms[1]
  return forms[2]
}

function readPassengerSnapshot() {
  try {
    const raw = window.sessionStorage.getItem(confirmationStorageKey)
    if (!raw) return null
    const snapshot = JSON.parse(raw)
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null

    const queryBookingId = query('bookingId')
    const queryFlightId = query('flight')
    if (queryBookingId && snapshot.bookingId && queryBookingId !== snapshot.bookingId) return null
    if (queryFlightId && snapshot.flight?.id && queryFlightId !== snapshot.flight.id) return null
    return snapshot
  } catch {
    return null
  }
}

function passengerName(passenger) {
  return [passenger?.surname, passenger?.givenName, passenger?.middleName]
    .filter(Boolean)
    .join(' ')
}

function passengerLabel(snapshot) {
  const explicitNames = query('passengerNames', 'travellerNames')
  if (explicitNames) return explicitNames

  const snapshotNames = Array.isArray(snapshot?.passengers)
    ? snapshot.passengers.map(passengerName).filter(Boolean)
    : []
  if (snapshotNames.length) return snapshotNames.join(', ')

  const explicitName = query('passengerName')
  if (explicitName) return explicitName

  const traveller = query('traveller', 'guests')
  if (traveller) return traveller

  const adults = Math.max(1, Number(query('adults')) || 1)
  const children = Math.max(0, Number(query('children')) || 0)
  const labels = [`${adults} ${wordForm(adults, ['взрослый', 'взрослых', 'взрослых'])}`]
  if (children) labels.push(`${children} ${wordForm(children, ['ребёнок', 'ребёнка', 'детей'])}`)
  return labels.join(', ')
}

function flightScope() {
  const explicit = query('flightScope')
  if (explicit === 'oneway' || explicit === 'roundtrip') return explicit
  return query('flightReturnDate', 'return') ? 'roundtrip' : 'oneway'
}

const snapshot = readPassengerSnapshot()
const scope = flightScope()
const origin = query('from') || snapshot?.route?.origin || 'Москва'
const destination = query('to') || snapshot?.route?.destination || 'Санкт-Петербург'
const outboundDate = query('flightOutboundDate', 'depart') || snapshot?.route?.depart || '4 августа'
const returnDate = query('flightReturnDate', 'return') || snapshot?.route?.returning || '6 августа'
const total = numberValue(query('flightTotalPrice'), query('flightPrice'), snapshot?.fare?.price, snapshot?.flight?.totalPrice)

setText('#avia-success-route', `${origin} — ${destination}`)
setText('#avia-success-outbound-date', outboundDate)
setText('#avia-success-outbound-time', query('flightDepartTime') || snapshot?.flight?.outbound?.departTime || '06:40')
setText('#avia-success-outbound-arrival', query('flightArrivalTime') || snapshot?.flight?.outbound?.arrivalTime || '11:55')
setText('#avia-success-outbound-code', query('flightFromCode') || snapshot?.flight?.outbound?.fromCode || 'SVO')
setText('#avia-success-outbound-to-code', query('flightToCode') || snapshot?.flight?.outbound?.toCode || 'LED')
setText('#avia-success-outbound-duration', query('flightDuration') || snapshot?.flight?.outbound?.duration || '2 ч 10 м')
setText('#avia-success-outbound-flight', `${query('flightAirline') || snapshot?.flight?.outbound?.airline || 'Аэрофлот'} · ${query('flightNumber') || snapshot?.flight?.outbound?.number || 'SU 1000'}`)

const returnSection = document.querySelector('#avia-success-return')
const legs = document.querySelector('#avia-success-legs')
if (returnSection) returnSection.hidden = scope !== 'roundtrip'
if (legs) legs.dataset.scope = scope

if (scope === 'roundtrip') {
  setText('#avia-success-return-date', returnDate)
  setText('#avia-success-return-time', query('returnDepartTime') || snapshot?.flight?.returning?.departTime || '18:40')
  setText('#avia-success-return-arrival', query('returnArrivalTime') || snapshot?.flight?.returning?.arrivalTime || '20:50')
  setText('#avia-success-return-code', query('returnFromCode') || snapshot?.flight?.returning?.fromCode || query('flightToCode') || 'LED')
  setText('#avia-success-return-to-code', query('returnToCode') || snapshot?.flight?.returning?.toCode || query('flightFromCode') || 'SVO')
  setText('#avia-success-return-duration', query('returnDuration') || snapshot?.flight?.returning?.duration || query('flightDuration') || '2 ч 10 м')
  setText('#avia-success-return-flight', `${query('returnAirline') || snapshot?.flight?.returning?.airline || query('flightAirline') || 'Аэрофлот'} · ${query('returnFlightNumber') || snapshot?.flight?.returning?.number || 'SU 1001'}`)
}

setText('#avia-success-passengers', passengerLabel(snapshot))
setText('#avia-success-tariff', query('flightTariffName') || snapshot?.fare?.title || 'Эконом Лайт')
setText('#avia-success-total', formatPrice(total))

const workBadge = document.querySelector('#avia-success-work')
if (workBadge) workBadge.hidden = params.get('workTrip') !== '1'

const tripsLink = document.querySelector('#avia-success-trips')
if (tripsLink) tripsLink.href = new URL('./trips.html#personal', window.location.href).href

const homeLink = document.querySelector('#avia-success-home')
if (homeLink) {
  const homeUrl = new URL('./index.html', window.location.href)
  homeLink.href = homeUrl.href
}

page.dataset.ready = 'true'
