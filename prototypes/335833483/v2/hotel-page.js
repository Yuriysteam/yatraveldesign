const page = document.querySelector('.hotel-detail-page')
const offerForm = document.querySelector('#hotel-offer-search')
const dateWagonsRoot = document.querySelector('#date-wagons')
const roomsRoot = document.querySelector('#rooms-list')
const nearbyHotelsRoot = document.querySelector('#nearby-hotels-list')
const guestFavoritesRoot = document.querySelector('#guest-favorites-list')
const announcer = document.querySelector('#detail-announcer')
const lightbox = document.querySelector('#hotel-lightbox')
const lightboxImage = document.querySelector('#lightbox-image')
const lightboxCaption = document.querySelector('#lightbox-caption')

if (!page || !offerForm || !dateWagonsRoot || !roomsRoot || !nearbyHotelsRoot || !guestFavoritesRoot || !announcer || !lightbox || !lightboxImage || !lightboxCaption) {
  throw new Error('Не найдены обязательные элементы страницы отеля')
}

const params = new URLSearchParams(window.location.search)

const selectedCity = params.get('city')?.trim() || params.get('to')?.trim() || 'Москва'

const hotelAddressByCity = Object.freeze({
  Москва: 'Москва, Смоленская улица, 16',
  'Санкт-Петербург': 'Санкт-Петербург, Лермонтовский проспект, 43/1',
  Екатеринбург: 'Екатеринбург, улица Малышева, 51',
  Казань: 'Казань, улица Пушкина, 4',
  Новосибирск: 'Новосибирск, улица Ленина, 21',
  Сочи: 'Сочи, улица Орджоникидзе, 17',
})

const hotelCatalog = Object.freeze({
  azimut: Object.freeze({
    id: 'azimut',
    name: 'AZIMUT Городской 3*',
    rating: 4.9,
    reviews: 3562,
    price: 34600,
    address: 'Москва, Смоленская улица, 16',
  }),
  metropol: Object.freeze({ id: 'metropol', name: 'Метрополь Бизнес 5*', rating: 4.8, reviews: 1298, price: 48600, address: 'Москва, Театральный проезд, 2' }),
  palmira: Object.freeze({ id: 'palmira', name: 'Palmira Business 4*', rating: 4.7, reviews: 884, price: 22600, address: 'Москва, Новоданиловская набережная, 6' }),
  maxima: Object.freeze({ id: 'maxima', name: 'Maxima Panorama 4*', rating: 4.5, reviews: 631, price: 18600, address: 'Москва, Мастеркова, 4' }),
  penta: Object.freeze({ id: 'penta', name: 'Pentahotel Central 4*', rating: 4.4, reviews: 905, price: 11990, address: 'Москва, Новый Арбат, 15' }),
  'russo-balt': Object.freeze({ id: 'russo-balt', name: 'Руссо-Балт 5*', rating: 4.6, reviews: 188, price: 39900, address: 'Москва, Гоголевский бульвар, 31' }),
})

const defaultHotel = hotelCatalog[params.get('hotel')] || hotelCatalog.azimut
const initialHotelBookingId = params.get('hotelBookingId')?.trim()
  || window.crypto?.randomUUID?.()
  || `hotel-booking-${Date.now()}`

let dateOptions = []

function resolveHotelAddress(hotel, city) {
  const requestedAddress = params.get('hotelAddress')?.trim()
  if (requestedAddress?.toLocaleLowerCase('ru-RU').startsWith(city.toLocaleLowerCase('ru-RU'))) return requestedAddress
  if (hotel.address?.toLocaleLowerCase('ru-RU').startsWith(city.toLocaleLowerCase('ru-RU'))) return hotel.address
  return hotelAddressByCity[city] || `${city}, Центральная улица, 1`
}

const rooms = Object.freeze([
  Object.freeze({
    id: 'premium-double',
    name: 'Двухместный номер «Премиум» с двуспальной кроватью',
    image: './assets/hotel-detail/room-premium-exact.png',
    imageAlt: 'Двухместный номер Премиум с видом на город',
    availability: Object.freeze(['В каждом номере: 2 основных места', 'Всего 10 основных мест']),
    amenities: Object.freeze([
      Object.freeze({ icon: './assets/hotel-detail/briefcase.svg', label: 'Рабочее место' }),
      Object.freeze({ icon: './assets/hotel-detail/wifi.svg', label: 'Быстрый Wi‑Fi' }),
      Object.freeze({ icon: './assets/icons/check.svg', label: 'Отчётные документы' }),
    ]),
    description: 'Просторный номер с отдельной гостиной зоной, рабочим местом и панорамным видом. В стоимость входят ежедневная уборка и доступ к Wi‑Fi.',
    tariffs: Object.freeze([
      Object.freeze({
        id: 'premium-flex',
        name: 'Завтрак, оплата в отеле',
        offset: 0,
        oldPrice: 40000,
        discount: 10,
        conditions: Object.freeze([
          Object.freeze({ label: 'Включён завтрак', tone: 'positive' }),
          Object.freeze({ label: 'Отмена со штрафом', more: true }),
        ]),
      }),
      Object.freeze({
        id: 'premium-policy-exception',
        name: 'Завтрак, расширенные условия',
        offset: 10000,
        outOfPolicy: true,
        conditions: Object.freeze([
          Object.freeze({ label: 'Включён завтрак', tone: 'positive' }),
          Object.freeze({ label: 'Отмена со штрафом', more: true }),
        ]),
      }),
    ]),
  }),
  Object.freeze({
    id: 'business-premium',
    name: 'Бизнес Премиум с одной двуспальной',
    image: './assets/hotel-detail/room-business-exact.png',
    imageAlt: 'Гостиная номера Бизнес Премиум',
    subtitle: 'Двуспальная кровать',
    amenities: Object.freeze([
      Object.freeze({ icon: './assets/hotel-detail/briefcase.svg', label: 'Рабочее место' }),
      Object.freeze({ icon: './assets/hotel-detail/wifi.svg', label: 'Быстрый Wi‑Fi' }),
      Object.freeze({ icon: './assets/icons/check.svg', label: 'Отчётные документы' }),
    ]),
    description: 'Номер с двуспальной кроватью, гостиной зоной и рабочим столом. Подойдёт для длительной деловой поездки.',
    tariffs: Object.freeze([
      Object.freeze({
        id: 'business-room-only',
        name: 'Без питания',
        fixedPrice: 125500,
        outOfPolicy: true,
        conditions: Object.freeze([
          Object.freeze({ label: 'Без питания' }),
          Object.freeze({ label: 'Отмена со штрафом', more: true }),
        ]),
      }),
    ]),
  }),
])

const nearbyHotels = Object.freeze([
  Object.freeze({ id: 'ecodom', name: 'Экодом Фэмили', rating: 4.9, reviews: '221 отзыв', type: 'Гостиница', price: 37770, image: './assets/hotel-detail/ecodom.png' }),
  Object.freeze({ id: 'kenguru', name: 'Кенгуру', rating: 4.9, reviews: '93 отзыва', type: 'Отель', price: 37770, image: './assets/hotel-detail/kenguru.png' }),
  Object.freeze({ id: 'aist', name: 'Аист', rating: 4.9, reviews: '173 отзыва', type: 'Отель', price: 37770, image: './assets/hotel-detail/aist.png' }),
  Object.freeze({ id: 'nadezhda', name: 'Надежда', rating: 4.9, reviews: '2 отзыва', type: 'Гостиница', price: 37770, image: './assets/hotel-detail/nadezhda.png' }),
  Object.freeze({ id: 'orhideya', name: 'Орхидея', rating: 4.9, reviews: '2 отзыва', type: 'Гостиница', price: 37770, image: './assets/hotel-detail/orhideya.png' }),
])

const guestFavorites = Object.freeze([
  Object.freeze({ label: 'Расположение', value: 93 }),
  Object.freeze({ label: 'Wi‑Fi', value: 88 }),
  Object.freeze({ label: 'Завтрак', value: 80 }),
  Object.freeze({ label: 'Расположение', value: 77 }),
  Object.freeze({ label: 'Wi‑Fi', value: 71 }),
  Object.freeze({ label: 'Завтрак', value: 65 }),
])

const gallery = Object.freeze([
  Object.freeze({ src: './assets/hotel-detail/hero-main.png', caption: 'AZIMUT Смоленская — вид на здание' }),
  Object.freeze({ src: './assets/hotel-detail/hero-room.png', caption: 'Двухместный номер' }),
  Object.freeze({ src: './assets/hotel-detail/hero-restaurant.png', caption: 'Ресторан отеля' }),
  Object.freeze({ src: './assets/hotel-detail/room-premium-exact.png', caption: 'Номер «Премиум»' }),
  Object.freeze({ src: './assets/hotel-detail/room-business-exact.png', caption: 'Номер «Бизнес Премиум»' }),
])

const state = {
  hotel: {
    ...defaultHotel,
    name: params.get('hotelName')?.trim() || defaultHotel.name,
    price: Math.max(1, Number(params.get('hotelPrice')) || defaultHotel.price),
    rating: Number(params.get('hotelRating')) || defaultHotel.rating,
    reviews: Math.max(1, Number(params.get('hotelReviews')) || defaultHotel.reviews),
    address: resolveHotelAddress(defaultHotel, selectedCity),
  },
  city: selectedCity,
  checkin: params.get('checkin')?.trim() || params.get('depart')?.trim() || '21 июня',
  checkout: params.get('checkout')?.trim() || params.get('return')?.trim() || '25 июня',
  guests: params.get('guests')?.trim() || params.get('traveller')?.trim() || '1 взрослый',
  addToTrip: params.get('addToTrip') === '1',
  tripKind: params.get('tripKind') === 'existing' ? 'existing' : 'new',
  hotelBookingId: initialHotelBookingId,
  selectedDateId: 'current',
  currentPrice: Math.max(1, Number(params.get('hotelPrice')) || defaultHotel.price),
  galleryIndex: 0,
  selectedTariffId: null,
}

dateOptions = buildDateOptions()

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

function formatReviews(value) {
  const mod10 = value % 10
  const mod100 = value % 100
  const word = mod10 === 1 && mod100 !== 11 ? 'отзыв' : mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14) ? 'отзыва' : 'отзывов'
  return `${new Intl.NumberFormat('ru-RU').format(value)} ${word}`
}

function setText(selector, value) {
  const element = document.querySelector(selector)
  if (element) element.textContent = value
}

function announce(message) {
  announcer.textContent = message
}

function parseHotelDate(value) {
  const match = String(value || '').trim().match(/^(\d{1,2})\s+([а-яё]+)/iu)
  if (!match) return null
  const monthKey = match[2].toLocaleLowerCase('ru').slice(0, 3)
  const month = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'].indexOf(monthKey)
  if (month < 0) return null
  return new Date(2026, month, Number(match[1]), 12)
}

function stayNights() {
  const checkin = parseHotelDate(state.checkin)
  let checkout = parseHotelDate(state.checkout)
  if (!checkin || !checkout) return 1
  if (checkout <= checkin) {
    checkout = new Date(checkout)
    checkout.setFullYear(checkout.getFullYear() + 1)
  }
  return Math.max(1, Math.round((checkout - checkin) / 86400000))
}

function formatNights(value) {
  const remainder100 = value % 100
  const remainder10 = value % 10
  const word = remainder100 >= 11 && remainder100 <= 14
    ? 'ночей'
    : remainder10 === 1
      ? 'ночь'
      : remainder10 >= 2 && remainder10 <= 4
        ? 'ночи'
        : 'ночей'
  return `${value} ${word}`
}

function formatDateRange(from, to) {
  const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  if (from.getMonth() === to.getMonth()) return `${from.getDate()} – ${to.getDate()} ${monthNames[to.getMonth()]}`
  return `${from.getDate()} ${monthNames[from.getMonth()]} – ${to.getDate()} ${monthNames[to.getMonth()]}`
}

function weekdayRange(from, to) {
  const formatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })
  return `${formatter.format(from).replace('.', '')} – ${formatter.format(to).replace('.', '')}`
}

function shiftedDate(date, offset) {
  const result = new Date(date)
  result.setDate(result.getDate() + offset)
  return result
}

function buildDateOptions() {
  const from = parseHotelDate(state.checkin) || new Date(2026, 5, 21, 12)
  let to = parseHotelDate(state.checkout) || new Date(2026, 5, 25, 12)
  if (to <= from) {
    to = new Date(to)
    to.setFullYear(to.getFullYear() + 1)
  }
  const specs = [
    { id: 'previous', offset: -2, factor: .96 },
    { id: 'current', offset: 0, factor: 1, current: true },
    { id: 'next-one', offset: 1, factor: 1.03 },
    { id: 'cheaper', offset: 2, factor: .98, cheaper: true },
    { id: 'next-three', offset: 3, factor: 1.01 },
    { id: 'next-four', offset: 4, factor: 1.04 },
  ]
  return specs.map(spec => {
    const optionFrom = shiftedDate(from, spec.offset)
    const optionTo = shiftedDate(to, spec.offset)
    return Object.freeze({
      ...spec,
      range: formatDateRange(optionFrom, optionTo),
      price: Math.max(1, Math.round(state.currentPrice * spec.factor / 100) * 100),
      weekdays: weekdayRange(optionFrom, optionTo),
    })
  })
}

function setHotelCopy() {
  document.title = `${state.hotel.name} — прототип`
  setText('#hotel-name', state.hotel.name)
  setText('#hotel-rating', state.hotel.rating.toFixed(1))
  setText('#hotel-reviews', formatReviews(state.hotel.reviews))
  setText('#hotel-address', state.hotel.address)
  setText('#hero-price', formatPrice(state.currentPrice))
  setText('#map-hotel-name', state.hotel.name)
  setText('#map-rating', state.hotel.rating.toFixed(1))
  setText('#map-reviews', formatReviews(state.hotel.reviews))
  setText('#back-city', state.city)
}

function setFormValues() {
  offerForm.elements.checkin.value = state.checkin
  offerForm.elements.checkout.value = state.checkout
  const select = offerForm.elements.guests
  if (![...select.options].some(option => option.value === state.guests)) {
    select.add(new Option(state.guests, state.guests))
  }
  select.value = state.guests
}

function syncQuery() {
  const locationValue = new URL(window.location.href)
  const values = {
    hotel: state.hotel.id,
    hotelName: state.hotel.name,
    hotelAddress: state.hotel.address,
    hotelPrice: String(state.currentPrice),
    hotelRating: String(state.hotel.rating),
    hotelReviews: String(state.hotel.reviews),
    city: state.city,
    to: state.city,
    checkin: state.checkin,
    checkout: state.checkout,
    guests: state.guests,
    traveller: state.guests,
    hotelBookingId: state.hotelBookingId,
  }
  if (state.tripKind !== 'existing') {
    values.depart = state.checkin
    values.return = state.checkout
  }
  Object.entries(values).forEach(([name, value]) => locationValue.searchParams.set(name, value))
  window.history.replaceState(null, '', locationValue)
}

function splitDateRange(range) {
  const [fromPart, toPart] = range.split('–').map(part => part.trim())
  const toMonth = toPart?.match(/[а-яё]+/iu)?.[0] || 'июня'
  const fromMonth = fromPart?.match(/[а-яё]+/iu)?.[0] || toMonth
  const fromDay = fromPart?.match(/\d{1,2}/u)?.[0] || '21'
  const toDay = toPart?.match(/\d{1,2}/u)?.[0] || '25'
  return { checkin: `${fromDay} ${fromMonth}`, checkout: `${toDay} ${toMonth}` }
}

function renderDates() {
  dateWagonsRoot.innerHTML = dateOptions.map(option => {
    const active = state.selectedDateId === option.id
    const badge = active
      ? '<span class="date-wagon__badge">Ваши даты</span>'
      : option.cheaper
        ? '<span class="date-wagon__badge date-wagon__badge--cheap">Дешевле</span>'
        : ''
    return `
      <button class="date-wagon${active ? ' is-active' : ''}" type="button" data-date-id="${escapeHtml(option.id)}" role="option" aria-selected="${active ? 'true' : 'false'}">
        ${badge}
        <span>${escapeHtml(option.range)}</span>
        <strong>от ${escapeHtml(formatPrice(option.price))}</strong>
        <small>${escapeHtml(option.weekdays)}</small>
      </button>`
  }).join('')
}

function renderCondition(condition) {
  const tone = condition.tone ? ` condition-chip--${escapeHtml(condition.tone)}` : ''
  return `<span class="condition-chip${tone}"${condition.more ? ' data-more="true"' : ''}>${escapeHtml(condition.label)}</span>`
}

function renderPaymentOptions() {
  return `
    <div class="payment-options">
      <span class="payment-option"><img class="payment-plus-logo" src="./assets/hotel-detail/plus-gradient.svg" alt="">3200 по Я Пэй</span>
      <span class="payment-option"><i class="payment-icon">₽</i>Оплата в день заселения</span>
    </div>`
}

function tariffPrice(tariff) {
  return tariff.fixedPrice || state.currentPrice + (tariff.offset || 0)
}

function renderTariff(room, tariff) {
  const price = tariffPrice(tariff)
  const selected = state.selectedTariffId === tariff.id
  const oldPrice = tariff.oldPrice ? `<span class="tariff-old-price">${escapeHtml(formatPrice(tariff.oldPrice))}</span>` : ''
  const discount = tariff.discount
    ? `<span class="business-discount">-${escapeHtml(tariff.discount)}% <img src="./assets/hotel-detail/briefcase.svg" alt=""></span>`
    : ''
  return `
    <div class="tariff-row${tariff.discount ? ' has-discount' : ''}${selected ? ' is-selected' : ''}" data-tariff-id="${escapeHtml(tariff.id)}">
      <div class="tariff-conditions">${tariff.conditions.map(renderCondition).join('')}</div>
      <div class="tariff-booking">
        <div class="tariff-price-panel">
          <div class="tariff-price-line"><strong>${escapeHtml(formatPrice(price))}</strong>${discount}</div>
          ${oldPrice}
          <span class="tariff-nights">${escapeHtml(formatNights(stayNights()))}</span>
          ${renderPaymentOptions()}
        </div>
        <button class="tariff-choose" type="button" data-action="select-tariff" data-room-id="${escapeHtml(room.id)}" data-tariff-id="${escapeHtml(tariff.id)}">Выбрать</button>
      </div>
    </div>`
}

function renderRoom(room) {
  const availability = room.availability
    ? `<div class="room-head__copy room-head__copy--availability">${room.availability.map(line => `<span>${escapeHtml(line)}</span>`).join('')}</div>`
    : `<div class="room-head__copy"><span>${escapeHtml(room.subtitle)}</span></div>`
  return `
    <article class="room-group" data-room-id="${escapeHtml(room.id)}">
      <div class="room-head">
        <img class="room-head__image" src="${escapeHtml(room.image)}" alt="${escapeHtml(room.imageAlt)}">
        <div class="room-head__body">
          <h3>${escapeHtml(room.name)}</h3>
          ${availability}
          <div class="room-amenities">
            ${room.amenities.map(amenity => `<span class="room-amenity"><img src="${escapeHtml(amenity.icon)}" alt=""><span>${escapeHtml(amenity.label)}</span></span>`).join('')}
          </div>
          <button class="room-details-button" type="button" data-action="room-details" data-room-id="${escapeHtml(room.id)}" aria-expanded="false">Подробнее о номере</button>
        </div>
        <p class="room-description" id="room-description-${escapeHtml(room.id)}" hidden>${escapeHtml(room.description)}</p>
      </div>
      <div class="tariff-list">${room.tariffs.map(tariff => renderTariff(room, tariff)).join('')}</div>
    </article>`
}

function renderRooms() {
  roomsRoot.innerHTML = rooms.map(renderRoom).join('')
}

function renderNearbyHotels() {
  nearbyHotelsRoot.innerHTML = nearbyHotels.map(hotel => `
    <button class="nearby-hotel" type="button" data-nearby-hotel="${escapeHtml(hotel.id)}" aria-label="Открыть ${escapeHtml(hotel.name)}">
      <img src="${escapeHtml(hotel.image)}" alt="${escapeHtml(hotel.name)}">
      <span class="nearby-hotel__body">
        <strong>${escapeHtml(hotel.name)}</strong>
        <span class="nearby-hotel__meta"><b>${escapeHtml(hotel.rating)}</b><span>${escapeHtml(hotel.reviews)}</span><i aria-hidden="true"></i><span>${escapeHtml(hotel.type)}</span></span>
        <span class="nearby-hotel__price">От ${escapeHtml(formatPrice(hotel.price))}</span>
      </span>
    </button>`).join('')
}

function renderGuestFavorites() {
  guestFavoritesRoot.innerHTML = guestFavorites.map(item => `
    <div class="guest-favorite">
      <span>${escapeHtml(item.label)}</span>
      <span class="guest-favorite__metric"><span class="guest-favorite__bar"><i style="width:${escapeHtml(item.value)}%"></i></span><strong>${escapeHtml(item.value)}%</strong></span>
    </div>`).join('')
}

function buildResultsLink() {
  const target = new URL('./hotel-search.html', window.location.href)
  params.forEach((value, name) => target.searchParams.set(name, value))
  target.searchParams.set('city', state.city)
  target.searchParams.set('to', state.city)
  target.searchParams.set('checkin', state.checkin)
  target.searchParams.set('checkout', state.checkout)
  target.searchParams.set('guests', state.guests)
  target.searchParams.set('traveller', state.guests)
  target.searchParams.set('hotelBookingId', state.hotelBookingId)
  if (state.tripKind !== 'existing') {
    target.searchParams.set('depart', state.checkin)
    target.searchParams.set('return', state.checkout)
  }
  return target
}

function buildCheckoutLink(room, tariff) {
  const target = new URL('./hotel-checkout.html', window.location.href)
  params.forEach((value, name) => target.searchParams.set(name, value))
  target.searchParams.set('city', state.city)
  target.searchParams.set('to', state.city)
  target.searchParams.set('checkin', state.checkin)
  target.searchParams.set('checkout', state.checkout)
  target.searchParams.set('guests', state.guests)
  target.searchParams.set('traveller', state.guests)
  target.searchParams.set('hotelBookingId', state.hotelBookingId)
  if (state.tripKind !== 'existing') {
    target.searchParams.set('depart', state.checkin)
    target.searchParams.set('return', state.checkout)
  }
  target.searchParams.set('hotel', state.hotel.id)
  target.searchParams.set('hotelName', state.hotel.name)
  target.searchParams.set('hotelAddress', state.hotel.address)
  target.searchParams.set('hotelPrice', String(tariffPrice(tariff)))
  target.searchParams.set('hotelRating', String(state.hotel.rating))
  target.searchParams.set('hotelReviews', String(state.hotel.reviews))
  target.searchParams.set('roomId', room.id)
  target.searchParams.set('room', room.name)
  target.searchParams.set('tariffId', tariff.id)
  target.searchParams.set('tariff', tariff.name)
  target.searchParams.set('hotelStatus', tariff.outOfPolicy ? 'out-of-policy' : 'awaiting-payment')
  return target
}

function openGallery(index) {
  state.galleryIndex = (index + gallery.length) % gallery.length
  const item = gallery[state.galleryIndex]
  lightboxImage.src = item.src
  lightboxImage.alt = item.caption
  lightboxCaption.textContent = `${item.caption} · ${state.galleryIndex + 1} из ${gallery.length}`
  lightbox.hidden = false
  document.body.style.overflow = 'hidden'
  document.querySelector('[data-action="close-gallery"]')?.focus()
}

function closeGallery() {
  lightbox.hidden = true
  document.body.style.overflow = ''
  document.querySelector(`[data-gallery-index="${Math.min(state.galleryIndex, 2)}"]`)?.focus()
}

function toggleRoomDetails(button) {
  const roomId = button.dataset.roomId
  const description = document.querySelector(`#room-description-${CSS.escape(roomId)}`)
  if (!description) return
  const expanded = button.getAttribute('aria-expanded') === 'true'
  button.setAttribute('aria-expanded', String(!expanded))
  button.textContent = expanded ? 'Подробнее о номере' : 'Скрыть подробности'
  description.hidden = expanded
}

function selectTariff(button) {
  const room = rooms.find(item => item.id === button.dataset.roomId)
  const tariff = room?.tariffs.find(item => item.id === button.dataset.tariffId)
  if (!room || !tariff) return
  state.selectedTariffId = tariff.id
  renderRooms()
  announce('Переходим к оформлению номера')
  const target = buildCheckoutLink(room, tariff)
  window.setTimeout(() => { window.location.href = target.href }, 650)
}

function chooseDate(optionId) {
  const option = dateOptions.find(item => item.id === optionId)
  if (!option) return
  const dates = splitDateRange(option.range)
  state.selectedDateId = option.id
  state.checkin = dates.checkin
  state.checkout = dates.checkout
  state.currentPrice = option.price
  setFormValues()
  setHotelCopy()
  syncQuery()
  renderDates()
  renderRooms()
  announce(`Цены обновлены на ${option.range}`)
}

offerForm.addEventListener('submit', event => {
  event.preventDefault()
  const data = new FormData(offerForm)
  state.checkin = String(data.get('checkin') || '').trim() || '21 июня'
  state.checkout = String(data.get('checkout') || '').trim() || '25 июня'
  state.guests = String(data.get('guests') || '').trim() || '1 взрослый'
  state.selectedDateId = 'current'
  dateOptions = buildDateOptions()
  syncQuery()
  renderDates()
  renderRooms()
  announce('Предложения обновлены на выбранные даты')
})

document.addEventListener('click', event => {
  const headerMessage = event.target.closest('[data-header-message]')
  if (headerMessage) {
    event.preventDefault()
    announce(`${headerMessage.dataset.headerMessage}: раздел пока не подключён`)
    return
  }

  const galleryTarget = event.target.closest('[data-gallery-index]')
  if (galleryTarget) {
    openGallery(Number(galleryTarget.dataset.galleryIndex) || 0)
    return
  }

  const dateTarget = event.target.closest('[data-date-id]')
  if (dateTarget) {
    chooseDate(dateTarget.dataset.dateId)
    return
  }

  const nearbyTarget = event.target.closest('[data-nearby-hotel]')
  if (nearbyTarget) {
    const hotel = nearbyHotels.find(item => item.id === nearbyTarget.dataset.nearbyHotel)
    if (!hotel) return
    const target = new URL (window.location.href)
    target.searchParams.set('hotel', hotel.id)
    target.searchParams.set('hotelName', hotel.name)
    target.searchParams.set('hotelPrice', String(hotel.price))
    target.searchParams.set('hotelRating', String(hotel.rating))
    target.searchParams.set('hotelReviews', hotel.reviews.match(/\d+/u)?.[0] || '2')
    window.location.href = target.href
    return
  }

  const actionTarget = event.target.closest('[data-action]')
  const action = actionTarget?.dataset.action
  if (!action) return

  if (action === 'back-to-results') window.location.href = buildResultsLink().href
  else if (action === 'share') {
    navigator.clipboard?.writeText(window.location.href)
      .then(() => announce('Ссылка на отель скопирована'))
      .catch(() => announce('Ссылка на отель готова в адресной строке'))
  } else if (action === 'notify' || action === 'favorite') {
    const pressed = actionTarget.getAttribute('aria-pressed') !== 'true'
    actionTarget.setAttribute('aria-pressed', String(pressed))
    announce(action === 'notify'
      ? pressed ? 'Сообщим, если цена изменится' : 'Уведомление о цене выключено'
      : pressed ? 'Отель добавлен в избранное' : 'Отель удалён из избранного')
  } else if (action === 'reviews') {
    document.querySelector('#guest-favorites-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else if (action === 'map') announce(`${state.hotel.name} показан на карте ${state.city}`)
  else if (action === 'scroll-to-offers') document.querySelector('#hotel-offers')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  else if (action === 'room-details') toggleRoomDetails(actionTarget)
  else if (action === 'select-tariff') selectTariff(actionTarget)
  else if (action === 'occupied') {
    const content = document.querySelector('#occupied-content')
    const expanded = actionTarget.getAttribute('aria-expanded') === 'true'
    actionTarget.setAttribute('aria-expanded', String(!expanded))
    content.hidden = expanded
  } else if (action === 'close-gallery') closeGallery()
  else if (action === 'gallery-prev') openGallery(state.galleryIndex - 1)
  else if (action === 'gallery-next') openGallery(state.galleryIndex + 1)
})

document.addEventListener('keydown', event => {
  if (lightbox.hidden) return
  if (event.key === 'Escape') closeGallery()
  else if (event.key === 'ArrowLeft') openGallery(state.galleryIndex - 1)
  else if (event.key === 'ArrowRight') openGallery(state.galleryIndex + 1)
})

syncQuery()
setHotelCopy()
setFormValues()
renderDates()
renderRooms()
renderNearbyHotels()
renderGuestFavorites()
page.setAttribute('data-ready', 'true')

window.HotelDetailPrototype = Object.freeze({
  hotelCatalog,
  rooms,
  nearbyHotels,
  state,
  renderDates,
  renderRooms,
  chooseDate,
  buildResultsLink,
  buildCheckoutLink,
  openGallery,
})
