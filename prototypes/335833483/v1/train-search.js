const page = document.querySelector('.train-search-page')
const searchForm = document.querySelector('#train-search-form')
const filterRow = document.querySelector('#train-filter-row')
const trainList = document.querySelector('#train-list')
const emptyState = document.querySelector('#train-empty')
const calendarPopover = document.querySelector('#train-calendar')
const announcer = document.querySelector('#train-announcer')

if (!page || !searchForm || !filterRow || !trainList || !emptyState || !calendarPopover || !announcer) {
  throw new Error('Не найдены обязательные элементы страницы поиска ж/д билетов')
}

let params = new URLSearchParams(window.location.search)
const calendarMonthNames = Object.freeze(['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'])
const calendarMonthShort = Object.freeze(['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'])
const calendarToday = new Date()
calendarToday.setHours(0, 0, 0, 0)
const calendarBaseYear = calendarToday.getFullYear()
const calendarMinimumMonth = new Date(calendarBaseYear, calendarToday.getMonth(), 1)

function hasRealReturn(value) {
  const normalized = String(value || '').trim()
  return Boolean(normalized && !/^(нет|без|без обратного|—|-|one.?way)$/iu.test(normalized))
}

function clearReturnParams(searchParams) {
  ;[...searchParams.keys()].forEach(key => {
    if (key.startsWith('railReturn')) searchParams.delete(key)
  })
}

const baseDepartDate = params.get('depart')?.trim() || '29 сентября'
const baseReturnDate = params.get('return')?.trim() || ''
const railIsOneWay = params.get('railScope') === 'oneway'
const returnExplicitlyDisabled = params.get('railReturnDisabled') === '1'
const tripSegment = params.get('tripSegment') === 'return'
  ? 'return'
  : params.get('tripSegment') === 'outbound' ? 'outbound' : null
const isSingleReturn = tripSegment === 'return'
const rawInitialReturn = isSingleReturn
  ? params.get('railReturnDate')?.trim() || params.get('railOutboundDate')?.trim() || baseReturnDate
  : returnExplicitlyDisabled || (railIsOneWay && tripSegment !== 'outbound')
    ? ''
    : params.get('railReturnDate')?.trim() || baseReturnDate
const initialReturn = hasRealReturn(rawInitialReturn) ? rawInitialReturn : ''
let railSegment = tripSegment || (params.get('railSegment') === 'return' && hasRealReturn(initialReturn) ? 'return' : 'outbound')

const cityCatalog = Object.freeze({
  'Москва': Object.freeze({ station: 'Ленинградский вокзал', from: 'Москвы', to: 'Москву' }),
  'Санкт-Петербург': Object.freeze({ station: 'Московский вокзал', from: 'Санкт-Петербурга', to: 'Санкт-Петербург' }),
  'Стамбул': Object.freeze({ station: 'Стамбул, Сиркеджи', from: 'Стамбула', to: 'Стамбул' }),
  'Казань': Object.freeze({ station: 'Казань-Пасс.', from: 'Казани', to: 'Казань' }),
  'Сочи': Object.freeze({ station: 'Сочи', from: 'Сочи', to: 'Сочи' }),
  'Екатеринбург': Object.freeze({ station: 'Екатеринбург-Пасс.', from: 'Екатеринбурга', to: 'Екатеринбург' }),
})

function travellerFromParams() {
  const existing = params.get('traveller')?.trim()
  if (existing && /\d/u.test(existing)) return existing
  const adults = Math.max(1, Number(params.get('adults')) || 1)
  const children = Math.max(0, Number(params.get('children')) || 0)
  const adultWord = adults % 10 === 1 && adults % 100 !== 11 ? 'взрослый' : 'взрослых'
  const childWord = children % 10 === 1 && children % 100 !== 11 ? 'ребёнок' : 'детей'
  return `${adults} ${adultWord}${children ? `, ${children} ${childWord}` : ''}`
}

function lockTripParticipantCount(control) {
  const limit = Math.max(0, Number(params.get('tripAdults') || params.get('adults')) || 0) + Math.max(0, Number(params.get('tripChildren') || params.get('children')) || 0)
  if (!(params.get('workTrip') === '1' || params.get('addToTrip') === '1' || params.get('draft') === '1') || !limit) return
  const count = value => [...String(value).matchAll(/\d+/gu)].reduce((total, match) => total + Number(match[0]), 0)
  ;[...control.options].forEach(option => { option.disabled = count(option.value) > limit })
}

const state = {
  canonicalFrom: params.get('tripFrom')?.trim() || params.get('from')?.trim() || 'Москва',
  canonicalTo: params.get('tripTo')?.trim() || params.get('to')?.trim() || 'Санкт-Петербург',
  depart: isSingleReturn ? baseDepartDate : params.get('railOutboundDate')?.trim() || baseDepartDate,
  returning: initialReturn,
  traveller: travellerFromParams(),
  speed: false,
  available: false,
  lower: false,
  coach: '',
  time: '',
  amenity: '',
  maxPrice: Infinity,
  station: '',
  sort: 'recommended',
}

const calendarState = {
  triggerField: null,
  mode: 'range',
  phase: 'start',
  month: 0,
  year: calendarBaseYear,
  depart: null,
  returning: null,
}

function displayedFrom() {
  return railSegment === 'return' ? state.canonicalTo : state.canonicalFrom
}

function displayedTo() {
  return railSegment === 'return' ? state.canonicalFrom : state.canonicalTo
}

function displayedDate() {
  return railSegment === 'return' ? state.returning : state.depart
}

function cityData(city) {
  return cityCatalog[city] || { station: `${city}, вокзал`, from: city, to: city }
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

function closeCalendar(options = {}) {
  const previousField = calendarState.triggerField
  calendarState.triggerField = null
  calendarState.phase = 'start'
  calendarPopover.hidden = true
  syncCalendarFieldState()
  if (options.restoreFocus && previousField) searchForm.elements[previousField]?.focus()
}

function openCalendar(field) {
  if (!['depart', 'return'].includes(field) || railSegment === 'return') return
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
    announcer.textContent = 'Дата отправления выбрана. Выберите дату обратно'
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
    announcer.textContent = 'Выбрана новая дата отправления. Теперь выберите дату обратно'
    return
  }
  calendarState.returning = selectedDate
  searchForm.elements.return.value = formatCalendarDate(selectedDate)
  closeCalendar({ restoreFocus: true })
  announcer.textContent = 'Даты поездки выбраны'
}

function formatPrice(value) {
  return new Intl.NumberFormat('ru-RU').format(value).replaceAll('\u00a0', ' ')
}

function shortDate(value) {
  const normalized = String(value).trim().toLocaleLowerCase('ru')
  const monthMap = {
    января: 'янв', февраля: 'фев', марта: 'мар', апреля: 'апр', мая: 'мая', июня: 'июн',
    июля: 'июл', августа: 'авг', сентября: 'сен', октября: 'окт', ноября: 'ноя', декабря: 'дек',
  }
  const match = normalized.match(/(\d{1,2})\s+([а-яё]+)/u)
  if (!match) return normalized || '1 дек'
  return `${match[1]} ${monthMap[match[2]] || match[2].slice(0, 3)}`
}

function nextDateLabel(value, dayOffset) {
  if (!dayOffset) return shortDate(value)
  const match = String(value).match(/(\d{1,2})\s+([а-яё]+)/iu)
  if (!match) return shortDate(value)
  return shortDate(`${Number(match[1]) + dayOffset} ${match[2]}`)
}

const amenityAssets = Object.freeze({
  bio: 'bio-toilet.svg',
  air: 'air-conditioning.svg',
  sleeping: 'sleeping.svg',
  dinner: 'dinner.svg',
  wifi: 'wifi.svg',
  wine: 'wine.svg',
  pets: 'pets.svg',
  shower: 'shower.svg',
})

function buildTrains() {
  const from = displayedFrom()
  const to = displayedTo()
  const fromStation = cityData(from).station
  const toStation = cityData(to).station
  const date = displayedDate()
  return [
    {
      id: 'night-express-022a', number: '022А', brand: '«Ночной экспресс»', carrier: 'Тверской Экспресс',
      depart: '00:25', arrival: '09:26', duration: '9 ч 1 м', minutes: 541, price: 5708,
      departDate: shortDate(date), arrivalDate: shortDate(date), fromStation, toStation,
      amenities: ['bio', 'air', 'sleeping', 'dinner', 'wifi', 'wine', 'pets', 'shower'], more: 1,
      places: [['Купе', 133, 5708], ['СВ', 16, 9508]], speed: true, available: true, lower: true, station: 'main',
    },
    {
      id: 'arctic-016a', number: '016А', brand: 'фирменный «Арктика»', carrier: 'РЖД/ФПК',
      depart: '00:46', arrival: '09:13', duration: '8 ч 27 м', minutes: 507, price: 3894,
      departDate: shortDate(date), arrivalDate: shortDate(date), fromStation, toStation,
      amenities: ['dinner', 'wifi', 'shower'],
      places: [['Плац', 231, 3894], ['Купе', 67, 4994], ['СВ', 8, 8950]], speed: true, available: true, lower: false, station: 'main',
    },
    {
      id: 'volga-060g', number: '060Г', brand: 'фирменный «Волга»', carrier: 'РЖД/ФПК',
      depart: '00:48', arrival: '09:57', duration: '9 ч 9 м', minutes: 549, price: 2708,
      departDate: shortDate(date), arrivalDate: shortDate(date), fromStation, toStation,
      amenities: ['bio', 'air', 'sleeping', 'dinner', 'shower'],
      places: [['Плац', 333, 2708], ['Купе', 126, 3412], ['СВ', 12, 7999]], speed: false, available: true, lower: true, station: 'main',
    },
    {
      id: 'rzd-057m', number: '057М', brand: '', carrier: 'РЖД/ФПК',
      depart: '01:00', arrival: '10:41', duration: '9 ч 41 м', minutes: 581, price: 3122,
      departDate: shortDate(date), arrivalDate: shortDate(date), fromStation, toStation,
      amenities: ['bio', 'air', 'wine', 'shower'],
      places: [['Купе', 43, 3122], ['СВ', 10, 8508]], speed: false, available: true, lower: false, station: 'main',
    },
    {
      id: 'rzd-222a', number: '222А', brand: '', carrier: 'РЖД/ФПК',
      depart: '01:15', arrival: '19:15', duration: '1 дн. 18 ч', minutes: 2520, price: 3672,
      departDate: shortDate(date), arrivalDate: nextDateLabel(date, 2), fromStation, toStation,
      amenities: ['dinner', 'wifi', 'pets', 'shower'],
      places: [['Плац', 333, 2708], ['Купе', 12, 2708], ['СВ', 16, 9508]], speed: false, available: true, lower: true, station: 'other',
      tags: [{ type: 'alert', text: 'есть скидка на невозвратный тариф' }, { type: 'success', text: 'самый дешёвый' }],
    },
  ]
}

function renderAmenities(train) {
  const visible = train.amenities.slice(0, 8)
  return `${visible.map(name => `<img src="./assets/rail/${amenityAssets[name]}" alt="" title="${escapeHtml(name)}">`).join('')}${train.more ? `<span class="train-card__more">+${train.more}</span>` : ''}`
}

function renderPlaces(train) {
  return train.places.map(([type, count, price]) => `
    <span class="train-card__place">
      <span>${escapeHtml(type)}</span>
      <span class="train-card__place-count">${escapeHtml(count)}</span>
      <span class="train-card__place-price">от ${escapeHtml(formatPrice(price))} ₽</span>
    </span>`).join('')
}

function renderTrain(train) {
  const tags = train.tags || []
  return `
    <article class="train-card" data-train-id="${escapeHtml(train.id)}">
      <div class="train-card__tags">${tags.map(tag => `<span class="train-card__tag train-card__tag--${escapeHtml(tag.type)}">${escapeHtml(tag.text)}</span>`).join('')}</div>
      <div class="train-card__content">
        <div class="train-card__left">
          <div class="train-card__route">
            <div class="train-card__stops">
              <div class="train-card__stop">
                <div class="train-card__time-row"><strong class="train-card__time">${escapeHtml(train.depart)}</strong><span class="train-card__date">${escapeHtml(train.departDate)}</span></div>
                <strong class="train-card__station">${escapeHtml(train.fromStation)}</strong>
              </div>
              <div class="train-card__stop">
                <div class="train-card__time-row"><strong class="train-card__time">${escapeHtml(train.arrival)}</strong><span class="train-card__date">${escapeHtml(train.arrivalDate)}</span></div>
                <strong class="train-card__station">${escapeHtml(train.toStation)}</strong>
              </div>
            </div>
            <div class="train-card__amenities">${renderAmenities(train)}</div>
          </div>
          <div class="train-card__info">
            <strong class="train-card__duration">${escapeHtml(train.duration)}</strong>
            <span class="train-card__number">${escapeHtml(train.number)}${train.brand ? ` · <span class="train-card__brand">${escapeHtml(train.brand)}</span>` : ''}${train.carrier ? ` · <span class="train-card__carrier">${escapeHtml(train.carrier)}</span>` : ''}</span>
          </div>
          <div class="train-card__places">${renderPlaces(train)}</div>
        </div>
        <span class="train-card__divider" aria-hidden="true"></span>
        <div class="train-card__right">
          <strong class="train-card__price">от ${escapeHtml(formatPrice(train.price))} ₽</strong>
          <button class="train-card__select" type="button" data-action="select-train" data-train-id="${escapeHtml(train.id)}">Выбрать место</button>
        </div>
      </div>
    </article>`
}

function currentTimeBucket(value) {
  const hour = Number(String(value).split(':')[0]) || 0
  if (hour < 6) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'day'
  return 'evening'
}

function filteredTrains() {
  let trains = buildTrains().filter(train => {
    if (state.speed && !train.speed) return false
    if (state.available && !train.available) return false
    if (state.lower && !train.lower) return false
    if (state.coach && !train.places.some(([type]) => type === state.coach)) return false
    if (state.time && currentTimeBucket(train.depart) !== state.time) return false
    if (state.amenity && !train.amenities.includes(state.amenity)) return false
    if (Number.isFinite(state.maxPrice) && train.price > state.maxPrice) return false
    if (state.station && train.station !== state.station) return false
    return true
  })
  if (state.sort === 'price') trains.sort((a, b) => a.price - b.price)
  else if (state.sort === 'time') trains.sort((a, b) => a.minutes - b.minutes)
  return trains
}

function renderTrains() {
  const trains = filteredTrains()
  trainList.innerHTML = trains.map(renderTrain).join('')
  trainList.hidden = trains.length === 0
  emptyState.hidden = trains.length > 0
  announcer.textContent = trains.length ? `Найдено поездов: ${trains.length}` : 'Подходящих поездов нет'
}

let trainRefreshTimer = 0
function refreshTrains() {
  window.clearTimeout(trainRefreshTimer)
  trainList.hidden = false
  emptyState.hidden = true
  trainList.innerHTML = '<div class="search-results-loader" role="status">Обновляем цены и варианты…</div>'
  trainRefreshTimer = window.setTimeout(renderTrains, 360)
}

function setSearchValues() {
  page.dataset.railSegment = railSegment
  searchForm.elements.origin.value = displayedFrom()
  searchForm.elements.destination.value = displayedTo()
  searchForm.elements.depart.value = state.depart
  searchForm.elements.return.value = state.returning
  const passengers = searchForm.elements.passengers
  if (![...passengers.options].some(option => option.value === state.traveller)) passengers.add(new Option(state.traveller, state.traveller))
  lockTripParticipantCount(passengers)
  passengers.value = state.traveller
  const fromCase = cityData(displayedFrom()).from
  const toCase = cityData(displayedTo()).to
  const minimumPrice = formatPrice(Math.min(...buildTrains().map(train => train.price)))
  document.querySelector('#train-results-title').textContent = railSegment === 'return'
    ? `Выберите поезд обратно: ${displayedFrom()} → ${displayedTo()}, ${shortDate(displayedDate())} · от ${minimumPrice} ₽`
    : `Билеты на поезд из ${fromCase} в ${toCase} от ${minimumPrice} ₽`
}

function syncQuery() {
  const target = Reflect.construct(window.URL, [window.location.href])
  target.searchParams.set('from', state.canonicalFrom)
  target.searchParams.set('to', state.canonicalTo)
  if (!isSingleReturn) target.searchParams.set('railOutboundDate', state.depart)
  if (isSingleReturn && hasRealReturn(state.returning)) {
    target.searchParams.set('railReturnDate', state.returning)
    target.searchParams.set('railScope', 'oneway')
    target.searchParams.delete('railReturnDisabled')
    railSegment = 'return'
  } else if (hasRealReturn(state.returning)) {
    target.searchParams.set('railReturnDate', state.returning)
    target.searchParams.set('railScope', 'roundtrip')
    target.searchParams.delete('railReturnDisabled')
    target.searchParams.delete('tripSegment')
    target.searchParams.delete('serviceSlot')
  }
  else {
    state.returning = ''
    railSegment = 'outbound'
    clearReturnParams(target.searchParams)
    target.searchParams.set('railScope', 'oneway')
    target.searchParams.set('railReturnDisabled', '1')
  }
  target.searchParams.set('traveller', state.traveller)
  target.searchParams.set('railSegment', railSegment)
  window.history.replaceState(null, '', target)
  params = new URLSearchParams(target.search)
}

function readDropdownFilters() {
  state.coach = String(filterRow.querySelector('input[name="coach"]:checked')?.value || '')
  state.time = String(filterRow.querySelector('input[name="time"]:checked')?.value || '')
  state.amenity = String(filterRow.querySelector('input[name="amenity"]:checked')?.value || '')
  state.maxPrice = Number(filterRow.querySelector('input[name="price"]:checked')?.value) || Infinity
  state.station = String(filterRow.querySelector('input[name="station"]:checked')?.value || '')
  filterRow.querySelectorAll('.train-filter-menu').forEach(menu => {
    const active = [...menu.querySelectorAll('input')].some(input => input.checked && input.value)
    menu.classList.toggle('is-active', active)
  })
}

function resetFilters() {
  state.speed = false
  state.available = false
  state.lower = false
  state.coach = ''
  state.time = ''
  state.amenity = ''
  state.maxPrice = Infinity
  state.station = ''
  state.sort = 'recommended'
  filterRow.querySelectorAll('[data-filter-toggle]').forEach(button => button.setAttribute('aria-pressed', 'false'))
  filterRow.querySelectorAll('input[type="radio"]').forEach(input => { input.checked = input.value === '' })
  filterRow.querySelectorAll('.train-filter-menu').forEach(menu => {
    menu.classList.remove('is-active')
    menu.open = false
  })
  updateSortLabel()
  refreshTrains()
}

function updateSortLabel() {
  const button = filterRow.querySelector('[data-action="cycle-sort"]')
  const labels = { recommended: 'рекомендуемые', price: 'сначала дешевле', time: 'сначала быстрее' }
  button.setAttribute('aria-label', `Сортировка: ${labels[state.sort]}`)
  button.title = `Сортировка: ${labels[state.sort]}`
}

function buildBookingLink(trainId) {
  const train = buildTrains().find(item => item.id === trainId) || buildTrains()[0]
  const target = Reflect.construct(window.URL, ['./train-booking.html', window.location.href])
  new URLSearchParams(window.location.search).forEach((value, name) => target.searchParams.set(name, value))
  target.searchParams.set('from', state.canonicalFrom)
  target.searchParams.set('to', state.canonicalTo)
  if (!isSingleReturn) target.searchParams.set('railOutboundDate', state.depart)
  if (isSingleReturn && hasRealReturn(state.returning)) {
    target.searchParams.set('railReturnDate', state.returning)
    target.searchParams.set('railScope', 'oneway')
    target.searchParams.delete('railReturnDisabled')
  } else if (hasRealReturn(state.returning)) {
    target.searchParams.set('railReturnDate', state.returning)
    target.searchParams.set('railScope', 'roundtrip')
    target.searchParams.delete('railReturnDisabled')
    target.searchParams.delete('tripSegment')
    target.searchParams.delete('serviceSlot')
  } else {
    clearReturnParams(target.searchParams)
    target.searchParams.set('railScope', 'oneway')
    target.searchParams.set('railReturnDisabled', '1')
  }
  target.searchParams.set('traveller', state.traveller)
  target.searchParams.set('railSegment', railSegment)
  target.searchParams.set('railTrainId', train.id)
  target.searchParams.set('railTrainNumber', train.number)
  target.searchParams.set('railPrice', String(train.price))
  target.searchParams.set('railDepartTime', train.depart)
  target.searchParams.set('railArrivalTime', train.arrival)
  target.searchParams.set('railDuration', train.duration)
  target.searchParams.set('railFromStation', train.fromStation)
  target.searchParams.set('railToStation', train.toStation)
  target.searchParams.set('railFrom', displayedFrom())
  target.searchParams.set('railTo', displayedTo())
  target.searchParams.set('railDate', displayedDate())
  target.searchParams.set('railCarrier', train.carrier)
  const prefix = railSegment === 'return' ? 'railReturn' : 'railOutbound'
  ;['Seats', 'Coach', 'Total'].forEach(suffix => target.searchParams.delete(`${prefix}${suffix}`))
  const resetSegments = new Set(
    (target.searchParams.get('railResetSegment') || '')
      .split(',')
      .filter(segment => segment === 'outbound' || segment === 'return'),
  )
  resetSegments.add(railSegment)
  target.searchParams.set('railResetSegment', [...resetSegments].join(','))
  target.searchParams.delete('railSeatComplete')
  target.searchParams.set(`${prefix}TrainId`, train.id)
  target.searchParams.set(`${prefix}TrainNumber`, train.number)
  target.searchParams.set(`${prefix}Price`, String(train.price))
  target.searchParams.set(`${prefix}DepartTime`, train.depart)
  target.searchParams.set(`${prefix}ArrivalTime`, train.arrival)
  target.searchParams.set(`${prefix}Duration`, train.duration)
  target.searchParams.set(`${prefix}FromStation`, train.fromStation)
  target.searchParams.set(`${prefix}ToStation`, train.toStation)
  target.searchParams.set(`${prefix}From`, displayedFrom())
  target.searchParams.set(`${prefix}To`, displayedTo())
  target.searchParams.set(`${prefix}Date`, displayedDate())
  target.searchParams.set(`${prefix}Carrier`, train.carrier)
  const initialCoach = ({ 'Плац': 'platz', 'Купе': 'coupe', 'СВ': 'sv', 'Люкс': 'lux' })[train.places[0]?.[0]] || 'platz'
  target.searchParams.set(`${prefix}Coach`, initialCoach)
  if (train.brand) target.searchParams.set(`${prefix}Brand`, train.brand)
  else target.searchParams.delete(`${prefix}Brand`)
  target.searchParams.set('railSeatSegment', railSegment)
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
    state.returning = ''
    railSegment = 'outbound'
    closeCalendar({ restoreFocus: true })
    syncQuery()
    setSearchValues()
    renderTrains()
    announcer.textContent = 'Поиск изменён на поездку в одну сторону'
  }
})

searchForm.addEventListener('submit', event => {
  event.preventDefault()
  const data = new FormData(searchForm)
  const inputFrom = String(data.get('origin') || '').trim() || 'Москва'
  const inputTo = String(data.get('destination') || '').trim() || 'Санкт-Петербург'
  if (railSegment === 'return') {
    state.canonicalFrom = inputTo
    state.canonicalTo = inputFrom
  } else {
    state.canonicalFrom = inputFrom
    state.canonicalTo = inputTo
  }
  state.depart = String(data.get('depart') || '').trim() || '29 сентября'
  state.returning = String(data.get('return') || '').trim()
  state.traveller = String(data.get('passengers') || '').trim() || '1 взрослый'
  syncQuery()
  setSearchValues()
  refreshTrains()
})

filterRow.addEventListener('change', event => {
  if (!event.target.matches('input')) return
  readDropdownFilters()
  renderTrains()
  event.target.closest('details')?.removeAttribute('open')
})

document.addEventListener('click', event => {
  const calendarFieldShell = event.target.closest('[data-calendar-field-shell]')
  if (calendarFieldShell && railSegment !== 'return') {
    event.preventDefault()
    const input = calendarFieldShell.querySelector('[data-calendar-field]')
    if (input) {
      input.focus()
      openCalendar(input.dataset.calendarField)
    }
    return
  }

  if (!calendarPopover.hidden && !calendarPopover.contains(event.target) && !searchForm.contains(event.target)) closeCalendar()

  const announceControl = event.target.closest('[data-announce]')
  if (announceControl) {
    announcer.textContent = announceControl.dataset.announce
    return
  }

  const toggle = event.target.closest('[data-filter-toggle]')
  if (toggle) {
    const active = toggle.getAttribute('aria-pressed') !== 'true'
    toggle.setAttribute('aria-pressed', String(active))
    state[toggle.dataset.filterToggle] = active
    renderTrains()
    return
  }

  const action = event.target.closest('[data-action]')
  if (!action) return
  if (action.dataset.action === 'swap') {
    const origin = searchForm.elements.origin.value
    searchForm.elements.origin.value = searchForm.elements.destination.value
    searchForm.elements.destination.value = origin
    return
  }
  if (action.dataset.action === 'cycle-sort') {
    const order = ['recommended', 'price', 'time']
    state.sort = order[(order.indexOf(state.sort) + 1) % order.length]
    updateSortLabel()
    renderTrains()
    return
  }
  if (action.dataset.action === 'reset-filters') {
    resetFilters()
    return
  }
  if (action.dataset.action === 'select-train') {
    window.location.href = buildBookingLink(action.dataset.trainId).href
  }
})

document.addEventListener('keydown', event => {
  const calendarInput = event.target.closest('[data-calendar-field]')
  if (calendarInput && railSegment !== 'return' && ['Enter', ' ', 'ArrowDown'].includes(event.key)) {
    event.preventDefault()
    openCalendar(calendarInput.dataset.calendarField)
    return
  }
  if (event.key === 'Escape' && !calendarPopover.hidden) {
    event.preventDefault()
    closeCalendar({ restoreFocus: true })
  }
})

document.querySelectorAll('[data-preserve-query]').forEach(link => {
  const href = link.getAttribute('href')
  if (!href || href === '#') return
  const target = Reflect.construct(window.URL, [href, window.location.href])
  params.forEach((value, name) => target.searchParams.set(name, value))
  if (!hasRealReturn(state.returning)) clearReturnParams(target.searchParams)
  if (!isSingleReturn) target.searchParams.set('railOutboundDate', state.depart)
  if (hasRealReturn(state.returning)) target.searchParams.set('railReturnDate', state.returning)
  target.searchParams.set('railScope', hasRealReturn(state.returning) && !isSingleReturn ? 'roundtrip' : 'oneway')
  target.searchParams.set('railSegment', railSegment)
  link.href = target.href
})

document.addEventListener('click', event => {
  const details = event.target.closest('.train-filter-menu')
  document.querySelectorAll('.train-filter-menu[open]').forEach(menu => {
    if (menu !== details) menu.open = false
  })
})

setSearchValues()
syncQuery()
updateSortLabel()
renderTrains()
page.dataset.ready = 'true'

window.businessTripTrainSearchPrototype = {
  getState: () => ({ ...state, railSegment }),
  buildBookingLink,
  resetFilters,
}
