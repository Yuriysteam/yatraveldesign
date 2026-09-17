(() => {
  const EMBED_VALUE = 'trip-v2'
  const TRIP_SERVICES_PARAM = 'tripServices'
  const NOT_NEEDED_PARAM = 'notNeeded'
  const REMOVED_SERVICES_PARAM = 'tripRemovedServices'
  const ACTIVE_VERTICAL_PARAM = 'tripVertical'
  const AVIA_BOOKING_STORAGE_KEY = 'business-trip-avia-booking-v2'
  const BUSINESS_DRAFTS_STORAGE_KEY = 'business-trip-drafts-v2'
  const BUSINESS_CANCELLED_TRIPS_STORAGE_KEY = 'business-trip-cancelled-v2'
  const BUSINESS_PAID_TRIPS_STORAGE_KEY = 'business-trip-paid-v2'
  const RAIL_BOOKING_STORAGE_PREFIX = 'rail-booking-v2:'
  const SERVICE_STATUS_LABELS = Object.freeze({
    paid: 'Оплачено',
    'awaiting-payment': 'Ожидает оплаты',
    'out-of-policy': 'Не в тревел-политике',
    cancelled: 'Отменено',
  })
  const RAIL_COACH_LABELS = Object.freeze({
    platz: 'Плацкарт',
    coupe: 'Купе',
    sv: 'СВ',
    lux: 'Люкс',
  })
  const VERTICALS = Object.freeze({
    avia: Object.freeze({ path: './avia-search.html', frameName: 'авиабилеты', revision: '14' }),
    train: Object.freeze({ path: './train-search.html', frameName: 'ж/д билеты', revision: '13' }),
    hotel: Object.freeze({ path: './hotel-search.html', frameName: 'жильё', revision: '14' }),
  })
  const PAYMENT_PATH = './trip-payment.html'
  const CITY_CASES = Object.freeze({
    'Москва': Object.freeze({ accusative: 'Москву', prepositional: 'Москве' }),
    'Санкт-Петербург': Object.freeze({ accusative: 'Санкт-Петербург', prepositional: 'Санкт-Петербурге' }),
    'Екатеринбург': Object.freeze({ accusative: 'Екатеринбург', prepositional: 'Екатеринбурге' }),
    'Пятигорск': Object.freeze({ accusative: 'Пятигорск', prepositional: 'Пятигорске' }),
    'Кострома': Object.freeze({ accusative: 'Кострому', prepositional: 'Костроме' }),
    'Казань': Object.freeze({ accusative: 'Казань', prepositional: 'Казани' }),
    'Новороссийск': Object.freeze({ accusative: 'Новороссийск', prepositional: 'Новороссийске' }),
    'Сочи': Object.freeze({ accusative: 'Сочи', prepositional: 'Сочи' }),
    'Стамбул': Object.freeze({ accusative: 'Стамбул', prepositional: 'Стамбуле' }),
  })
  const SEARCH_CITY_SUGGESTIONS = Object.freeze([
    Object.freeze({ label: 'Москва', subtitle: '', icon: 'location' }),
    Object.freeze({ label: 'Санкт-Петербург', subtitle: '', icon: 'location' }),
    Object.freeze({ label: 'Екатеринбург', subtitle: '', icon: 'location' }),
    Object.freeze({ label: 'Казань', subtitle: '', icon: 'location' }),
    Object.freeze({ label: 'Сочи', subtitle: '', icon: 'location' }),
  ])
  const SEARCH_AVIA_SUGGESTIONS = Object.freeze([
    Object.freeze({ label: 'Москва', subtitle: 'Внуково · VKO, Шереметьево · SVO', icon: 'transport-plane' }),
    Object.freeze({ label: 'Санкт-Петербург', subtitle: 'Пулково · LED', icon: 'transport-plane' }),
    Object.freeze({ label: 'Екатеринбург', subtitle: 'Кольцово · SVX', icon: 'transport-plane' }),
    Object.freeze({ label: 'Казань', subtitle: 'Аэропорт Казань · KZN', icon: 'transport-plane' }),
    Object.freeze({ label: 'Сочи', subtitle: 'Адлер · AER', icon: 'transport-plane' }),
    Object.freeze({ label: 'Стамбул', subtitle: 'IST · SAW', icon: 'transport-plane' }),
  ])
  const SEARCH_MONTH_NAMES = Object.freeze(['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'])
  const SEARCH_MONTH_SHORT = Object.freeze(['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'])
  const TIMELINE_MONTH_NAMES = Object.freeze({
    янв: 'января', фев: 'февраля', мар: 'марта', апр: 'апреля', май: 'мая', мая: 'мая', июн: 'июня',
    июл: 'июля', авг: 'августа', сен: 'сентября', окт: 'октября', ноя: 'ноября', дек: 'декабря',
  })
  const TIMELINE_MONTH_INDEX = Object.freeze({
    янв: 0,
    фев: 1,
    мар: 2,
    апр: 3,
    май: 4,
    мая: 4,
    июн: 5,
    июл: 6,
    авг: 7,
    сен: 8,
    окт: 9,
    ноя: 10,
    дек: 11,
  })
  const TIMELINE_BASE_YEAR = new Date().getUTCFullYear()
  const SEARCH_CALENDAR_TODAY = new Date()
  SEARCH_CALENDAR_TODAY.setHours(0, 0, 0, 0)
  const SEARCH_CALENDAR_MINIMUM_MONTH = new Date(SEARCH_CALENDAR_TODAY.getFullYear(), SEARCH_CALENDAR_TODAY.getMonth(), 1)

  const initialParams = new URLSearchParams(window.location.search)
  const parentTargetOrigin = window.location.protocol === 'file:' ? '*' : window.location.origin
  if (window.parent !== window && initialParams.get('embed') === EMBED_VALUE) {
    document.documentElement.dataset.tripNestedReturn = 'true'
    const outer = new URL(window.location.href)
    outer.searchParams.delete('embed')
    window.parent.postMessage({
      type: 'trip-v2:return',
      href: outer.href,
      search: outer.search,
    }, parentTargetOrigin)
    return
  }

  const shell = document.querySelector('#trip-shell')
  const shellSurface = document.querySelector('#trip-shell-surface')
  const overviewButton = document.querySelector('#trip-overview')
  const overviewRoute = document.querySelector('#trip-overview-route')
  const overviewDates = document.querySelector('#trip-overview-dates')
  const overviewTravellers = document.querySelector('#trip-overview-travellers')
  const overviewServices = document.querySelector('#trip-overview-services')
  const searchForm = document.querySelector('#trip-search-form')
  const topbarSearchRow = document.querySelector('.trip-topbar__search-row')
  const bookingStage = document.querySelector('.trip-booking-stage')
  const bookingFrame = document.querySelector('#trip-booking-frame')
  const frameState = document.querySelector('#trip-frame-state')
  const serviceAddedState = document.querySelector('#trip-service-added-state')
  const serviceAddedIcon = document.querySelector('#trip-service-added-icon')
  const serviceAddedTitle = document.querySelector('#trip-service-added-title')
  const serviceAddedActions = document.querySelector('#trip-service-added-actions')
  const servicesOverlay = document.querySelector('#trip-services-overlay')
  const servicesDrawer = document.querySelector('#trip-services-drawer')
  const drawerScroll = document.querySelector('#trip-drawer-scroll')
  const drawerBack = document.querySelector('.trip-drawer-back')
  const drawerTitle = document.querySelector('#trip-drawer-title')
  const drawerMeta = document.querySelector('#trip-drawer-meta')
  const drawerBadge = document.querySelector('#trip-drawer-badge')
  const servicesList = document.querySelector('#trip-services-list')
  const finalCost = document.querySelector('#trip-final-cost')
  const serviceChooser = document.querySelector('#trip-service-chooser')
  const detailsDialog = document.querySelector('#trip-details-dialog')
  const detailsForm = document.querySelector('#trip-details-form')
  const removeDialog = document.querySelector('#trip-remove-dialog')
  const removeDialogTitle = document.querySelector('#trip-remove-title')
  const announcer = document.querySelector('#trip-announcer')

  if (!shell || !shellSurface || !overviewButton || !searchForm || !topbarSearchRow || !bookingStage || !bookingFrame || !serviceAddedState || !serviceAddedIcon || !serviceAddedTitle || !serviceAddedActions || !servicesOverlay || !servicesDrawer || !servicesList || !serviceChooser || !detailsDialog || !detailsForm || !removeDialog || !removeDialogTitle || !announcer) {
    throw new Error('Не найдены обязательные элементы оболочки командировки v2')
  }

  let params = new URLSearchParams(window.location.search)
  params.delete('_prototypeShell')
  let activeVertical = normalizeVertical(params.get(ACTIVE_VERTICAL_PARAM) || params.get('vertical'))
  let selectedPaymentMethod = ['card', 'business'].includes(params.get('paymentMethod')) ? params.get('paymentMethod') : 'business'
  let services = []
  let overlayTrigger = null
  let chooserTrigger = null
  let overlayCloseTimer = 0
  let overlayMorphTimer = 0
  let lastInteractionWasKeyboard = false
  let overlayOpenedFromKeyboard = false
  let chooserCloseTimer = 0
  let frameRevealTimer = 0
  let frameStateHideTimer = 0
  let framePricePulseTimer = 0
  let frameRevealNotBefore = 0
  let frameLoadToken = 0
  let frameLoadMode = 'ready'
  let overviewAnimationTimer = 0
  let serviceAddedAnimationFrame = 0
  let frameResizeObserver = null
  let frameResizeAnimation = 0
  let frameHeightSyncing = false
  const FRAME_CONTENT_ROOT_SELECTOR = [
    '.avia-search-page',
    '.train-search-page',
    '.hotel-search-page',
    '.avia-workspace',
    '.train-navigation',
    '.hotel-results-layout',
    '.hotel-detail-main',
    '.checkout-main',
    '.passenger-main',
    '.confirmation-main',
    '.rail-seat-main',
    '.rail-passengers-main',
  ].join(', ')

  function isPastTrip() {
    return params.get('tripState') === 'past' || params.get('past') === '1'
  }

  function isAddingServicesLocked() {
    return params.get('cancelled') === '1' || isPastTrip()
  }

  function isOrderPage() {
    return params.get('order') === '1'
  }

  shell.classList.toggle('is-past-trip', isPastTrip())

  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

  function syncBookingStepChrome(pathname = '') {
    const pageName = String(pathname).split('/').pop() || ''
    const isSearchResults = ['avia-search.html', 'train-search.html', 'hotel-search.html'].includes(pageName)
    shell.classList.toggle('is-booking-step', !isSearchResults)
    topbarSearchRow.setAttribute('aria-hidden', 'false')
    return isSearchResults
  }

  function resetEmbeddedFrameScroll() {
    try {
      bookingFrame.contentWindow.scrollTo(0, 0)
      bookingFrame.contentDocument.documentElement.scrollTop = 0
      bookingFrame.contentDocument.body.scrollTop = 0
    } catch {
      // Same-origin is expected. The outer page remains independently scrollable.
    }
  }

  function resetBookingStepScroll() {
    window.scrollTo(0, 0)
    resetEmbeddedFrameScroll()
  }

  function syncBookingFrameHeight() {
    if (frameHeightSyncing) return
    try {
      const frameDocument = bookingFrame.contentDocument
      if (!frameDocument?.documentElement || !frameDocument.body) return
      frameHeightSyncing = true
      const contentRoot = frameDocument.querySelector(FRAME_CONTENT_ROOT_SELECTOR)
        || frameDocument.body.firstElementChild
        || frameDocument.body
      const rootRect = contentRoot.getBoundingClientRect()
      const documentScrollTop = frameDocument.documentElement.scrollTop || frameDocument.body.scrollTop || 0
      const rootTop = rootRect.top + documentScrollTop
      const rootHeight = Math.max(rootRect.height, contentRoot.scrollHeight || 0)
      const rootStyle = bookingFrame.contentWindow.getComputedStyle(contentRoot)
      const marginBottom = Number.parseFloat(rootStyle.marginBottom) || 0
      const frameHeight = Math.min(12000, Math.max(720, Math.ceil(rootTop + rootHeight + marginBottom + 2)))
      const currentHeight = Number.parseFloat(bookingFrame.style.height) || bookingFrame.getBoundingClientRect().height
      if (Math.abs(currentHeight - frameHeight) > 1) bookingFrame.style.height = `${frameHeight}px`
    } catch {
      // Внешний фрейм остаётся с безопасной минимальной высотой.
    } finally {
      frameHeightSyncing = false
    }
  }

  function scheduleBookingFrameHeightSync() {
    if (frameResizeAnimation) return
    frameResizeAnimation = window.requestAnimationFrame(() => {
      frameResizeAnimation = 0
      syncBookingFrameHeight()
    })
  }

  function observeBookingFrameHeight() {
    frameResizeObserver?.disconnect()
    if (frameResizeAnimation) window.cancelAnimationFrame(frameResizeAnimation)
    frameResizeAnimation = 0
    try {
      const frameDocument = bookingFrame.contentDocument
      if (!frameDocument?.body || !window.ResizeObserver) return
      frameResizeObserver = new ResizeObserver(scheduleBookingFrameHeightSync)
      const contentRoot = frameDocument.querySelector(FRAME_CONTENT_ROOT_SELECTOR)
        || frameDocument.body.firstElementChild
        || frameDocument.body
      frameResizeObserver.observe(contentRoot)
      syncBookingFrameHeight()
      window.requestAnimationFrame(scheduleBookingFrameHeightSync)
      window.setTimeout(scheduleBookingFrameHeightSync, 120)
      window.setTimeout(scheduleBookingFrameHeightSync, 520)
    } catch {
      syncBookingFrameHeight()
    }
  }
  let pendingRemovalId = ''
  let activeSearchSegment = ''
  const skippedTimelineSlots = new Set(
    (params.get(NOT_NEEDED_PARAM) || '').split(',').map(value => value.trim()).filter(Boolean),
  )
  const searchUi = {
    kind: '',
    field: '',
    query: '',
    activeOption: 0,
    trigger: null,
    calendarMonth: SEARCH_CALENDAR_TODAY.getMonth(),
    calendarYear: SEARCH_CALENDAR_TODAY.getFullYear(),
    calendarMode: 'range',
    calendarPhase: 'start',
    calendarFirstName: 'depart',
    calendarSecondName: 'return',
    calendarDepart: null,
    calendarReturning: null,
  }

  function normalizeVertical(value) {
    if (value === 'rail') return 'train'
    return Object.hasOwn(VERTICALS, value) ? value : 'avia'
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function stableHash(value) {
    let hash = 2166136261
    for (const character of String(value || '')) {
      hash ^= character.codePointAt(0)
      hash = Math.imul(hash, 16777619)
    }
    return (hash >>> 0).toString(36)
  }

  function stringParam(source, name, fallback = '') {
    const value = source.get(name)?.trim()
    return value || fallback
  }

  function positiveNumber(source, ...names) {
    for (const name of names) {
      const value = Number(String(source.get(name) || '').replace(',', '.'))
      if (Number.isFinite(value) && value > 0) return value
    }
    return 0
  }

  function hasReturn(value = params.get('return')) {
    const normalized = String(value || '').trim()
    return Boolean(normalized) && !/^(?:нет|без|—|-|one[\s-]?way)$/iu.test(normalized)
  }

  function formatMoney(value) {
    return `${new Intl.NumberFormat('ru-RU').format(Math.max(0, Math.round(Number(value) || 0)))} ₽`
  }

  function cityInCase(city, grammaticalCase) {
    return CITY_CASES[city]?.[grammaticalCase] || city
  }

  function serviceWord(count) {
    const value = Math.abs(Number(count) || 0) % 100
    const last = value % 10
    if (value > 10 && value < 20) return 'услуг'
    if (last === 1) return 'услуга'
    if (last >= 2 && last <= 4) return 'услуги'
    return 'услуг'
  }

  function participantSummary(source = params) {
    const explicit = source.get('tripTraveller')?.trim() || source.get('traveller')?.trim()
    if (explicit && explicit !== 'Едете вы') return explicit
    const adults = Math.max(1, Number(source.get('tripAdults') || source.get('adults')) || 1)
    const children = Math.max(0, Number(source.get('tripChildren') || source.get('children')) || 0)
    const adultWord = adults % 10 === 1 && adults % 100 !== 11 ? 'взрослый' : 'взрослых'
    const childWord = children % 10 === 1 && children % 100 !== 11 ? 'ребёнок' : 'детей'
    return `${adults} ${adultWord}${children ? `, ${children} ${childWord}` : ''}`
  }

  function routeTitle(source = params) {
    return stringParam(source, 'title', `${stringParam(source, 'from', 'Москва')} – ${stringParam(source, 'to', 'Санкт-Петербург')}`)
  }

  function shortDate(value) {
    return String(value || '').trim().replace(/\s+/gu, ' ')
  }

  function tripDateRange(source = params) {
    const depart = shortDate(source.get('depart') || source.get('checkin') || '12 окт')
    const returning = shortDate(source.get('return') || source.get('checkout'))
    if (!hasReturn(returning)) return depart
    const first = depart.match(/^(\d{1,2})\s+([а-яё]{3,})/iu)
    const second = returning.match(/^(\d{1,2})\s+([а-яё]{3,})/iu)
    if (first && second && first[2].toLocaleLowerCase('ru') === second[2].toLocaleLowerCase('ru')) {
      return `${first[1]} – ${second[1]} ${second[2]}`
    }
    return `${depart} – ${returning}`
  }

  function dateParts(value, fallback = { day: '14', month: 'окт' }) {
    if (value && typeof value === 'object') {
      return {
        day: String(value.day || fallback.day),
        month: String(value.month || fallback.month).slice(0, 3),
      }
    }
    const match = String(value || '').match(/(\d{1,2})\s+([а-яё]{3,})/iu)
    return match ? { day: match[1], month: match[2].slice(0, 3) } : fallback
  }

  function normalizeTimelineDate(value) {
    const day = Math.max(0, Number.parseInt(value?.day, 10) || 0)
    const month = String(value?.month || '').trim().toLocaleLowerCase('ru').slice(0, 3)
    if (day < 1 || day > 31 || !Object.hasOwn(TIMELINE_MONTH_INDEX, month)) return null
    return { day: String(day), month }
  }

  function parseTimelineDateLabel(value) {
    const normalized = String(value || '').trim()
    const day = normalized.match(/^(\d{1,2})/u)?.[1]
    const month = normalized.match(/[а-яё]+/giu)?.[0]
    return normalizeTimelineDate({ day, month })
  }

  function parseTimelineDateRangeEnd(value, startDate) {
    const normalized = String(value || '').trim()
    const lastPart = normalized.split(/[–—-]/u).at(-1)?.trim() || ''
    const parsed = parseTimelineDateLabel(lastPart)
    if (parsed) return parsed
    const day = lastPart.match(/^(\d{1,2})/u)?.[1]
    return normalizeTimelineDate({ day, month: startDate?.month })
  }

  function timelineDeparture() {
    return normalizeTimelineDate(dateParts(params.get('depart') || params.get('checkin') || '12 окт'))
  }

  function timelineReturn() {
    if (!hasReturn(params.get('return') || params.get('checkout'))) return null
    return normalizeTimelineDate(dateParts(params.get('return') || params.get('checkout')))
  }

  function timelineDateOrdinal(date, departure = timelineDeparture()) {
    const month = TIMELINE_MONTH_INDEX[date.month]
    const startMonth = TIMELINE_MONTH_INDEX[departure?.month] ?? month
    const relativeMonth = (month - startMonth + 12) % 12
    return relativeMonth * 32 + Number(date.day)
  }

  function timelineCalendarDate(date, departure = timelineDeparture()) {
    const normalized = normalizeTimelineDate(date)
    const normalizedDeparture = normalizeTimelineDate(departure)
    if (!normalized || !normalizedDeparture) return null
    const month = TIMELINE_MONTH_INDEX[normalized.month]
    const departureMonth = TIMELINE_MONTH_INDEX[normalizedDeparture.month]
    const year = month < departureMonth ? TIMELINE_BASE_YEAR + 1 : TIMELINE_BASE_YEAR
    return new Date(Date.UTC(year, month, Number(normalized.day)))
  }

  function timelineDateFromCalendar(date) {
    const month = Object.entries(TIMELINE_MONTH_INDEX)
      .find(([key, index]) => index === date.getUTCMonth() && key !== 'мая')?.[0]
    return { day: String(date.getUTCDate()), month: month || 'янв' }
  }

  function timelineCalendarKey(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
  }

  function statusValue(value) {
    return Object.hasOwn(SERVICE_STATUS_LABELS, value) ? value : 'awaiting-payment'
  }

  function isServicePayable(service) {
    return service?.status !== 'paid' && service?.status !== 'cancelled'
  }

  function isServiceSettled(service) {
    return service?.status === 'paid' || service?.status === 'cancelled'
  }

  function railCoachLabel(value) {
    const coach = String(value || '').trim()
    return RAIL_COACH_LABELS[coach.toLocaleLowerCase('ru')] || coach || 'Купе'
  }

  function readJsonArray(value) {
    try {
      const parsed = JSON.parse(value || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  function readRemovedServiceIds(source) {
    return new Set(readJsonArray(source.get(REMOVED_SERVICES_PARAM)).map(String))
  }

  function readSessionSnapshot(key) {
    try {
      const value = JSON.parse(window.sessionStorage.getItem(key) || '{}')
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    } catch {
      return {}
    }
  }

  function passengerFromSnapshots(source, kind) {
    if (source.get('passengerName')) {
      return {
        name: stringParam(source, 'passengerName', 'Иван Иванов'),
        details: stringParam(source, 'passengerDetails', '11.11.1990'),
      }
    }

    const bookingId = kind === 'rail'
      ? stringParam(source, 'railBookingId')
      : stringParam(source, 'bookingId')
    const snapshot = kind === 'rail'
      ? readSessionSnapshot(`${RAIL_BOOKING_STORAGE_PREFIX}${bookingId}`)
      : readSessionSnapshot(AVIA_BOOKING_STORAGE_KEY)
    const passenger = snapshot.passengers?.[0] || snapshot.passenger || snapshot
    const name = [passenger.givenName, passenger.surname].filter(Boolean).join(' ')
      || passenger.name
      || 'Иван Иванов'
    const details = passenger.birthDate
      ? `${passenger.birthDate}${passenger.documentNumber ? ` · *${String(passenger.documentNumber).replace(/\D/gu, '').slice(-4)}` : ''}`
      : '11.11.1990'
    return { name, details }
  }

  function normalizedKind(snapshot) {
    if (snapshot?.booking?.kind === 'flight') return 'avia'
    if (snapshot?.booking?.kind === 'rail') return 'rail'
    if (snapshot?.type === 'lodging' || snapshot?.booking?.hotelName) return 'hotel'
    if (snapshot?.kind === 'avia' || snapshot?.kind === 'rail' || snapshot?.kind === 'hotel') return snapshot.kind
    return ''
  }

  function normalizeSnapshot(snapshot, index) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null
    const kind = normalizedKind(snapshot)
    if (!kind) return null
    const booking = snapshot.booking && typeof snapshot.booking === 'object' ? { ...snapshot.booking } : {}
    const sourceSectionId = String(snapshot.sourceSectionId || snapshot.source || (kind === 'hotel' ? 'lodging' : 'outbound'))
    const id = String(snapshot.serviceId || snapshot.id || `${kind}:${stableHash(JSON.stringify([booking, snapshot.title, snapshot.price, index]))}`)
    const fallbackDate = sourceSectionId === 'return'
      ? params.get('return')
      : kind === 'hotel' ? params.get('checkin') || params.get('depart') : params.get('depart')
    const date = dateParts(snapshot.date || booking.dateLabel || booking.dateRange || fallbackDate)
    const passenger = booking.passenger && typeof booking.passenger === 'object'
      ? booking.passenger
      : passengerFromSnapshots(params, kind === 'rail' ? 'rail' : 'avia')
    if (kind === 'rail') booking.coach = railCoachLabel(booking.coach)
    return {
      id,
      kind,
      sourceSectionId,
      date,
      title: String(snapshot.title || ''),
      status: statusValue(snapshot.status),
      price: Math.max(0, Number(snapshot.price) || 0),
      booking: { ...booking, passenger },
    }
  }

  function queryFlightServices(source) {
    const legacy = source.get('flightAdded') === '1'
    const outboundAdded = legacy || source.get('flightOutboundAdded') === '1'
    const returningAdded = source.get('flightReturnAdded') === '1'
      || (legacy && source.get('flightScope') !== 'oneway' && hasReturn(source.get('flightReturnDate') || source.get('return')))
    if (!outboundAdded && !returningAdded) return []

    const bookingId = stringParam(source, 'bookingId', `legacy-${stableHash(JSON.stringify([
      source.get('flightNumber'),
      source.get('returnFlightNumber'),
      source.get('depart'),
    ]))}`)
    const total = positiveNumber(source, 'flightTotalPrice', 'flightPrice')
    const explicitOutbound = positiveNumber(source, 'flightOutboundTotal')
    const explicitReturn = positiveNumber(source, 'flightReturnTotal')
    const splitTotal = outboundAdded && returningAdded && !explicitOutbound && !explicitReturn
    const passenger = passengerFromSnapshots(source, 'avia')
    const result = []
    if (outboundAdded && source.get('flightOutboundRemoved') !== '1' && source.get('outboundRemoved') !== '1') {
      const id = `flight:${stringParam(source, 'flightOutboundBookingId', bookingId)}:outbound`
      result.push({
        id,
        kind: 'avia',
        sourceSectionId: 'outbound',
        date: dateParts(source.get('flightOutboundDate') || source.get('depart')),
        status: statusValue(source.get('flightOutboundStatus') || source.get('flightStatus')),
        price: explicitOutbound || (splitTotal ? Math.round(total / 2) : total),
        booking: {
          kind: 'flight',
          airline: stringParam(source, 'flightAirline', 'Аэрофлот'),
          flightNumber: stringParam(source, 'flightNumber', 'SU 6026'),
          departTime: stringParam(source, 'flightDepartTime', '05:30'),
          arrivalTime: stringParam(source, 'flightArrivalTime', '09:35'),
          duration: stringParam(source, 'flightDuration', '4 ч 5 мин'),
          fromCode: stringParam(source, 'flightFromCode', 'SVO'),
          toCode: stringParam(source, 'flightToCode', 'LED'),
          fromCity: stringParam(source, 'from', 'Москва'),
          toCity: stringParam(source, 'to', 'Санкт-Петербург'),
          fromAirport: stringParam(source, 'flightFromAirport', 'Шереметьево'),
          toAirport: stringParam(source, 'flightToAirport', 'Пулково'),
          tariff: stringParam(source, 'flightTariffName', 'Эконом'),
          passenger,
        },
      })
    }
    if (returningAdded && source.get('flightReturnRemoved') !== '1' && source.get('returnRemoved') !== '1') {
      const id = `flight:${stringParam(source, 'flightReturnBookingId', bookingId)}:return`
      result.push({
        id,
        kind: 'avia',
        sourceSectionId: 'return',
        date: dateParts(source.get('flightReturnDate') || source.get('return')),
        status: statusValue(source.get('flightReturnStatus') || source.get('flightStatus')),
        price: explicitReturn || (splitTotal ? total - Math.round(total / 2) : 0),
        booking: {
          kind: 'flight',
          airline: stringParam(source, 'returnAirline', stringParam(source, 'flightAirline', 'Аэрофлот')),
          flightNumber: stringParam(source, 'returnFlightNumber', 'SU 6027'),
          departTime: stringParam(source, 'returnDepartTime', '18:30'),
          arrivalTime: stringParam(source, 'returnArrivalTime', '20:40'),
          duration: stringParam(source, 'returnDuration', '2 ч 10 мин'),
          fromCode: stringParam(source, 'returnFromCode', stringParam(source, 'flightToCode', 'LED')),
          toCode: stringParam(source, 'returnToCode', stringParam(source, 'flightFromCode', 'SVO')),
          fromCity: stringParam(source, 'to', 'Санкт-Петербург'),
          toCity: stringParam(source, 'from', 'Москва'),
          fromAirport: stringParam(source, 'returnFromAirport', 'Пулково'),
          toAirport: stringParam(source, 'returnToAirport', 'Шереметьево'),
          tariff: stringParam(source, 'flightTariffName', 'Эконом'),
          passenger,
        },
      })
    }
    return result
  }

  function railService(source, segment, bookingId, total) {
    const prefix = segment === 'return' ? 'railReturn' : 'railOutbound'
    const isReturn = segment === 'return'
    const passenger = passengerFromSnapshots(source, 'rail')
    const fromCity = isReturn ? stringParam(source, 'to', 'Санкт-Петербург') : stringParam(source, 'from', 'Москва')
    const toCity = isReturn ? stringParam(source, 'from', 'Москва') : stringParam(source, 'to', 'Санкт-Петербург')
    return {
      id: `rail:${stringParam(source, `${prefix}BookingId`, bookingId)}:${segment}`,
      kind: 'rail',
      sourceSectionId: segment,
      date: dateParts(source.get(`${prefix}Date`) || source.get(isReturn ? 'return' : 'depart')),
      status: statusValue(source.get(`${prefix}Status`) || source.get('railStatus')),
      price: total,
      booking: {
        kind: 'rail',
        carrier: stringParam(source, `${prefix}Carrier`, 'РЖД/ФПК'),
        trainNumber: stringParam(source, `${prefix}TrainNumber`, '770А'),
        brand: stringParam(source, `${prefix}Brand`),
        departTime: stringParam(source, `${prefix}DepartTime`, '00:25'),
        arrivalTime: stringParam(source, `${prefix}ArrivalTime`, '09:26'),
        duration: stringParam(source, `${prefix}Duration`, '9 ч 1 мин'),
        fromCity,
        toCity,
        fromStation: stringParam(source, `${prefix}FromStation`, isReturn ? 'Московский вокзал' : 'Ленинградский вокзал'),
        toStation: stringParam(source, `${prefix}ToStation`, isReturn ? 'Ленинградский вокзал' : 'Московский вокзал'),
        coach: railCoachLabel(stringParam(source, `${prefix}Coach`, 'Купе')),
        seats: stringParam(source, `${prefix}Seats`),
        passenger,
      },
    }
  }

  function queryRailServices(source) {
    const legacy = source.get('railAdded') === '1'
    const outboundAdded = legacy || source.get('railOutboundAdded') === '1'
    const returningAdded = source.get('railReturnAdded') === '1'
      || (legacy && source.get('railScope') === 'roundtrip' && hasReturn(source.get('railReturnDate') || source.get('return')))
    if (!outboundAdded && !returningAdded) return []

    const bookingId = stringParam(source, 'railBookingId', `legacy-${stableHash(JSON.stringify([
      source.get('railOutboundTrainNumber'),
      source.get('railReturnTrainNumber'),
      source.get('depart'),
    ]))}`)
    const result = []
    if (outboundAdded && source.get('railOutboundRemoved') !== '1' && source.get('outboundRemoved') !== '1') {
      const total = positiveNumber(source, 'railOutboundTotal', 'railTotalPrice')
      if (source.get('railOutboundTrainNumber') || source.get('railOutboundTrainId') || total) {
        result.push(railService(source, 'outbound', bookingId, total))
      }
    }
    if (returningAdded && source.get('railReturnRemoved') !== '1' && source.get('returnRemoved') !== '1') {
      const total = positiveNumber(source, 'railReturnTotal')
      if (source.get('railReturnTrainNumber') || source.get('railReturnTrainId') || total) {
        result.push(railService(source, 'return', bookingId, total))
      }
    }
    return result
  }

  function queryHotelServices(source) {
    if (source.get('lodgingRemoved') === '1') return []
    const name = source.get('hotelName')?.trim()
    const price = positiveNumber(source, 'hotelPrice')
    const bookingId = stringParam(source, 'hotelBookingId')
    if (!name || (!price && !bookingId)) return []
    const id = `hotel:${bookingId || stableHash(JSON.stringify([name, source.get('checkin'), source.get('checkout'), price]))}`
    const hotelId = stringParam(source, 'hotel', 'azimut')
    return [{
      id,
      kind: 'hotel',
      sourceSectionId: 'lodging',
      date: dateParts(source.get('checkin') || source.get('depart')),
      status: statusValue(source.get('hotelStatus')),
      price,
      booking: {
        kind: 'hotel',
        hotelName: name,
        address: stringParam(source, 'hotelAddress', `${stringParam(source, 'to', 'Санкт-Петербург')}, адрес отеля`),
        roomName: stringParam(source, 'room', 'Двухместный номер «Премиум»'),
        cancellation: /платн/iu.test(stringParam(source, 'tariff')) ? 'Платная отмена' : 'Бесплатная отмена',
        meal: /без питания/iu.test(stringParam(source, 'tariff')) ? 'Без питания' : 'Завтрак включён',
        image: hotelId === 'azimut' ? './assets/hotel-detail/hero-main.png' : './assets/hotels/hotel-exterior.png',
        dateRange: `${stringParam(source, 'checkin', stringParam(source, 'depart', '12 окт'))} – ${stringParam(source, 'checkout', stringParam(source, 'return', '14 окт'))}`,
        endDate: dateParts(source.get('checkout') || source.get('return')),
        passenger: passengerFromSnapshots(source, 'avia'),
      },
    }]
  }

  function buildServices(source = params) {
    const removed = readRemovedServiceIds(source)
    const candidates = [
      ...readJsonArray(source.get(TRIP_SERVICES_PARAM)).map(normalizeSnapshot).filter(Boolean),
      ...queryFlightServices(source),
      ...queryRailServices(source),
      ...queryHotelServices(source),
    ]
    const ids = new Set()
    const sourceOrder = Object.freeze({ outbound: 0, lodging: 1, return: 2 })
    return candidates.filter(service => {
      if (!service || removed.has(service.id)) return false
      if (service.kind === 'avia' && service.sourceSectionId === 'outbound' && (source.get('flightOutboundRemoved') === '1' || source.get('outboundRemoved') === '1')) return false
      if (service.kind === 'avia' && service.sourceSectionId === 'return' && (source.get('flightReturnRemoved') === '1' || source.get('returnRemoved') === '1')) return false
      if (service.kind === 'rail' && service.sourceSectionId === 'outbound' && (source.get('railOutboundRemoved') === '1' || source.get('outboundRemoved') === '1')) return false
      if (service.kind === 'rail' && service.sourceSectionId === 'return' && (source.get('railReturnRemoved') === '1' || source.get('returnRemoved') === '1')) return false
      if (service.kind === 'hotel' && source.get('lodgingRemoved') === '1') return false
      if (ids.has(service.id)) return false
      ids.add(service.id)
      return true
    }).sort((first, second) => (
      (sourceOrder[first.sourceSectionId] ?? 3) - (sourceOrder[second.sourceSectionId] ?? 3)
    ))
  }

  function serviceSnapshot(service) {
    return {
      version: 2,
      serviceId: service.id,
      sourceSectionId: service.sourceSectionId,
      type: service.kind === 'hotel' ? 'lodging' : 'transport',
      state: 'filled',
      date: { ...service.date },
      title: serviceDisplayTitle(service),
      status: service.status,
      price: service.price,
      booking: { ...service.booking, kind: service.kind === 'avia' ? 'flight' : service.kind },
    }
  }

  function syncServicesParam() {
    if (services.length) params.set(TRIP_SERVICES_PARAM, JSON.stringify(services.map(serviceSnapshot)))
    else params.delete(TRIP_SERVICES_PARAM)
  }

  function serviceDisplayTitle(service) {
    const booking = service.booking || {}
    if (service.kind === 'hotel') {
      const city = booking.toCity || stringParam(params, 'to', 'Санкт-Петербург')
      return `Жильё в ${cityInCase(city, 'prepositional')}`
    }
    const noun = service.kind === 'rail' ? 'Поезд' : 'Самолёт'
    const city = booking.toCity || (service.sourceSectionId === 'return' ? stringParam(params, 'from', 'Москву') : stringParam(params, 'to', 'Санкт-Петербург'))
    return `${noun} в ${cityInCase(city, 'accusative')}`
  }

  function serviceCountLabel() {
    const activeCount = services.filter(service => service.status !== 'cancelled').length
    return `${activeCount} ${serviceWord(activeCount)}`
  }

  function serviceTimelineDate(service, departure, returning) {
    return normalizeTimelineDate(service?.date)
      || parseTimelineDateLabel(service?.booking?.dateLabel)
      || parseTimelineDateLabel(service?.booking?.dateRange)
      || (service?.sourceSectionId === 'return' ? returning : departure)
  }

  function timelineSlotDefinitions(departure, returning) {
    const origin = stringParam(params, 'from', 'Москва')
    const destination = stringParam(params, 'to', 'Санкт-Петербург')
    const slots = [
      {
        id: 'outbound',
        sourceSectionId: 'outbound',
        kind: 'transport',
        date: departure,
        title: `На чём поедем в ${cityInCase(destination, 'accusative')}`,
      },
      {
        id: 'lodging',
        sourceSectionId: 'lodging',
        kind: 'hotel',
        date: departure,
        title: `Жильё в ${cityInCase(destination, 'prepositional')}`,
      },
    ]
    if (returning && hasReturn(params.get('return'))) {
      slots.push({
        id: 'return',
        sourceSectionId: 'return',
        kind: 'transport',
        date: returning,
        title: `На чём вернёмся в ${cityInCase(origin, 'accusative')}`,
      })
    }
    return slots
  }

  function rebuildTimelineFreeDays(items, departure, returning) {
    if (!departure || !returning) return items
    const hotels = services.filter(service => service.kind === 'hotel' && service.status !== 'cancelled')
    const tripStart = timelineCalendarDate(departure, departure)
    const tripEnd = timelineCalendarDate(returning, departure)
    if (!tripStart || !tripEnd || tripEnd < tripStart) return items

    const occupiedDays = new Set()
    items.forEach(item => {
      const calendarDate = timelineCalendarDate(item.actualDate, departure)
      if (calendarDate) occupiedDays.add(timelineCalendarKey(calendarDate))
    })

    const lodgingIntervals = hotels.map(service => {
      const startDate = serviceTimelineDate(service, departure, returning)
      const endDate = normalizeTimelineDate(service.booking?.endDate)
        || parseTimelineDateRangeEnd(service.booking?.dateRange, startDate)
        || normalizeTimelineDate(dateParts(params.get('checkout') || params.get('return')))
      const start = timelineCalendarDate(startDate, departure)
      const end = timelineCalendarDate(endDate, departure)
      return start && end && end > start ? { start, end } : null
    }).filter(Boolean)
    if (!lodgingIntervals.length) return items

    const destination = stringParam(params, 'to', 'Санкт-Петербург')
    const freeIntervals = []
    const cursor = new Date(tripStart)
    let checkedDays = 0
    while (cursor <= tripEnd && checkedDays < 370) {
      const dayKey = timelineCalendarKey(cursor)
      const coveredByLodging = lodgingIntervals.some(interval => cursor >= interval.start && cursor <= interval.end)
      if (coveredByLodging || occupiedDays.has(dayKey)) {
        cursor.setUTCDate(cursor.getUTCDate() + 1)
        checkedDays += 1
        continue
      }

      const intervalStart = new Date(cursor)
      while (cursor <= tripEnd && checkedDays < 370) {
        const cursorKey = timelineCalendarKey(cursor)
        const cursorCovered = lodgingIntervals.some(interval => cursor >= interval.start && cursor <= interval.end)
        if (cursorCovered || occupiedDays.has(cursorKey)) break
        cursor.setUTCDate(cursor.getUTCDate() + 1)
        checkedDays += 1
      }
      const boundary = cursor <= tripEnd ? new Date(cursor) : new Date(tripEnd)
      const date = timelineDateFromCalendar(intervalStart)
      const endDate = timelineDateFromCalendar(boundary)
      freeIntervals.push({
        type: 'free-interval',
        id: `free-interval-${timelineCalendarKey(intervalStart)}`,
        actualDate: date,
        date,
        endDate,
        title: `Свободно до ${endDate.day} ${TIMELINE_MONTH_NAMES[endDate.month] || endDate.month}`,
        city: destination,
        order: items.length + freeIntervals.length,
      })
    }
    return [...items, ...freeIntervals]
  }

  function buildTimelineItems() {
    const departure = timelineDeparture()
    const returning = timelineReturn()
    const slots = timelineSlotDefinitions(departure, returning)
    const slotIds = new Set(slots.map(slot => slot.sourceSectionId))
    const items = []
    let order = 0

    slots.forEach(slot => {
      const related = services.filter(service => service.sourceSectionId === slot.sourceSectionId)
      if (related.length) {
        related.forEach(service => {
          items.push({
            type: 'service',
            id: service.id,
            service,
            actualDate: serviceTimelineDate(service, departure, returning),
            order: order++,
          })
          if (service.kind === 'hotel' && service.status !== 'cancelled') {
            const checkoutDate = normalizeTimelineDate(service.booking?.endDate)
              || parseTimelineDateRangeEnd(service.booking?.dateRange, serviceTimelineDate(service, departure, returning))
              || normalizeTimelineDate(dateParts(params.get('checkout') || params.get('return')))
            if (checkoutDate) {
              items.push({
                type: 'hotel-checkout',
                id: `hotel-checkout-${stableHash(service.id)}`,
                checkoutFor: service.id,
                actualDate: checkoutDate,
                order: order++,
              })
            }
          }
        })
      }
      if (!related.some(service => service.status !== 'cancelled')) {
        items.push({
          type: 'empty',
          ...slot,
          reopened: related.some(service => service.status === 'cancelled'),
          actualDate: slot.date,
          order: order++,
        })
      }
    })

    services
      .filter(service => !slotIds.has(service.sourceSectionId))
      .forEach(service => {
        items.push({
          type: 'service',
          id: service.id,
          service,
          actualDate: serviceTimelineDate(service, departure, returning),
          order: order++,
        })
        if (service.kind === 'hotel') {
          const checkoutDate = normalizeTimelineDate(service.booking?.endDate)
            || parseTimelineDateRangeEnd(service.booking?.dateRange, serviceTimelineDate(service, departure, returning))
            || normalizeTimelineDate(dateParts(params.get('checkout') || params.get('return')))
          if (checkoutDate) {
            items.push({
              type: 'hotel-checkout',
              id: `hotel-checkout-${stableHash(service.id)}`,
              checkoutFor: service.id,
              actualDate: checkoutDate,
              order: order++,
            })
          }
        }
      })

    const ordered = rebuildTimelineFreeDays(items, departure, returning)
      .sort((first, second) => {
        if (!first.actualDate && !second.actualDate) return first.order - second.order
        if (!first.actualDate) return 1
        if (!second.actualDate) return -1
        return timelineDateOrdinal(first.actualDate, departure) - timelineDateOrdinal(second.actualDate, departure)
          || first.order - second.order
      })

    const checkoutsByService = new Map()
    ordered.filter(item => item.type === 'hotel-checkout' && item.checkoutFor).forEach(item => {
      checkoutsByService.set(item.checkoutFor, item)
    })
    const grouped = ordered
      .filter(item => item.type !== 'hotel-checkout')
      .flatMap(item => [item, ...(item.type === 'service' && item.service?.kind === 'hotel' && checkoutsByService.get(item.service.id) ? [checkoutsByService.get(item.service.id)] : [])])

    let previousDateKey = ''
    const marked = grouped.map(item => {
      const dateKey = item.actualDate ? `${item.actualDate.month}-${item.actualDate.day}` : ''
      const marker = dateKey && dateKey === previousDateKey ? 'milestone' : 'date'
      previousDateKey = dateKey
      return { ...item, marker }
    })

    // Empty service selectors are useful between populated stages, but a
    // trailing selector creates a misleading "add something at the end"
    // card. Keep the empty states when the timeline is otherwise blank and
    // trim only selectors that come after the last meaningful item.
    const lastMeaningfulIndex = marked.reduce(
      (lastIndex, item, index) => item.type === 'empty' ? lastIndex : index,
      -1,
    )
    if (lastMeaningfulIndex < 0) return marked
    return marked.filter((item, index) => item.type !== 'empty' || item.reopened || index <= lastMeaningfulIndex)
  }

  function replaceParentUrl() {
    syncServicesParam()
    params.set(ACTIVE_VERTICAL_PARAM, activeVertical)
    params.delete('embed')
    const target = new URL('./trip.html', window.location.href)
    target.search = params.toString()
    window.history.replaceState(window.history.state, '', target)
  }

  function searchPopoverLayer() {
    return searchForm.querySelector('#trip-search-popover-layer')
  }

  function closeSearchPopover({ restoreFocus = false } = {}) {
    const trigger = searchUi.trigger
    searchUi.kind = ''
    searchUi.field = ''
    searchUi.query = ''
    searchUi.trigger = null
    const layer = searchPopoverLayer()
    if (layer) layer.innerHTML = ''
    searchForm.querySelectorAll('[aria-expanded="true"]').forEach(element => element.setAttribute('aria-expanded', 'false'))
    searchForm.querySelectorAll('.is-open').forEach(element => element.classList.remove('is-open'))
    if (restoreFocus && trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
  }

  function searchSuggestionSource() {
    return activeVertical === 'avia' ? SEARCH_AVIA_SUGGESTIONS : SEARCH_CITY_SUGGESTIONS
  }

  function currentSearchSuggestions() {
    const query = String(searchUi.query || '').trim().toLocaleLowerCase('ru')
    if (!query) return searchSuggestionSource()
    return searchSuggestionSource().filter(item => `${item.label} ${item.subtitle}`.toLocaleLowerCase('ru').includes(query))
  }

  function positionSearchPopover(popover, anchor) {
    if (!popover || !anchor) return
    const formRect = searchForm.getBoundingClientRect()
    const anchorRect = anchor.getBoundingClientRect()
    const popoverRect = popover.getBoundingClientRect()
    const maxLeft = Math.max(0, formRect.width - popoverRect.width)
    const requestedLeft = anchorRect.left - formRect.left
    popover.style.left = `${Math.max(0, Math.min(requestedLeft, maxLeft))}px`
    popover.style.top = `${anchorRect.bottom - formRect.top + 8}px`
  }

  function renderSearchSuggestions() {
    const layer = searchPopoverLayer()
    const input = searchForm.querySelector(`[data-trip-suggest-field="${searchUi.field}"]`)
    if (!layer || !input || searchUi.kind !== 'suggest') return
    const suggestions = currentSearchSuggestions()
    searchUi.activeOption = Math.min(searchUi.activeOption, Math.max(0, suggestions.length - 1))
    const body = suggestions.length
      ? suggestions.map((item, index) => `
          <button class="suggest-option${index === searchUi.activeOption ? ' is-active' : ''}" id="trip-search-suggestion-${index}" type="button" role="option" aria-selected="${index === searchUi.activeOption}" data-search-action="select-suggestion" data-suggestion-index="${index}">
            <span class="suggest-icon"><img src="./assets/icons/${escapeHtml(item.icon)}.svg" alt=""></span>
            <span class="suggest-copy"><strong>${escapeHtml(item.label)}</strong>${item.subtitle ? `<small>${escapeHtml(item.subtitle)}</small>` : ''}</span>
          </button>`).join('')
      : '<div class="suggest-empty">Ничего не найдено</div>'
    layer.innerHTML = `<div class="popover suggest-popover trip-search-suggest-popover" id="trip-search-suggestions" role="listbox" aria-label="Варианты направления">${body}</div>`
    input.setAttribute('aria-expanded', 'true')
    input.setAttribute('aria-activedescendant', suggestions.length ? `trip-search-suggestion-${searchUi.activeOption}` : '')
    input.closest('.trip-search-field')?.classList.add('is-open')
    positionSearchPopover(layer.firstElementChild, input.closest('.trip-search-field'))
  }

  function openSearchSuggestions(input) {
    if (!input) return
    closeSearchPopover()
    searchUi.kind = 'suggest'
    searchUi.field = input.dataset.tripSuggestField || ''
    searchUi.query = ''
    const currentValue = input.value.trim().toLocaleLowerCase('ru')
    const currentIndex = searchSuggestionSource().findIndex(item => item.label.toLocaleLowerCase('ru') === currentValue)
    searchUi.activeOption = Math.max(0, currentIndex)
    searchUi.trigger = input
    renderSearchSuggestions()
  }

  function selectSearchSuggestion(index) {
    const item = currentSearchSuggestions()[index]
    const field = searchUi.field
    const input = searchForm.querySelector(`[data-trip-suggest-field="${field}"]`)
    if (!item || !input) return
    input.value = item.label
    closeSearchPopover()
    announceMessage(`${item.label} выбрано`)
    if (field === 'from') {
      window.requestAnimationFrame(() => searchForm.querySelector('[data-trip-suggest-field="to"]')?.focus())
    }
  }

  function searchField(name, label, value, { plain = false } = {}) {
    return `
      <label class="trip-search-field${plain ? ' trip-search-field--plain' : ''}">
        ${plain ? '' : `<span>${escapeHtml(label)}</span>`}
        <input id="trip-search-${escapeHtml(name)}" name="${escapeHtml(name)}" type="search" role="combobox" aria-autocomplete="list" aria-controls="trip-search-suggestions" aria-expanded="false" value="${escapeHtml(value)}" autocomplete="off" data-trip-suggest-field="${escapeHtml(name)}"${plain ? ` aria-label="${escapeHtml(label)}"` : ''}>
      </label>`
  }

  function searchDateField(item) {
    const displayValue = item.oneWay ? 'Только туда' : item.value || 'Выбрать'
    return `
      <div class="trip-search-date">
        <button class="trip-search-date__button${item.value || item.oneWay ? ' has-value' : ''}" type="button" data-trip-date-field="${escapeHtml(item.name)}" aria-haspopup="dialog" aria-controls="trip-search-calendar" aria-expanded="false">
          <span class="trip-search-date__copy"><span>${escapeHtml(item.label)}</span><strong data-trip-date-value>${escapeHtml(displayValue)}</strong></span>
        </button>
        <input type="hidden" name="${escapeHtml(item.name)}" value="${escapeHtml(item.value)}">
      </div>`
  }

  function searchDates(first, second) {
    return `
      <div class="trip-search-dates">
        ${searchDateField(first)}
        <span class="trip-search-dates__divider" aria-hidden="true"></span>
        ${searchDateField(second)}
      </div>`
  }

  function parseSearchCalendarDate(value, year = TIMELINE_BASE_YEAR) {
    const match = String(value || '').toLocaleLowerCase('ru').match(/(\d{1,2})\s+([а-яё]+)/u)
    if (!match) return null
    const monthKey = Object.keys(TIMELINE_MONTH_INDEX).find(key => match[2].startsWith(key))
    if (!monthKey) return null
    const month = TIMELINE_MONTH_INDEX[monthKey]
    const inferredYear = month < SEARCH_CALENDAR_TODAY.getMonth() ? year + 1 : year
    const date = new Date(inferredYear, month, Number(match[1]))
    return Number.isNaN(date.getTime()) ? null : date
  }

  function formatSearchCalendarDate(date) {
    return `${date.getDate()} ${SEARCH_MONTH_SHORT[date.getMonth()]}`
  }

  function isSameSearchCalendarDate(first, second) {
    return Boolean(first && second
      && first.getFullYear() === second.getFullYear()
      && first.getMonth() === second.getMonth()
      && first.getDate() === second.getDate())
  }

  function syncSearchCalendarFromInputs() {
    const firstInput = searchForm.elements.namedItem(searchUi.calendarFirstName)
    const secondInput = searchForm.elements.namedItem(searchUi.calendarSecondName)
    const departing = parseSearchCalendarDate(firstInput?.value)
    const returning = parseSearchCalendarDate(secondInput?.value)
    if (departing && returning && returning < departing) returning.setFullYear(returning.getFullYear() + 1)
    searchUi.calendarDepart = departing
    searchUi.calendarReturning = returning
  }

  function renderSearchCalendarMonths() {
    const months = []
    for (let offset = 0; offset < 13; offset += 1) {
      const date = new Date(SEARCH_CALENDAR_MINIMUM_MONTH.getFullYear(), SEARCH_CALENDAR_MINIMUM_MONTH.getMonth() + offset, 1)
      const active = date.getMonth() === searchUi.calendarMonth && date.getFullYear() === searchUi.calendarYear
      const showYear = date.getMonth() === 0
      months.push(`
        <button class="calendar-month${active ? ' is-active' : ''}" type="button" data-search-action="change-month" data-month="${date.getMonth()}" data-year="${date.getFullYear()}"${active ? ' aria-current="date"' : ''}>
          ${escapeHtml(SEARCH_MONTH_NAMES[date.getMonth()])}${showYear ? ` ${date.getFullYear()}` : ''}
        </button>`)
    }
    return months.join('')
  }

  function renderSearchCalendarDays() {
    const first = new Date(searchUi.calendarYear, searchUi.calendarMonth, 1)
    const daysInMonth = new Date(searchUi.calendarYear, searchUi.calendarMonth + 1, 0).getDate()
    const mondayIndex = (first.getDay() + 6) % 7
    const cells = []
    for (let index = 0; index < mondayIndex; index += 1) cells.push('<span class="calendar-day is-muted" aria-hidden="true"></span>')
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(searchUi.calendarYear, searchUi.calendarMonth, day)
      const weekday = (date.getDay() + 6) % 7
      const isStart = isSameSearchCalendarDate(date, searchUi.calendarDepart)
      const isEnd = isSameSearchCalendarDate(date, searchUi.calendarReturning)
      const isInRange = Boolean(searchUi.calendarDepart && searchUi.calendarReturning && date > searchUi.calendarDepart && date < searchUi.calendarReturning)
      const disabled = date < SEARCH_CALENDAR_TODAY
      const classes = [
        'calendar-day',
        weekday >= 5 ? 'is-weekend' : '',
        isInRange ? 'is-in-range' : '',
        isStart ? 'is-range-start is-selected' : '',
        isEnd ? 'is-range-end is-selected' : '',
      ].filter(Boolean).join(' ')
      cells.push(`<button class="${classes}" type="button" data-search-action="select-date" data-day="${day}" aria-label="${day} ${SEARCH_MONTH_NAMES[searchUi.calendarMonth].toLocaleLowerCase('ru')} ${searchUi.calendarYear}" aria-selected="${isStart || isEnd}" aria-disabled="${disabled}"${disabled ? ' disabled' : ''}>${day}</button>`)
    }
    return cells.join('')
  }

  function renderSearchCalendar() {
    const layer = searchPopoverLayer()
    const dates = searchForm.querySelector('.trip-search-dates')
    if (!layer || !dates || searchUi.kind !== 'calendar') return
    const canChooseOneWay = activeVertical === 'avia' || activeVertical === 'train'
    layer.innerHTML = `
      <div class="popover calendar-popover trip-search-calendar-popover" id="trip-search-calendar" role="dialog" aria-label="Выбор дат">
        <div class="calendar-months">${renderSearchCalendarMonths()}</div>
        <div class="calendar-main">
          <div class="calendar-weekdays" aria-hidden="true"><span>пн</span><span>вт</span><span>ср</span><span>чт</span><span>пт</span><span>сб</span><span>вс</span></div>
          ${canChooseOneWay ? '<button class="calendar-one-way" type="button" data-search-action="one-way">Только туда</button>' : ''}
          <h3 class="calendar-title">${escapeHtml(SEARCH_MONTH_NAMES[searchUi.calendarMonth])} ${searchUi.calendarYear}</h3>
          <div class="calendar-days" role="grid" aria-label="${escapeHtml(SEARCH_MONTH_NAMES[searchUi.calendarMonth])} ${searchUi.calendarYear}">${renderSearchCalendarDays()}</div>
        </div>
      </div>`
    searchForm.querySelectorAll('[data-trip-date-field]').forEach(button => {
      button.setAttribute('aria-expanded', String(button.dataset.tripDateField === searchUi.field))
    })
    dates.classList.add('is-open')
    positionSearchPopover(layer.firstElementChild, dates)
  }

  function openSearchCalendar(field, trigger) {
    closeSearchPopover()
    searchUi.kind = 'calendar'
    searchUi.field = field
    searchUi.trigger = trigger
    searchUi.calendarFirstName = activeVertical === 'hotel' ? 'checkin' : 'depart'
    searchUi.calendarSecondName = activeVertical === 'hotel' ? 'checkout' : 'return'
    syncSearchCalendarFromInputs()
    searchUi.calendarMode = 'range'
    searchUi.calendarPhase = field === searchUi.calendarSecondName && searchUi.calendarDepart ? 'end' : 'start'
    const selectedDate = field === searchUi.calendarSecondName
      ? searchUi.calendarReturning || searchUi.calendarDepart
      : searchUi.calendarDepart || searchUi.calendarReturning
    const visibleDate = selectedDate && selectedDate >= SEARCH_CALENDAR_TODAY ? selectedDate : SEARCH_CALENDAR_TODAY
    searchUi.calendarMonth = visibleDate.getMonth()
    searchUi.calendarYear = visibleDate.getFullYear()
    renderSearchCalendar()
  }

  function setSearchDateValue(name, date, { oneWay = false } = {}) {
    const input = searchForm.elements.namedItem(name)
    const button = searchForm.querySelector(`[data-trip-date-field="${name}"]`)
    const value = date ? formatSearchCalendarDate(date) : ''
    if (input) input.value = value
    const display = button?.querySelector('[data-trip-date-value]')
    if (display) display.textContent = oneWay ? 'Только туда' : value || 'Выбрать'
    button?.classList.toggle('has-value', Boolean(value) || oneWay)
  }

  function chooseSearchCalendarDate(day) {
    if (searchUi.kind !== 'calendar' || !Number.isInteger(day)) return
    const selectedDate = new Date(searchUi.calendarYear, searchUi.calendarMonth, day)
    if (selectedDate < SEARCH_CALENDAR_TODAY) return
    if (searchUi.calendarPhase === 'start') {
      searchUi.calendarDepart = selectedDate
      searchUi.calendarReturning = null
      setSearchDateValue(searchUi.calendarFirstName, selectedDate)
      setSearchDateValue(searchUi.calendarSecondName, null)
      searchUi.calendarPhase = 'end'
      searchUi.field = searchUi.calendarSecondName
      renderSearchCalendar()
      announceMessage('Дата начала выбрана. Выберите дату окончания')
      return
    }
    if (!searchUi.calendarDepart || selectedDate < searchUi.calendarDepart) {
      searchUi.calendarDepart = selectedDate
      searchUi.calendarReturning = null
      setSearchDateValue(searchUi.calendarFirstName, selectedDate)
      setSearchDateValue(searchUi.calendarSecondName, null)
      searchUi.field = searchUi.calendarSecondName
      renderSearchCalendar()
      announceMessage('Новая дата начала выбрана. Выберите дату окончания')
      return
    }
    searchUi.calendarReturning = selectedDate
    setSearchDateValue(searchUi.calendarSecondName, selectedDate)
    closeSearchPopover({ restoreFocus: true })
    announceMessage('Диапазон дат выбран')
  }

  function selectSearchOneWay() {
    if (activeVertical !== 'avia' && activeVertical !== 'train') return
    searchUi.calendarReturning = null
    setSearchDateValue(searchUi.calendarSecondName, null, { oneWay: true })
    closeSearchPopover({ restoreFocus: true })
    announceMessage('Выбран билет только туда')
  }

  function renderSearchForm() {
    closeSearchPopover()
    const popoverLayer = '<div class="trip-search-popover-layer" id="trip-search-popover-layer"></div>'
    if (activeVertical === 'hotel') {
      searchForm.dataset.vertical = 'hotel'
      searchForm.innerHTML = [
        `<div class="trip-search-route-fields trip-search-route-fields--hotel">${searchField('to', 'Город или отель', stringParam(params, 'to', stringParam(params, 'city', 'Санкт-Петербург')), { plain: true })}</div>`,
        searchDates(
          { name: 'checkin', label: 'Заезд', value: stringParam(params, 'checkin', stringParam(params, 'depart', '12 окт')) },
          { name: 'checkout', label: 'Выезд', value: stringParam(params, 'checkout', stringParam(params, 'return', '14 окт')) },
        ),
        '<button class="trip-search-submit" type="submit">Найти жильё</button>',
        popoverLayer,
      ].join('')
      return
    }

    const returning = hasReturn(params.get('return')) ? stringParam(params, 'return') : ''
    const scopeParam = activeVertical === 'avia' ? 'flightScope' : 'railScope'
    const oneWay = !returning && params.get(scopeParam) === 'oneway'
    searchForm.dataset.vertical = activeVertical
    searchForm.innerHTML = [
      `<div class="trip-search-route-fields">${searchField('from', 'Откуда', stringParam(params, 'from', 'Москва'))}${searchField('to', 'Куда', stringParam(params, 'to', 'Санкт-Петербург'))}</div>`,
      searchDates(
        { name: 'depart', label: 'Туда', value: stringParam(params, 'depart', '12 окт') },
        { name: 'return', label: 'Обратно', value: returning, oneWay },
      ),
      '<button class="trip-search-submit" type="submit">Найти билеты</button>',
      popoverLayer,
    ].join('')
  }

  function animateOverviewUpdate() {
    window.clearTimeout(overviewAnimationTimer)
    overviewButton.classList.remove('is-service-updated')
    overviewServices.classList.remove('is-count-updated')
    void overviewButton.offsetWidth
    overviewButton.classList.add('is-service-updated')
    overviewServices.classList.add('is-count-updated')
    overviewAnimationTimer = window.setTimeout(() => {
      overviewButton.classList.remove('is-service-updated')
      overviewServices.classList.remove('is-count-updated')
    }, 720)
  }

  function hideServiceAddedState() {
    window.cancelAnimationFrame(serviceAddedAnimationFrame)
    serviceAddedAnimationFrame = 0
    bookingStage.classList.remove('is-service-added')
    serviceAddedState.hidden = true
  }

  function showServiceAddedState(kind) {
    const vertical = normalizeVertical(kind)
    const copy = {
      avia: { title: 'Авиабилеты добавлены', icon: './assets/images/tab-avia.png' },
      train: { title: 'Ж/д билеты добавлены', icon: './assets/images/tab-train.png' },
      hotel: { title: 'Жильё добавлено', icon: './assets/images/tab-hotel.png' },
    }[vertical]
    serviceAddedTitle.textContent = copy.title
    serviceAddedIcon.src = copy.icon
    serviceAddedActions.innerHTML = [
      { id: 'avia', label: 'Авиа', icon: './assets/icons/transport-plane.svg' },
      { id: 'train', label: 'Поезда', icon: './assets/icons/transport-train.svg' },
      { id: 'hotel', label: 'Жильё', icon: './assets/icons/hotel.svg' },
    ]
      .filter(item => item.id !== vertical)
      .map(item => `<button type="button" data-service-added-vertical="${item.id}"><img src="${item.icon}" alt=""><span>${item.label}</span></button>`)
      .join('')
    bookingStage.classList.remove('is-service-added')
    serviceAddedState.hidden = false
    window.cancelAnimationFrame(serviceAddedAnimationFrame)
    serviceAddedAnimationFrame = window.requestAnimationFrame(() => {
      serviceAddedAnimationFrame = 0
      bookingStage.classList.add('is-service-added')
    })
  }

  function renderHeader() {
    const route = routeTitle()
    const dates = tripDateRange()
    const travellers = participantSummary()
    overviewRoute.textContent = route
    overviewDates.textContent = dates
    overviewTravellers.textContent = travellers
    overviewServices.textContent = serviceCountLabel()
    document.querySelectorAll('[data-trip-vertical]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.tripVertical === activeVertical))
    })
    renderSearchForm()
  }

  function serviceIcon(service) {
    if (service.kind === 'hotel') return service.booking.image || './assets/hotels/hotel-exterior.png'
    if (service.kind === 'rail') return './assets/icons/trip-train-filled.svg'
    return './assets/icons/trip-flight-filled.svg'
  }

  function renderServiceStatus(service) {
    const cancelled = params.get('cancelled') === '1'
    const label = cancelled ? 'Отменено' : SERVICE_STATUS_LABELS[service.status]
    const tone = cancelled ? 'negative' : service.status === 'paid' ? 'positive' : 'warning'
    return `<span class="trip-status trip-status--${tone}" data-service-status="${escapeHtml(cancelled ? 'cancelled' : service.status)}">${escapeHtml(label)}</span>`
  }

  function renderBookingFooterAction(service, className) {
    if (params.get('cancelled') === '1' || service.status === 'cancelled') return ''
    if (service.status === 'paid') {
      return `<button class="${className} trip-booking-documents" type="button"><img src="./assets/icons/trip-paid-document.svg" alt=""><span>Скачать документы</span></button>`
    }
    return `<button class="${className}" type="button" data-open-payment="${escapeHtml(service.id)}">Оплатить</button>`
  }

  function renderTransportCard(service) {
    const booking = service.booking || {}
    const passenger = booking.passenger || {}
    const prefix = service.kind === 'rail' ? 'trip-rail-booking' : 'trip-flight-booking'
    const brand = service.kind === 'rail' && booking.brand ? ` · ${booking.brand}` : ''
    const subline = service.kind === 'rail' ? `Поезд ${booking.trainNumber || '—'}${brand}` : booking.flightNumber || '—'
    const fromLabel = service.kind === 'rail' ? booking.fromStation : [booking.fromCode, booking.fromAirport].filter(Boolean).join(', ')
    const toLabel = service.kind === 'rail' ? booking.toStation : [booking.toCode, booking.toAirport].filter(Boolean).join(', ')
    const fare = service.kind === 'rail'
      ? [railCoachLabel(booking.coach), booking.seats].filter(Boolean).join(' · ')
      : booking.tariff || 'Эконом'
    return `
      <div class="${prefix}">
        <div class="${prefix}__header">
          <span class="${prefix}__logo" aria-hidden="true"><img src="${escapeHtml(serviceIcon(service))}" alt=""></span>
          <span class="${prefix}__identity"><strong>${escapeHtml(`${booking.fromCity || ''} — ${booking.toCity || ''}`)}</strong><small>${escapeHtml(subline)}</small></span>
          ${renderServiceStatus(service)}
        </div>
        <div class="${prefix}__journey" aria-label="${escapeHtml(`${booking.duration || ''} в пути`)}">
          <div class="${prefix}__timeline"><strong>${escapeHtml(booking.departTime || '—')}</strong><i aria-hidden="true"></i><span>${escapeHtml(booking.duration || '—')}</span><i aria-hidden="true"></i><strong>${escapeHtml(booking.arrivalTime || '—')}</strong></div>
          <div class="${prefix}__details">
            <span>${booking.dateLabel ? `<small>${escapeHtml(booking.dateLabel)}</small>` : ''}<small>${escapeHtml(fromLabel || '')}</small></span>
            <span>${booking.dateLabel ? `<small>${escapeHtml(booking.dateLabel)}</small>` : ''}<small>${escapeHtml(toLabel || '')}</small></span>
          </div>
        </div>
        <p class="${prefix}__fare">${escapeHtml(fare)}</p>
        <div class="${prefix}__passengers"><span class="${prefix}__passenger"><strong>${escapeHtml(passenger.name || 'Иван Иванов')}</strong><small>${escapeHtml(passenger.details || '11.11.1990')}</small></span>${renderBookingFooterAction(service, `${prefix}__pay`)}</div>
      </div>`
  }

  function renderHotelCard(service) {
    const booking = service.booking || {}
    const passenger = booking.passenger || {}
    const roomTitle = (booking.roomName || 'Номер').replace(/\s+с\s+двуспальной\s+кроватью$/iu, '')
    const bed = /двуспальной\s+кроватью/iu.test(booking.roomName || '') ? '1 двуспальная кровать' : '1 кровать'
    const birthDate = (passenger.details || '11.11.1990').split(' · ')[0]
    return `
      <div class="trip-hotel-booking">
        <div class="trip-hotel-booking__header"><img class="trip-hotel-booking__image" src="${escapeHtml(serviceIcon(service))}" alt=""><span class="trip-hotel-booking__identity"><strong>${escapeHtml(booking.hotelName || 'Отель')}</strong><small>${escapeHtml(booking.address || '')}</small></span>${renderServiceStatus(service)}</div>
        <span class="trip-hotel-booking__room"><strong>${escapeHtml(roomTitle)}</strong><small>${escapeHtml(booking.dateRange || '')}</small><small>${escapeHtml(bed)}</small></span>
        <div class="trip-hotel-booking__conditions"><span><img src="./assets/icons/hotel-cancellation.svg" alt="">${escapeHtml(booking.cancellation || 'Условия отмены')}</span><span><img src="./assets/icons/hotel-meal.svg" alt="">${escapeHtml(booking.meal || 'Без питания')}</span></div>
        <div class="trip-hotel-booking__footer"><span class="trip-hotel-booking__traveller"><strong>${escapeHtml(passenger.name || 'Иван Иванов')}</strong><small>${escapeHtml(birthDate)}</small></span>${renderBookingFooterAction(service, 'trip-hotel-booking__pay')}</div>
      </div>`
  }

  function renderTimelineMarker(item) {
    if (item.marker === 'milestone') {
      return '<div class="trip-service__timeline"><span class="trip-date-chip trip-date-chip--milestone" aria-hidden="true"><span class="trip-date-chip__dot"></span></span><span class="trip-service__line" aria-hidden="true"></span></div>'
    }
    const date = item.actualDate || timelineDeparture() || { day: '—', month: '' }
    return `<div class="trip-service__timeline"><span class="trip-date-chip" aria-label="${escapeHtml(`${date.day} ${date.month}`)}"><span class="trip-date-chip__day">${escapeHtml(date.day)}</span><span class="trip-date-chip__month">${escapeHtml(date.month)}</span></span><span class="trip-service__line" aria-hidden="true"></span></div>`
  }

  function renderService(item) {
    const service = item.service
    if (!service.booking.dateLabel && item.actualDate) {
      service.booking.dateLabel = `${item.actualDate.day} ${TIMELINE_MONTH_NAMES[item.actualDate.month] || item.actualDate.month}`
    }
    const card = service.kind === 'hotel' ? renderHotelCard(service) : renderTransportCard(service)
    const canRemove = isServicePayable(service) && params.get('cancelled') !== '1'
    return `
      <article class="trip-service" data-trip-service-id="${escapeHtml(service.id)}">
        ${renderTimelineMarker(item)}
        <div class="trip-service__content">
          <div class="trip-service__heading">
            <h2 class="trip-service__title">${escapeHtml(serviceDisplayTitle(service))}</h2>
            ${canRemove ? `<span class="trip-service__status"><button class="trip-remove-button" type="button" data-remove-service="${escapeHtml(service.id)}"><svg class="trip-remove-button__icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 4.5h9M6 4.5v-1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1m-5.5 0 .55 7.7a1 1 0 0 0 1 .93h3.9a1 1 0 0 0 1-.93l.55-7.7M6.75 7v3.75M9.25 7v3.75"/></svg><span>Удалить</span></button></span>` : '<span class="trip-service__status" aria-hidden="true"></span>'}
          </div>
          <div class="trip-booking-shell trip-booking-shell--interactive" data-booking-state="filled" data-service-details="${escapeHtml(service.id)}" role="button" tabindex="0" aria-label="${escapeHtml(`Показать детали: ${serviceDisplayTitle(service)}`)}"><div class="trip-booking-shell__inner">${card}</div></div>
        </div>
      </article>`
  }

  function renderEmptyTimelineSlot(item) {
    const addingLocked = isAddingServicesLocked()
    const selected = skippedTimelineSlots.has(item.id)
    const actions = item.kind === 'hotel'
      ? `<button type="button" data-choose-service="hotel" data-trip-segment="lodging"><img src="./assets/icons/lodging.svg" alt="">Найти жильё</button>`
      : `
        <button type="button" data-choose-service="avia" data-trip-segment="${escapeHtml(item.id)}"><img src="./assets/icons/transport-plane.svg" alt="">Авиа</button>
        <button type="button" data-choose-service="train" data-trip-segment="${escapeHtml(item.id)}"><img src="./assets/icons/transport-train.svg" alt="">Ж/д</button>`
    return `
      <article class="trip-service trip-service--empty" data-timeline-slot="${escapeHtml(item.id)}">
        ${renderTimelineMarker(item)}
        <div class="trip-service-content">
          <div class="trip-service-heading"><h2>${escapeHtml(item.title)}</h2></div>
          <div class="trip-timeline-empty-card">
            ${addingLocked
              ? '<p class="trip-timeline-empty-card__cancelled">Услуга не добавлялась</p>'
              : `<div class="trip-empty-actions">${actions}<button class="${selected ? 'is-selected' : ''}" type="button" data-skip-timeline-slot="${escapeHtml(item.id)}" aria-pressed="${selected ? 'true' : 'false'}">Не нужно</button></div>`}
          </div>
        </div>
      </article>`
  }

  function renderFreeTimelineDay(item) {
    const addingLocked = isAddingServicesLocked()
    const endDate = item.endDate || item.actualDate
    return `
      <article class="trip-service trip-service--free-day" data-timeline-free-interval="${escapeHtml(item.id)}">
        ${renderTimelineMarker(item)}
        <div class="trip-service-content">
          <div class="trip-service-heading"><h2>${escapeHtml(item.title)}</h2></div>
          <div class="trip-timeline-day-card">
            <span>${escapeHtml(`${item.actualDate.day} ${item.actualDate.month} — ${endDate.day} ${TIMELINE_MONTH_NAMES[endDate.month] || endDate.month}`)}</span>
            <strong>Свободное время в ${escapeHtml(cityInCase(item.city, 'prepositional'))}</strong>
            <small>Следующий этап — ${escapeHtml(`${endDate.day} ${TIMELINE_MONTH_NAMES[endDate.month] || endDate.month}`)}</small>
            ${addingLocked ? '' : '<button type="button" data-trip-action="open-chooser">Добавить услуги</button>'}
          </div>
        </div>
      </article>`
  }

  function renderHotelCheckout(item) {
    return `
      <article class="trip-service trip-service--hotel-checkout" data-hotel-checkout="${escapeHtml(item.id)}">
        ${renderTimelineMarker(item)}
        <div class="trip-service-content">
          <div class="trip-service-heading"><h2>Выезд из отеля</h2></div>
          <div class="trip-hotel-checkout-card">
            <div class="trip-hotel-checkout-card__inner">
              <img src="./assets/images/worktrip-hotel-checkout.png" alt="">
              <strong>До 12:00</strong>
            </div>
          </div>
        </div>
      </article>`
  }

  function renderTimelineItem(item) {
    if (item.type === 'service') return renderService(item)
    if (item.type === 'free-interval') return renderFreeTimelineDay(item)
    if (item.type === 'hotel-checkout') return renderHotelCheckout(item)
    return renderEmptyTimelineSlot(item)
  }

  function renderServicePreview(service) {
    const booking = service.booking || {}
    const title = service.kind === 'hotel'
      ? booking.hotelName || 'Жильё'
      : `${booking.fromCity || ''} — ${booking.toCity || ''}`
    const details = service.kind === 'hotel'
      ? [booking.dateRange, booking.roomName].filter(Boolean).join(' · ')
      : [booking.departTime && booking.arrivalTime ? `${booking.departTime} — ${booking.arrivalTime}` : '', service.kind === 'rail' ? booking.trainNumber : booking.flightNumber].filter(Boolean).join(' · ')
    const kindLabel = service.kind === 'hotel' ? 'Жильё' : service.kind === 'rail' ? 'Ж/д билет' : 'Авиабилет'
    return `
      <article class="trip-service-preview" data-service-kind="${escapeHtml(service.kind)}">
        <span class="trip-service-preview__icon"><img src="${escapeHtml(serviceIcon(service))}" alt=""></span>
        <span class="trip-service-preview__copy">
          <small>${kindLabel}</small>
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(details || serviceDisplayTitle(service))}</span>
        </span>
        <span class="trip-service-preview__side">
          ${renderServiceStatus(service)}
          <strong>${formatMoney(Number(service.price) || 0)}</strong>
        </span>
      </article>`
  }

  function renderDrawer() {
    const cancelled = params.get('cancelled') === '1'
    const preview = !isOrderPage()
    const fullyPaid = services.some(service => service.status === 'paid') && services.every(isServiceSettled)
    shell.classList.toggle('is-trip-paid', fullyPaid && !cancelled)
    servicesDrawer.classList.toggle('is-services-preview', preview)
    const builderUrl = new URL('./trip.html', window.location.href)
    const builderParams = new URLSearchParams(params)
    builderParams.delete('order')
    builderParams.delete('embed')
    builderUrl.search = builderParams.toString()
    drawerBack.href = fullyPaid && !cancelled
      ? new URL('./trips.html#business', window.location.href).href
      : builderUrl.href
    drawerTitle.textContent = routeTitle()
    drawerMeta.textContent = `${tripDateRange()} · ${hasReturn() ? 'туда – обратно' : 'в одну сторону'} · ${participantSummary()}${preview ? ` · ${serviceCountLabel()}` : ''}`
    drawerBadge.hidden = !cancelled
    servicesList.innerHTML = preview
      ? services.map(renderServicePreview).join('') || '<p class="trip-service-preview-empty">В командировке пока нет услуг</p>'
      : buildTimelineItems().map(renderTimelineItem).join('')
    const primaryAction = document.querySelector('#trip-drawer-primary-action')
    const drawerFooter = primaryAction.closest('.trip-drawer-footer')
    const payableServices = services.filter(isServicePayable)
    const payable = payableServices.length > 0
    const pricedServices = isOrderPage() && payable
      ? payableServices
      : services.filter(service => service.status !== 'cancelled')
    const groups = [
      { label: 'Авиабилеты', kinds: ['avia'] },
      { label: 'Ж/д билеты', kinds: ['rail'] },
      { label: 'Жильё', kinds: ['hotel'] },
    ].map(group => ({
      ...group,
      price: pricedServices.filter(service => group.kinds.includes(service.kind)).reduce((sum, service) => sum + (Number(service.price) || 0), 0),
    })).filter(group => group.price > 0)
    const total = groups.reduce((sum, group) => sum + group.price, 0)
    finalCost.classList.toggle('is-paid', fullyPaid && !cancelled)
    finalCost.classList.toggle('trip-cost-card', fullyPaid && !cancelled)
    finalCost.classList.toggle('trip-paid-card', fullyPaid && !cancelled)
    finalCost.innerHTML = fullyPaid && !cancelled
      ? `
        <div class="trip-paid-card__header"><h2>Командировка</h2><span class="trip-paid-card__badge">Оплачена</span></div>
        <div class="trip-paid-card__actions">
          ${[
            ['edit-details', 'trip-paid-calendar.svg', 'Изменить даты'],
            ['trip-documents', 'trip-paid-document.svg', 'Документы по бронированию'],
            ['cancel-trip', 'trip-paid-cancel.svg', 'Отменить'],
            ['trip-support', 'trip-paid-support.svg', 'Чат с поддержкой'],
          ].map(([action, icon, label]) => `
            <button class="trip-paid-card__action" type="button" data-trip-action="${action}">
              <img class="trip-paid-card__action-icon" src="./assets/icons/${icon}" alt=""><span>${label}</span><img class="trip-paid-card__arrow" src="./assets/icons/trip-paid-arrow.svg" alt="">
            </button>`).join('')}
        </div>
        <div class="trip-paid-card__total"><span>Итого</span><img src="./assets/icons/trip-paid-more.svg" alt=""><strong>${formatMoney(total)}</strong></div>`
      : `
        <h2>Стоимость</h2>
        <div class="trip-final-cost__rows">${groups.map(group => `<p><span>${escapeHtml(group.label)}</span><strong>${formatMoney(group.price)}</strong></p>`).join('')}</div>
        ${payable && !cancelled ? `
          <div class="trip-final-cost__payment-methods" role="group" aria-label="Способ оплаты">
            <button class="trip-final-cost__payment-method${selectedPaymentMethod === 'card' ? ' is-selected' : ''}" type="button" data-trip-payment-method="card" aria-pressed="${selectedPaymentMethod === 'card'}">
              <span class="trip-final-cost__payment-icon trip-final-cost__payment-icon--card" aria-hidden="true"></span>
              <strong>Карта или СБП</strong>
            </button>
            <button class="trip-final-cost__payment-method${selectedPaymentMethod === 'business' ? ' is-selected' : ''}" type="button" data-trip-payment-method="business" aria-pressed="${selectedPaymentMethod === 'business'}">
              <span class="trip-final-cost__payment-icon" aria-hidden="true"><img src="./assets/icons/briefcase.svg" alt=""></span>
              <span><strong>Бизнес-счёт</strong><small>100 000 ₽</small></span>
            </button>
          </div>` : ''}
        <div class="trip-final-cost__total"><span>${payable ? 'Итого к оплате' : 'Итого'}</span><strong>${formatMoney(total)}</strong></div>`
    primaryAction.dataset.tripAction = preview ? 'show-details' : 'pay-all'
    primaryAction.classList.remove('is-processing')
    primaryAction.textContent = preview ? 'К оплате' : 'Оплатить всё'
    primaryAction.disabled = preview ? false : !payable || cancelled
    drawerFooter.hidden = preview ? false : isPastTrip() || !payable
    document.querySelector('[data-trip-action="edit-details"]').disabled = cancelled
    document.querySelector('[data-trip-action="cancel-trip"]').disabled = cancelled
    document.querySelectorAll('[data-choose-service], [data-trip-action="open-chooser"]')
      .forEach(button => { button.disabled = isAddingServicesLocked() })
  }

  function renderAll() {
    services = buildServices(params)
    clearIntegratedBookingContexts(params)
    syncServicesParam()
    shell.classList.remove('is-payment-page')
    shell.classList.toggle('is-order-page', isOrderPage())
    shell.classList.toggle('trip-page', isOrderPage())
    shell.classList.toggle('page-shell', isOrderPage())
    renderHeader()
    renderDrawer()
    if (isOrderPage()) {
      servicesOverlay.hidden = false
      servicesOverlay.classList.add('is-open')
      shell.classList.add('is-services-open')
      overviewButton.setAttribute('aria-expanded', 'true')
    }
    replaceParentUrl()
    saveTripLifecycle()
  }

  function buildFrameUrl(vertical, { segment = '' } = {}) {
    syncServicesParam()
    const target = new URL(VERTICALS[vertical].path, window.location.href)
    const tripSegment = ['outbound', 'return', 'lodging'].includes(segment) ? segment : ''
    const origin = stringParam(params, 'from', 'Москва')
    const destination = stringParam(params, 'to', 'Санкт-Петербург')
    params.forEach((value, name) => target.searchParams.set(name, value))
    clearPreviousBookingContext(target, vertical)
    target.searchParams.set('_prototypeRevision', VERTICALS[vertical].revision)
    target.searchParams.set('embed', EMBED_VALUE)
    target.searchParams.set('workTrip', '1')
    target.searchParams.set('addToTrip', '1')
    target.searchParams.set('tripKind', 'existing')
    target.searchParams.set(ACTIVE_VERTICAL_PARAM, vertical)
    target.searchParams.set('traveller', participantSummary())
    if (vertical === 'hotel') {
      target.searchParams.delete('segment')
      target.searchParams.delete('tripSegment')
      target.searchParams.delete('railSegment')
      if (tripSegment === 'lodging') target.searchParams.delete('lodgingRemoved')
      target.searchParams.set('city', stringParam(params, 'to', 'Санкт-Петербург'))
      target.searchParams.set('checkin', stringParam(params, 'checkin', stringParam(params, 'depart', '12 окт')))
      target.searchParams.set('checkout', stringParam(params, 'checkout', stringParam(params, 'return', '14 окт')))
    } else if (vertical === 'avia') {
      target.searchParams.delete('tripSegment')
      target.searchParams.delete('railSegment')
      if (tripSegment === 'outbound' || tripSegment === 'return') {
        const isReturn = tripSegment === 'return'
        removalFlagsForReturn('avia', tripSegment).forEach(name => target.searchParams.delete(name))
        target.searchParams.set('tripFrom', origin)
        target.searchParams.set('tripTo', destination)
        target.searchParams.set('from', isReturn ? destination : origin)
        target.searchParams.set('to', isReturn ? origin : destination)
        target.searchParams.set('flightOutboundDate', isReturn
          ? stringParam(params, 'return', '14 окт')
          : stringParam(params, 'depart', '12 окт'))
        target.searchParams.delete('flightReturnDate')
        target.searchParams.set('flightScope', 'oneway')
        target.searchParams.set('segment', tripSegment)
      } else {
        target.searchParams.delete('segment')
        target.searchParams.set('flightOutboundDate', stringParam(params, 'depart', '12 окт'))
        if (hasReturn()) target.searchParams.set('flightReturnDate', stringParam(params, 'return'))
        else target.searchParams.delete('flightReturnDate')
        target.searchParams.set('flightScope', hasReturn() ? 'roundtrip' : 'oneway')
      }
    } else {
      target.searchParams.delete('segment')
      if (tripSegment === 'outbound' || tripSegment === 'return') {
        removalFlagsForReturn('rail', tripSegment).forEach(name => target.searchParams.delete(name))
        target.searchParams.set('tripFrom', origin)
        target.searchParams.set('tripTo', destination)
        const isReturn = tripSegment === 'return'
        target.searchParams.set('from', isReturn ? destination : origin)
        target.searchParams.set('to', isReturn ? origin : destination)
        target.searchParams.set(tripSegment === 'return' ? 'railReturnDate' : 'railOutboundDate',
          tripSegment === 'return'
            ? stringParam(params, 'return', '14 окт')
            : stringParam(params, 'depart', '12 окт'))
        target.searchParams.set('railScope', 'oneway')
        target.searchParams.set('railSegment', tripSegment)
        target.searchParams.set('tripSegment', tripSegment)
      } else {
        target.searchParams.delete('tripSegment')
        target.searchParams.delete('railSegment')
        target.searchParams.set('railOutboundDate', stringParam(params, 'depart', '12 окт'))
        if (hasReturn()) target.searchParams.set('railReturnDate', stringParam(params, 'return'))
        else target.searchParams.delete('railReturnDate')
        target.searchParams.set('railScope', hasReturn() ? 'roundtrip' : 'oneway')
      }
    }
    return target
  }

  function clearPreviousBookingContext(target, vertical) {
    const targetParams = target.searchParams || target
    const shouldDelete = name => {
      if (vertical === 'hotel') {
        return name.startsWith('hotel') || name.startsWith('room') || name.startsWith('tariff') || name === 'lodgingRemoved'
      }
      if (vertical === 'train') {
        return name.startsWith('rail') || name === 'outboundRemoved' || name === 'returnRemoved'
      }
      return name === 'bookingId'
        || name.startsWith('flight')
        || name === 'outboundRemoved'
        || name === 'returnRemoved'
        || name === 'returnAirline'
        || name.startsWith('returnFlight')
        || name.startsWith('returnDepart')
        || name.startsWith('returnArrival')
        || name.startsWith('returnDuration')
        || name.startsWith('returnFrom')
        || name.startsWith('returnTo')
    }
    ;[...targetParams.keys()].filter(shouldDelete).forEach(name => targetParams.delete(name))
  }

  function clearIntegratedBookingContexts(target) {
    clearPreviousBookingContext(target, 'avia')
    clearPreviousBookingContext(target, 'train')
    clearPreviousBookingContext(target, 'hotel')
  }

  function searchButtonLabel() {
    return activeVertical === 'hotel' ? 'Найти жильё' : 'Найти билеты'
  }

  function setSearchBusy(isBusy) {
    const submit = searchForm.querySelector('.trip-search-submit')
    if (!submit) return
    submit.disabled = isBusy
    submit.textContent = isBusy ? 'Ищем…' : searchButtonLabel()
  }

  function beginFrameLoad({ title, caption, research = false } = {}) {
    window.clearTimeout(frameRevealTimer)
    window.clearTimeout(frameStateHideTimer)
    window.clearTimeout(framePricePulseTimer)
    frameLoadToken += 1
    frameLoadMode = research ? 'research' : 'load'
    frameRevealNotBefore = performance.now() + (research ? (overlayMotionQuery.matches ? 120 : 900) : 0)
    bookingStage.classList.add('is-frame-loading')
    bookingStage.classList.toggle('is-researching', research)
    bookingStage.setAttribute('aria-busy', 'true')
    frameState.hidden = false
    frameState.innerHTML = `
      <span class="trip-frame-state__spinner" aria-hidden="true"></span>
      <span class="trip-frame-state__copy">
        <strong>${escapeHtml(title || 'Обновляем варианты')}</strong>
        <small>${escapeHtml(caption || 'Проверяем наличие и актуальные цены')}</small>
      </span>`
    setSearchBusy(true)
    return frameLoadToken
  }

  function finishFrameLoad() {
    bookingFrame.classList.remove('is-loading')
    bookingStage.classList.remove('is-frame-loading', 'is-researching')
    bookingStage.removeAttribute('aria-busy')
    setSearchBusy(false)
    frameStateHideTimer = window.setTimeout(() => {
      if (bookingStage.classList.contains('is-frame-loading')) return
      frameState.hidden = true
      frameState.replaceChildren()
    }, 220)
  }

  function pulseEmbeddedPrices() {
    if (frameLoadMode !== 'research') return
    try {
      const frameRoot = bookingFrame.contentDocument?.documentElement
      if (!frameRoot) return
      frameRoot.classList.remove('trip-prices-updated')
      void frameRoot.offsetWidth
      frameRoot.classList.add('trip-prices-updated')
      framePricePulseTimer = window.setTimeout(() => frameRoot.classList.remove('trip-prices-updated'), 1100)
    } catch {
      // The results are still usable if visual price highlighting cannot be applied.
    }
  }

  function loadVertical(vertical, { announce = true, segment = null, research = false } = {}) {
    hideServiceAddedState()
    shell.classList.remove('is-payment-page')
    activeVertical = normalizeVertical(vertical)
    if (segment !== null) activeSearchSegment = ['outbound', 'return', 'lodging'].includes(segment) ? segment : ''
    params.set(ACTIVE_VERTICAL_PARAM, activeVertical)
    renderHeader()
    replaceParentUrl()
    bookingFrame.classList.add('is-loading')
    beginFrameLoad({
      title: research ? 'Обновляем варианты' : `Загружаем ${VERTICALS[activeVertical].frameName}`,
      caption: research ? 'Проверяем наличие и пересчитываем цены' : 'Собираем доступные варианты',
      research,
    })
    syncBookingStepChrome(VERTICALS[activeVertical].path)
    resetBookingStepScroll()
    bookingFrame.src = buildFrameUrl(activeVertical, { segment: activeSearchSegment }).href
    if (announce) announceMessage(`Открыт поиск: ${VERTICALS[activeVertical].frameName}`)
  }

  function inferVerticalFromPath(pathname) {
    const name = pathname.split('/').pop() || ''
    if (name.startsWith('hotel')) return 'hotel'
    if (name.startsWith('train')) return 'train'
    if (name.startsWith('avia')) return 'avia'
    return activeVertical
  }

  function mergeVisibleFrameQuery() {
    try {
      const frameUrl = new URL(bookingFrame.contentWindow.location.href)
      const isSearchResults = syncBookingStepChrome(frameUrl.pathname)
      if (!isSearchResults) resetBookingStepScroll()
      if (frameUrl.pathname.endsWith('/trip.html') || frameUrl.pathname.endsWith('/trip-payment.html')) return
      activeVertical = inferVerticalFromPath(frameUrl.pathname)
      const incoming = new URLSearchParams(frameUrl.search)
      const frameSegment = incoming.get('segment') || incoming.get('tripSegment')
      if (frameSegment === 'outbound' || frameSegment === 'return') {
        params.set(ACTIVE_VERTICAL_PARAM, activeVertical)
        renderHeader()
        replaceParentUrl()
        return
      }
      incoming.forEach((value, name) => {
        if (name !== 'embed' && name !== '_prototypeRevision' && !isShellOwnedServiceStateParam(name)) params.set(name, value)
      })
      params.set(ACTIVE_VERTICAL_PARAM, activeVertical)
      renderHeader()
      replaceParentUrl()
    } catch {
      // Same-origin is expected. If the browser blocks inspection, the embedded page still works.
    }
  }

  function revealEmbeddedFrame() {
    window.clearTimeout(frameRevealTimer)
    const revealToken = frameLoadToken
    let documentReady = false
    const reveal = () => {
      if (documentReady || revealToken !== frameLoadToken) return
      const waitTime = frameRevealNotBefore - performance.now()
      if (waitTime > 0) {
        frameRevealTimer = window.setTimeout(reveal, waitTime)
        return
      }
      documentReady = true
      try {
        if ('scrollRestoration' in bookingFrame.contentWindow.history) {
          bookingFrame.contentWindow.history.scrollRestoration = 'manual'
        }
      } catch {
        // Same-origin is expected. The outer scroll reset still applies.
      }
      syncBookingFrameHeight()
      resetEmbeddedFrameScroll()
      pulseEmbeddedPrices()
      finishFrameLoad()
      frameLoadMode = 'ready'
    }

    try {
      const frameDocument = bookingFrame.contentDocument
      if (!frameDocument) {
        reveal()
        return
      }
      frameDocument.documentElement.classList.add('trip-shell-embed')
      let style = frameDocument.querySelector('link[data-trip-shell-embed-style]')
      if (!style) {
        style = frameDocument.createElement('link')
        style.rel = 'stylesheet'
        style.href = './trip-shell-embed.css?v=6'
        style.dataset.tripShellEmbedStyle = 'true'
        style.addEventListener('load', reveal, { once: true })
        frameDocument.head.append(style)
      } else reveal()
      frameRevealTimer = window.setTimeout(reveal, 320)
    } catch {
      reveal()
    }
  }

  const overlayMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

  document.addEventListener('pointerdown', () => {
    lastInteractionWasKeyboard = false
  }, true)

  document.addEventListener('keydown', () => {
    lastInteractionWasKeyboard = true
  }, true)

  function setDrawerMorphGeometry(sourceRect, targetRect) {
    servicesDrawer.style.setProperty('--trip-drawer-to-top', `${targetRect.top}px`)
    servicesDrawer.style.setProperty('--trip-drawer-to-left', `${targetRect.left}px`)
    servicesDrawer.style.setProperty('--trip-drawer-to-width', `${targetRect.width}px`)
    servicesDrawer.style.setProperty('--trip-drawer-to-height', `${targetRect.height}px`)
    servicesDrawer.style.setProperty('--trip-drawer-from-x', `${sourceRect.left - targetRect.left}px`)
    servicesDrawer.style.setProperty('--trip-drawer-from-y', `${sourceRect.top - targetRect.top}px`)
    servicesDrawer.style.setProperty('--trip-drawer-from-scale-x', String(sourceRect.width / targetRect.width))
    servicesDrawer.style.setProperty('--trip-drawer-from-scale-y', String(sourceRect.height / targetRect.height))
  }

  function clearDrawerMorph() {
    window.clearTimeout(overlayMorphTimer)
    servicesDrawer.classList.remove('is-overview-morphing')
    ;[
      '--trip-drawer-to-top',
      '--trip-drawer-to-left',
      '--trip-drawer-to-width',
      '--trip-drawer-to-height',
      '--trip-drawer-from-x',
      '--trip-drawer-from-y',
      '--trip-drawer-from-scale-x',
      '--trip-drawer-from-scale-y',
    ].forEach((property) => servicesDrawer.style.removeProperty(property))
  }

  function prepareDrawerMorph() {
    if (overlayMotionQuery.matches) return false
    const sourceRect = overviewButton.getBoundingClientRect()
    servicesOverlay.classList.add('is-measuring')
    const targetRect = servicesDrawer.getBoundingClientRect()
    servicesOverlay.classList.remove('is-measuring')
    setDrawerMorphGeometry(sourceRect, targetRect)
    servicesDrawer.classList.add('is-overview-morphing')
    return true
  }

  function openServices(trigger = overviewButton) {
    window.clearTimeout(overlayCloseTimer)
    window.clearTimeout(overlayMorphTimer)
    clearDrawerMorph()
    overviewButton.classList.remove('is-morph-source-hidden')
    overlayTrigger = trigger || document.activeElement
    overlayOpenedFromKeyboard = lastInteractionWasKeyboard
    servicesOverlay.hidden = false
    servicesOverlay.classList.remove('is-closing')
    shell.classList.add('is-services-open')
    shellSurface.setAttribute('aria-hidden', 'true')
    overviewButton.setAttribute('aria-expanded', 'true')
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        servicesOverlay.classList.add('is-open')
        servicesDrawer.focus({ preventScroll: true })
      })
    })
  }

  function closeServices({ restoreFocus = true } = {}) {
    if (servicesOverlay.hidden) return
    const shouldRestoreFocus = restoreFocus && (overlayOpenedFromKeyboard || lastInteractionWasKeyboard)
    window.clearTimeout(overlayMorphTimer)
    if (!serviceChooser.hidden) {
      closeChooser({ restoreFocus: false })
    }
    clearDrawerMorph()
    overviewButton.classList.remove('is-morph-source-hidden')
    if (document.activeElement instanceof HTMLElement && servicesOverlay.contains(document.activeElement)) {
      document.activeElement.blur()
    }
    servicesOverlay.classList.remove('is-open')
    servicesOverlay.classList.add('is-closing')
    shell.classList.remove('is-services-open')
    shellSurface.removeAttribute('aria-hidden')
    overviewButton.setAttribute('aria-expanded', 'false')
    overlayCloseTimer = window.setTimeout(() => {
      servicesOverlay.hidden = true
      servicesOverlay.classList.remove('is-closing')
      clearDrawerMorph()
      overviewButton.classList.remove('is-morph-source-hidden')
      if (shouldRestoreFocus && overlayTrigger instanceof HTMLElement) overlayTrigger.focus({ preventScroll: true })
      overlayTrigger = null
      overlayOpenedFromKeyboard = false
    }, overlayMotionQuery.matches ? 20 : 300)
  }

  function openChooser(trigger) {
    if (isAddingServicesLocked()) return
    window.clearTimeout(chooserCloseTimer)
    chooserTrigger = trigger || document.activeElement
    serviceChooser.hidden = false
    serviceChooser.classList.remove('is-closing')
    servicesDrawer.classList.add('is-chooser-open')
    trigger?.setAttribute('aria-expanded', 'true')
    window.requestAnimationFrame(() => serviceChooser.querySelector('.trip-service-chooser__card')?.focus({ preventScroll: true }))
  }

  function closeChooser({ restoreFocus = true } = {}) {
    if (serviceChooser.hidden) return
    serviceChooser.classList.add('is-closing')
    servicesDrawer.classList.remove('is-chooser-open')
    document.querySelector('[data-trip-action="open-chooser"]')?.setAttribute('aria-expanded', 'false')
    chooserCloseTimer = window.setTimeout(() => {
      serviceChooser.hidden = true
      serviceChooser.classList.remove('is-closing')
      if (restoreFocus && chooserTrigger instanceof HTMLElement) chooserTrigger.focus({ preventScroll: true })
      chooserTrigger = null
    }, 220)
  }

  function chooseService(vertical, segment = '') {
    if (isAddingServicesLocked()) return
    const next = normalizeVertical(vertical)
    const targetSegment = ['outbound', 'return', 'lodging'].includes(segment) ? segment : ''
    if (isOrderPage()) {
      params.delete('order')
      shell.classList.remove('is-order-page', 'trip-page', 'page-shell')
      bookingStage.hidden = false
      shellSurface.removeAttribute('aria-hidden')
    }
    clearSkippedTimelineSlot(targetSegment)
    closeChooser({ restoreFocus: false })
    closeServices({ restoreFocus: false })
    window.setTimeout(() => loadVertical(next, { segment: targetSegment }), 110)
  }

  function setFormValue(source, name, fallback = '') {
    const value = String(source.get(name) || '').trim()
    if (value) params.set(name, value)
    else if (fallback) params.set(name, fallback)
    else params.delete(name)
  }

  function submitTopSearch() {
    if (isAddingServicesLocked()) return
    const data = new FormData(searchForm)
    if (activeVertical === 'hotel') {
      setFormValue(data, 'to', 'Санкт-Петербург')
      setFormValue(data, 'checkin', '12 окт')
      setFormValue(data, 'checkout', '14 окт')
      params.set('city', stringParam(params, 'to', 'Санкт-Петербург'))
      params.set('depart', stringParam(params, 'checkin', '12 окт'))
      params.set('return', stringParam(params, 'checkout', '14 окт'))
    } else {
      setFormValue(data, 'from', 'Москва')
      setFormValue(data, 'to', 'Санкт-Петербург')
      setFormValue(data, 'depart', '12 окт')
      setFormValue(data, 'return')
      const scopeParam = activeVertical === 'avia' ? 'flightScope' : 'railScope'
      params.set(scopeParam, hasReturn() ? 'roundtrip' : 'oneway')
      if (!hasReturn() && activeSearchSegment === 'return') activeSearchSegment = ''
    }
    renderHeader()
    replaceParentUrl()
    saveTripLifecycle()
    loadVertical(activeVertical, { announce: false, segment: activeSearchSegment, research: true })
    announceMessage('Поиск обновлён')
  }

  function normalizeReturnKind(value) {
    if (value === 'hotel' || value === 'avia' || value === 'rail') return value
    return ''
  }

  function removalFlagsForReturn(kind, segment) {
    if (kind === 'hotel' && segment === 'lodging') return ['lodgingRemoved']
    if (kind === 'avia' && segment === 'outbound') return ['outboundRemoved', 'flightOutboundRemoved']
    if (kind === 'avia' && segment === 'return') return ['returnRemoved', 'flightReturnRemoved']
    if (kind === 'rail' && segment === 'outbound') return ['outboundRemoved', 'railOutboundRemoved']
    if (kind === 'rail' && segment === 'return') return ['returnRemoved', 'railReturnRemoved']
    return []
  }

  function isShellOwnedServiceStateParam(name) {
    return name === TRIP_SERVICES_PARAM
      || name === REMOVED_SERVICES_PARAM
      || name === 'draft'
      || name === 'draftId'
      || name === 'tripId'
      || name === 'cancelled'
      || name.endsWith('Removed')
  }

  function clearSuccessfulReturnRemovalState(incoming, message) {
    if (message.result !== 'service-added') return ''
    const kind = normalizeReturnKind(message.kind)
    if (!kind) return ''
    const allowedSegments = kind === 'hotel' ? ['lodging'] : ['outbound', 'return']
    const segments = new Set((Array.isArray(message.segments) ? message.segments : [])
      .filter(segment => allowedSegments.includes(segment)))
    if (!segments.size) return kind

    segments.forEach(segment => {
      removalFlagsForReturn(kind, segment).forEach(name => {
        params.delete(name)
        incoming.delete(name)
      })
    })

    const returnedRawServices = kind === 'hotel'
      ? queryHotelServices(incoming)
      : kind === 'rail' ? queryRailServices(incoming) : queryFlightServices(incoming)
    const removedIds = readRemovedServiceIds(params)
    segments.forEach(segment => removedIds.delete(segment))
    returnedRawServices
      .filter(service => segments.has(service.sourceSectionId))
      .forEach(service => {
        removedIds.delete(service.id)
        removedIds.delete(service.sourceSectionId)
      })

    if (removedIds.size) {
      const value = JSON.stringify([...removedIds])
      params.set(REMOVED_SERVICES_PARAM, value)
    } else {
      params.delete(REMOVED_SERVICES_PARAM)
    }
    return kind
  }

  function removeService(id) {
    if (params.get('cancelled') === '1') return
    const removed = services.find(service => service.id === id)
    if (!removed || !isServicePayable(removed)) return
    removed.status = 'cancelled'
    syncServicesParam()
    renderHeader()
    renderDrawer()
    replaceParentUrl()
    saveTripLifecycle()
    window.requestAnimationFrame(() => {
      servicesList.querySelector(`[data-timeline-slot="${CSS.escape(removed.sourceSectionId)}"] button`)?.focus({ preventScroll: true })
    })
    announceMessage(`Услуга «${serviceDisplayTitle(removed)}» удалена`)
  }

  function requestServiceRemoval(id) {
    const service = services.find(item => item.id === id)
    if (!service || !isServicePayable(service) || params.get('cancelled') === '1') return
    pendingRemovalId = id
    removeDialogTitle.textContent = serviceDisplayTitle(service)
    removeDialog.showModal()
  }

  function buildPaymentUrl(ids) {
    syncServicesParam()
    const target = new URL(PAYMENT_PATH, window.location.href)
    params.forEach((value, name) => target.searchParams.set(name, value))
    target.searchParams.set('embed', EMBED_VALUE)
    target.searchParams.set('payIds', JSON.stringify(ids))
    return target
  }

  function openPaymentStage(ids) {
    if (params.get('cancelled') === '1') return
    const requested = new Set((Array.isArray(ids) ? ids : []).map(String))
    const payable = services.filter(service => isServicePayable(service) && (!requested.size || requested.has(service.id)))
    if (!payable.length) return
    hideServiceAddedState()
    closeChooser({ restoreFocus: false })
    closeServices({ restoreFocus: false })
    shell.classList.remove('is-order-page')
    shell.classList.add('is-payment-page')
    bookingStage.hidden = false
    bookingFrame.classList.add('is-loading')
    beginFrameLoad({ title: 'Открываем проверку и оплату', caption: 'Готовим выбранные услуги' })
    window.setTimeout(() => {
      bookingFrame.src = buildPaymentUrl(payable.map(service => service.id)).href
    }, 110)
    announceMessage('Проверка и оплата открыта в нижней части страницы')
  }

  function showTripDetails() {
    params.set('order', '1')
    bookingStage.hidden = true
    renderAll()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    announceMessage('Открыта страница командировки')
  }

  function payAllServices(button) {
    const payableIds = services.filter(isServicePayable).map(service => service.id)
    if (!payableIds.length || params.get('cancelled') === '1') return
    params.set('paymentMethod', selectedPaymentMethod)
    button.disabled = true
    button.classList.add('is-processing')
    button.textContent = 'Оплачиваем…'
    window.setTimeout(() => completePayments(payableIds), 280)
  }

  function completePayments(ids) {
    if (params.get('cancelled') === '1') return
    const requested = new Set((Array.isArray(ids) ? ids : []).map(String))
    const paid = services.filter(service => isServicePayable(service) && requested.has(service.id))
    if (!paid.length) return
    paid.forEach(service => {
      service.status = 'paid'
      if (service.kind === 'hotel') params.set('hotelStatus', 'paid')
      else {
        const suffix = service.sourceSectionId === 'return' ? 'Return' : 'Outbound'
        params.set(`${service.kind === 'rail' ? 'rail' : 'flight'}${suffix}Status`, 'paid')
      }
    })
    const aviaServices = services.filter(service => service.kind === 'avia')
    const railServices = services.filter(service => service.kind === 'rail')
    if (aviaServices.length && aviaServices.every(service => service.status === 'paid')) params.set('flightStatus', 'paid')
    if (railServices.length && railServices.every(service => service.status === 'paid')) params.set('railStatus', 'paid')
    syncServicesParam()
    renderHeader()
    renderDrawer()
    replaceParentUrl()
    saveTripLifecycle()
    // The payment frame is no longer valid after completion. Return it to the
    // regular service search before opening the paid trip drawer so a stale
    // "Оплачиваем…" state cannot remain visible behind the overlay.
    params.set('order', '1')
    loadVertical(activeVertical, { announce: false, segment: '' })
    renderAll()
    announceMessage(paid.length === 1 ? `Услуга «${serviceDisplayTitle(paid[0])}» оплачена` : 'Выбранные услуги командировки оплачены')
  }

  function tripRecord(status = 'Черновик') {
    const from = stringParam(params, 'from', 'Москва')
    const to = stringParam(params, 'to', 'Санкт-Петербург')
    const depart = stringParam(params, 'depart', stringParam(params, 'checkin', '12 окт'))
    const returning = stringParam(params, 'return', stringParam(params, 'checkout'))
    const paidServices = services.filter(service => service.status === 'paid').length
    const serviceCount = services.length
    const hasRail = services.some(service => service.kind === 'rail')
    const hasAvia = services.some(service => service.kind === 'avia')
    const hasHotel = services.some(service => service.kind === 'hotel')
    const transport = hasRail ? 'train' : hasAvia ? 'avia' : hasHotel ? 'hotel' : activeVertical
    const hotelService = services.find(service => service.kind === 'hotel')
    const serviceNames = [...new Set(services.map(service => (
      service.kind === 'rail' ? 'Ж/д билеты' : service.kind === 'avia' ? 'Авиабилеты' : 'Жильё'
    )))]
    const secondaryIcon = transport === 'train'
      ? './assets/icons/trip-train-filled.svg'
      : transport === 'avia' ? './assets/icons/trip-flight-filled.svg' : './assets/icons/lodging.svg'
    const search = params.toString()
    const target = new URL('./trip.html', window.location.href)
    target.search = search
    const id = stringParam(params, 'tripId', stringParam(params, 'draftId', `trip-v2-${stableHash(target.search)}`))
    const state = status === 'Отменена' ? 'cancelled' : status === 'Черновик' ? 'draft' : 'upcoming'
    return {
      id,
      state,
      search,
      from,
      to,
      depart,
      return: returning,
      paidServices,
      serviceCount,
      city: to,
      transport,
      route: `${from} — ${to}`,
      dates: tripDateRange(),
      title: hotelService?.booking?.hotelName || `Командировка в ${to}`,
      detail: serviceCount ? `${serviceCountLabel()} · ${participantSummary()}` : participantSummary(),
      status,
      hotelImage: hotelService?.booking?.image || './assets/hotels/hotel-exterior.png',
      secondaryTitle: serviceNames.length > 1
        ? (paidServices ? 'Оплаченные услуги' : 'Добавленные услуги')
        : serviceNames[0] || 'Командировка',
      secondaryDetail: serviceNames.join(' · '),
      secondaryIcon,
      secondaryType: transport,
      href: `./trip.html${search ? `?${search}` : ''}`,
      savedAt: new Date().toISOString(),
    }
  }

  function readStoredTrips(key) {
    try {
      const value = JSON.parse(window.localStorage.getItem(key) || '[]')
      return Array.isArray(value) ? value : []
    } catch {
      return []
    }
  }

  function saveStoredTrip(key, record) {
    try {
      const remaining = readStoredTrips(key).filter(item => item?.id !== record.id)
      window.localStorage.setItem(key, JSON.stringify([record, ...remaining].slice(0, 12)))
    } catch {
      // Persistence is optional for the standalone prototype.
    }
  }

  function removeStoredTrip(key, id) {
    try {
      const remaining = readStoredTrips(key).filter(item => item?.id !== id)
      window.localStorage.setItem(key, JSON.stringify(remaining))
    } catch {
      // Persistence is optional for the standalone prototype.
    }
  }

  function saveDraftSnapshot() {
    if (params.get('draft') !== '1' || params.get('cancelled') === '1') return
    saveStoredTrip(BUSINESS_DRAFTS_STORAGE_KEY, tripRecord())
  }

  function savePaidTripSnapshot() {
    const paidServices = services.filter(service => service.status === 'paid').length
    if (!paidServices) return
    const draftId = stringParam(params, 'draftId')
    const tripId = stringParam(params, 'tripId', draftId || `trip-v2-${stableHash(params.toString())}`)
    params.set('tripId', tripId)
    params.delete('draft')
    params.delete('draftId')
    params.delete('cancelled')
    const record = tripRecord(services.every(isServiceSettled) ? 'Оплачено' : 'Частично оплачено')
    saveStoredTrip(BUSINESS_PAID_TRIPS_STORAGE_KEY, record)
    removeStoredTrip(BUSINESS_DRAFTS_STORAGE_KEY, record.id)
    if (draftId && draftId !== record.id) removeStoredTrip(BUSINESS_DRAFTS_STORAGE_KEY, draftId)
    replaceParentUrl()
  }

  function saveTripLifecycle() {
    if (params.get('cancelled') === '1') return
    if (services.some(service => service.status === 'paid')) savePaidTripSnapshot()
    else saveDraftSnapshot()
  }

  function cancelTrip() {
    if (params.get('cancelled') === '1') return
    if (!window.confirm('Отменить командировку? Добавленные услуги останутся в истории прототипа.')) return
    params.set('cancelled', '1')
    const record = tripRecord('Отменена')
    saveStoredTrip(BUSINESS_CANCELLED_TRIPS_STORAGE_KEY, record)
    removeStoredTrip(BUSINESS_DRAFTS_STORAGE_KEY, record.id)
    renderDrawer()
    replaceParentUrl()
    announceMessage('Командировка отменена')
  }

  function openDetailsEditor() {
    if (params.get('cancelled') === '1') return
    detailsForm.elements.from.value = stringParam(params, 'from', 'Москва')
    detailsForm.elements.to.value = stringParam(params, 'to', 'Санкт-Петербург')
    detailsForm.elements.depart.value = stringParam(params, 'depart', '12 окт')
    detailsForm.elements.return.value = stringParam(params, 'return', '14 окт')
    detailsDialog.showModal()
    window.requestAnimationFrame(() => detailsForm.elements.from.focus())
  }

  function saveTripDetails() {
    if (params.get('cancelled') === '1') return
    const data = new FormData(detailsForm)
    setFormValue(data, 'from', 'Москва')
    setFormValue(data, 'to', 'Санкт-Петербург')
    setFormValue(data, 'depart', '12 окт')
    setFormValue(data, 'return')
    params.set('checkin', stringParam(params, 'depart'))
    if (hasReturn()) params.set('checkout', stringParam(params, 'return'))
    renderHeader()
    renderDrawer()
    replaceParentUrl()
    saveTripLifecycle()
    detailsDialog.close('save')
    loadVertical(activeVertical, { announce: false })
    announceMessage('Детали командировки изменены')
  }

  function skipTimelineSlot(slotId) {
    if (isAddingServicesLocked() || !['outbound', 'lodging', 'return'].includes(slotId)) return
    if (skippedTimelineSlots.has(slotId)) {
      skippedTimelineSlots.delete(slotId)
      syncSkippedTimelineSlots()
      renderDrawer()
      replaceParentUrl()
      saveTripLifecycle()
      announceMessage('Потребность в услуге снова открыта')
      return
    }
    skippedTimelineSlots.add(slotId)
    syncSkippedTimelineSlots()
    renderDrawer()
    replaceParentUrl()
    saveTripLifecycle()
    servicesList.querySelector(`[data-timeline-slot="${CSS.escape(slotId)}"] [data-skip-timeline-slot]`)?.focus({ preventScroll: true })
    announceMessage('Услуга не нужна')
  }

  function syncSkippedTimelineSlots() {
    const value = [...skippedTimelineSlots].join(',')
    if (value) params.set(NOT_NEEDED_PARAM, value)
    else params.delete(NOT_NEEDED_PARAM)
  }

  function clearSkippedTimelineSlot(slotId) {
    if (!slotId || !skippedTimelineSlots.delete(slotId)) return
    syncSkippedTimelineSlots()
  }

  function mergeReturnMessage(message) {
    let incoming
    try {
      incoming = message.search
        ? new URLSearchParams(message.search)
        : new URL(message.href, window.location.href).searchParams
    } catch {
      return
    }
    if (isAddingServicesLocked() && message.result === 'service-added') {
      openServices(overviewButton)
      announceMessage(isPastTrip() ? 'В завершённую командировку нельзя добавить услуги' : 'Отменённую командировку нельзя изменить')
      return
    }
    const successfulKind = clearSuccessfulReturnRemovalState(incoming, message)
    ;[...params.keys()].forEach(name => {
      if (name !== 'embed' && name !== '_prototypeRevision' && !isShellOwnedServiceStateParam(name) && !incoming.has(name)) params.delete(name)
    })
    incoming.forEach((value, name) => {
      if (name !== 'embed' && name !== '_prototypeRevision' && !isShellOwnedServiceStateParam(name)) params.set(name, value)
    })
    params.delete('embed')
    activeVertical = successfulKind
      ? normalizeVertical(successfulKind)
      : inferVerticalFromPath((() => {
        try { return new URL(message.href, window.location.href).pathname } catch { return bookingFrame.contentWindow?.location?.pathname || '' }
      })())
    services = buildServices(params)
    clearIntegratedBookingContexts(params)
    if (message.result === 'service-added') {
      activeSearchSegment = ''
      const addedSegments = Array.isArray(message.segments) ? message.segments : []
      if (successfulKind === 'hotel') skippedTimelineSlots.delete('lodging')
      addedSegments.forEach(segment => skippedTimelineSlots.delete(segment))
      syncSkippedTimelineSlots()
    }
    syncServicesParam()
    renderHeader()
    renderDrawer()
    replaceParentUrl()
    saveTripLifecycle()
    if (message.result === 'service-added') {
      showServiceAddedState(successfulKind || activeVertical)
      animateOverviewUpdate()
      announceMessage('Услуга добавлена в командировку')
      return
    }
    openServices(overviewButton)
    drawerScroll.scrollTop = 0
    announceMessage('Командировка открыта')
  }

  function announceMessage(message) {
    announcer.textContent = ''
    window.requestAnimationFrame(() => { announcer.textContent = message })
  }

  function focusableElements(root) {
    return [...root.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.closest('[hidden]') && element.getClientRects().length > 0)
  }

  function trapFocus(event, root) {
    if (event.key !== 'Tab') return
    const focusable = focusableElements(root)
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  bookingFrame.addEventListener('load', () => {
    mergeVisibleFrameQuery()
    if (bookingStage.classList.contains('is-frame-loading')) setSearchBusy(true)
    resetEmbeddedFrameScroll()
    revealEmbeddedFrame()
    observeBookingFrameHeight()
  })

  searchForm.addEventListener('focusin', event => {
    const input = event.target.closest('[data-trip-suggest-field]')
    if (!input) return
    if (searchUi.kind !== 'suggest' || searchUi.field !== input.dataset.tripSuggestField) openSearchSuggestions(input)
  })

  searchForm.addEventListener('input', event => {
    const input = event.target.closest('[data-trip-suggest-field]')
    if (!input) return
    if (searchUi.kind !== 'suggest' || searchUi.field !== input.dataset.tripSuggestField) {
      openSearchSuggestions(input)
      return
    }
    searchUi.query = input.value
    searchUi.activeOption = 0
    renderSearchSuggestions()
  })

  searchForm.addEventListener('keydown', event => {
    const input = event.target.closest('[data-trip-suggest-field]')
    if (input && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      if (searchUi.kind !== 'suggest' || searchUi.field !== input.dataset.tripSuggestField) openSearchSuggestions(input)
      const suggestions = currentSearchSuggestions()
      if (suggestions.length) {
        const direction = event.key === 'ArrowDown' ? 1 : -1
        searchUi.activeOption = (searchUi.activeOption + direction + suggestions.length) % suggestions.length
        renderSearchSuggestions()
      }
      return
    }
    if (input && event.key === 'Enter' && searchUi.kind === 'suggest') {
      event.preventDefault()
      if (currentSearchSuggestions().length) selectSearchSuggestion(searchUi.activeOption)
      else {
        closeSearchPopover()
        searchForm.requestSubmit()
      }
      return
    }
    if (event.key === 'Escape' && searchUi.kind) {
      event.preventDefault()
      closeSearchPopover({ restoreFocus: true })
    }
  })

  searchForm.addEventListener('click', event => {
    const suggestInput = event.target.closest('[data-trip-suggest-field]')
    if (suggestInput && (searchUi.kind !== 'suggest' || searchUi.field !== suggestInput.dataset.tripSuggestField)) {
      openSearchSuggestions(suggestInput)
      return
    }
    const dateButton = event.target.closest('[data-trip-date-field]')
    if (dateButton) {
      const field = dateButton.dataset.tripDateField
      if (searchUi.kind === 'calendar' && searchUi.field === field) closeSearchPopover({ restoreFocus: true })
      else openSearchCalendar(field, dateButton)
      return
    }
    const actionTarget = event.target.closest('[data-search-action]')
    if (!actionTarget) return
    const action = actionTarget.dataset.searchAction
    if (action === 'select-suggestion') selectSearchSuggestion(Number(actionTarget.dataset.suggestionIndex))
    else if (action === 'change-month') {
      searchUi.calendarMonth = Number(actionTarget.dataset.month)
      searchUi.calendarYear = Number(actionTarget.dataset.year)
      renderSearchCalendar()
    } else if (action === 'select-date') chooseSearchCalendarDate(Number(actionTarget.dataset.day))
    else if (action === 'one-way') selectSearchOneWay()
  })

  searchForm.addEventListener('submit', event => {
    event.preventDefault()
    closeSearchPopover()
    submitTopSearch()
  })

  detailsForm.addEventListener('submit', event => {
    if (event.submitter?.dataset.saveTripDetails === undefined) return
    event.preventDefault()
    saveTripDetails()
  })

  window.addEventListener('message', event => {
    if (event.source !== bookingFrame.contentWindow) return
    const expectedOrigin = window.location.protocol === 'file:' ? 'null' : window.location.origin
    if (event.origin !== expectedOrigin) return
    if (event.data?.type === 'trip-v2:payment-complete') {
      completePayments(event.data.serviceIds)
      return
    }
    if (event.data?.type === 'trip-v2:open-services') {
      openServices(overviewButton)
      return
    }
    if (event.data?.type === 'trip-v2:return') mergeReturnMessage(event.data)
  })

  document.addEventListener('click', event => {
    if (searchUi.kind && !event.composedPath().includes(searchForm)) closeSearchPopover()
    if (!serviceChooser.hidden && !event.target.closest('.trip-add-service-control')) closeChooser({ restoreFocus: false })
    const paymentMethod = event.target.closest('[data-trip-payment-method]')
    if (paymentMethod) {
      selectedPaymentMethod = paymentMethod.dataset.tripPaymentMethod
      params.set('paymentMethod', selectedPaymentMethod)
      renderDrawer()
      replaceParentUrl()
      finalCost.querySelector(`[data-trip-payment-method="${CSS.escape(selectedPaymentMethod)}"]`)?.focus({ preventScroll: true })
      announceMessage(`Выбран способ оплаты: ${paymentMethod.textContent.trim()}`)
      return
    }
    const serviceAddedVertical = event.target.closest('[data-service-added-vertical]')
    if (serviceAddedVertical) {
      const vertical = normalizeVertical(serviceAddedVertical.dataset.serviceAddedVertical)
      loadVertical(vertical, { segment: '' })
      announceMessage(`Открыт поиск: ${VERTICALS[vertical].frameName}`)
      return
    }
    const verticalTab = event.target.closest('[data-trip-vertical]')
    if (verticalTab) {
      loadVertical(verticalTab.dataset.tripVertical, { segment: '' })
      return
    }

    const serviceChoice = event.target.closest('[data-choose-service]')
    if (serviceChoice) {
      chooseService(serviceChoice.dataset.chooseService, serviceChoice.dataset.tripSegment)
      return
    }

    const skippedSlot = event.target.closest('[data-skip-timeline-slot]')
    if (skippedSlot) {
      skipTimelineSlot(skippedSlot.dataset.skipTimelineSlot)
      return
    }

    if (event.target.closest('[data-close-chooser]')) {
      closeChooser()
      return
    }
    if (event.target.closest('[data-close-services]')) {
      closeServices()
      return
    }

    const remove = event.target.closest('[data-remove-service]')
    if (remove) {
      requestServiceRemoval(remove.dataset.removeService)
      return
    }
    const pay = event.target.closest('[data-open-payment]')
    if (pay) {
      openPaymentStage([pay.dataset.openPayment])
      return
    }

    const detailsTarget = event.target.closest('[data-service-details]')
    const nestedControl = event.target.closest('button, a, input, select, textarea')
    if (detailsTarget && !nestedControl) {
      const service = services.find(item => item.id === detailsTarget.dataset.serviceDetails)
      if (service?.kind === 'hotel' || service?.kind === 'avia') {
        const groupKey = String(service.id).split(':').slice(0, 2).join(':')
        const relatedSections = service.kind === 'avia'
          ? services
            .filter(item => item.kind === 'avia' && String(item.id).startsWith(`${groupKey}:`))
            .map(item => ({ ...serviceSnapshot(item), id: item.id, title: serviceDisplayTitle(item) }))
          : []
        document.dispatchEvent(new CustomEvent('trip:service-details', {
          detail: {
            section: { ...serviceSnapshot(service), id: service.id, title: serviceDisplayTitle(service) },
            relatedSections,
          },
        }))
        announceMessage(`Открыты детали услуги «${serviceDisplayTitle(service)}»`)
      }
      return
    }

    const action = event.target.closest('[data-trip-action]')?.dataset.tripAction
    if (action === 'open-chooser') {
      if (serviceChooser.hidden) openChooser(event.target.closest('[data-trip-action]'))
      else closeChooser()
    }
    else if (action === 'pay-all') payAllServices(event.target.closest('[data-trip-action]'))
    else if (action === 'show-details') showTripDetails()
    else if (action === 'edit-details') openDetailsEditor()
    else if (action === 'cancel-trip') cancelTrip()
    else if (action === 'trip-documents') announceMessage('Открыты документы по бронированию')
    else if (action === 'trip-support') announceMessage('Открыт чат с поддержкой')
  })

  overviewButton.addEventListener('click', () => openServices(overviewButton))

  removeDialog.addEventListener('click', event => {
    if (!event.target.closest('[data-confirm-remove-service]')) return
    const id = pendingRemovalId
    pendingRemovalId = ''
    removeDialog.close('remove')
    removeService(id)
  })

  removeDialog.addEventListener('close', () => { pendingRemovalId = '' })

  document.addEventListener('keydown', event => {
    const detailsTarget = event.target.closest('[data-service-details]')
    if (detailsTarget && event.target === detailsTarget && ['Enter', ' '].includes(event.key)) {
      event.preventDefault()
      const service = services.find(item => item.id === detailsTarget.dataset.serviceDetails)
      if (service?.kind === 'hotel' || service?.kind === 'avia') {
        const groupKey = String(service.id).split(':').slice(0, 2).join(':')
        const relatedSections = service.kind === 'avia'
          ? services
            .filter(item => item.kind === 'avia' && String(item.id).startsWith(`${groupKey}:`))
            .map(item => ({ ...serviceSnapshot(item), id: item.id, title: serviceDisplayTitle(item) }))
          : []
        document.dispatchEvent(new CustomEvent('trip:service-details', {
          detail: {
            section: { ...serviceSnapshot(service), id: service.id, title: serviceDisplayTitle(service) },
            relatedSections,
          },
        }))
        announceMessage(`Открыты детали услуги «${serviceDisplayTitle(service)}»`)
      }
      return
    }
    if (!detailsDialog.open && event.key === 'Escape' && !serviceChooser.hidden) {
      event.preventDefault()
      closeChooser()
      return
    }
    if (!detailsDialog.open && event.key === 'Escape' && !servicesOverlay.hidden) {
      event.preventDefault()
      closeServices()
      return
    }
    if (!serviceChooser.hidden) trapFocus(event, serviceChooser)
    else if (!servicesOverlay.hidden) trapFocus(event, servicesDrawer)
  })

  services = buildServices(params)
  renderAll()
  if (isOrderPage()) {
    bookingStage.hidden = true
  } else {
    loadVertical(activeVertical, { announce: false })
  }
  shell.dataset.ready = 'true'
  if (params.get('openServices') === '1') {
    window.requestAnimationFrame(() => openServices(overviewButton))
  }

  window.TripPagePrototype = Object.freeze({
    buildServices,
    buildFrameUrl,
    openServices,
    closeServices,
    loadVertical,
    openPaymentStage,
    mergeReturnMessage,
  })
})()
