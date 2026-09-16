const listRoot = document.querySelector('#trips-list')
const announcer = document.querySelector('#trips-announcer')
const filterButtons = Array.from(document.querySelectorAll('[data-trip-filter]'))
const sectionLinks = Array.from(document.querySelectorAll('[data-trip-section]'))
const filtersRoot = document.querySelector('.trips-filters')
const BUSINESS_CANCELLED_TRIPS_STORAGE_KEY = 'business-trip-cancelled-v1'
const BUSINESS_PAID_TRIPS_STORAGE_KEY = 'business-trip-paid-v1'
const BUSINESS_DRAFTS_STORAGE_KEY = 'business-trip-drafts-v1'
const PERSONAL_TRIPS_STORAGE_KEY = 'personal-trip-bookings-v1'

const cityImages = Object.freeze({
  'Москва': './assets/images/trip-moscow.png',
  'Санкт-Петербург': './assets/images/trip-kazan.png',
  'Новороссийск': './assets/images/city-novorossiysk.png',
  'Пятигорск': './assets/images/city-pyatigorsk.png',
  'Екатеринбург': './assets/images/city-ekaterinburg.png',
  'Кострома': './assets/images/city-kostroma.png',
})

const personalTrips = Object.freeze([
  { id: 'personal-novorossiysk', state: 'upcoming', city: 'Новороссийск', transport: 'avia', route: 'Москва — Новороссийск', dates: '6–10 сентября', title: 'Hilton Garden Inn Новороссийск', detail: '1 × Стандартный номер', status: 'Подтверждено', hotelImage: './assets/hotels/hotel-exterior.png', href: './trip.html?from=Москва&to=Новороссийск&depart=6+сен&return=10+сен&flightAdded=1&flightTotalPrice=19400&flightStatus=paid&hotel=hilton&hotelName=Hilton+Garden+Inn+Новороссийск&hotelPrice=15200&hotelStatus=paid' },
  { id: 'personal-pyatigorsk', state: 'upcoming', city: 'Пятигорск', transport: 'avia', route: 'Москва — Пятигорск', dates: '2–8 января', title: 'Интурист Пятигорск', detail: '1 × Двуспальная кровать', status: 'Подтверждено', hotelImage: './assets/hotels/hotel-resort.png', href: './trip.html?from=Москва&to=Пятигорск&depart=2+янв&return=8+янв&flightAdded=1&flightTotalPrice=26600&flightStatus=paid&hotel=intourist&hotelName=Интурист+Пятигорск&hotelPrice=22400&hotelStatus=paid' },
  { id: 'personal-current', state: 'active', city: 'Екатеринбург', transport: 'train', route: 'Москва — Екатеринбург', dates: '25–27 августа', title: 'Novotel Екатеринбург Центр', detail: 'Заселение сегодня', status: 'В поездке', hotelImage: './assets/hotel-detail/hero-main.png', href: './trip.html?from=Москва&to=Екатеринбург&depart=25+авг&return=27+авг&flightAdded=1&flightTotalPrice=12400&flightStatus=paid&hotel=novotel&hotelName=Novotel+Екатеринбург+Центр&hotelPrice=16800&hotelStatus=paid' },
  { id: 'personal-kostroma', state: 'past', city: 'Кострома', transport: 'train', route: 'Москва — Кострома', dates: '3–7 мая', title: 'Островский', detail: 'Поездка завершена', status: 'Завершена', hotelImage: './assets/hotels/azimut-smolenskaya.png', href: './trip.html?from=Москва&to=Кострома&depart=3+мая&return=7+мая&flightAdded=1&flightTotalPrice=13800&flightStatus=paid&hotel=ostrovsky&hotelName=Островский&hotelPrice=24800&hotelStatus=paid' },
  { id: 'personal-kostroma-cancelled', state: 'cancelled', city: 'Кострома', transport: 'train', route: 'Москва — Кострома', dates: '18–23 марта', title: 'Островский', detail: 'Поездка отменена', status: 'Отменена', hotelImage: './assets/hotels/hotel-resort.png', href: '#' },
])

const businessTrips = Object.freeze([
  { id: 'moscow-october', state: 'upcoming', paidServices: 3, city: 'Москва', transport: 'train', route: 'Санкт-Петербург — Москва', dates: '23 — 28 окт', title: 'AZIMUT Сити Отель Смоленская', detail: 'Стандарт · 3 взрослых', status: 'Оплачено', hotelImage: './assets/hotels/azimut-smolenskaya.png', href: './trip.html?from=Санкт-Петербург&to=Москва&title=Санкт-Петербург+–+Москва&depart=23+окт&return=28+окт&adults=3&children=0&traveller=3+взрослых&travellerNames=Юрий+Ширяев,+Андрей+Соколов,+Наталья+Старкова&passengerName=Юрий+Ширяев&passengerDetails=14.04.1988+·+Паспорт+РФ&railAdded=1&railScope=roundtrip&railStatus=paid&railOutboundDate=23+окт&railReturnDate=28+окт&railOutboundTrainId=sapsan-770a&railOutboundTrainNumber=770А&railOutboundTotal=12750&railOutboundDepartTime=06:40&railOutboundArrivalTime=10:35&railOutboundDuration=3+ч+55+мин&railOutboundFromStation=Московский+вокзал&railOutboundToStation=Ленинградский+вокзал&railOutboundCoach=coupe&railOutboundSeats=4:8,4:9,4:10&railReturnTrainId=sapsan-781a&railReturnTrainNumber=781А&railReturnTotal=13800&railReturnDepartTime=18:30&railReturnArrivalTime=22:25&railReturnDuration=3+ч+55+мин&railReturnFromStation=Ленинградский+вокзал&railReturnToStation=Московский+вокзал&railReturnCoach=coupe&railReturnSeats=5:6,5:7,5:8&hotel=azimut&hotelName=AZIMUT+Сити+Отель+Смоленская&hotelAddress=Смоленская+улица,+8&hotelPrice=72500&hotelStatus=paid&checkin=23+окт&checkout=28+окт&room=Стандарт+с+двуспальной+кроватью&tariff=Завтрак+включён' },
  { id: 'spb-kazan-august', state: 'active', paidServices: 3, city: 'Санкт-Петербург', transport: 'avia', route: 'Санкт-Петербург – Казань', dates: '10 авг — 12 авг', title: 'Ramada by Wyndham Kazan City Centre', detail: 'Семейный номер · 2 взрослых, 1 ребёнок', status: 'Оплачено', hotelImage: './assets/hotels/hotel-exterior.png', href: './trip.html?from=Санкт-Петербург&to=Казань&title=Санкт-Петербург+–+Казань&depart=10+авг&return=12+авг&adults=2&children=1&traveller=2+взрослых,+1+ребёнок&travellerNames=Ольга+Лебедева,+Максим+Крылов,+Миша+Крылов+(12+лет)&passengerName=Ольга+Лебедева&passengerDetails=02.09.1991+·+Паспорт+РФ&flightAdded=1&flightScope=roundtrip&flightStatus=paid&flightTotalPrice=45600&flightOutboundDate=10+авг&flightReturnDate=12+авг&flightAirline=Россия&flightNumber=FV+6105&flightDepartTime=08:20&flightArrivalTime=10:35&flightDuration=2+ч+15+мин&flightFromCode=LED&flightToCode=KZN&flightFromAirport=Пулково&flightToAirport=Казань&returnAirline=Россия&returnFlightNumber=FV+6106&returnDepartTime=19:10&returnArrivalTime=21:25&returnDuration=2+ч+15+мин&returnFromCode=KZN&returnToCode=LED&returnFromAirport=Казань&returnToAirport=Пулково&flightTariff=optimum&flightTariffName=Эконом+Оптимум&hotel=ramada&hotelName=Ramada+by+Wyndham+Kazan+City+Centre&hotelAddress=улица+Чернышевского,+39&hotelPrice=29200&hotelStatus=paid&checkin=10+авг&checkout=12+авг&room=Семейный+номер+с+двуспальной+кроватью&tariff=Завтрак+включён' },
  { id: 'ekb-august', state: 'past', paidServices: 2, city: 'Екатеринбург', transport: 'avia', route: 'Москва — Екатеринбург', dates: '18–21 августа', title: 'Novotel Екатеринбург Центр', detail: '1 × Двуспальная кровать', status: 'Оплачено', hotelImage: './assets/hotel-detail/hero-main.png', href: './trip.html?from=Москва&to=Екатеринбург&depart=18+авг&return=21+авг&flightAdded=1&flightTotalPrice=17400&flightStatus=paid&hotel=novotel&hotelName=Novotel+Екатеринбург+Центр&hotelPrice=13800&hotelStatus=paid' },
  { id: 'kostroma-july', state: 'cancelled', paidServices: 1, city: 'Кострома', transport: 'train', route: 'Москва — Кострома', dates: '8–12 июля', title: 'Островский', detail: 'Командировка отменена', status: 'Отменена', hotelImage: './assets/hotels/hotel-resort.png', href: '#' },
])

const emptyMessages = Object.freeze({
  upcoming: 'Предстоящих командировок нет',
  active: 'Сейчас нет командировок в пути',
  past: 'Прошлых командировок пока нет',
  cancelled: 'Отменённых командировок нет',
})

let activeFilter = 'upcoming'
let activeSection = window.location.hash === '#business' ? 'business' : 'personal'

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}

function readCancelledBusinessTrips() {
  return readStoredTrips(BUSINESS_CANCELLED_TRIPS_STORAGE_KEY)
}

function readBusinessDraftTrips() {
  return readStoredTrips(BUSINESS_DRAFTS_STORAGE_KEY).map(draft => {
    const search = new URLSearchParams(draft.search || '')
    const from = draft.from || search.get('from') || 'Москва'
    const to = draft.to || search.get('to') || 'Командировка'
    const hasFlight = search.get('flightAdded') === '1' || search.get('flightOutboundAdded') === '1' || search.get('flightReturnAdded') === '1'
    const hasRail = search.get('railAdded') === '1' || search.get('railOutboundAdded') === '1' || search.get('railReturnAdded') === '1'
    const hasHotel = Boolean(search.get('hotel'))
    const transport = hasRail ? 'train' : hasFlight ? 'avia' : 'hotel'
    const serviceCount = Number(hasFlight) + Number(hasRail) + Number(hasHotel)
    const traveller = search.get('traveller') || `${search.get('adults') || '1'} взрослый`
    const hotelName = search.get('hotelName')
    const href = search.toString() ? `./trip.html?${search.toString()}` : './trip.html'

    return {
      id: draft.id,
      state: 'upcoming',
      serviceCount,
      city: to,
      transport,
      route: `${from} — ${to}`,
      dates: draft.dates || [draft.depart, draft.return].filter(Boolean).join(' — '),
      title: hotelName || `Командировка в ${to}`,
      detail: serviceCount ? `${serviceCount} ${serviceCount === 1 ? 'услуга' : 'услуги'} · ${traveller}` : traveller,
      status: 'Черновик',
      hotelImage: './assets/hotels/hotel-exterior.png',
      href,
    }
  })
}

function readStoredTrips(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && item.id) : []
  } catch {
    return []
  }
}

function mergeTrips(...sources) {
  const trips = new Map()
  sources.flat().forEach(trip => {
    if (trip?.id) trips.set(trip.id, trip)
  })
  return [...trips.values()]
}

function cardHref(trip) {
  if ((!trip.href || trip.href === '#') && typeof trip.search !== 'string') return '#'
  const target = new URL('./trip.html', window.location.href)
  let sourceParams = null
  try {
    if (trip.href && trip.href !== '#') {
      const source = new URL(trip.href, window.location.href)
      sourceParams = source.searchParams
      const successTarget = sourceParams.get('successTarget')
      if (successTarget) {
        const nested = new URL(successTarget, window.location.href)
        if (nested.origin === window.location.origin && nested.pathname.endsWith('/trip.html')) {
          sourceParams = nested.searchParams
        }
      }
    }
  } catch {
    sourceParams = typeof trip.search === 'string' ? new URLSearchParams(trip.search) : null
  }
  if (!sourceParams && typeof trip.search === 'string') sourceParams = new URLSearchParams(trip.search)
  sourceParams?.forEach((value, name) => target.searchParams.set(name, value))
  const transientParams = ['successMode', 'successTarget', 'embed']
  transientParams.forEach(name => target.searchParams.delete(name))
  if (trip.status !== 'Черновик') {
    target.searchParams.delete('draft')
    target.searchParams.delete('draftId')
  }
  if (trip.state !== 'cancelled' && trip.status !== 'Отменена') target.searchParams.delete('cancelled')
  if (trip.id) target.searchParams.set('tripId', trip.id)
  if (trip.state) target.searchParams.set('tripState', trip.state)
  return target.href
}

function renderCard(trip) {
  const cancelled = trip.state === 'cancelled'
  const past = trip.state === 'past'
  const isTrain = trip.transport === 'train'
  const isHotel = trip.transport === 'hotel'
  const cityImage = cityImages[trip.city] || './assets/images/trip-kazan.png'
  const transportTitle = isTrain ? 'Билеты на поезд' : isHotel ? 'Отель' : 'Авиабилеты'
  const transportIcon = isTrain ? './assets/icons/trip-train-filled.svg' : isHotel ? './assets/icons/lodging.svg' : './assets/icons/trip-flight-filled.svg'
  const secondaryTitle = trip.secondaryTitle || transportTitle
  const secondaryDetail = trip.secondaryDetail || trip.route
  const secondaryIcon = trip.secondaryIcon || transportIcon
  const secondaryType = trip.secondaryType || (isTrain ? 'train' : isHotel ? 'hotel' : 'avia')
  return `
    <a class="trip-list-card${cancelled ? ' is-cancelled' : ''}" href="${escapeHtml(cardHref(trip))}" data-trip-id="${escapeHtml(trip.id)}">
      <img class="trip-list-card__cover" src="${escapeHtml(cityImage)}" alt="${escapeHtml(trip.city)}">
      <span class="trip-list-card__shade" aria-hidden="true"></span>
      <span class="trip-list-card__route">${escapeHtml(trip.route)}</span>
      <span class="trip-list-card__dates">${escapeHtml(trip.dates)}</span>
      <span class="trip-list-card__details trip-list-card__details--primary">
        <img class="trip-list-card__hotel-image" src="${escapeHtml(trip.hotelImage)}" alt="">
        <span class="trip-list-card__copy"><strong>${escapeHtml(trip.title)}</strong><small>${escapeHtml(trip.detail)}</small></span>
        <span class="trip-list-card__status${cancelled ? ' trip-list-card__status--cancelled' : ''}${past ? ' trip-list-card__status--past' : ''}">${escapeHtml(trip.status)}</span>
      </span>
      <span class="trip-list-card__details trip-list-card__details--next">
        <span class="trip-list-card__service-icon trip-list-card__service-icon--${escapeHtml(secondaryType)}"><img src="${escapeHtml(secondaryIcon)}" alt=""></span>
        <span class="trip-list-card__copy"><strong>${escapeHtml(secondaryTitle)}</strong><small>${escapeHtml(secondaryDetail)}</small></span>
        <span class="trip-list-card__status${cancelled ? ' trip-list-card__status--cancelled' : ''}${past ? ' trip-list-card__status--past' : ''}">${escapeHtml(trip.status)}</span>
      </span>
    </a>`
}

function renderTrips() {
  if (activeSection === 'passengers') {
    listRoot.innerHTML = '<p class="trips-empty">Здесь будут сохранённые пассажиры</p>'
    return
  }
  const cancelledTrips = readCancelledBusinessTrips()
  const paidBusinessTrips = readStoredTrips(BUSINESS_PAID_TRIPS_STORAGE_KEY)
  const draftBusinessTrips = readBusinessDraftTrips()
  const storedPersonalTrips = readStoredTrips(PERSONAL_TRIPS_STORAGE_KEY)
  const allBusinessTrips = mergeTrips(businessTrips, paidBusinessTrips, draftBusinessTrips, cancelledTrips)
  const sourceTrips = activeSection === 'business'
    ? allBusinessTrips.filter(trip => (trip.serviceCount || trip.paidServices || trip.status === 'Черновик') > 0)
    : mergeTrips(personalTrips, storedPersonalTrips)
  const datedTrips = sourceTrips.map(trip => window.TripDateState?.normalizeTrip(trip) || trip)
  const filteredTrips = datedTrips.filter(trip => trip.state === activeFilter)
  const visibleTrips = window.TripDateState?.sortTrips(filteredTrips, activeFilter) || filteredTrips
  listRoot.innerHTML = visibleTrips.length
    ? visibleTrips.map(renderCard).join('')
    : `<p class="trips-empty">${emptyMessages[activeFilter]}</p>`
}

function setSection(section) {
  activeSection = section
  const isPassengers = section === 'passengers'
  filtersRoot.hidden = isPassengers
  sectionLinks.forEach(link => {
    const active = link.dataset.tripSection === section
    link.classList.toggle('is-active', active)
    if (active) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  })
  renderTrips()
}

sectionLinks.forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault()
    const section = link.dataset.tripSection
    window.history.replaceState(null, '', `#${section}`)
    setSection(section)
    announcer.textContent = `Открыт раздел: ${link.textContent.trim().toLocaleLowerCase('ru')}`
  })
})

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.tripFilter
    filterButtons.forEach(item => {
      const active = item === button
      item.classList.toggle('is-active', active)
      item.setAttribute('aria-selected', String(active))
    })
    renderTrips()
    announcer.textContent = `Показаны: ${button.textContent.trim().toLocaleLowerCase('ru')}`
  })
})

document.querySelectorAll('[data-header-action]').forEach(button => {
  button.addEventListener('click', () => {
    if (button.dataset.headerAction === 'Мои поездки') return
    announcer.textContent = `${button.dataset.headerAction}: действие пока не подключено`
  })
})

listRoot.addEventListener('click', event => {
  const card = event.target.closest('.trip-list-card.is-cancelled')
  if (!card || card.getAttribute('href') !== '#') return
  event.preventDefault()
  announcer.textContent = 'Отменённая командировка доступна только для просмотра'
})

setSection(activeSection)
