const page = document.querySelector('.hotel-confirmation-page')

if (!page) {
  throw new Error('Не найдена страница подтверждения оплаты отеля')
}

const params = new URLSearchParams(window.location.search)

const hotelCatalog = Object.freeze({
  azimut: Object.freeze({ name: 'AZIMUT Смоленская 3*', city: 'Москва', address: 'Смоленская улица, 16', image: './assets/hotel-detail/hero-main.png' }),
  metropol: Object.freeze({ name: 'Метрополь Москва 5*', city: 'Москва', address: 'Театральный проезд, 2', image: './assets/hotels/hotel-exterior.png' }),
  palmira: Object.freeze({ name: 'Palmira Business Club 4*', city: 'Москва', address: 'Новоданиловская набережная, 6', image: './assets/hotels/hotel-resort.png' }),
  maxima: Object.freeze({ name: 'Maxima Panorama 4*', city: 'Москва', address: 'улица Мастеркова, 4', image: './assets/hotels/azimut-smolenskaya.png' }),
  penta: Object.freeze({ name: 'Pentahotel Moscow Arbat 4*', city: 'Москва', address: 'Новый Арбат, 15', image: './assets/hotels/hotel-exterior.png' }),
  'russo-balt': Object.freeze({ name: 'Руссо-Балт 5*', city: 'Москва', address: 'Гоголевский бульвар, 31', image: './assets/hotels/hotel-resort.png' }),
})

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

function parseAmount(value) {
  const amount = Number(String(value || '').replace(/[^\d]/g, ''))
  return Number.isFinite(amount) && amount > 0 ? amount : 34600
}

function formatPrice(value) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

function wordForm(value, forms) {
  const mod100 = value % 100
  const mod10 = value % 10
  if (mod100 >= 11 && mod100 <= 19) return forms[2]
  if (mod10 === 1) return forms[0]
  if (mod10 >= 2 && mod10 <= 4) return forms[1]
  return forms[2]
}

function guestLabel() {
  const explicit = query('guests', 'traveller')
  if (explicit) return explicit

  const adults = Math.max(1, Number(query('adults')) || 1)
  const children = Math.max(0, Number(query('children')) || 0)
  const adultsPart = `${adults} ${wordForm(adults, ['взрослый', 'взрослых', 'взрослых'])}`
  if (!children) return adultsPart
  return `${adultsPart}, ${children} ${wordForm(children, ['ребёнок', 'ребёнка', 'детей'])}`
}

function normalizeAddress(value, city) {
  const address = value.trim()
  const prefix = `${city},`
  return address.toLocaleLowerCase('ru-RU').startsWith(prefix.toLocaleLowerCase('ru-RU'))
    ? address.slice(prefix.length).trim()
    : address
}

const selectedHotel = hotelCatalog[query('hotel')] || hotelCatalog.azimut
const hotelName = query('hotelName') || selectedHotel.name
const city = query('city', 'to') || selectedHotel.city
const address = normalizeAddress(query('hotelAddress') || selectedHotel.address, city)
const checkin = query('checkin', 'depart') || '21 июня'
const checkout = query('checkout', 'return') || '25 июня'
const room = query('room', 'roomName')
const total = parseAmount(query('totalPrice', 'hotelPrice', 'price'))
const workTrip = params.get('workTrip') === '1'

setText('#confirmed-hotel-name', hotelName)
setText('#confirmed-hotel-city', city)
setText('#confirmed-hotel-address', address)
setText('#confirmed-hotel-dates', `${checkin} — ${checkout}`)
setText('#confirmed-hotel-guests', guestLabel())
setText('#confirmed-hotel-total', formatPrice(total))

const hotelImage = document.querySelector('#confirmed-hotel-image')
if (hotelImage) {
  hotelImage.src = query('hotelImage') || selectedHotel.image
  hotelImage.alt = hotelName
}

const roomElement = document.querySelector('#confirmed-hotel-room')
if (roomElement && room) {
  roomElement.textContent = room
  roomElement.hidden = false
}

const workBadge = document.querySelector('#confirmed-work-badge')
if (workBadge) workBadge.hidden = !workTrip

const tripsLink = document.querySelector('#open-my-trips')
if (tripsLink) tripsLink.href = new URL('./trips.html#personal', window.location.href).href

const homeLink = document.querySelector('#go-home')
if (homeLink) {
  const homeUrl = new URL('./index.html', window.location.href)
  homeLink.href = homeUrl.href
}

page.dataset.ready = 'true'
