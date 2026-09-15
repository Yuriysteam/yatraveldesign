const searchFields = document.querySelector('#search-fields')
const popoverLayer = document.querySelector('#popover-layer')
const tripForm = document.querySelector('#trip-form')
const tabs = Array.from(document.querySelectorAll('[data-vertical]'))
const announcer = document.querySelector('#announcer')
const tripCards = document.querySelector('#trip-cards')
const searchSubmit = document.querySelector('#search-submit')
const workTripRow = document.querySelector('#work-trip-row')
const workTripToggle = document.querySelector('#work-trip-toggle')
const draftsRoot = document.querySelector('#trip-drafts')
const businessOnlySections = Array.from(document.querySelectorAll('[data-business-only]'))

if (!searchFields || !popoverLayer || !tripForm || !announcer || !tripCards || !searchSubmit || !workTripRow || !workTripToggle || !draftsRoot || businessOnlySections.length === 0) {
  throw new Error('Не найдены обязательные элементы прототипа')
}

const params = new URLSearchParams(window.location.search)
if (params.has('vertical')) {
  const homeUrl = new URL(window.location.href)
  homeUrl.searchParams.delete('vertical')
  window.history.replaceState(null, '', homeUrl.href)
}
const referenceMode = params.get('reference') === '1'
const calendarToday = new Date()
calendarToday.setHours(0, 0, 0, 0)
const calendarMinimumMonth = new Date(calendarToday.getFullYear(), calendarToday.getMonth(), 1)

const state = {
  vertical: 'hotel',
  open: null,
  suggestField: null,
  activeOption: 0,
  calendarField: 'depart',
  calendarStep: 'start',
  calendarMonth: calendarToday.getMonth(),
  calendarYear: calendarToday.getFullYear(),
  selectedDateKeys: {
    depart: null,
    return: null,
  },
  adults: 1,
  children: 0,
  childExpanded: false,
  workTrip: params.get('workTrip') === '1',
  routeScopes: {
    avia: params.get('flightScope') === 'oneway' ? 'oneway' : 'roundtrip',
    train: params.get('railScope') === 'oneway' ? 'oneway' : 'roundtrip',
  },
  values: {
    from: '',
    to: '',
    depart: '',
    return: '',
    service: '',
  },
  errors: new Set(),
}

const citySuggestions = Object.freeze([
  Object.freeze({ label: 'Москва', subtitle: '', icon: 'location' }),
  Object.freeze({ label: 'Санкт-Петербург', subtitle: '', icon: 'location' }),
  Object.freeze({ label: 'Екатеринбург', subtitle: '', icon: 'location' }),
  Object.freeze({ label: 'Казань', subtitle: '', icon: 'location' }),
  Object.freeze({ label: 'Сочи', subtitle: '', icon: 'location' }),
])

const aviaSuggestions = Object.freeze([
  Object.freeze({ label: 'Москва', subtitle: 'Внуково · VKO, Шереметьево · SVO', icon: 'plane' }),
  Object.freeze({ label: 'Санкт-Петербург', subtitle: 'Пулково · LED', icon: 'plane' }),
  Object.freeze({ label: 'Екатеринбург', subtitle: 'Кольцово · SVX', icon: 'plane' }),
  Object.freeze({ label: 'Казань', subtitle: 'Аэропорт Казань · KZN', icon: 'plane' }),
  Object.freeze({ label: 'Сочи', subtitle: 'Адлер · AER', icon: 'plane' }),
  Object.freeze({ label: 'Стамбул', subtitle: 'IST · SAW', icon: 'plane' }),
])

const routeSuggestionsByVertical = Object.freeze({
  hotel: citySuggestions,
  avia: aviaSuggestions,
  train: citySuggestions,
  tour: citySuggestions,
  business: citySuggestions,
})

const serviceSuggestions = [
  { label: 'Трансфер из аэропорта', subtitle: 'Встреча с табличкой', icon: 'location', recent: true },
  { label: 'Страховка для поездки', subtitle: 'Россия и зарубежные поездки', icon: 'hotel', recent: true },
  { label: 'Бизнес-зал', subtitle: 'Аэропорты Москвы', icon: 'hotel' },
  { label: 'Аэроэкспресс', subtitle: 'До аэропорта и обратно', icon: 'location' },
]

const BUSINESS_DRAFTS_STORAGE_KEY = 'business-trip-drafts-v1'
const BUSINESS_CANCELLED_TRIPS_STORAGE_KEY = 'business-trip-cancelled-v1'
const BUSINESS_PAID_TRIPS_STORAGE_KEY = 'business-trip-paid-v1'

const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const monthShort = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function isRouteVertical() {
  return ['business', 'avia', 'train', 'tour'].includes(state.vertical)
}

function isSearchVertical() {
  return ['hotel', 'avia', 'train'].includes(state.vertical)
}

function supportsOneWay() {
  return state.vertical === 'business' || state.vertical === 'avia' || state.vertical === 'train'
}

function isOneWay() {
  return supportsOneWay() && state.routeScopes[state.vertical] === 'oneway'
}

function requiresDateRange() {
  return state.vertical !== 'service' && !isOneWay()
}

function travellerPlaceholder() {
  if (state.vertical === 'avia') return 'Кто летит'
  if (state.vertical === 'hotel') return 'Гости'
  if (state.vertical === 'tour') return 'Туристы'
  return 'Кто едет'
}

function travellerSummary() {
  if (state.adults === 0 && state.children === 0) return travellerPlaceholder()
  const adults = `${state.adults} ${state.adults === 1 ? 'взрослый' : 'взрослых'}`
  return state.children > 0 ? `${adults}, ${state.children} реб.` : adults
}

function directionField(name, placeholder, extraClass = '') {
  const value = state.values[name]
  const open = (state.open === 'suggest' && state.suggestField === name) || (referenceMode && name === 'from')
  return `
    <label class="search-field search-field--direction ${name === 'from' ? 'search-field--from' : ''} ${extraClass} ${open ? 'is-open' : ''} ${state.errors.has(name) ? 'has-error' : ''}">
      <span class="visually-hidden">${escapeHtml(placeholder)}</span>
      <input
        id="field-${name}"
        name="${name}"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="suggest-list"
        aria-expanded="${open ? 'true' : 'false'}"
        autocomplete="off"
        placeholder="${escapeHtml(placeholder)}"
        value="${escapeHtml(value)}"
        data-suggest-field="${name}"
      >
    </label>`
}

function dateField(name, placeholder) {
  const value = state.values[name]
  const oneWay = name === 'return' && isOneWay()
  const open = state.open === 'calendar' && state.calendarField === name
  return `
    <div class="search-field search-field--date ${open ? 'is-open' : ''} ${state.errors.has(name) ? 'has-error' : ''}">
      <button class="field-button ${value || oneWay ? 'has-value' : ''}" type="button" data-action="open-calendar" data-field="${name}" aria-expanded="${open ? 'true' : 'false'}">
        <span>${escapeHtml(oneWay ? 'Только туда' : value || placeholder)}</span>
      </button>
    </div>`
}

function travellersField() {
  const hasValue = state.adults > 0 || state.children > 0
  const open = state.open === 'travellers' || referenceMode
  return `
    <div class="search-field search-field--travellers ${open ? 'is-open' : ''} ${state.errors.has('travellers') ? 'has-error' : ''}">
      <button class="field-button ${hasValue ? 'has-value' : ''}" type="button" data-action="open-travellers" aria-expanded="${open ? 'true' : 'false'}">
        <span>${escapeHtml(travellerSummary())}</span><span class="chevron" aria-hidden="true"></span>
      </button>
    </div>`
}

function divider() {
  return '<span class="field-divider" aria-hidden="true"></span>'
}

function swapButton() {
  return '<button class="swap-button" type="button" data-action="swap-directions" aria-label="Поменять направления местами"><img src="./assets/icons/swap.svg" alt=""></button>'
}

function renderForm() {
  let markup = ''
  if (isRouteVertical()) {
    markup = [
      directionField('from', state.vertical === 'tour' ? 'Город вылета' : 'Откуда'),
      swapButton(),
      directionField('to', state.vertical === 'tour' ? 'Куда хотите поехать' : 'Куда'),
      divider(),
      dateField('depart', state.vertical === 'tour' ? 'Даты' : 'Туда'),
      divider(),
      dateField('return', 'Обратно'),
      divider(),
      travellersField(),
    ].join('')
  } else if (state.vertical === 'hotel') {
    markup = [
      directionField('to', 'Город', 'search-field--wide'),
      divider(),
      dateField('depart', 'Заезд'),
      divider(),
      dateField('return', 'Выезд'),
      divider(),
      travellersField(),
    ].join('')
  } else {
    markup = [
      directionField('to', 'Город', 'search-field--wide'),
      divider(),
      directionField('service', 'Услуга', 'search-field--wide'),
      divider(),
      dateField('depart', 'Дата'),
      divider(),
      travellersField(),
    ].join('')
  }

  searchFields.innerHTML = markup
  updateTabs()
  updateSearchMode()
  updateVerticalContent()
  renderPopovers()
}

function updateSearchMode() {
  const searchMode = isSearchVertical()
  document.querySelector('.creator')?.classList.toggle('has-search-options', searchMode)
  workTripRow.hidden = !searchMode
  workTripToggle.checked = state.workTrip
  searchSubmit.textContent = searchMode ? 'Найти' : 'Создать'
  searchSubmit.classList.toggle('is-search', searchMode)
  searchSubmit.classList.toggle('is-work-trip', searchMode && state.workTrip)
}

function updateVerticalContent() {
  const showBusinessContent = state.vertical === 'business'
  for (const section of businessOnlySections) section.hidden = !showBusinessContent
  draftsRoot.hidden = !showBusinessContent || draftsRoot.childElementCount === 0
}

function readBusinessDrafts() {
  try {
    const value = JSON.parse(window.localStorage.getItem(BUSINESS_DRAFTS_STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function hideCancelledTripCards() {
  let cancelledTrips = []
  try {
    const value = JSON.parse(window.localStorage.getItem(BUSINESS_CANCELLED_TRIPS_STORAGE_KEY) || '[]')
    cancelledTrips = Array.isArray(value) ? value : []
  } catch {
    cancelledTrips = []
  }
  const cancelledIds = new Set(cancelledTrips.map(trip => trip?.id).filter(Boolean))
  tripCards.querySelectorAll('[data-trip-id]').forEach(card => {
    card.hidden = cancelledIds.has(card.dataset.tripId)
  })
}

function renderPaidBusinessTripCards() {
  let paidTrips = []
  try {
    const value = JSON.parse(window.localStorage.getItem(BUSINESS_PAID_TRIPS_STORAGE_KEY) || '[]')
    paidTrips = Array.isArray(value) ? value : []
  } catch {
    paidTrips = []
  }
  const cityImages = {
    Москва: './assets/images/trip-moscow.png',
    'Санкт-Петербург': './assets/images/trip-kazan.png',
    Екатеринбург: './assets/images/city-ekaterinburg.png',
    Пятигорск: './assets/images/city-pyatigorsk.png',
    Кострома: './assets/images/city-kostroma.png',
    Новороссийск: './assets/images/city-novorossiysk.png',
  }
  tripCards.querySelectorAll('[data-dynamic-business-trip]').forEach(card => card.remove())
  const visibleTrips = paidTrips.filter(trip => ['upcoming', 'active'].includes(trip?.state) && trip?.id)
  const cards = visibleTrips.map(trip => {
    const image = cityImages[trip.city] || './assets/images/trip-kazan.png'
    const target = new URL(trip.href || './trips.html#business', window.location.href)
    return `
      <a class="trip-image-card trip-image-card--created" href="${escapeHtml(target.href)}" data-trip-id="${escapeHtml(trip.id)}" data-dynamic-business-trip>
        <img src="${escapeHtml(image)}" alt="${escapeHtml(trip.city || 'Командировка')}">
        <div class="trip-image-card__shade"></div>
        <div class="trip-image-card__copy"><h3>${escapeHtml(String(trip.city || 'Командировка').toLocaleUpperCase('ru'))}</h3><span>${escapeHtml(trip.dates || '')}</span></div>
      </a>`
  }).join('')
  if (cards) tripCards.insertAdjacentHTML('afterbegin', cards)
}

function draftHref(draft) {
  const url = new URL('./trip.html', window.location.href)
  if (typeof draft.search === 'string' && draft.search) {
    const savedParams = new URLSearchParams(draft.search)
    savedParams.forEach((value, name) => url.searchParams.set(name, value))
  }
  url.searchParams.set('from', draft.from)
  url.searchParams.set('to', draft.to)
  url.searchParams.set('depart', draft.depart)
  url.searchParams.set('return', draft.return)
  url.searchParams.set('draft', '1')
  url.searchParams.set('draftId', draft.id)
  return url.href
}

function renderDrafts() {
  const visibleDrafts = readBusinessDrafts().filter(draft => draft.paidServices === 0)
  draftsRoot.innerHTML = visibleDrafts.map(draft => `
    <a class="trip-draft-card" href="${escapeHtml(draftHref(draft))}" data-draft-id="${escapeHtml(draft.id)}">
      <span class="trip-draft-card__icon" aria-hidden="true"><img src="./assets/icons/draft-briefcase-filled.svg" alt=""></span>
      <span class="trip-draft-card__copy">
        <strong>${escapeHtml(`${draft.from} – ${draft.to}`)}</strong>
        <small>${escapeHtml(`${draft.dates}, командировка`)}</small>
      </span>
    </a>`).join('')
  draftsRoot.hidden = state.vertical !== 'business' || visibleDrafts.length === 0
}

function updateTabs() {
  for (const tab of tabs) {
    const selected = tab.dataset.vertical === state.vertical
    tab.classList.toggle('is-selected', selected)
    tab.setAttribute('aria-selected', String(selected))
    tab.tabIndex = selected ? 0 : -1
  }
}

function normalize(value) {
  return value.trim().toLocaleLowerCase('ru')
}

function currentSuggestions() {
  const source = state.suggestField === 'service'
    ? serviceSuggestions
    : routeSuggestionsByVertical[state.vertical] || citySuggestions
  const query = normalize(state.values[state.suggestField] || '')
  if (query) return source.filter(item => normalize(`${item.label} ${item.subtitle}`).includes(query))
  return source
}

function suggestionOption(item, index) {
  const icon = {
    hotel: 'hotel',
    location: 'location',
    plane: 'transport-plane',
    train: 'transport-train',
  }[item.icon] || 'location'
  return `
    <button class="suggest-option ${index === state.activeOption ? 'is-active' : ''}" id="suggest-option-${index}" type="button" role="option" aria-selected="${index === state.activeOption ? 'true' : 'false'}" data-action="select-suggestion" data-index="${index}">
      <span class="suggest-icon"><img src="./assets/icons/${icon}.svg" alt=""></span>
      <span class="suggest-copy"><strong>${escapeHtml(item.label)}</strong>${item.subtitle ? `<small>${escapeHtml(item.subtitle)}</small>` : ''}</span>
    </button>`
}

function suggestPopover() {
  const suggestions = currentSuggestions()
  if (state.activeOption >= suggestions.length) state.activeOption = Math.max(0, suggestions.length - 1)
  const body = suggestions.length === 0
    ? '<div class="suggest-empty">Ничего не найдено</div>'
    : `<div class="suggest-list" id="suggest-list" role="listbox" aria-label="Варианты направления">
        ${suggestions.map((item, index) => suggestionOption(item, index)).join('')}
      </div>`
  return `<div class="popover suggest-popover" data-popover="suggest">${body}</div>`
}

function travellersPopover() {
  return `
    <div class="popover travellers-popover" data-popover="travellers">
      <div class="traveller-row">
        <span class="traveller-copy"><strong>Взрослые</strong><small>от 18 лет</small></span>
        <span class="stepper">
          <button class="stepper-button" type="button" data-action="adults-minus" aria-label="Уменьшить число взрослых" ${state.adults === 0 ? 'disabled' : ''}><img src="./assets/icons/minus.svg" alt=""></button>
          <span class="stepper-value" aria-live="polite">${state.adults}</span>
          <button class="stepper-button" type="button" data-action="adults-plus" aria-label="Увеличить число взрослых"><img src="./assets/icons/plus.svg" alt=""></button>
        </span>
      </div>
      <button class="child-button" type="button" data-action="toggle-child"><span>${state.children > 0 ? `Дети: ${state.children}` : 'Добавить ребенка'}</span><span class="chevron" aria-hidden="true"></span></button>
      ${state.childExpanded ? `
        <div class="traveller-row child-row">
          <span class="traveller-copy"><strong>Дети</strong><small>до 18 лет</small></span>
          <span class="stepper">
            <button class="stepper-button" type="button" data-action="children-minus" aria-label="Уменьшить число детей" ${state.children === 0 ? 'disabled' : ''}><img src="./assets/icons/minus.svg" alt=""></button>
            <span class="stepper-value" aria-live="polite">${state.children}</span>
            <button class="stepper-button" type="button" data-action="children-plus" aria-label="Увеличить число детей"><img src="./assets/icons/plus.svg" alt=""></button>
          </span>
        </div>` : ''}
    </div>`
}

function calendarMonths() {
  const months = []
  for (let offset = 0; offset < 13; offset += 1) {
    const date = new Date(calendarMinimumMonth.getFullYear(), calendarMinimumMonth.getMonth() + offset, 1)
    const active = date.getMonth() === state.calendarMonth && date.getFullYear() === state.calendarYear
    months.push({ month: date.getMonth(), year: date.getFullYear(), label: `${monthNames[date.getMonth()]}${date.getMonth() === 0 ? ` ${date.getFullYear()}` : ''}`, active })
  }
  return months.map(item => `<button class="calendar-month ${item.active ? 'is-active' : ''}" type="button" data-action="change-month" data-month="${item.month}" data-year="${item.year}">${escapeHtml(item.label)}</button>`).join('')
}

function calendarDays() {
  const first = new Date(state.calendarYear, state.calendarMonth, 1)
  const daysInMonth = new Date(state.calendarYear, state.calendarMonth + 1, 0).getDate()
  const mondayIndex = (first.getDay() + 6) % 7
  const cells = []
  const rangeStart = state.selectedDateKeys.depart
  const rangeEnd = requiresDateRange() ? state.selectedDateKeys.return : null
  for (let i = 0; i < mondayIndex; i += 1) cells.push('<span class="calendar-day is-muted" aria-hidden="true"></span>')
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(state.calendarYear, state.calendarMonth, day)
    const weekday = (date.getDay() + 6) % 7
    const key = calendarDateKey(state.calendarYear, state.calendarMonth, day)
    const isStart = key === rangeStart
    const isEnd = key === rangeEnd
    const isInRange = Boolean(rangeStart && rangeEnd && key > rangeStart && key < rangeEnd)
    const referenceSelected = referenceMode && !rangeStart && day === 7
    const isPast = date < calendarToday
    const classes = [
      'calendar-day',
      weekday >= 5 ? 'is-weekend' : '',
      isInRange ? 'is-in-range' : '',
      isStart ? 'is-range-start' : '',
      isEnd ? 'is-range-end' : '',
      referenceSelected ? 'is-selected' : '',
    ].filter(Boolean).join(' ')
    cells.push(`<button class="${classes}" type="button" data-action="select-date" data-day="${day}" data-date-key="${key}" aria-label="${day} ${monthNames[state.calendarMonth].toLowerCase()} ${state.calendarYear}" aria-disabled="${isPast}"${isPast ? ' disabled' : ''}>${day}</button>`)
  }
  return cells.join('')
}

function calendarDateKey(year, month, day) {
  return year * 10000 + (month + 1) * 100 + day
}

function calendarPopover() {
  const canChooseOneWay = supportsOneWay()
  return `
    <div class="popover calendar-popover" data-popover="calendar">
      <div class="calendar-months">${calendarMonths()}</div>
      <div class="calendar-main">
        <div class="calendar-weekdays" aria-hidden="true"><span>пн</span><span>вт</span><span>ср</span><span>чт</span><span>пт</span><span>сб</span><span>вс</span></div>
        <h3 class="calendar-title">${monthNames[state.calendarMonth]}</h3>
        ${canChooseOneWay ? '<button class="calendar-one-way" type="button" data-action="select-one-way">Только туда</button>' : ''}
        <div class="calendar-days" role="grid" aria-label="${monthNames[state.calendarMonth]} ${state.calendarYear}">${calendarDays()}</div>
      </div>
    </div>`
}

function renderPopovers() {
  if (referenceMode) {
    const previousField = state.suggestField
    state.suggestField = 'from'
    popoverLayer.innerHTML = suggestPopover() + travellersPopover()
    state.suggestField = previousField
    return
  }

  if (state.open === 'suggest') popoverLayer.innerHTML = suggestPopover()
  else if (state.open === 'travellers') popoverLayer.innerHTML = travellersPopover()
  else if (state.open === 'calendar') popoverLayer.innerHTML = calendarPopover()
  else popoverLayer.innerHTML = ''
}

function setOpen(kind, field = null) {
  state.open = kind
  if (kind === 'suggest') {
    state.suggestField = field
    state.activeOption = 0
  }
  if (kind === 'calendar') {
    state.calendarField = field
    state.calendarStep = field === 'return' && state.selectedDateKeys.depart ? 'end' : 'start'
    const selectedKey = field === 'return'
      ? state.selectedDateKeys.return || state.selectedDateKeys.depart
      : state.selectedDateKeys.depart || state.selectedDateKeys.return
    const selectedDate = selectedKey
      ? new Date(Math.floor(selectedKey / 10000), Math.floor(selectedKey / 100) % 100 - 1, selectedKey % 100)
      : calendarToday
    const visibleDate = selectedDate < calendarToday ? calendarToday : selectedDate
    state.calendarMonth = visibleDate.getMonth()
    state.calendarYear = visibleDate.getFullYear()
  }
  renderForm()
  if (kind === 'suggest' && field) {
    const input = document.querySelector(`[data-suggest-field="${field}"]`)
    input?.focus()
    const valueLength = input?.value.length || 0
    input?.setSelectionRange(valueLength, valueLength)
  }
}

function closePopovers({ restoreFocus = false } = {}) {
  const previousOpen = state.open
  const previousField = state.open === 'suggest' ? state.suggestField : state.open === 'calendar' ? state.calendarField : null
  state.open = null
  renderForm()
  if (restoreFocus) {
    if (previousOpen === 'travellers') document.querySelector('[data-action="open-travellers"]')?.focus()
    else if (previousField) document.querySelector(`[data-suggest-field="${previousField}"], [data-action="open-calendar"][data-field="${previousField}"]`)?.focus()
  }
}

function announce(message) {
  announcer.textContent = message
}

function chooseSuggestion(index) {
  const suggestions = currentSuggestions()
  const item = suggestions[index]
  if (!item || !state.suggestField) return
  state.values[state.suggestField] = item.label
  state.errors.delete(state.suggestField)
  const chosenField = state.suggestField
  closePopovers()
  if (chosenField === 'from' && isRouteVertical()) document.querySelector('[data-suggest-field="to"]')?.focus()
}

function handleSearchInput(input) {
  const field = input.dataset.suggestField
  if (!field) return
  state.values[field] = input.value
  state.errors.delete(field)
  state.suggestField = field
  state.open = 'suggest'
  state.activeOption = 0
  renderPopovers()
  input.setAttribute('aria-expanded', 'true')
}

function handleSearchKeydown(event) {
  const input = event.target.closest('[data-suggest-field]')
  if (!input) return
  const field = input.dataset.suggestField
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (state.open !== 'suggest' || state.suggestField !== field) {
      state.open = 'suggest'
      state.suggestField = field
    }
    const count = currentSuggestions().length
    if (count > 0) state.activeOption = (state.activeOption + (event.key === 'ArrowDown' ? 1 : -1) + count) % count
    renderPopovers()
    input.setAttribute('aria-activedescendant', `suggest-option-${state.activeOption}`)
  } else if (event.key === 'Enter' && state.open === 'suggest') {
    event.preventDefault()
    chooseSuggestion(state.activeOption)
  }
}

searchFields.addEventListener('focusin', event => {
  const input = event.target.closest('[data-suggest-field]')
  if (!input) return
  if (state.open !== 'suggest' || state.suggestField !== input.dataset.suggestField) setOpen('suggest', input.dataset.suggestField)
})

searchFields.addEventListener('input', event => {
  const input = event.target.closest('[data-suggest-field]')
  if (input) handleSearchInput(input)
})

searchFields.addEventListener('keydown', handleSearchKeydown)

searchFields.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action
  if (!action) return
  if (action === 'swap-directions') {
    ;[state.values.from, state.values.to] = [state.values.to, state.values.from]
    renderForm()
    announce('Направления поменялись местами')
  }
  if (action === 'open-calendar') {
    const field = event.target.closest('[data-field]')?.dataset.field
    if (field === 'return' && supportsOneWay() && isOneWay()) {
      state.routeScopes[state.vertical] = 'roundtrip'
    }
    setOpen(state.open === 'calendar' && state.calendarField === field ? null : 'calendar', field)
  }
  if (action === 'open-travellers') setOpen(state.open === 'travellers' ? null : 'travellers')
})

popoverLayer.addEventListener('click', event => {
  event.stopPropagation()
  const target = event.target.closest('[data-action]')
  if (!target) return
  const action = target.dataset.action
  if (action === 'select-suggestion') chooseSuggestion(Number(target.dataset.index))
  if (action === 'adults-minus') state.adults = Math.max(0, state.adults - 1)
  if (action === 'adults-plus') state.adults += 1
  if (action === 'children-minus') state.children = Math.max(0, state.children - 1)
  if (action === 'children-plus') state.children += 1
  if (action === 'toggle-child') state.childExpanded = !state.childExpanded
  if (['adults-minus', 'adults-plus', 'children-minus', 'children-plus', 'toggle-child'].includes(action)) {
    state.errors.delete('travellers')
    renderForm()
  }
  if (action === 'change-month') {
    state.calendarMonth = Number(target.dataset.month)
    state.calendarYear = Number(target.dataset.year)
    renderPopovers()
  }
  if (action === 'select-one-way' && supportsOneWay()) {
    state.routeScopes[state.vertical] = 'oneway'
    state.values.return = ''
    state.selectedDateKeys.return = null
    state.calendarField = 'depart'
    state.calendarStep = 'start'
    state.errors.delete('return')
    renderForm()
    announce('Выберите дату поездки')
  }
  if (action === 'select-date') {
    const day = Number(target.dataset.day)
    const selectedDate = new Date(state.calendarYear, state.calendarMonth, day)
    if (selectedDate < calendarToday) return
    const value = `${day} ${monthShort[state.calendarMonth]}`
    const key = calendarDateKey(state.calendarYear, state.calendarMonth, day)

    if (!requiresDateRange()) {
      state.values.depart = value
      state.selectedDateKeys.depart = key
      state.values.return = ''
      state.selectedDateKeys.return = null
      state.errors.delete('depart')
      closePopovers()
      announce('Дата поездки выбрана')
    } else if (state.calendarStep === 'start') {
      state.values.depart = value
      state.selectedDateKeys.depart = key
      state.values.return = ''
      state.selectedDateKeys.return = null
      state.errors.delete('depart')
      state.calendarStep = 'end'
      state.calendarField = 'return'
      renderForm()
      announce('Дата начала выбрана. Выберите дату окончания')
    } else {
      const startKey = state.selectedDateKeys.depart
      if (startKey && key < startKey) {
        state.values.depart = value
        state.selectedDateKeys.depart = key
        state.values.return = ''
        state.selectedDateKeys.return = null
        state.calendarField = 'return'
        renderForm()
        announce('Новая дата начала выбрана. Выберите дату окончания')
      } else {
        state.values.return = value
        state.selectedDateKeys.return = key
        state.errors.delete('return')
        if (supportsOneWay()) state.routeScopes[state.vertical] = 'roundtrip'
        state.calendarStep = 'start'
        closePopovers()
        announce('Диапазон дат выбран')
      }
    }
  }
})

workTripToggle.addEventListener('change', () => {
  state.workTrip = workTripToggle.checked
  updateSearchMode()
  announce(state.workTrip ? 'Включён режим «Еду по работе»' : 'Режим «Еду по работе» выключен')
})

for (const tab of tabs) {
  tab.addEventListener('click', () => {
    state.vertical = tab.dataset.vertical
    state.open = null
    state.errors.clear()
    renderForm()
    announce(`Форма: ${tab.textContent.trim()}`)
  })
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const current = tabs.indexOf(tab)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    tabs[next].focus()
    tabs[next].click()
  })
}

document.addEventListener('pointerdown', event => {
  if (referenceMode || !state.open) return
  if (!event.target.closest('.search-area')) closePopovers()
})

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.open) {
    event.preventDefault()
    closePopovers({ restoreFocus: true })
  }
})

function requiredFields() {
  if (isRouteVertical()) {
    const fields = ['from', 'to', 'depart', 'travellers']
    if (!isOneWay()) fields.splice(3, 0, 'return')
    return fields
  }
  if (state.vertical === 'hotel') return ['to', 'depart', 'return', 'travellers']
  return ['to', 'service', 'depart', 'travellers']
}

function createTripCard() {
  const from = state.values.from || 'Москва'
  const to = state.values.to
  const dates = [state.values.depart, state.values.return].filter(Boolean).join(' — ')
  const title = state.vertical === 'hotel' ? to : `${from} – ${to}`
  const card = document.createElement('article')
  card.className = 'trip-image-card trip-image-card--created'
  card.innerHTML = `
    <img src="./assets/images/trip-kazan.png" alt="${escapeHtml(title)}">
    <div class="trip-image-card__shade"></div>
    <div class="trip-image-card__copy"><h3>${escapeHtml(title.toUpperCase())}</h3><span>${escapeHtml(dates)}</span></div>`
  tripCards.prepend(card)
  while (tripCards.children.length > 2) tripCards.lastElementChild.remove()
}

function openTripPage() {
  const url = new URL('./trip.html', window.location.href)
  const values = {
    from: state.values.from,
    to: state.values.to,
    depart: state.values.depart,
    return: state.values.return,
    adults: state.adults,
    children: state.children,
  }
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '') url.searchParams.delete(key)
    else url.searchParams.set(key, String(value))
  }
  const draftId = window.crypto?.randomUUID?.() || `draft-${Date.now()}`
  url.searchParams.set('draft', '1')
  url.searchParams.set('draftId', draftId)
  window.location.assign(url.href)
}

function openSearchPage() {
  const pageByVertical = {
    hotel: './hotel-search.html',
    avia: './avia-search.html',
    train: './train-search.html',
  }
  const url = new URL(pageByVertical[state.vertical], window.location.href)
  const commonValues = {
    depart: state.values.depart,
    traveller: travellerSummary(),
    adults: state.adults,
    children: state.children,
  }
  for (const [key, value] of Object.entries(commonValues)) url.searchParams.set(key, String(value))

  if (state.vertical === 'hotel') {
    url.searchParams.set('city', state.values.to)
    url.searchParams.set('to', state.values.to)
    url.searchParams.set('checkin', state.values.depart)
    url.searchParams.set('checkout', state.values.return)
    url.searchParams.set('return', state.values.return)
  } else {
    url.searchParams.set('from', state.values.from)
    url.searchParams.set('to', state.values.to)
    if (isOneWay()) url.searchParams.delete('return')
    else url.searchParams.set('return', state.values.return)
    if (state.vertical === 'avia') url.searchParams.set('flightScope', isOneWay() ? 'oneway' : 'roundtrip')
    if (state.vertical === 'train') url.searchParams.set('railScope', isOneWay() ? 'oneway' : 'roundtrip')
  }

  if (state.workTrip) url.searchParams.set('workTrip', '1')
  window.location.assign(url.href)
}

tripForm.addEventListener('submit', event => {
  event.preventDefault()
  state.errors.clear()
  for (const field of requiredFields()) {
    const empty = field === 'travellers' ? state.adults + state.children === 0 : !state.values[field]
    if (empty) state.errors.add(field)
  }
  if (state.errors.size > 0) {
    renderForm()
    const first = state.errors.values().next().value
    if (first === 'travellers') document.querySelector('[data-action="open-travellers"]')?.focus()
    else document.querySelector(`[data-suggest-field="${first}"], [data-action="open-calendar"][data-field="${first}"]`)?.focus()
    announce('Заполните обязательные поля')
    return
  }
  if (isSearchVertical()) {
    openSearchPage()
    return
  }
  if (state.vertical === 'business') {
    openTripPage()
    return
  }
  createTripCard()
  closePopovers()
  document.querySelector('#trips-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  announce('Командировка создана и добавлена в «Мои командировки»')
})

document.querySelectorAll('.approve-button').forEach(button => {
  button.addEventListener('click', () => {
    const approved = button.classList.toggle('is-approved')
    button.lastChild.textContent = approved ? 'Согласовано' : 'Согласовать'
    announce(approved ? 'Командировка согласована' : 'Согласование отменено')
  })
})

document.querySelectorAll('.details-button').forEach(button => {
  button.addEventListener('click', () => announce('Детали откроются в следующем экране прототипа'))
})

document.querySelectorAll('.destination-card').forEach(button => {
  button.addEventListener('click', () => {
    state.vertical = 'hotel'
    state.values.to = button.dataset.city
    state.open = null
    renderForm()
    document.querySelector('.creator')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => document.querySelector('[data-suggest-field="to"]')?.focus(), 250)
    announce(`${button.dataset.city} добавлен в форму`)
  })
})

document.querySelectorAll('.icon-button, .account').forEach(button => {
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-label') === 'Мои поездки') {
      window.location.assign(new URL('./trips.html', window.location.href).href)
      return
    }
    announce(`${button.getAttribute('aria-label') || button.textContent.trim()} — демонстрационный элемент`)
  })
})

renderPaidBusinessTripCards()
hideCancelledTripCards()
renderDrafts()
renderForm()
document.querySelector('.page-shell').dataset.ready = 'true'
