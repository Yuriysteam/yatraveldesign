const page = document.querySelector('.hotel-checkout-page')
const announcer = document.querySelector('#checkout-announcer')
const promoForm = document.querySelector('#promo-form')
const promoMessage = document.querySelector('#promo-message')
const wishes = document.querySelector('#checkout-wishes')
const wishesCounter = document.querySelector('#wishes-counter')
const workPurposeToggle = document.querySelector('#work-purpose-toggle')
const addToTripToggle = document.querySelector('#add-to-trip-toggle')
const businessTripRow = document.querySelector('#business-trip-row')
const businessTripKind = document.querySelector('#business-trip-kind')
const checkoutSubmit = document.querySelector('#checkout-submit')
const paymentSetup = document.querySelector('#checkout-payment-setup')
const checkoutTotalLabel = document.querySelector('#checkout-total-label')
const buyerContactsSection = document.querySelector('.checkout-section[aria-labelledby="contacts-title"]')
const paymentOnlyElements = Array.from(document.querySelectorAll('[data-payment-only]'))

if (!page || !announcer || !promoForm || !promoMessage || !wishes || !wishesCounter || !workPurposeToggle || !addToTripToggle || !businessTripRow || !businessTripKind || !checkoutSubmit || !paymentSetup || !checkoutTotalLabel || !buyerContactsSection) {
  throw new Error('Не найдены обязательные элементы страницы оформления отеля')
}

const params = new URLSearchParams(window.location.search)
const PERSONAL_TRIPS_STORAGE_KEY = 'personal-trip-bookings-v2'
const BUSINESS_PAID_TRIPS_STORAGE_KEY = 'business-trip-paid-v2'

const hotelCatalog = Object.freeze({
  azimut: Object.freeze({ id: 'azimut', name: 'AZIMUT Городской 3*', address: 'Москва, Смоленская улица, 16', image: './assets/hotel-detail/hero-main.png' }),
  metropol: Object.freeze({ id: 'metropol', name: 'Метрополь Бизнес 5*', address: 'Москва, Театральный проезд, 2', image: './assets/hotels/hotel-exterior.png' }),
  palmira: Object.freeze({ id: 'palmira', name: 'Palmira Business 4*', address: 'Москва, Новоданиловская набережная, 6', image: './assets/hotels/hotel-resort.png' }),
  maxima: Object.freeze({ id: 'maxima', name: 'Maxima Panorama 4*', address: 'Москва, Мастеркова, 4', image: './assets/hotels/azimut-smolenskaya.png' }),
  penta: Object.freeze({ id: 'penta', name: 'Pentahotel Central 4*', address: 'Москва, Новый Арбат, 15', image: './assets/hotels/hotel-exterior.png' }),
  'russo-balt': Object.freeze({ id: 'russo-balt', name: 'Руссо-Балт 5*', address: 'Москва, Гоголевский бульвар, 31', image: './assets/hotels/hotel-resort.png' }),
})

const roomCatalog = Object.freeze({
  'premium-double': Object.freeze({
    id: 'premium-double',
    name: 'Двухместный номер «Премиум» с двуспальной кроватью',
    image: './assets/hotel-detail/room-premium-exact.png',
    bed: 'Двуспальная кровать',
    features: Object.freeze(['Телевизор', 'Тапочки', 'Душевая кабина', 'Кондиционер', 'Гладильная доска', 'Wi‑Fi', 'Вид на озеро', 'Балкон', 'Сушилка']),
  }),
  'business-premium': Object.freeze({
    id: 'business-premium',
    name: 'Бизнес Премиум с одной двуспальной',
    image: './assets/hotel-detail/room-business-exact.png',
    bed: 'Двуспальная кровать',
    features: Object.freeze(['Телевизор', 'Рабочее место', 'Кондиционер', 'Wi‑Fi', 'Вид на город', 'Мини-бар', 'Сейф']),
  }),
})

const selectedHotel = hotelCatalog[params.get('hotel')] || hotelCatalog.azimut
const roomFromId = roomCatalog[params.get('roomId')]
const roomFromName = Object.values(roomCatalog).find(item => item.name === params.get('room'))
const selectedRoom = roomFromId || roomFromName || roomCatalog['premium-double']
const initialAddToTrip = params.get('addToTrip') === '1'
const initialTripKind = params.get('tripKind') === 'existing' ? 'existing' : 'new'
const sourceTripId = params.get('tripId')?.trim() || params.get('draftId')?.trim() || ''
const startedFromExistingTrip = initialAddToTrip && initialTripKind === 'existing' && Boolean(sourceTripId) && params.get('tripSelection') !== 'inline'
const initialHotelBookingId = params.get('hotelBookingId')?.trim()
  || window.crypto?.randomUUID?.()
  || `hotel-booking-${Date.now()}`

const state = {
  hotel: {
    ...selectedHotel,
    name: params.get('hotelName')?.trim() || selectedHotel.name,
    address: params.get('hotelAddress')?.trim() || selectedHotel.address,
  },
  room: {
    ...selectedRoom,
    name: params.get('room')?.trim() || selectedRoom.name,
  },
  tariff: params.get('tariff')?.trim() || 'Завтрак, оплата в отеле',
  tariffId: params.get('tariffId')?.trim() || 'premium-flex',
  checkin: params.get('checkin')?.trim() || params.get('depart')?.trim() || '21 июня',
  checkout: params.get('checkout')?.trim() || params.get('return')?.trim() || '25 июня',
  guests: params.get('guests')?.trim() || params.get('traveller')?.trim() || '1 взрослый',
  adults: Math.max(1, Number(params.get('adults')) || 0),
  children: Math.max(0, Number(params.get('children')) || 0),
  basePrice: Math.max(1, Number(params.get('hotelPrice')) || 34600),
  pointsMode: 'earn',
  promoDiscount: 0,
  outOfPolicy: params.get('hotelStatus') === 'out-of-policy',
  paymentPlan: ['full', 'split', 'deferred'].includes(params.get('paymentPlan')) ? params.get('paymentPlan') : 'full',
  paymentMethod: ['pay', 'business', 'sbp', 'card'].includes(params.get('paymentMethod')) ? params.get('paymentMethod') : 'pay',
  workTrip: startedFromExistingTrip || params.get('workTrip') === '1' || params.get('paymentMethod') === 'business' || initialAddToTrip,
  addToTrip: startedFromExistingTrip,
  tripKind: startedFromExistingTrip ? 'existing' : initialTripKind,
  hotelBookingId: initialHotelBookingId,
}

const monthIndexes = Object.freeze({
  янв: 0,
  января: 0,
  фев: 1,
  февраля: 1,
  мар: 2,
  марта: 2,
  апр: 3,
  апреля: 3,
  мая: 4,
  июн: 5,
  июня: 5,
  июл: 6,
  июля: 6,
  авг: 7,
  августа: 7,
  сен: 8,
  сентября: 8,
  окт: 9,
  октября: 9,
  ноя: 10,
  ноября: 10,
  дек: 11,
  декабря: 11,
})

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatPrice(value) {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`
}

function setText(selector, value) {
  const element = document.querySelector(selector)
  if (element) element.textContent = value
}

function parseRussianDate(value) {
  const match = String(value || '').trim().match(/^(\d{1,2})\s+([а-яё]+)/iu)
  if (!match) return null
  const month = monthIndexes[match[2].toLocaleLowerCase('ru')]
  if (!Number.isInteger(month)) return null
  const year = Number(params.get('year')) || new Date().getFullYear()
  return new Date(year, month, Number(match[1]), 12)
}

function formatDate(value) {
  const date = parseRussianDate(value)
  if (!date) return value
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })
    .format(date)
    .replace('.', '')
}

function daysBetween(fromValue, toValue) {
  const from = parseRussianDate(fromValue)
  const to = parseRussianDate(toValue)
  if (!from || !to) return 1
  if (to <= from) to.setFullYear(to.getFullYear() + 1)
  return Math.max(1, Math.round((to - from) / 86400000))
}

function wordForm(value, forms) {
  const mod10 = value % 10
  const mod100 = value % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return forms[1]
  return forms[2]
}

function inferGuests() {
  const adultMatch = state.guests.match(/(\d+)\s+(?:взросл|гост)/iu)
  const childMatch = state.guests.match(/(\d+)\s+(?:реб|дет)/iu)
  if (!Number(params.get('adults')) && adultMatch) state.adults = Math.max(1, Number(adultMatch[1]))
  if (!Number(params.get('children')) && childMatch) state.children = Math.max(0, Number(childMatch[1]))
  if (!state.adults) state.adults = 1
}

function cancellationDate() {
  const date = parseRussianDate(state.checkin)
  if (!date) return state.checkin
  date.setDate(date.getDate() - 1)
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date)
}

function totalPrice() {
  const pointsDiscount = state.pointsMode === 'redeem' ? Math.min(1000, state.basePrice - 1) : 0
  return Math.max(1, state.basePrice - pointsDiscount - state.promoDiscount)
}

function announce(message) {
  announcer.textContent = message
}

function syncSemanticParams() {
  const target = new URL(window.location.href)
  if (state.workTrip) target.searchParams.set('workTrip', '1')
  else target.searchParams.delete('workTrip')
  if (state.addToTrip) {
    target.searchParams.delete('paymentMethod')
    target.searchParams.delete('paymentPlan')
  } else {
    target.searchParams.set('paymentMethod', state.paymentMethod)
    target.searchParams.set('paymentPlan', state.paymentPlan)
  }
  target.searchParams.set('hotelBookingId', state.hotelBookingId)
  if (state.addToTrip) {
    target.searchParams.set('addToTrip', '1')
    target.searchParams.set('tripKind', state.tripKind)
    if (state.tripKind === 'new') {
      ;['tripSelection', 'tripId', 'tripFrom', 'tripTo', 'tripDepart', 'tripReturn'].forEach(name => target.searchParams.delete(name))
    }
  } else {
    target.searchParams.delete('addToTrip')
    target.searchParams.delete('tripKind')
  }
  window.history.replaceState(null, '', target)
  document.querySelectorAll('[data-travel-header] [data-route]').forEach(link => {
    const route = new URL(link.href, window.location.href)
    if (state.workTrip) route.searchParams.set('workTrip', '1')
    else route.searchParams.delete('workTrip')
    link.href = route.href
  })
}

function renderPaymentState() {
  if (startedFromExistingTrip) {
    state.workTrip = true
    state.addToTrip = true
    state.tripKind = 'existing'
  }
  if (!state.workTrip) state.addToTrip = false
  if (state.workTrip) state.pointsMode = 'earn'
  paymentSetup.hidden = startedFromExistingTrip
  buyerContactsSection.hidden = startedFromExistingTrip
  paymentOnlyElements.forEach(element => { element.hidden = state.workTrip })
  page.dataset.checkoutContext = state.workTrip ? 'work-trip' : 'standalone'
  document.querySelectorAll('[data-payment-plan]').forEach(button => {
    const selected = button.dataset.paymentPlan === state.paymentPlan
    button.classList.toggle('is-selected', selected)
    button.setAttribute('aria-pressed', String(selected))
  })
  document.querySelectorAll('[data-payment-method]').forEach(button => {
    const selected = button.dataset.paymentMethod === state.paymentMethod
    button.classList.toggle('is-selected', selected)
    button.setAttribute('aria-pressed', String(selected))
  })
  workPurposeToggle.setAttribute('aria-checked', String(state.workTrip))
  businessTripRow.hidden = startedFromExistingTrip || !state.workTrip
  addToTripToggle.setAttribute('aria-checked', String(state.addToTrip))
  businessTripKind.hidden = startedFromExistingTrip || !state.addToTrip
  document.querySelectorAll('[data-trip-kind]').forEach(button => {
    const selected = button.dataset.tripKind === state.tripKind
    button.classList.toggle('is-selected', selected)
    button.setAttribute('aria-pressed', String(selected))
  })
  checkoutSubmit.textContent = state.addToTrip ? 'Добавить в командировку' : 'Оплатить'
  checkoutTotalLabel.textContent = state.addToTrip ? 'Стоимость' : 'К оплате'
  setText('#checkout-result-copy', state.addToTrip
    ? 'Жильё появится в командировке со статусом «Ожидает оплаты».'
    : 'После оплаты бронирование появится в «Моих поездках».')
}

function renderFeatures() {
  const visible = state.room.features.slice(0, 8)
  const more = state.room.features.length > visible.length
    ? `<span class="room-feature room-feature--more">Ещё ${state.room.features.length - visible.length}</span>`
    : '<span class="room-feature room-feature--more">Ещё</span>'
  document.querySelector('#checkout-room-features').innerHTML = `${visible.map(feature => `<span class="room-feature">${escapeHtml(feature)}</span>`).join('')}${more}`
}

function renderGuestForms() {
  const guestCard = document.querySelector('.guest-form-card')?.closest('.checkout-card')
  if (!guestCard) return
  const parent = guestCard.parentElement
  parent.querySelectorAll('[data-generated-guest]').forEach(card => card.remove())
  const totalGuests = Math.max(1, state.adults + state.children)
  for (let index = 1; index < totalGuests; index += 1) {
    const card = guestCard.cloneNode(true)
    card.dataset.generatedGuest = 'true'
    card.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'))
    card.querySelector('h3').textContent = `Гость ${index + 1}, ${index < state.adults ? 'взрослый' : 'ребёнок'}`
    card.querySelectorAll('[data-action="add-guest"]').forEach(button => button.remove())
    card.querySelectorAll('input').forEach(input => { input.value = '' })
    parent.append(card)
  }
  guestCard.querySelector('[data-action="add-guest"]')?.setAttribute('hidden', '')
}

function renderPage() {
  inferGuests()
  const nights = daysBetween(state.checkin, state.checkout)
  const freeCancellation = !state.outOfPolicy && state.tariffId !== 'business-room-only'
  const cancelDate = cancellationDate()
  const cancellationTitle = freeCancellation ? `Бесплатная отмена до ${cancelDate}` : 'Отмена со штрафом'
  const cancellationCopy = freeCancellation ? 'После — удерживается стоимость первой ночи' : 'При отмене стоимость бронирования не возвращается'
  const meal = /без питания/iu.test(state.tariff) ? 'Без питания' : 'Завтрак включён'
  const nightLabel = `${nights} ${wordForm(nights, ['ночь', 'ночи', 'ночей'])}`
  const childrenLabel = state.children
    ? `${state.children} ${wordForm(state.children, ['ребёнок', 'ребёнка', 'детей'])}`
    : 'без детей'

  const gradeMatch = state.hotel.name.match(/\s(\d)\*?$/u)
  const hotelTitle = gradeMatch ? state.hotel.name.slice(0, gradeMatch.index).trim() : state.hotel.name
  const hotelGrade = gradeMatch?.[1] || '3'
  document.title = `${state.hotel.name} — оформление`
  setText('#checkout-hotel-name', hotelTitle)
  setText('#checkout-hotel-grade', hotelGrade)
  setText('#checkout-hotel-address', state.hotel.address)
  setText('#checkout-checkin', formatDate(state.checkin))
  setText('#checkout-checkout', formatDate(state.checkout))
  setText('#checkout-adults', `${state.adults} ${wordForm(state.adults, ['взрослый', 'взрослых', 'взрослых'])}`)
  setText('#checkout-children', childrenLabel)
  renderGuestForms()
  setText('#checkout-room-name', state.room.name)
  setText('#checkout-bed', state.room.bed)
  setText('#checkout-cancellation-title', cancellationTitle)
  setText('#checkout-cancellation-copy', cancellationCopy)
  setText('#checkout-meal', meal)
  setText('#checkout-green-note', freeCancellation ? cancellationTitle : 'Проверьте условия отмены перед оплатой')
  setText('#checkout-nights', nightLabel)
  setText('#checkout-base-price', formatPrice(state.basePrice))
  setText('#checkout-breakdown-price', formatPrice(state.basePrice))
  setText('#split-payment', formatPrice(Math.ceil(state.basePrice / 4)))
  setText('#earn-points', new Intl.NumberFormat('ru-RU').format(Math.min(2000, Math.floor(state.basePrice * .05))))
  setText('#checkout-total', formatPrice(totalPrice()))

  const hotelImage = document.querySelector('#checkout-hotel-image')
  hotelImage.src = state.hotel.image
  hotelImage.alt = state.hotel.name
  const roomImage = document.querySelector('#checkout-room-image')
  roomImage.src = state.room.image
  roomImage.alt = state.room.name
  renderFeatures()
  renderPaymentState()
}

function buildHotelLink() {
  const target = new URL ('./hotel.html', window.location.href)
  params.forEach((value, name) => {
    if (!['roomId', 'room', 'tariffId', 'tariff', 'hotelStatus'].includes(name)) target.searchParams.set(name, value)
  })
  target.searchParams.set('hotel', state.hotel.id)
  target.searchParams.set('hotelName', state.hotel.name)
  target.searchParams.set('hotelPrice', String(state.basePrice))
  target.searchParams.set('hotelAddress', state.hotel.address)
  target.searchParams.set('hotelBookingId', state.hotelBookingId)
  target.searchParams.set('checkin', state.checkin)
  target.searchParams.set('checkout', state.checkout)
  target.searchParams.set('guests', state.guests)
  if (state.workTrip) target.searchParams.set('workTrip', '1')
  else target.searchParams.delete('workTrip')
  return target
}

function checkoutTripId() {
  if (state.tripKind === 'existing') {
    const existingId = params.get('tripId')?.trim() || params.get('draftId')?.trim()
    if (existingId) return existingId
  }
  return window.crypto?.randomUUID?.() || `business-hotel-${Date.now()}`
}

function buildTripLink(tripId = checkoutTripId()) {
  const target = new URL('./trip.html', window.location.href)
  params.forEach((value, name) => target.searchParams.set(name, value))
  const tripDepart = state.tripKind === 'existing'
    ? params.get('tripDepart')?.trim() || params.get('depart')?.trim() || state.checkin
    : state.checkin
  const tripReturn = state.tripKind === 'existing'
    ? params.get('tripReturn')?.trim() || params.get('return')?.trim() || state.checkout
    : state.checkout
  const destination = state.tripKind === 'existing'
    ? params.get('tripTo')?.trim() || params.get('to')?.trim() || params.get('city')?.trim() || 'Москва'
    : params.get('to')?.trim() || params.get('city')?.trim() || 'Москва'
  const origin = state.tripKind === 'existing'
    ? params.get('tripFrom')?.trim() || params.get('from')?.trim() || 'Санкт-Петербург'
    : params.get('from')?.trim() || 'Санкт-Петербург'
  target.searchParams.set('from', origin)
  target.searchParams.set('to', destination)
  target.searchParams.set('title', `${origin} – ${destination}`)
  target.searchParams.set('depart', tripDepart)
  target.searchParams.set('return', tripReturn)
  target.searchParams.set('checkin', state.checkin)
  target.searchParams.set('checkout', state.checkout)
  target.searchParams.set('traveller', state.guests)
  target.searchParams.set('adults', String(state.adults))
  target.searchParams.set('children', String(state.children))
  target.searchParams.set('hotel', state.hotel.id)
  target.searchParams.set('hotelName', state.hotel.name)
  target.searchParams.set('hotelAddress', state.hotel.address)
  target.searchParams.set('hotelBookingId', state.hotelBookingId)
  target.searchParams.set('hotelPrice', String(totalPrice()))
  target.searchParams.set('room', state.room.name)
  target.searchParams.set('roomId', state.room.id)
  target.searchParams.set('tariff', state.tariff)
  target.searchParams.set('hotelStatus', 'awaiting-payment')
  target.searchParams.set('workTrip', '1')
  target.searchParams.delete('paymentMethod')
  target.searchParams.delete('paymentPlan')
  target.searchParams.set('addToTrip', '1')
  target.searchParams.set('tripKind', state.tripKind)
  target.searchParams.set('tripId', tripId)
  target.searchParams.delete('tripSelection')
  if (state.tripKind === 'new') {
    target.searchParams.set('draft', '1')
    target.searchParams.set('draftId', tripId)
  }
  const wish = wishes.value.trim()
  if (wish) target.searchParams.set('hotelWish', wish)
  return target
}

function buildConfirmationLink(bookingId) {
  const target = new URL('./hotel-confirmation.html', window.location.href)
  params.forEach((value, name) => target.searchParams.set(name, value))
  target.searchParams.set('bookingId', bookingId)
  target.searchParams.set('city', params.get('city')?.trim() || params.get('to')?.trim() || 'Москва')
  target.searchParams.set('hotel', state.hotel.id)
  target.searchParams.set('hotelName', state.hotel.name)
  target.searchParams.set('hotelAddress', state.hotel.address)
  target.searchParams.set('hotelBookingId', state.hotelBookingId)
  target.searchParams.set('hotelPrice', String(totalPrice()))
  target.searchParams.set('checkin', state.checkin)
  target.searchParams.set('checkout', state.checkout)
  target.searchParams.set('traveller', state.guests)
  target.searchParams.set('adults', String(state.adults))
  target.searchParams.set('children', String(state.children))
  target.searchParams.set('room', state.room.name)
  target.searchParams.set('tariff', state.tariff)
  target.searchParams.set('hotelStatus', 'paid')
  target.searchParams.set('paymentMethod', state.paymentMethod)
  target.searchParams.set('paymentPlan', state.paymentPlan)
  if (state.workTrip) target.searchParams.set('workTrip', '1')
  else target.searchParams.delete('workTrip')
  return target
}

function readStoredTrips(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function saveStoredTrip(key, trip) {
  try {
    const remaining = readStoredTrips(key).filter(item => item?.id !== trip.id)
    window.localStorage.setItem(key, JSON.stringify([trip, ...remaining].slice(0, 12)))
  } catch {
    // Оплата и переход остаются доступны, даже если хранилище браузера недоступно.
  }
}

function tripRecord(id, target, business) {
  const city = params.get('city')?.trim() || params.get('to')?.trim() || 'Москва'
  const origin = params.get('from')?.trim() || 'Санкт-Петербург'
  const pageName = target.pathname.split('/').pop()
  return {
    id,
    state: 'upcoming',
    serviceCount: 1,
    paidServices: 1,
    city,
    transport: 'hotel',
    route: business ? `${origin} — ${city}` : city,
    dates: `${state.checkin} — ${state.checkout}`,
    title: state.hotel.name,
    detail: `${state.room.name} · ${state.guests}${state.workTrip && !business ? ' · Рабочая поездка' : ''}`,
    status: 'Оплачено',
    hotelImage: state.hotel.image,
    secondaryTitle: 'Отель',
    secondaryDetail: `${state.checkin} — ${state.checkout}`,
    secondaryIcon: './assets/icons/lodging.svg',
    secondaryType: 'hotel',
    workTrip: state.workTrip,
    href: `./${pageName}?${target.searchParams.toString()}`,
  }
}

function payBooking(button) {
  button.disabled = true
  button.textContent = state.addToTrip ? 'Добавляем…' : 'Оплачиваем…'
  if (state.addToTrip) {
    const tripId = checkoutTripId()
    const target = buildTripLink(tripId)
    announce(`${state.hotel.name} добавлен в командировку без оплаты`)
    window.setTimeout(() => {
      if (!window.TripV2Bridge?.returnToTrip(target, { result: 'service-added', kind: 'hotel', segments: ['lodging'] })) window.location.href = target.href
    }, 350)
    return
  }
  const bookingId = window.crypto?.randomUUID?.() || `hotel-${Date.now()}`
  const target = buildConfirmationLink(bookingId)
  saveStoredTrip(PERSONAL_TRIPS_STORAGE_KEY, tripRecord(bookingId, target, false))
  announce(`${state.hotel.name} оплачен`)
  window.setTimeout(() => { window.location.href = target.href }, 550)
}

function selectPointsMode(button) {
  state.pointsMode = button.dataset.pointsMode === 'redeem' ? 'redeem' : 'earn'
  document.querySelectorAll('[data-points-mode]').forEach(item => {
    const active = item === button
    item.classList.toggle('is-active', active)
    item.setAttribute('aria-pressed', String(active))
  })
  setText('#checkout-total', formatPrice(totalPrice()))
  announce(state.pointsMode === 'redeem' ? 'Списываем 1 000 баллов Плюса' : 'Баллы Плюса будут начислены после поездки')
}

function togglePromo() {
  const toggle = document.querySelector('#promo-toggle')
  const enabled = toggle.getAttribute('aria-checked') !== 'true'
  toggle.setAttribute('aria-checked', String(enabled))
  promoForm.hidden = !enabled
  promoMessage.hidden = true
  if (enabled) window.requestAnimationFrame(() => promoForm.elements.promo.focus())
  else {
    state.promoDiscount = 0
    promoForm.reset()
    setText('#checkout-total', formatPrice(totalPrice()))
  }
}

promoForm.addEventListener('submit', event => {
  event.preventDefault()
  const promo = String(new FormData(promoForm).get('promo') || '').trim().toLocaleUpperCase('ru')
  const valid = promo === 'TRAVEL10'
  state.promoDiscount = valid ? Math.round(state.basePrice * .1) : 0
  promoMessage.hidden = false
  promoMessage.classList.toggle('is-error', !valid)
  promoMessage.textContent = valid ? `Промокод применён: −${formatPrice(state.promoDiscount)}` : 'Промокод не найден'
  setText('#checkout-total', formatPrice(totalPrice()))
})

wishes.addEventListener('input', () => {
  wishesCounter.textContent = `${wishes.value.length} / 500`
})

document.addEventListener('click', event => {
  const planButton = event.target.closest('[data-payment-plan]')
  if (planButton) {
    state.paymentPlan = planButton.dataset.paymentPlan
    renderPaymentState()
    syncSemanticParams()
    announce(`Выбран способ оплаты: ${planButton.querySelector('strong')?.textContent || ''}`)
    return
  }

  const methodButton = event.target.closest('[data-payment-method]')
  if (methodButton) {
    state.paymentMethod = methodButton.dataset.paymentMethod
    if (state.paymentMethod === 'business') state.workTrip = true
    renderPaymentState()
    syncSemanticParams()
    announce(`Выбран способ оплаты: ${methodButton.querySelector('strong')?.textContent || ''}`)
    return
  }

  const tripKindButton = event.target.closest('[data-trip-kind]')
  if (tripKindButton) {
    state.tripKind = tripKindButton.dataset.tripKind
    renderPaymentState()
    syncSemanticParams()
    announce(state.tripKind === 'new' ? 'Будет создана новая командировка' : 'Отель будет добавлен в существующую командировку')
    return
  }

  const savedGuestButton = event.target.closest('[data-saved-guest]')
  if (savedGuestButton) {
    document.querySelectorAll('[data-saved-guest]').forEach(button => button.classList.toggle('is-selected', button === savedGuestButton))
    const [lastName, firstName] = savedGuestButton.dataset.savedGuest.split(' ')
    document.querySelector('#guest-first-name').value = firstName || ''
    document.querySelector('#guest-last-name').value = lastName || ''
    announce(`Выбран гость: ${savedGuestButton.dataset.savedGuest}`)
    return
  }

  const pointsButton = event.target.closest('[data-points-mode]')
  if (pointsButton) {
    selectPointsMode(pointsButton)
    return
  }

  const headerMessage = event.target.closest('[data-header-message]')
  if (headerMessage) {
    event.preventDefault()
    announce(`${headerMessage.dataset.headerMessage}: раздел пока не подключён`)
    return
  }

  const actionTarget = event.target.closest('[data-action]')
  const action = actionTarget?.dataset.action
  if (!action) return

  if (action === 'back-to-hotel') window.location.href = buildHotelLink().href
  else if (action === 'toggle-promo') togglePromo()
  else if (action === 'toggle-work-purpose') {
    state.workTrip = !state.workTrip
    if (!state.workTrip && state.paymentMethod === 'business') state.paymentMethod = 'pay'
    renderPaymentState()
    syncSemanticParams()
    announce(state.workTrip ? 'Включена рабочая поездка' : 'Рабочая поездка выключена')
  } else if (action === 'toggle-add-to-trip') {
    state.addToTrip = !state.addToTrip
    renderPaymentState()
    syncSemanticParams()
    announce(state.addToTrip ? 'Отель будет добавлен в командировку' : 'Отель останется в «Моих поездках»')
  } else if (action === 'toggle-breakdown') {
    const breakdown = document.querySelector('#price-breakdown')
    const expanded = actionTarget.getAttribute('aria-expanded') === 'true'
    actionTarget.setAttribute('aria-expanded', String(!expanded))
    breakdown.hidden = expanded
  } else if (action === 'pay') {
    payBooking(actionTarget)
  } else if (action === 'add-guest') {
    announce('Добавлена форма ещё одного гостя')
  } else if (action === 'legal') {
    event.preventDefault()
    announce('Откроем юридическую информацию в полной версии')
  }
})

document.addEventListener('business-trip-target-change', event => {
  const current = new URLSearchParams(event.detail?.search || window.location.search)
  Array.from(params.keys()).forEach(name => params.delete(name))
  current.forEach((value, name) => params.set(name, value))
  state.tripKind = 'existing'
  renderPaymentState()
  announce('Выбрана существующая командировка')
})

syncSemanticParams()
renderPage()
page.setAttribute('data-ready', 'true')

window.HotelCheckoutPrototype = Object.freeze({
  state,
  hotelCatalog,
  roomCatalog,
  renderPage,
  totalPrice,
  buildHotelLink,
  buildTripLink,
  buildConfirmationLink,
  renderPaymentState,
})
