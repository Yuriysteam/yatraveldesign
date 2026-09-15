const page = document.querySelector('.hotel-search-page')
const searchForm = document.querySelector('#hotel-search-form')
const filtersForm = document.querySelector('#hotel-filters-form')
const hotelList = document.querySelector('#hotel-list')
const emptyResults = document.querySelector('#empty-results')
const resultsCount = document.querySelector('#results-count')
const resultsSection = document.querySelector('.hotel-results')
const searchSubmit = searchForm?.querySelector('.hotel-search-submit')
const sortSelect = document.querySelector('#hotel-sort')
const priceRange = filtersForm?.elements.maxPrice
const priceRangeShell = document.querySelector('.price-range-shell')
const mapCanvas = document.querySelector('#hotel-map-canvas')
const mapPins = document.querySelector('#map-pins')
const calendarPopover = document.querySelector('#hotel-calendar')
const announcer = document.querySelector('#hotel-announcer')

if (!page || !searchForm || !filtersForm || !hotelList || !emptyResults || !resultsCount || !resultsSection || !searchSubmit || !sortSelect || !mapCanvas || !mapPins || !calendarPopover || !announcer) {
  throw new Error('Не найдены обязательные элементы страницы поиска отелей')
}

const params = new URLSearchParams(window.location.search)
let searchRefreshTimer = 0
const calendarMonthNames = Object.freeze(['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'])
const calendarMonthShort = Object.freeze(['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'])
const calendarToday = new Date()
calendarToday.setHours(0, 0, 0, 0)
const calendarBaseYear = calendarToday.getFullYear()
const calendarMinimumMonth = new Date(calendarBaseYear, calendarToday.getMonth(), 1)

const hotels = Object.freeze([
  Object.freeze({
    id: 'azimut',
    name: 'AZIMUT Городской 3*',
    city: 'Москва',
    stars: 3,
    type: 'hotel',
    distance: 7.9,
    rating: 4.9,
    reviews: 3562,
    price: 34600,
    nightly: 8650,
    oldPrice: 40000,
    discount: 10,
    points: 3700,
    image: './assets/hotels/azimut-smolenskaya.png',
    imageAlt: 'Интерьер AZIMUT Смоленская',
    breakfast: true,
    freeCancel: false,
    wifi: true,
    desk: true,
    corporate: false,
    withinPolicy: true,
    metro: true,
    recommended: true,
    pin: { x: 46, y: 23 },
    weight: 22,
  }),
  Object.freeze({
    id: 'metropol',
    name: 'Метрополь Бизнес 5*',
    city: 'Москва',
    stars: 5,
    type: 'hotel',
    distance: 0.4,
    rating: 4.8,
    reviews: 1298,
    price: 48600,
    nightly: 12000,
    oldPrice: 54000,
    discount: 10,
    points: 4860,
    image: './assets/hotels/hotel-exterior.png',
    imageAlt: 'Отель в центре Москвы',
    breakfast: true,
    freeCancel: true,
    wifi: true,
    desk: true,
    corporate: true,
    withinPolicy: true,
    metro: true,
    pin: { x: 47, y: 44 },
    weight: 18,
  }),
  Object.freeze({
    id: 'palmira',
    name: 'Palmira Business 4*',
    city: 'Москва',
    stars: 4,
    type: 'hotel',
    distance: 6.2,
    rating: 4.7,
    reviews: 884,
    price: 22600,
    nightly: 5650,
    oldPrice: null,
    discount: null,
    points: 2260,
    image: './assets/hotels/azimut-smolenskaya.png',
    imageAlt: 'Лобби бизнес-отеля',
    breakfast: true,
    freeCancel: true,
    wifi: true,
    desk: true,
    corporate: true,
    withinPolicy: true,
    metro: false,
    pin: { x: 33, y: 45 },
    pinIcon: 'heart',
    weight: 20,
  }),
  Object.freeze({
    id: 'maxima',
    name: 'Maxima Panorama 4*',
    city: 'Москва',
    stars: 4,
    type: 'hotel',
    distance: 5.5,
    rating: 4.5,
    reviews: 631,
    price: 18600,
    nightly: 4650,
    oldPrice: null,
    discount: null,
    points: 1860,
    image: './assets/hotels/hotel-exterior.png',
    imageAlt: 'Фасад отеля Maxima Panorama',
    breakfast: false,
    freeCancel: true,
    wifi: true,
    desk: true,
    corporate: false,
    withinPolicy: false,
    metro: true,
    pin: { x: 39, y: 37 },
    weight: 20,
  }),
  Object.freeze({
    id: 'penta',
    name: 'Pentahotel Central 4*',
    city: 'Москва',
    stars: 4,
    type: 'hotel',
    distance: 1.8,
    rating: 4.4,
    reviews: 905,
    price: 11990,
    nightly: 2998,
    oldPrice: null,
    discount: null,
    points: 1200,
    image: './assets/hotels/hotel-resort.png',
    imageAlt: 'Отель Pentahotel',
    breakfast: false,
    freeCancel: false,
    wifi: true,
    desk: false,
    corporate: true,
    withinPolicy: true,
    metro: true,
    pin: { x: 72, y: 32 },
    weight: 18,
  }),
  Object.freeze({
    id: 'russo-balt',
    name: 'Руссо-Балт 5*',
    city: 'Москва',
    stars: 5,
    type: 'hotel',
    distance: 0.8,
    rating: 4.6,
    reviews: 188,
    price: 39900,
    nightly: 9975,
    oldPrice: 44300,
    discount: 9,
    points: 3990,
    image: './assets/hotels/hotel-exterior.png',
    imageAlt: 'Исторический отель в Москве',
    breakfast: true,
    freeCancel: false,
    wifi: true,
    desk: false,
    corporate: false,
    withinPolicy: false,
    metro: true,
    pin: { x: 66, y: 29 },
    pinIcon: 'shield',
    weight: 22,
  }),
])

const extraPins = Object.freeze([
  Object.freeze({ price: 48600, x: 27, y: 20 }),
  Object.freeze({ price: 3450, x: 49, y: 52 }),
  Object.freeze({ price: 7600, x: 69, y: 50 }),
  Object.freeze({ price: 18600, x: 47, y: 59 }),
  Object.freeze({ price: 22600, x: 39, y: 72, icon: 'sale' }),
  Object.freeze({ price: 3450, x: 67, y: 74 }),
])

const state = {
  selectedHotelId: null,
  focusedHotelId: null,
  zoom: 1,
  smartFilter: false,
  city: params.get('city')?.trim() || params.get('to')?.trim() || 'Москва',
  checkin: params.get('checkin')?.trim() || params.get('depart')?.trim() || '21 июня',
  checkout: params.get('checkout')?.trim() || params.get('return')?.trim() || '25 июня',
  traveller: params.get('traveller')?.trim() || buildTravellerLabel(params),
  visibleHotels: [...hotels],
}

const initialCheckinDate = parseRussianDate(state.checkin)
const initialCheckoutDate = parseRussianDate(state.checkout)
if (initialCheckinDate && initialCheckoutDate && initialCheckoutDate <= initialCheckinDate) {
  initialCheckoutDate.setFullYear(initialCheckoutDate.getFullYear() + 1)
}
const initialCalendarDate = initialCheckinDate || new Date(calendarBaseYear, 5, 1)
const calendarState = {
  triggerField: null,
  phase: 'start',
  month: initialCalendarDate.getMonth(),
  year: initialCalendarDate.getFullYear(),
  checkin: initialCheckinDate,
  checkout: initialCheckoutDate,
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildTravellerLabel(searchParams) {
  const adults = Math.max(1, Number(searchParams.get('adults')) || 1)
  const children = Math.max(0, Number(searchParams.get('children')) || 0)
  const adultsWord = adults % 10 === 1 && adults % 100 !== 11 ? 'взрослый' : 'взрослых'
  const childrenPart = children > 0 ? `, ${children} ${children === 1 ? 'ребёнок' : 'детей'}` : ''
  return `${adults} ${adultsWord}${childrenPart}`
}

function cityInGenitive(city) {
  const cases = {
    'Москва': 'Москвы',
    'Санкт-Петербург': 'Санкт-Петербурга',
    'Казань': 'Казани',
    'Екатеринбург': 'Екатеринбурга',
    'Кострома': 'Костромы',
    'Пятигорск': 'Пятигорска',
    'Новороссийск': 'Новороссийска',
    'Сочи': 'Сочи',
  }
  return cases[city] || city
}

function cityInPrepositional(city) {
  const cases = {
    'Москва': 'Москве',
    'Санкт-Петербург': 'Санкт-Петербурге',
    'Казань': 'Казани',
    'Екатеринбург': 'Екатеринбурге',
    'Кострома': 'Костроме',
    'Пятигорск': 'Пятигорске',
    'Новороссийск': 'Новороссийске',
    'Сочи': 'Сочи',
  }
  return cases[city] || city
}

function formatPrice(value) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

function formatReviewCount(value) {
  const mod10 = value % 10
  const mod100 = value % 100
  const word = mod10 === 1 && mod100 !== 11 ? 'отзыв' : mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14) ? 'отзыва' : 'отзывов'
  return `${value} ${word}`
}

function formatNightCount(value) {
  const mod10 = value % 10
  const mod100 = value % 100
  const word = mod10 === 1 && mod100 !== 11 ? 'ночь' : mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14) ? 'ночи' : 'ночей'
  return `${value} ${word}`
}

function parseRussianDate(value) {
  const months = { янв: 0, январ: 0, фев: 1, март: 2, мар: 2, апр: 3, май: 4, мая: 4, июн: 5, июл: 6, авг: 7, сен: 8, сент: 8, окт: 9, ноя: 10, дек: 11 }
  const match = String(value).toLocaleLowerCase('ru').match(/(\d{1,2})\s+([а-яё]+)/u)
  if (!match) return null
  const monthKey = Object.keys(months).find(key => match[2].startsWith(key))
  if (!monthKey) return null
  const month = months[monthKey]
  const year = month < calendarToday.getMonth() ? calendarBaseYear + 1 : calendarBaseYear
  return new Date(year, month, Number(match[1]))
}

function calculateNights() {
  const from = parseRussianDate(state.checkin)
  const to = parseRussianDate(state.checkout)
  if (!from || !to) return 3
  if (to <= from) to.setFullYear(to.getFullYear() + 1)
  return Math.max(1, Math.round((to - from) / 86400000))
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

function syncCalendarStateFromValues() {
  const checkin = parseRussianDate(state.checkin)
  const checkout = parseRussianDate(state.checkout)
  if (checkin && checkout && checkout <= checkin) checkout.setFullYear(checkout.getFullYear() + 1)
  calendarState.checkin = checkin
  calendarState.checkout = checkout
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
    const isStart = isSameCalendarDate(date, calendarState.checkin)
    const isEnd = isSameCalendarDate(date, calendarState.checkout)
    const isInRange = Boolean(calendarState.checkin && calendarState.checkout && date > calendarState.checkin && date < calendarState.checkout)
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
      <h3 class="calendar-title">${calendarMonthNames[calendarState.month]} ${calendarState.year}</h3>
      <div class="calendar-days" role="grid" aria-label="${calendarMonthNames[calendarState.month]} ${calendarState.year}">${renderCalendarDays()}</div>
    </div>`
}

function syncCalendarFieldState() {
  searchForm.querySelectorAll('[data-calendar-field]').forEach(input => {
    const isOpen = !calendarPopover.hidden
    const isActive = isOpen && input.dataset.calendarField === calendarState.triggerField
    input.setAttribute('aria-expanded', String(isActive))
    input.closest('[data-calendar-field-shell]')?.classList.toggle('is-calendar-open', isActive)
  })
}

function closeCalendar(options = {}) {
  const previousField = calendarState.triggerField
  calendarState.triggerField = null
  calendarState.phase = 'start'
  calendarPopover.hidden = true
  syncCalendarFieldState()
  if (options.restoreFocus && previousField) searchForm.elements[previousField]?.focus()
}

function openCalendar(field) {
  if (!['checkin', 'checkout'].includes(field)) return
  syncCalendarStateFromValues()
  const selectedDate = field === 'checkout'
    ? calendarState.checkout || calendarState.checkin
    : calendarState.checkin || calendarState.checkout
  const visibleDate = selectedDate && selectedDate >= calendarToday ? selectedDate : calendarToday
  calendarState.triggerField = field
  calendarState.phase = field === 'checkout' && calendarState.checkin ? 'end' : 'start'
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
    calendarState.checkin = selectedDate
    calendarState.checkout = null
    searchForm.elements.checkin.value = formatCalendarDate(selectedDate)
    searchForm.elements.checkout.value = ''
    calendarState.phase = 'end'
    calendarState.triggerField = 'checkout'
    renderCalendar()
    syncCalendarFieldState()
    announce('Дата заезда выбрана. Выберите дату выезда')
    return
  }
  if (!calendarState.checkin || selectedDate <= calendarState.checkin) {
    calendarState.checkin = selectedDate
    calendarState.checkout = null
    searchForm.elements.checkin.value = formatCalendarDate(selectedDate)
    searchForm.elements.checkout.value = ''
    calendarState.phase = 'end'
    calendarState.triggerField = 'checkout'
    renderCalendar()
    syncCalendarFieldState()
    announce('Выбрана новая дата заезда. Теперь выберите выезд')
    return
  }
  calendarState.checkout = selectedDate
  searchForm.elements.checkout.value = formatCalendarDate(selectedDate)
  closeCalendar({ restoreFocus: true })
  announce('Даты проживания выбраны')
}

function renderBadges(hotel) {
  const badges = []
  if (hotel.breakfast) badges.push('<span class="hotel-badge">Включён завтрак</span>')
  if (hotel.freeCancel) badges.push('<span class="hotel-badge">Бесплатная отмена</span>')
  if (hotel.wifi) badges.push('<span class="hotel-badge">Wi‑Fi</span>')
  if (hotel.desk) badges.push('<span class="hotel-badge">Рабочий стол</span>')
  return badges.slice(0, 4).join('')
}

function renderHotelCard(hotel) {
  const focused = state.focusedHotelId === hotel.id
  const recommended = hotel.recommended ? '<span class="recommended-badge" title="Рекомендуем"><img src="./assets/icons/recommended.svg" alt=""></span>' : ''
  const discount = hotel.discount ? `<span class="hotel-discount">-${escapeHtml(hotel.discount)}%</span>` : ''
  const oldPrice = hotel.oldPrice ? `<span class="hotel-old-price">${escapeHtml(formatPrice(hotel.oldPrice))}</span>` : ''
  return `
    <article class="hotel-card${focused ? ' is-map-focused' : ''}" data-hotel-id="${escapeHtml(hotel.id)}" role="button" tabindex="0" aria-label="${escapeHtml(`${hotel.name}, ${formatPrice(hotel.price)}`)}">
      <div class="hotel-card__media">
        <img src="${escapeHtml(hotel.image)}" alt="${escapeHtml(hotel.imageAlt)}">
        ${recommended}
        <button class="favorite-button" type="button" data-action="favorite" aria-label="Добавить ${escapeHtml(hotel.name)} в избранное" aria-pressed="false"><img src="./assets/icons/heart.svg" alt=""></button>
      </div>
      <div class="hotel-card__body">
        <div class="hotel-card__top">
          <div class="hotel-card__heading">
            <div>
              <h2 class="hotel-card__title">${escapeHtml(hotel.name)}</h2>
              <p class="hotel-card__meta">Отель · ${escapeHtml(state.city)} · ${escapeHtml(hotel.distance)} км до центра</p>
            </div>
            <span class="hotel-rating"><strong>${escapeHtml(hotel.rating)}</strong><small>${escapeHtml(formatReviewCount(hotel.reviews))}</small></span>
          </div>
          <div class="hotel-card__badges">${renderBadges(hotel)}</div>
        </div>
        <div class="hotel-card__bottom">
          <div class="hotel-price">
            <div class="hotel-price__row"><strong class="hotel-price__value">${escapeHtml(formatPrice(hotel.price))}</strong>${discount}${oldPrice}</div>
            <span class="hotel-price__nights">${escapeHtml(formatNightCount(calculateNights()))}</span>
          </div>
          <button class="select-hotel" type="button" data-action="select-hotel">Выбрать</button>
        </div>
      </div>
    </article>`
}

function collectFilters() {
  const data = new FormData(filtersForm)
  const maxPrice = Number(data.get('maxPrice'))
  return {
    corporate: data.has('corporate'),
    discount: data.has('discount'),
    breakfast: data.has('breakfast'),
    freeCancel: data.has('freeCancel'),
    wifi: data.has('wifi'),
    desk: data.has('desk'),
    center: data.has('center'),
    metro: data.has('metro'),
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : 24000,
    types: data.getAll('type'),
    stars: data.getAll('stars').map(Number),
    rating: Number(data.get('rating')) || 0,
  }
}

function filterHotels() {
  const filter = collectFilters()
  const filtered = hotels.filter(hotel => {
    if (filter.corporate && !hotel.corporate) return false
    if (filter.discount && !hotel.discount) return false
    if (filter.breakfast && !hotel.breakfast) return false
    if (filter.freeCancel && !hotel.freeCancel) return false
    if (filter.wifi && !hotel.wifi) return false
    if (filter.desk && !hotel.desk) return false
    if (filter.center && hotel.distance > 3) return false
    if (filter.metro && !hotel.metro) return false
    if (filter.maxPrice < hotel.nightly) return false
    if (filter.types.length > 0 && !filter.types.includes(hotel.type)) return false
    if (filter.stars.length > 0 && !filter.stars.includes(hotel.stars)) return false
    if (filter.rating > hotel.rating) return false
    if (state.smartFilter && !hotel.withinPolicy) return false
    return true
  })

  if (sortSelect.value === 'price') filtered.sort((a, b) => a.price - b.price)
  else if (sortSelect.value === 'rating') filtered.sort((a, b) => b.rating - a.rating)
  else filtered.sort((a, b) => Number(b.recommended) - Number(a.recommended) || Number(b.withinPolicy) - Number(a.withinPolicy) || b.rating - a.rating)
  return filtered
}

function renderHotels() {
  state.visibleHotels = filterHotels()
  hotelList.innerHTML = state.visibleHotels.map(renderHotelCard).join('')
  emptyResults.hidden = state.visibleHotels.length > 0
  const resultWeight = state.visibleHotels.reduce((sum, hotel) => sum + hotel.weight, 0)
  resultsCount.textContent = `Найдено ${resultWeight} объектов в ${cityInPrepositional(state.city)}`
  renderPins()
}

function iconForPin(icon) {
  const icons = {
    heart: './assets/hotels/map-heart.svg',
    sale: './assets/hotels/map-sale.svg',
    shield: './assets/hotels/map-shield.svg',
  }
  return icons[icon] ? `<img src="${icons[icon]}" alt="">` : ''
}

function renderPins() {
  const visibleIds = new Set(state.visibleHotels.map(hotel => hotel.id))
  const hotelPins = hotels.map(hotel => {
    const hidden = visibleIds.has(hotel.id) ? '' : ' hidden'
    const active = state.selectedHotelId === hotel.id || state.focusedHotelId === hotel.id
    return `<button class="map-pin${active ? ' is-active' : ''}" type="button" data-hotel-pin="${escapeHtml(hotel.id)}" style="left:${hotel.pin.x}%;top:${hotel.pin.y}%"${hidden}>${iconForPin(hotel.pinIcon)}${escapeHtml(formatPrice(hotel.price))}</button>`
  })
  const decorativePins = extraPins.map((pin, index) => `<button class="map-pin" type="button" data-extra-pin="${index}" style="left:${pin.x}%;top:${pin.y}%">${iconForPin(pin.icon)}${escapeHtml(formatPrice(pin.price))}</button>`)
  mapPins.innerHTML = [...hotelPins, ...decorativePins].join('')
}

function setQueryValues() {
  searchForm.elements.city.value = state.city
  searchForm.elements.checkin.value = state.checkin
  searchForm.elements.checkout.value = state.checkout
  searchForm.elements.traveller.value = state.traveller
  const travellerControl = searchForm.elements.traveller
  const isTripSearch = params.get('workTrip') === '1' || params.get('addToTrip') === '1' || params.get('draft') === '1'
  travellerControl.readOnly = isTripSearch
  travellerControl.setAttribute('aria-readonly', String(isTripSearch))
  document.querySelector('#hotel-search-title').textContent = `Отели и гостиницы ${cityInGenitive(state.city)}`
}

function syncUrl() {
  const url = new URL (window.location.href)
  const values = {
    city: state.city,
    to: state.city,
    checkin: state.checkin,
    checkout: state.checkout,
    traveller: state.traveller,
  }
  Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value))
  window.history.replaceState(null, '', url)
}

function announce(message) {
  announcer.textContent = message
}

function refreshSearchResults() {
  window.clearTimeout(searchRefreshTimer)
  resultsSection.classList.add('is-refreshing')
  resultsSection.setAttribute('aria-busy', 'true')
  searchSubmit.disabled = true
  searchSubmit.textContent = 'Ищем…'
  resultsCount.textContent = `Ищем варианты в ${cityInPrepositional(state.city)}…`
  announce('Обновляем результаты поиска')

  searchRefreshTimer = window.setTimeout(() => {
    renderHotels()
    resultsSection.classList.remove('is-refreshing')
    resultsSection.removeAttribute('aria-busy')
    searchSubmit.disabled = false
    searchSubmit.textContent = 'Найти'
    hotelList.classList.remove('is-refreshed')
    void hotelList.offsetWidth
    hotelList.classList.add('is-refreshed')
    window.setTimeout(() => hotelList.classList.remove('is-refreshed'), 420)
    searchRefreshTimer = 0
    announce(`Найдены отели в ${cityInPrepositional(state.city)} на ${formatNightCount(calculateNights())}`)
  }, 480)
}

function focusHotel(hotelId, options = {}) {
  state.focusedHotelId = hotelId
  document.querySelectorAll('.hotel-card').forEach(card => card.classList.toggle('is-map-focused', card.dataset.hotelId === hotelId))
  document.querySelectorAll('[data-hotel-pin]').forEach(pin => pin.classList.toggle('is-active', pin.dataset.hotelPin === hotelId || pin.dataset.hotelPin === state.selectedHotelId))
  const card = document.querySelector(`.hotel-card[data-hotel-id="${CSS.escape(hotelId)}"]`)
  if (options.scroll && card) card.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function selectHotel(hotelId) {
  const hotel = hotels.find(item => item.id === hotelId)
  if (!hotel) return
  window.location.href = buildHotelDetailLink(hotel).href
}

function syncPriceRangeStyle() {
  if (!priceRange || !priceRangeShell) return
  const min = Number(priceRange.min) || 0
  const max = Number(priceRange.max) || 1
  const value = Number(priceRange.value) || min
  const progress = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  priceRangeShell.style.setProperty('--range-progress', `${progress}%`)
}

function resetFilters(options = {}) {
  if (options.resetForm !== false) filtersForm.reset()
  state.smartFilter = false
  const button = document.querySelector('[data-action="smart-filter"]')
  button.setAttribute('aria-pressed', 'false')
  button.querySelector('span:first-child').textContent = 'Умный фильтр'
  document.querySelector('#price-max-copy').textContent = '24 000'
  syncPriceRangeStyle()
  renderHotels()
}

function toggleSmartFilter(button) {
  state.smartFilter = !state.smartFilter
  button.setAttribute('aria-pressed', String(state.smartFilter))
  button.querySelector('span:first-child').textContent = state.smartFilter ? 'Для командировки' : 'Умный фильтр'
  ;['corporate', 'breakfast', 'freeCancel', 'wifi', 'desk'].forEach(name => {
    const input = filtersForm.elements[name]
    if (input) input.checked = state.smartFilter
  })
  renderHotels()
  announce(state.smartFilter ? 'Показаны подходящие для командировки варианты' : 'Умный фильтр выключен')
}

function buildTripLink(selectedHotel = null) {
  const url = new URL('./trip.html', window.location.href)
  new URLSearchParams(window.location.search).forEach((value, name) => url.searchParams.set(name, value))
  url.searchParams.set('to', state.city)
  url.searchParams.set('checkin', state.checkin)
  url.searchParams.set('checkout', state.checkout)
  url.searchParams.set('traveller', state.traveller)
  if (selectedHotel) {
    url.searchParams.set('hotel', selectedHotel.id)
    url.searchParams.set('hotelName', selectedHotel.name)
    url.searchParams.set('hotelPrice', String(selectedHotel.price))
  }
  return url
}

function buildHotelDetailLink(hotel) {
  const target = new URL('./hotel.html', window.location.href)
  new URLSearchParams(window.location.search).forEach((value, name) => target.searchParams.set(name, value))
  target.searchParams.set('city', state.city)
  target.searchParams.set('to', state.city)
  target.searchParams.set('checkin', state.checkin)
  target.searchParams.set('checkout', state.checkout)
  target.searchParams.set('traveller', state.traveller)
  target.searchParams.set('hotel', hotel.id)
  target.searchParams.set('hotelName', hotel.name)
  target.searchParams.set('hotelPrice', String(hotel.price))
  target.searchParams.set('hotelRating', String(hotel.rating))
  target.searchParams.set('hotelReviews', String(hotel.reviews))
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
  if (target.dataset.calendarAction === 'select-date') chooseCalendarDate(Number(target.dataset.day))
})

searchForm.addEventListener('submit', event => {
  event.preventDefault()
  const data = new FormData(searchForm)
  state.city = String(data.get('city') || '').trim() || 'Москва'
  state.checkin = String(data.get('checkin') || '').trim() || '21 июня'
  const checkinDate = parseRussianDate(state.checkin)
  const fallbackCheckout = checkinDate
    ? formatCalendarDate(new Date(checkinDate.getFullYear(), checkinDate.getMonth(), checkinDate.getDate() + 1))
    : '25 июня'
  state.checkout = String(data.get('checkout') || '').trim() || fallbackCheckout
  state.traveller = String(data.get('traveller') || '').trim() || '1 взрослый'
  state.selectedHotelId = null
  state.focusedHotelId = null
  syncCalendarStateFromValues()
  closeCalendar()
  setQueryValues()
  syncUrl()
  refreshSearchResults()
})

filtersForm.addEventListener('input', event => {
  if (event.target.name === 'maxPrice') {
    document.querySelector('#price-max-copy').textContent = new Intl.NumberFormat('ru-RU').format(Number(event.target.value))
    syncPriceRangeStyle()
  }
  refreshSearchResults()
})

filtersForm.addEventListener('reset', () => window.setTimeout(() => resetFilters({ resetForm: false }), 0))
sortSelect.addEventListener('change', refreshSearchResults)

document.addEventListener('click', event => {
  const calendarFieldShell = event.target.closest('[data-calendar-field-shell]')
  if (calendarFieldShell && !event.target.closest('[data-clear]')) {
    const input = calendarFieldShell.querySelector('[data-calendar-field]')
    if (input) openCalendar(input.dataset.calendarField)
    return
  }

  if (!calendarPopover.hidden && !calendarPopover.contains(event.target) && !searchForm.contains(event.target)) closeCalendar()

  const clear = event.target.closest('[data-clear]')
  if (clear) {
    const input = searchForm.elements[clear.dataset.clear]
    if (input) {
      input.value = ''
      if (clear.dataset.clear === 'checkin' || clear.dataset.clear === 'checkout') {
        calendarState[clear.dataset.clear] = null
        closeCalendar()
      }
      input.focus()
    }
    return
  }

  const headerMessage = event.target.closest('[data-header-message]')
  if (headerMessage) {
    event.preventDefault()
    announce(`${headerMessage.dataset.headerMessage}: раздел пока не подключён`)
    return
  }

  const pin = event.target.closest('[data-hotel-pin]')
  if (pin) {
    focusHotel(pin.dataset.hotelPin, { scroll: true })
    return
  }

  const extraPin = event.target.closest('[data-extra-pin]')
  if (extraPin) {
    announce(`Ещё один вариант за ${extraPin.textContent.trim()}`)
    return
  }

  const mapAction = event.target.closest('[data-map-action]')?.dataset.mapAction
  if (mapAction) {
    if (mapAction === 'zoom-in') state.zoom = Math.min(1.45, state.zoom + .15)
    if (mapAction === 'zoom-out') state.zoom = Math.max(.85, state.zoom - .15)
    if (mapAction === 'center') {
      state.zoom = 1
      announce('Карта возвращена к Москве')
    }
    if (mapAction === 'expand') {
      page.classList.toggle('is-map-expanded')
      const expanded = page.classList.contains('is-map-expanded')
      event.target.closest('button').setAttribute('aria-label', expanded ? 'Свернуть карту' : 'Развернуть карту')
    }
    mapCanvas.style.setProperty('--map-zoom', state.zoom)
    return
  }

  const actionTarget = event.target.closest('[data-action]')
  const action = actionTarget?.dataset.action
  if (action === 'smart-filter') {
    toggleSmartFilter(actionTarget)
    return
  }
  if (action === 'reset-filters') {
    resetFilters()
    return
  }
  if (action === 'back') {
    window.location.href = buildTripLink().href
    return
  }
  if (action === 'next') {
    const selected = hotels.find(hotel => hotel.id === state.selectedHotelId)
    if (!selected) {
      announce('Сначала выберите отель')
      return
    }
    window.location.href = buildTripLink(selected).href
    return
  }

  const card = event.target.closest('.hotel-card')
  if (!card) return
  if (action === 'favorite') {
    const pressed = actionTarget.getAttribute('aria-pressed') !== 'true'
    actionTarget.setAttribute('aria-pressed', String(pressed))
    announce(pressed ? 'Добавлено в избранное' : 'Удалено из избранного')
    return
  }
  selectHotel(card.dataset.hotelId)
})

document.addEventListener('mouseover', event => {
  const card = event.target.closest('.hotel-card')
  if (card) focusHotel(card.dataset.hotelId)
})

document.addEventListener('mouseout', event => {
  const card = event.target.closest('.hotel-card')
  if (!card || card.contains(event.relatedTarget)) return
  focusHotel(state.selectedHotelId)
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
    return
  }
  if (event.key === 'Escape' && page.classList.contains('is-map-expanded')) {
    page.classList.remove('is-map-expanded')
    document.querySelector('[data-map-action="expand"]')?.focus()
    return
  }
  const card = event.target.closest('.hotel-card')
  if (card && event.target === card && ['Enter', ' '].includes(event.key)) {
    event.preventDefault()
    selectHotel(card.dataset.hotelId)
  }
})

setQueryValues()
syncPriceRangeStyle()
renderHotels()
page.setAttribute('data-ready', 'true')

window.HotelSearchPrototype = Object.freeze({
  hotels,
  state,
  renderHotels,
  collectFilters,
  calculateNights,
  focusHotel,
  selectHotel,
  buildHotelDetailLink,
  resetFilters,
})
