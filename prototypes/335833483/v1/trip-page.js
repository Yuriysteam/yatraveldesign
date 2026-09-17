const summaryRoot = document.querySelector('#trip-summary')
const servicesRoot = document.querySelector('#trip-services')
const costRoot = document.querySelector('#trip-cost')
const popupLayer = document.querySelector('#trip-popup-layer')
const announcer = document.querySelector('#trip-announcer')
const PAYMENT_TIMER_SECONDS = 12 * 60
const EMPTY_COST_MESSAGE = 'Добавьте услуги в командировки потом сможете их сразу все оплатить'
const SERVICE_STATUSES = Object.freeze({
  'awaiting-payment': Object.freeze({ label: 'Ожидает оплаты', tone: 'warning' }),
  paid: Object.freeze({ label: 'Оплачена', tone: 'positive' }),
  'out-of-policy': Object.freeze({ label: 'Не в тревел политике', tone: 'negative' }),
  cancelled: Object.freeze({ label: 'Отменена', tone: 'neutral' }),
})
const SECTION_REMOVED_QUERY_PARAMS = Object.freeze({
  outbound: 'outboundRemoved',
  lodging: 'lodgingRemoved',
  return: 'returnRemoved',
})
const RAIL_COACH_LABELS = Object.freeze({
  platz: 'Плацкарт',
  coupe: 'Купе',
  sv: 'СВ',
  lux: 'Люкс',
})
const AVIA_BOOKING_STORAGE_KEY = 'business-trip-avia-booking-v1'
const BUSINESS_DRAFTS_STORAGE_KEY = 'business-trip-drafts-v1'
const BUSINESS_CANCELLED_TRIPS_STORAGE_KEY = 'business-trip-cancelled-v1'
const BUSINESS_PAID_TRIPS_STORAGE_KEY = 'business-trip-paid-v1'
const TRIP_SERVICES_QUERY_PARAM = 'tripServices'
const NOT_NEEDED_QUERY_PARAM = 'notNeeded'
const AVIA_FARE_FEATURES = Object.freeze({
  light: Object.freeze([
    'Ручная кладь 1 место, 10 кг, 55×40×25 см',
    'Без багажа',
    'Невозвратный',
    'Обмен с доплатой',
  ]),
  optimum: Object.freeze([
    'Ручная кладь 1 место, 10 кг, 55×40×25 см',
    'Багаж 1 место, 23 кг',
    'Возврат со сбором',
    'Обмен с доплатой',
  ]),
  maximum: Object.freeze([
    'Ручная кладь 1 место, 10 кг, 55×40×25 см',
    'Багаж 1 место, 30 кг',
    'Возврат включён',
    'Обмен включён',
  ]),
})
const PASSENGER_DOCUMENT_NAMES = Object.freeze({
  'passport-rf': 'Паспорт РФ',
  'foreign-passport': 'Загранпаспорт РФ',
  'foreign-document': 'Иностранный паспорт',
})
const MONTH_NAMES = Object.freeze({
  янв: 'января',
  фев: 'февраля',
  мар: 'марта',
  апр: 'апреля',
  май: 'мая',
  июн: 'июня',
  июл: 'июля',
  авг: 'августа',
  сен: 'сентября',
  окт: 'октября',
  ноя: 'ноября',
  дек: 'декабря',
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

let paymentTimerInterval = null

if (!summaryRoot || !servicesRoot || !costRoot || !popupLayer || !announcer) {
  throw new Error('Не найдены обязательные элементы страницы командировки')
}

const params = new URLSearchParams(window.location.search)
const isPastTrip = params.get('tripState') === 'past' || params.get('past') === '1'

function isAddingServicesLocked() {
  return trip?.cancelled || isPastTrip
}

function stableHash(value) {
  let hash = 2166136261
  for (const character of String(value || '')) {
    hash ^= character.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function serviceIdentity(section) {
  if (section?.serviceId) return String(section.serviceId)
  const booking = section?.booking || {}
  const identity = [
    section?.type,
    booking.kind,
    booking.hotelBookingId,
    booking.bookingId,
    booking.hotelName,
    booking.flightNumber,
    booking.trainNumber,
    booking.fromCity,
    booking.toCity,
    booking.dateLabel,
    booking.dateRange,
    booking.roomName,
    section?.price,
  ]
  return `${booking.kind || section?.type || 'service'}-${stableHash(JSON.stringify(identity))}`
}

function snapshotTripSection(section) {
  if (!section || section.state !== 'filled' || !section.booking) return null
  return {
    version: 1,
    serviceId: serviceIdentity(section),
    sourceSectionId: section.sourceSectionId || section.id,
    type: section.type,
    state: 'filled',
    date: section.date ? { ...section.date } : { tone: 'milestone' },
    title: section.title || 'Услуга',
    summary: section.summary || '',
    booking: JSON.parse(JSON.stringify(section.booking)),
    status: SERVICE_STATUSES[section.status] ? section.status : 'awaiting-payment',
    removable: section.removable !== false,
    serviceGroup: section.serviceGroup || serviceIdentity(section),
    serviceKind: section.serviceKind || '',
    price: Math.max(0, Number(section.price) || 0),
  }
}

function readPreservedTripServices() {
  try {
    const value = JSON.parse(params.get(TRIP_SERVICES_QUERY_PARAM) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function normalizePreservedTripSection(value, index) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  if (!value.booking || typeof value.booking !== 'object' || Array.isArray(value.booking)) return null
  if (!['transport', 'lodging'].includes(value.type)) return null
  const serviceId = String(value.serviceId || serviceIdentity(value))
  const sourceSectionId = ['outbound', 'lodging', 'return', 'custom'].includes(value.sourceSectionId)
    ? value.sourceSectionId
    : value.type === 'lodging' ? 'lodging' : 'outbound'
  return {
    ...value,
    id: `saved-${stableHash(`${serviceId}-${index}`)}`,
    serviceId,
    sourceSectionId,
    state: 'filled',
    date: value.date && typeof value.date === 'object' ? { ...value.date } : { tone: 'milestone' },
    status: SERVICE_STATUSES[value.status] ? value.status : 'awaiting-payment',
    removable: value.removable !== false,
    price: Math.max(0, Number(value.price) || 0),
    isPreserved: true,
    actions: [],
  }
}

function mergePreservedTripServices(baseSections) {
  const preserved = readPreservedTripServices()
    .map(normalizePreservedTripSection)
    .filter(Boolean)
  if (preserved.length === 0) return baseSections

  const baseByServiceId = new Map()
  baseSections.filter(section => section.state === 'filled').forEach(section => {
    section.serviceId = serviceIdentity(section)
    baseByServiceId.set(section.serviceId, section)
  })

  const extras = []
  const seen = new Set()
  preserved.forEach(saved => {
    if (seen.has(saved.serviceId)) return
    seen.add(saved.serviceId)
    const current = baseByServiceId.get(saved.serviceId)
    if (!current) {
      extras.push(saved)
      return
    }

    const currentId = current.id
    const currentActions = current.actions
    const currentTone = current.date?.tone
    const status = current.status === 'paid' || saved.status === 'paid' ? 'paid' : current.status || saved.status
    Object.assign(current, saved, {
      id: currentId,
      sourceSectionId: current.sourceSectionId || currentId,
      actions: currentActions,
      date: { ...saved.date, tone: currentTone || saved.date?.tone },
      status,
      isPreserved: false,
    })
  })

  const extrasBySource = new Map()
  extras.forEach(section => {
    const source = section.sourceSectionId
    if (!extrasBySource.has(source)) extrasBySource.set(source, [])
    extrasBySource.get(source).push(section)
  })

  const merged = []
  baseSections.forEach(section => {
    const related = extrasBySource.get(section.id) || []
    related.forEach(saved => merged.push(saved))
    extrasBySource.delete(section.id)
    const hasActiveRelated = related.some(saved => saved.status !== 'cancelled')
    if (!(section.state === 'empty' && hasActiveRelated)) merged.push(section)
  })
  extrasBySource.forEach(list => list.forEach(section => merged.push(section)))
  return merged
}

function preserveTripServicesInUrl(target, sections) {
  const snapshots = (sections || [])
    .map(snapshotTripSection)
    .filter(Boolean)
  if (snapshots.length > 0) target.searchParams.set(TRIP_SERVICES_QUERY_PARAM, JSON.stringify(snapshots))
  else target.searchParams.delete(TRIP_SERVICES_QUERY_PARAM)
  return window.TripStateTransport?.compactUrl(target) || target
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function param(name, fallback) {
  const value = params.get(name)?.trim()
  return value || fallback
}

function participantSummary(adults = 1, children = 0) {
  const adultCount = Math.max(1, Number(adults) || 1)
  const childCount = Math.max(0, Number(children) || 0)
  const adultWord = adultCount % 10 === 1 && adultCount % 100 !== 11 ? 'взрослый' : 'взрослых'
  const childWord = childCount % 10 === 1 && childCount % 100 !== 11 ? 'ребёнок' : 'детей'
  return `${adultCount} ${adultWord}${childCount > 0 ? `, ${childCount} ${childWord}` : ''}`
}

function isTripSectionRemoved(sectionId) {
  const queryName = SECTION_REMOVED_QUERY_PARAMS[sectionId]
  return Boolean(queryName && params.get(queryName) === '1')
}

function serviceRemovedQueryName(section) {
  const sourceSectionId = section?.sourceSectionId || section?.id
  if (section?.booking?.kind === 'rail') {
    return sourceSectionId === 'return' ? 'railReturnRemoved' : 'railOutboundRemoved'
  }
  if (section?.booking?.kind === 'flight') {
    return sourceSectionId === 'return' ? 'flightReturnRemoved' : 'flightOutboundRemoved'
  }
  return SECTION_REMOVED_QUERY_PARAMS[sourceSectionId] || ''
}

function parseDate(value, fallback) {
  const normalized = String(value || '').trim()
  const match = normalized.match(/^(\d{1,2})\s+([а-яё]{3})/iu)
  if (!match) return fallback
  return { day: match[1], month: match[2].toLocaleLowerCase('ru') }
}

function formatDateRange(departure, returning) {
  if (!returning) return `${departure.day} ${departure.month}`
  if (departure.month === returning.month) return `${departure.day} — ${returning.day} ${returning.month}`
  return `${departure.day} ${departure.month} — ${returning.day} ${returning.month}`
}

function isSameDate(first, second) {
  return Boolean(first?.day && second?.day && first?.month && second?.month)
    && first.day === second.day
    && first.month === second.month
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

function sectionTimelineDate(section, departure, returning) {
  const explicitDate = normalizeTimelineDate(section?.date)
  if (explicitDate) return explicitDate

  const bookingDate = parseTimelineDateLabel(section?.booking?.dateLabel)
    || parseTimelineDateLabel(section?.booking?.dateRange)
  if (bookingDate) return bookingDate

  const sourceSectionId = section?.sourceSectionId || section?.id
  return normalizeTimelineDate(sourceSectionId === 'return' ? returning : departure)
}

function timelineDateOrdinal(date, departure) {
  const month = TIMELINE_MONTH_INDEX[date.month]
  const startMonth = TIMELINE_MONTH_INDEX[normalizeTimelineDate(departure)?.month] ?? month
  const relativeMonth = (month - startMonth + 12) % 12
  return relativeMonth * 32 + Number(date.day)
}

function timelineCalendarDate(date, departure) {
  const normalized = normalizeTimelineDate(date)
  const normalizedDeparture = normalizeTimelineDate(departure)
  if (!normalized || !normalizedDeparture) return null
  const month = TIMELINE_MONTH_INDEX[normalized.month]
  const departureMonth = TIMELINE_MONTH_INDEX[normalizedDeparture.month]
  const year = month < departureMonth ? 2027 : 2026
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

function rebuildFreeDaySections(sections, departure, returning, destinationCity) {
  const withoutFreeDays = (sections || []).filter(section => section.type !== 'trip-card')
  if (!withoutFreeDays.some(section => section.state === 'filled' && section.status !== 'cancelled')) return withoutFreeDays
  const tripStart = timelineCalendarDate(departure, departure)
  const tripEnd = timelineCalendarDate(returning, departure)
  if (!tripStart || !tripEnd || tripEnd < tripStart) return withoutFreeDays

  const lodgingSections = withoutFreeDays.filter(section => (
    section.type === 'lodging'
    && section.status !== 'cancelled'
    && (section.state === 'filled' || section.suggestedRange)
  ))
  const occupiedDays = new Set()
  withoutFreeDays.forEach(section => {
    const actualDate = sectionTimelineDate(section, departure, returning)
    const calendarDate = timelineCalendarDate(actualDate, departure)
    if (calendarDate) occupiedDays.add(timelineCalendarKey(calendarDate))
  })

  const lodgingIntervals = lodgingSections.map(section => {
    const suggestedCheckin = normalizeTimelineDate(section.suggestedRange?.checkin)
    const suggestedCheckout = normalizeTimelineDate(section.suggestedRange?.checkout)
    const startDate = suggestedCheckin || sectionTimelineDate(section, departure, returning)
    const endDate = suggestedCheckout
      || normalizeTimelineDate(section.booking?.endDate)
      || parseTimelineDateRangeEnd(section.booking?.dateRange, startDate)
    const start = timelineCalendarDate(startDate, departure)
    const end = timelineCalendarDate(endDate, departure)
    return start && end && end > start ? { start, end } : null
  }).filter(Boolean)

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
        id: `free-interval-${timelineCalendarKey(intervalStart)}`,
        type: 'trip-card',
        state: 'empty-day',
        date: { ...date, tone: 'normal' },
        endDate,
        title: `Свободно до ${endDate.day} ${MONTH_NAMES[endDate.month] || endDate.month}`,
        city: destinationCity,
        removable: false,
        serviceGroup: null,
        price: 0,
      })
  }

  return [...withoutFreeDays, ...freeIntervals]
}

function sortTripSectionsByDate(sections, departure, returning) {
  const ordered = (sections || []).map((section, index) => ({
    section,
    index,
    actualDate: sectionTimelineDate(section, departure, returning),
  }))

  ordered.sort((first, second) => {
    if (!first.actualDate && !second.actualDate) return first.index - second.index
    if (!first.actualDate) return 1
    if (!second.actualDate) return -1
    return timelineDateOrdinal(first.actualDate, departure) - timelineDateOrdinal(second.actualDate, departure)
      || first.index - second.index
  })

  let previousDateKey = ''
  ordered.forEach(item => {
    if (!item.actualDate) {
      previousDateKey = ''
      return
    }
    const dateKey = `${item.actualDate.month}-${item.actualDate.day}`
    item.section.date = {
      ...item.actualDate,
      tone: dateKey === previousDateKey ? 'milestone' : 'normal',
    }
    previousDateKey = dateKey
  })

  return ordered.map(item => item.section)
}

function positionEmptyLodgingBetweenTransports(sections, departure, returning) {
  const withoutGeneratedGaps = (sections || []).filter(section => section.type !== 'service-gap')
  const emptyLodgingSections = withoutGeneratedGaps.filter(section => section.type === 'lodging' && section.state === 'empty')
  if (emptyLodgingSections.length === 0) return withoutGeneratedGaps
  const withoutEmptyLodging = () => withoutGeneratedGaps.filter(section => !emptyLodgingSections.includes(section))

  const outboundDates = withoutGeneratedGaps
    .filter(section => section.type === 'transport' && (section.sourceSectionId || section.id) === 'outbound')
    .map(section => sectionTimelineDate(section, departure, returning))
    .filter(Boolean)
    .sort((first, second) => timelineDateOrdinal(first, departure) - timelineDateOrdinal(second, departure))
  if (outboundDates.length === 0) return withoutEmptyLodging()

  const returnDates = withoutGeneratedGaps
    .filter(section => section.type === 'transport' && (section.sourceSectionId || section.id) === 'return')
    .map(section => sectionTimelineDate(section, departure, returning))
    .filter(Boolean)
    .sort((first, second) => timelineDateOrdinal(first, departure) - timelineDateOrdinal(second, departure))
  if (returnDates.length === 0) return withoutEmptyLodging()

  const firstReturnDate = returnDates[0]
  const firstReturnOrdinal = timelineDateOrdinal(firstReturnDate, departure)
  const datesBeforeReturn = outboundDates.filter(date => timelineDateOrdinal(date, departure) < firstReturnOrdinal)
  const sameDayOutbound = outboundDates.find(date => timelineDateOrdinal(date, departure) === firstReturnOrdinal)
  const lodgingAnchor = datesBeforeReturn.at(-1) || sameDayOutbound
  if (!lodgingAnchor) return withoutEmptyLodging()

  emptyLodgingSections.forEach(section => {
    section.date = { ...lodgingAnchor, tone: 'milestone' }
    section.suggestedRange = {
      checkin: { ...lodgingAnchor },
      checkout: { ...firstReturnDate },
    }
  })
  return withoutGeneratedGaps
}

function addTripStartServiceGap(sections, departure, returning, destinationCity) {
  const tripStart = normalizeTimelineDate(departure)
  if (!tripStart) return sections

  const datedSections = (sections || []).map(section => ({
    section,
    date: sectionTimelineDate(section, departure, returning),
  })).filter(item => item.date)
  const hasSectionOnStart = datedSections.some(item => isSameDate(item.date, tripStart))
  const hasLaterSection = datedSections.some(item => (
    timelineDateOrdinal(item.date, departure) > timelineDateOrdinal(tripStart, departure)
  ))
  if (hasSectionOnStart || !hasLaterSection) return sections

  const startKey = `${tripStart.month}-${tripStart.day}`
  return [...sections, {
    id: `service-gap-${startKey}`,
    type: 'service-gap',
    state: 'empty-services',
    date: { ...tripStart, tone: 'normal' },
    title: 'Добавить услуги',
    city: destinationCity,
    removable: false,
    serviceGroup: null,
    price: 0,
  }]
}

function addHotelCheckoutSections(sections, departure, returning) {
  const cleanSections = (sections || []).filter(section => section.type !== 'hotel-checkout')
  const result = []
  cleanSections.forEach(section => {
    result.push(section)
    if (section.type !== 'lodging' || section.state !== 'filled' || section.status === 'cancelled' || !section.booking) return
    const startDate = sectionTimelineDate(section, departure, returning)
    const checkoutDate = normalizeTimelineDate(section.booking.endDate)
      || parseTimelineDateRangeEnd(section.booking.dateRange, startDate)
      || normalizeTimelineDate(returning)
    if (!checkoutDate) return
    result.push({
      id: `hotel-checkout-${stableHash(serviceIdentity(section))}`,
      checkoutFor: serviceIdentity(section),
      type: 'hotel-checkout',
      state: 'display',
      date: { ...checkoutDate, tone: 'normal' },
      title: 'Выезд из отеля',
      removable: false,
      serviceGroup: null,
      price: 0,
    })
  })
  return result
}

function buildChronologicalTimeline(sections, departure, returning, destinationCity) {
  const positionedSections = positionEmptyLodgingBetweenTransports(
    addHotelCheckoutSections(sections, departure, returning),
    departure,
    returning,
  )
  const sectionsWithFreeDays = rebuildFreeDaySections(positionedSections, departure, returning, destinationCity)
  const chronological = sortTripSectionsByDate(
    addTripStartServiceGap(sectionsWithFreeDays, departure, returning, destinationCity),
    departure,
    returning,
  )
  const checkoutsByHotel = new Map()
  chronological.filter(section => section.type === 'hotel-checkout' && section.checkoutFor).forEach(section => {
    checkoutsByHotel.set(section.checkoutFor, section)
  })
  return chronological
    .filter(section => section.type !== 'hotel-checkout')
    .flatMap(section => [section, ...(checkoutsByHotel.get(serviceIdentity(section)) ? [checkoutsByHotel.get(serviceIdentity(section))] : [])])
}

const cityCases = {
  'Москва': { accusative: 'Москву', prepositional: 'Москве' },
  'Санкт-Петербург': { accusative: 'Санкт-Петербург', prepositional: 'Санкт-Петербурге' },
  'Екатеринбург': { accusative: 'Екатеринбург', prepositional: 'Екатеринбурге' },
  'Пятигорск': { accusative: 'Пятигорск', prepositional: 'Пятигорске' },
  'Кострома': { accusative: 'Кострому', prepositional: 'Костроме' },
  'Казань': { accusative: 'Казань', prepositional: 'Казани' },
  'Новороссийск': { accusative: 'Новороссийск', prepositional: 'Новороссийске' },
  'Сочи': { accusative: 'Сочи', prepositional: 'Сочи' },
}

function cityInCase(city, grammaticalCase) {
  return cityCases[city]?.[grammaticalCase] || city
}

function formatMoney(value) {
  return `${new Intl.NumberFormat('ru-RU').format(Math.max(0, Math.round(Number(value) || 0)))} ₽`
}

function paymentButtonLabel(value) {
  return 'Оплатить'
}

function airlineLogo(airline) {
  const normalized = String(airline || '').toLocaleLowerCase('ru')
  if (normalized.includes('побед')) return './assets/avia/pobeda-tile.svg'
  if (normalized.includes('southwind')) return './assets/avia/southwind.svg'
  if (normalized.includes('ajet')) return './assets/avia/ajet.svg'
  if (normalized.includes('росси')) return './assets/avia-confirmation/rossiya.png'
  return './assets/avia-booking/aeroflot.png'
}

const FLIGHT_CITY_BY_AIRPORT_CODE = Object.freeze({
  AER: 'Сочи',
  IST: 'Стамбул',
  KZN: 'Казань',
  LED: 'Санкт-Петербург',
  SAW: 'Стамбул',
  SVO: 'Москва',
  SVX: 'Екатеринбург',
  VKO: 'Москва',
})

function flightCity(cityParam, airportCodeParam, fallback) {
  const explicitCity = params.get(cityParam)?.trim()
  if (explicitCity) return explicitCity
  const airportCode = params.get(airportCodeParam)?.trim().toLocaleUpperCase('en-US')
  return FLIGHT_CITY_BY_AIRPORT_CODE[airportCode] || fallback
}

function numberParam(name) {
  const value = Number(String(params.get(name) || '').replace(',', '.'))
  return Number.isFinite(value) && value > 0 ? value : 0
}

function hasReturnValue(value) {
  const normalized = String(value || '').trim()
  return Boolean(normalized) && !/^(?:нет|без|без обратного|—|-|one[\s-]?way)$/iu.test(normalized)
}

function formatRailSeats(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const match = item.match(/^(\d+)[-:](\d+)$/u)
      return match ? `вагон ${match[1]}, место ${match[2]}` : item
    })
    .join(' · ')
}

function buildRailBooking(prefix, fallback) {
  const coachId = params.get(`${prefix}Coach`)?.trim() || ''
  return {
    kind: 'rail',
    bookingId: params.get(`${prefix}BookingId`)?.trim() || params.get('railBookingId')?.trim() || '',
    carrier: param(`${prefix}Carrier`, 'РЖД/ФПК'),
    trainNumber: param(`${prefix}TrainNumber`, '—'),
    brand: params.get(`${prefix}Brand`)?.trim() || '',
    departTime: param(`${prefix}DepartTime`, '—'),
    arrivalTime: param(`${prefix}ArrivalTime`, '—'),
    duration: param(`${prefix}Duration`, 'Время в пути уточняется'),
    fromCity: param(`${prefix}From`, fallback.fromCity),
    toCity: param(`${prefix}To`, fallback.toCity),
    fromStation: param(`${prefix}FromStation`, `${fallback.fromCity}, вокзал`),
    toStation: param(`${prefix}ToStation`, `${fallback.toCity}, вокзал`),
    coach: RAIL_COACH_LABELS[coachId] || coachId || 'Вагон',
    seats: formatRailSeats(params.get(`${prefix}Seats`)),
    dateLabel: fallback.dateLabel,
    passenger: fallback.passenger,
    traveller: fallback.traveller,
  }
}

function readAviaBookingSnapshot(bookingId) {
  if (!bookingId) return null
  try {
    const raw = window.sessionStorage.getItem(AVIA_BOOKING_STORAGE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    if (value.bookingId?.trim() !== bookingId) return null
    return value
  } catch {
    return null
  }
}

function readRailBookingSnapshot(bookingId) {
  if (!bookingId) return null
  try {
    const raw = window.sessionStorage.getItem(`rail-booking:${bookingId}`)
    if (!raw) return null
    const value = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value
  } catch {
    return null
  }
}

function titleCaseNamePart(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('ru')
    .replace(/(^|[-\s])([\p{L}])/gu, (_, prefix, letter) => `${prefix}${letter.toLocaleUpperCase('ru')}`)
}

function passengerViewModel(snapshot) {
  const passenger = Array.isArray(snapshot?.passengers) ? snapshot.passengers[0] : null
  if (!passenger) {
    return {
      name: 'Иван Иванов',
      details: '11.11.1990 · Паспорт РФ',
    }
  }

  const name = passenger.displayName?.trim()
    || [passenger.givenName, passenger.surname].map(titleCaseNamePart).filter(Boolean).join(' ')
    || 'Иван Иванов'
  const documentName = PASSENGER_DOCUMENT_NAMES[passenger.documentType] || 'Документ'
  const documentDigits = String(passenger.documentNumber || '').replace(/\D/gu, '')
  const document = documentDigits ? `${documentName} *${documentDigits.slice(-4)}` : documentName
  const birthDate = passenger.birthDate?.trim() || '11.11.1990'
  return {
    name,
    details: `${birthDate} · ${document}`,
  }
}

function formatBookingDate(date) {
  if (!date?.day || !date?.month) return ''
  return `${date.day} ${MONTH_NAMES[date.month] || date.month}`
}

function buildCostItems(sections) {
  const groups = new Map()
  sections.filter(section => section.state === 'filled' && section.status !== 'cancelled').forEach(section => {
    const key = section.serviceGroup || section.id
    if (!groups.has(key)) groups.set(key, {
      key,
      kind: section.serviceKind || String(key).split(':')[0],
      sections: [],
      price: 0,
      payablePrice: 0,
    })
    const group = groups.get(key)
    group.sections.push(section)
    const price = Math.max(0, Number(section.price) || 0)
    group.price += price
    if (section.status === 'awaiting-payment') group.payablePrice += price
  })

  return [...groups.values()].map(group => {
    const section = group.sections[0]
    const booking = section?.booking
    let label = 'Услуга'
    let details = []
    if (group.kind === 'avia-roundtrip') label = 'Авиабилеты'
    else if (group.kind === 'avia-oneway') label = 'Авиабилет'
    else if (group.kind === 'rail-roundtrip') label = 'Ж/д билеты'
    else if (group.kind === 'rail-oneway') label = 'Ж/д билет'
    else if (group.kind === 'hotel') label = 'Жильё'

    if (booking?.kind === 'flight') details = booking.fareFeatures || []
    else if (booking?.kind === 'rail') details = [booking.coach, booking.seats].filter(Boolean)
    else if (section?.type === 'lodging') {
      details = [booking?.roomName, booking?.cancellation, booking?.meal].filter(Boolean)
    }

    return {
      key: group.key,
      label,
      price: group.price,
      payablePrice: group.payablePrice,
      amount: formatMoney(group.price),
      payableAmount: formatMoney(group.payablePrice),
      details,
      payable: group.payablePrice > 0,
    }
  })
}

function buildTripModel() {
  const appendsToRoute = params.get('serviceSlot') === 'append'
  const originCity = param('tripFrom', param('from', 'Москва'))
  const destinationCity = param('tripTo', param('to', 'Санкт-Петербург'))
  const hotelCity = param('city', destinationCity)
  const adults = Math.max(1, Number(params.get('tripAdults') || params.get('adults')) || 1)
  const children = Math.max(0, Number(params.get('tripChildren') || params.get('children')) || 0)
  const departure = parseDate(param('depart', '23 окт'), { day: '23', month: 'окт' })
  const returnValue = params.get('return')?.trim() || ''
  const hasReturnRoute = hasReturnValue(returnValue)
  const returning = hasReturnRoute
    ? parseDate(returnValue, { day: '28', month: 'окт' })
    : null
  const hotelCheckin = parseDate(param('checkin', param('depart', '23 окт')), departure)
  const hotelCheckoutValue = params.get('checkout')?.trim() || returnValue
  const hotelCheckout = hasReturnValue(hotelCheckoutValue)
    ? parseDate(hotelCheckoutValue, returning || hotelCheckin)
    : null
  const flightOutboundDate = parseDate(param('flightOutboundDate', param('depart', '23 окт')), departure)
  const flightReturnDateValue = params.get('flightReturnDate')?.trim() || returnValue
  const hasFlightReturnDate = hasReturnValue(flightReturnDateValue)
  const flightReturnDate = hasFlightReturnDate
    ? parseDate(flightReturnDateValue, returning || flightOutboundDate)
    : null
  const railOutboundDate = parseDate(param('railOutboundDate', param('depart', '23 окт')), departure)
  const railReturnDateValue = params.get('railReturnDate')?.trim() || returnValue
  const hasRailReturnDate = hasReturnValue(railReturnDateValue)
  const railReturnDate = hasRailReturnDate
    ? parseDate(railReturnDateValue, returning || railOutboundDate)
    : null
  const outboundRemoved = isTripSectionRemoved('outbound')
  const lodgingRemoved = isTripSectionRemoved('lodging')
  const returnRemoved = isTripSectionRemoved('return')
  const hotelName = params.get('hotelName')?.trim()
  const hotelAddress = params.get('hotelAddress')?.trim()
  const hotelId = params.get('hotel')?.trim() || 'azimut'
  const hotelBookingId = params.get('hotelBookingId')?.trim() || ''
  const roomName = params.get('room')?.trim()
  const tariffName = params.get('tariff')?.trim() || ''
  const hotelPrice = Math.max(0, Number(params.get('hotelPrice')) || 0)
  const requestedHotelStatus = params.get('hotelStatus')?.trim()
  const hotelStatus = SERVICE_STATUSES[requestedHotelStatus] ? requestedHotelStatus : 'awaiting-payment'
  const hasHotel = Boolean(hotelName && hotelPrice) && !lodgingRemoved
  const requestedRailStatus = params.get('railStatus')?.trim()
  const railStatus = SERVICE_STATUSES[requestedRailStatus] ? requestedRailStatus : 'awaiting-payment'
  const requestedRailOutboundStatus = params.get('railOutboundStatus')?.trim()
  const requestedRailReturnStatus = params.get('railReturnStatus')?.trim()
  const railOutboundStatus = SERVICE_STATUSES[requestedRailOutboundStatus] ? requestedRailOutboundStatus : railStatus
  const railReturnStatus = SERVICE_STATUSES[requestedRailReturnStatus] ? requestedRailReturnStatus : railStatus
  const railScope = params.get('railScope') === 'roundtrip' && hasRailReturnDate ? 'roundtrip' : 'oneway'
  const railOutboundTotal = numberParam('railOutboundTotal')
  const railReturnTotal = numberParam('railReturnTotal')
  const hasRailOutbound = Boolean(params.get('railOutboundTrainId')?.trim()
    || params.get('railOutboundTrainNumber')?.trim()) && railOutboundTotal > 0
  const hasRailReturn = Boolean(params.get('railReturnTrainId')?.trim()
    || params.get('railReturnTrainNumber')?.trim()) && railReturnTotal > 0
  const wantsRail = params.get('railAdded') === '1'
  const hasRailOutboundBooking = (wantsRail || params.get('railOutboundAdded') === '1')
    && hasRailOutbound && !outboundRemoved && params.get('railOutboundRemoved') !== '1'
  const hasRailReturnBooking = ((wantsRail && railScope === 'roundtrip') || params.get('railReturnAdded') === '1')
    && hasReturnRoute && hasRailReturn && !returnRemoved && params.get('railReturnRemoved') !== '1'
  const requestedFlightStatus = params.get('flightStatus')?.trim()
  const flightStatus = SERVICE_STATUSES[requestedFlightStatus] ? requestedFlightStatus : 'awaiting-payment'
  const requestedFlightOutboundStatus = params.get('flightOutboundStatus')?.trim()
  const requestedFlightReturnStatus = params.get('flightReturnStatus')?.trim()
  const flightOutboundStatus = SERVICE_STATUSES[requestedFlightOutboundStatus] ? requestedFlightOutboundStatus : flightStatus
  const flightReturnStatus = SERVICE_STATUSES[requestedFlightReturnStatus] ? requestedFlightReturnStatus : flightStatus
  const hasLegacyFlight = params.get('flightAdded') === '1'
  const hasReturnFlightDetails = hasFlightReturnDate
    && Boolean(params.get('returnFlightNumber')?.trim())
    && Boolean(params.get('returnFromCode')?.trim())
    && Boolean(params.get('returnToCode')?.trim())
  const recoversTruncatedRoundTrip = params.get('flightScope') === 'oneway'
    && params.get('segment') === 'outbound'
    && params.get('flightOutboundAdded') === '1'
    && params.get('flightAdded') === '0'
    && hasReturnFlightDetails
  const flightScope = (params.get('flightScope') === 'roundtrip' || recoversTruncatedRoundTrip) && hasFlightReturnDate
    ? 'roundtrip'
    : 'oneway'
  const hasFlightOutbound = (hasLegacyFlight || params.get('flightOutboundAdded') === '1')
    && !outboundRemoved && params.get('flightOutboundRemoved') !== '1'
  const hasFlightReturn = (hasLegacyFlight && flightScope === 'roundtrip'
    || params.get('flightReturnAdded') === '1'
    || recoversTruncatedRoundTrip)
    && !returnRemoved && params.get('flightReturnRemoved') !== '1'
  const flightPrice = Math.max(0, Number(params.get('flightTotalPrice')) || Number(params.get('flightPrice')) || 0)
  const flightTariff = param('flightTariffName', param('flightTariff', 'Эконом Лайт'))
  const bookingId = params.get('bookingId')?.trim() || ''
  const flightOutboundBookingId = params.get('flightOutboundBookingId')?.trim() || bookingId
  const flightReturnBookingId = params.get('flightReturnBookingId')?.trim() || bookingId
  const activeFlightBookingId = params.get('flightReturnBookingId')?.trim()
    || params.get('flightOutboundBookingId')?.trim()
    || bookingId
  const aviaBookingSnapshot = readAviaBookingSnapshot(activeFlightBookingId)
  const railBookingId = params.get('railBookingId')?.trim() || ''
  const railOutboundBookingId = params.get('railOutboundBookingId')?.trim() || railBookingId
  const railReturnBookingId = params.get('railReturnBookingId')?.trim() || railBookingId
  const activeRailBookingId = params.get('railReturnBookingId')?.trim()
    || params.get('railOutboundBookingId')?.trim()
    || railBookingId
  const railBookingSnapshot = readRailBookingSnapshot(activeRailBookingId)
  const defaultPassenger = passengerViewModel(null)
  const customPassenger = {
    name: param('passengerName', defaultPassenger.name),
    details: param('passengerDetails', defaultPassenger.details),
  }
  const passenger = aviaBookingSnapshot ? passengerViewModel(aviaBookingSnapshot) : customPassenger
  const railPassenger = railBookingSnapshot ? passengerViewModel(railBookingSnapshot) : customPassenger
  const flightFareId = param('flightTariff', 'light')
  const flightFareFeatures = Array.isArray(aviaBookingSnapshot?.fare?.features)
    ? aviaBookingSnapshot.fare.features
    : AVIA_FARE_FEATURES[flightFareId] || AVIA_FARE_FEATURES.light
  const requestedTraveller = params.get('traveller')?.trim()
  const serviceTraveller = requestedTraveller && requestedTraveller !== 'Едете вы'
    ? requestedTraveller
    : participantSummary(adults, children)
  const tripTraveller = params.get('tripTraveller')?.trim() || participantSummary(adults, children)
  const travellerNames = params.get('travellerNames')?.trim() || ''
  const servicePassenger = travellerNames
    ? { name: travellerNames, details: serviceTraveller }
    : passenger
  const outboundAirline = param('flightAirline', 'Аэрофлот')
  const returnAirline = param('returnAirline', outboundAirline)
  const outboundFlightBooking = hasFlightOutbound ? {
    kind: 'flight',
    airline: outboundAirline,
    logo: airlineLogo(outboundAirline),
    flightNumber: param('flightNumber', 'SU 6026'),
    departTime: param('flightDepartTime', '15:20'),
    arrivalTime: param('flightArrivalTime', '17:30'),
    duration: param('flightDuration', '2 ч 10 мин'),
    fromCode: param('flightFromCode', 'SVO'),
    toCode: param('flightToCode', 'LED'),
    fromCity: flightCity('flightFrom', 'flightFromCode', originCity),
    toCity: flightCity('flightTo', 'flightToCode', destinationCity),
    fromAirport: param('flightFromAirport', 'Шереметьево'),
    toAirport: param('flightToAirport', 'Пулково'),
    tariff: flightTariff,
    fareFeatures: flightFareFeatures,
    dateLabel: formatBookingDate(flightOutboundDate),
    passenger: servicePassenger,
    traveller: serviceTraveller,
    bookingId: flightOutboundBookingId,
  } : null
  const returnFlightBooking = hasFlightReturn && hasReturnRoute ? {
    kind: 'flight',
    airline: returnAirline,
    logo: airlineLogo(returnAirline),
    flightNumber: param('returnFlightNumber', 'SU 6027'),
    departTime: param('returnDepartTime', '18:30'),
    arrivalTime: param('returnArrivalTime', '20:40'),
    duration: param('returnDuration', '2 ч 10 мин'),
    fromCode: param('returnFromCode', 'LED'),
    toCode: param('returnToCode', 'SVO'),
    fromCity: flightCity('returnFrom', 'returnFromCode', destinationCity),
    toCity: flightCity('returnTo', 'returnToCode', originCity),
    fromAirport: param('returnFromAirport', 'Пулково'),
    toAirport: param('returnToAirport', 'Шереметьево'),
    tariff: flightTariff,
    fareFeatures: flightFareFeatures,
    dateLabel: formatBookingDate(flightReturnDate),
    passenger: servicePassenger,
    traveller: serviceTraveller,
    bookingId: flightReturnBookingId,
  } : null

  const outboundRailBooking = hasRailOutboundBooking
    ? buildRailBooking('railOutbound', {
      fromCity: originCity,
      toCity: destinationCity,
      traveller: serviceTraveller,
      dateLabel: formatBookingDate(railOutboundDate),
      passenger: travellerNames ? servicePassenger : railPassenger,
    })
    : null
  const returnRailBooking = hasRailReturnBooking
    ? buildRailBooking('railReturn', {
      fromCity: destinationCity,
      toCity: originCity,
      traveller: serviceTraveller,
      dateLabel: formatBookingDate(railReturnDate),
      passenger: travellerNames ? servicePassenger : railPassenger,
    })
    : null
  const railBookingCount = Number(Boolean(outboundRailBooking)) + Number(Boolean(returnRailBooking))
  const flightBookingCount = Number(Boolean(outboundFlightBooking)) + Number(Boolean(returnFlightBooking))
  const railLegacyBundleId = railBookingId || `legacy-${stableHash(JSON.stringify([
    outboundRailBooking?.trainNumber,
    returnRailBooking?.trainNumber,
    railOutboundDate,
    railReturnDate,
  ]))}`
  const flightLegacyBundleId = bookingId || `legacy-${stableHash(JSON.stringify([
    outboundFlightBooking?.flightNumber,
    returnFlightBooking?.flightNumber,
    flightOutboundDate,
    flightReturnDate,
  ]))}`
  const railOutboundBundleId = railOutboundBookingId || railLegacyBundleId
  const railReturnBundleId = railReturnBookingId || railLegacyBundleId
  const flightOutboundBundleId = flightOutboundBookingId || flightLegacyBundleId
  const flightReturnBundleId = flightReturnBookingId || flightLegacyBundleId
  const railIsRoundTripBundle = railBookingCount > 1 && railOutboundBundleId === railReturnBundleId
  const flightIsRoundTripBundle = flightBookingCount > 1 && flightOutboundBundleId === flightReturnBundleId
  const railOutboundGroupKind = railIsRoundTripBundle ? 'rail-roundtrip' : 'rail-oneway'
  const railReturnGroupKind = railIsRoundTripBundle ? 'rail-roundtrip' : 'rail-oneway'
  const flightOutboundGroupKind = flightIsRoundTripBundle ? 'avia-roundtrip' : 'avia-oneway'
  const flightReturnGroupKind = flightIsRoundTripBundle ? 'avia-roundtrip' : 'avia-oneway'
  const hotelBundleId = hotelBookingId || `legacy-${stableHash(JSON.stringify([
    hotelId,
    hotelCheckin,
    hotelCheckout,
    roomName,
    hotelPrice,
  ]))}`
  const outboundBooking = outboundRailBooking || outboundFlightBooking
  const outboundStatus = outboundRailBooking ? railOutboundStatus : outboundFlightBooking ? flightOutboundStatus : null
  const outboundGroup = outboundRailBooking
    ? `${railOutboundGroupKind}:${railOutboundBundleId}`
    : outboundFlightBooking ? `${flightOutboundGroupKind}:${flightOutboundBundleId}` : null
  const flightOutboundTotal = numberParam('flightOutboundTotal') || flightPrice
  const flightReturnTotal = numberParam('flightReturnTotal') || (hasLegacyFlight || recoversTruncatedRoundTrip ? 0 : flightPrice)
  const outboundPrice = outboundRailBooking ? railOutboundTotal : outboundFlightBooking ? flightOutboundTotal : 0
  const returnBooking = returnRailBooking || returnFlightBooking
  const returnStatus = returnRailBooking ? railReturnStatus : returnFlightBooking ? flightReturnStatus : null
  const returnGroup = returnRailBooking
    ? `${railReturnGroupKind}:${railReturnBundleId}`
    : returnFlightBooking ? `${flightReturnGroupKind}:${flightReturnBundleId}` : null
  const returnPrice = returnRailBooking
    ? railReturnTotal
    : returnFlightBooking ? flightReturnTotal : 0
  const outboundServiceDate = outboundRailBooking
    ? railOutboundDate
    : outboundFlightBooking
      ? flightOutboundDate
      : departure
  const returnServiceDate = returnRailBooking
    ? railReturnDate
    : returnFlightBooking
      ? flightReturnDate
      : returning
  const hotelStartsWithOutbound = isSameDate(hotelCheckin, outboundServiceDate)
  const sections = [
    {
      id: 'outbound',
      sourceSectionId: appendsToRoute ? 'custom' : 'outbound',
      type: 'transport',
      state: outboundBooking ? 'filled' : 'empty',
      date: { ...outboundServiceDate, tone: 'active' },
      title: `На чём поедем в ${cityInCase(outboundBooking?.toCity || destinationCity, 'accusative')}`,
      summary: outboundRailBooking
        ? `${outboundRailBooking.carrier} · поезд ${outboundRailBooking.trainNumber}`
        : outboundFlightBooking ? `${outboundAirline} · ${outboundFlightBooking.flightNumber}` : '',
      booking: outboundBooking,
      status: outboundStatus,
      removable: Boolean(outboundBooking),
      serviceGroup: outboundGroup,
      serviceKind: outboundRailBooking ? railOutboundGroupKind : outboundFlightBooking ? flightOutboundGroupKind : null,
      serviceId: outboundRailBooking
        ? `rail:${railOutboundBundleId}:outbound`
        : outboundFlightBooking ? `flight:${flightOutboundBundleId}:outbound` : null,
      price: outboundPrice,
      actions: [
        { id: 'avia', label: 'Авиа', icon: './assets/icons/transport-plane.svg' },
        { id: 'train', label: 'Ж/д', icon: './assets/icons/transport-train.svg' },
        { id: 'skip', label: 'Не нужно', compact: true },
      ],
    },
    {
      id: 'lodging',
      sourceSectionId: appendsToRoute ? 'custom' : 'lodging',
      type: 'lodging',
      state: hasHotel ? 'filled' : 'empty',
      date: hasHotel && !hotelStartsWithOutbound
        ? { ...hotelCheckin, tone: 'normal' }
        : { tone: 'milestone' },
      title: `Жильё в ${cityInCase(hotelCity, 'prepositional')}`,
      summary: hasHotel ? `${hotelName}${roomName ? ` · ${roomName}` : ''}` : '',
      booking: hasHotel ? {
        hotelBookingId,
        hotelName,
        city: hotelCity,
        address: hotelAddress || `${hotelCity}, адрес отеля`,
        roomName: roomName || 'Номер отеля',
        image: hotelId === 'azimut' ? './assets/hotel-detail/hero-main.png' : './assets/hotels/hotel-exterior.png',
        cancellation: /расширенные|без питания/iu.test(tariffName) ? 'Платная отмена' : 'Бесплатная отмена',
        meal: /без питания/iu.test(tariffName) ? 'Без питания' : 'Завтрак включён',
        dateRange: formatDateRange(hotelCheckin, hotelCheckout),
        endDate: hotelCheckout ? { ...hotelCheckout } : null,
        passenger: servicePassenger,
      } : null,
      status: hasHotel ? hotelStatus : null,
      removable: hasHotel,
      serviceGroup: hasHotel ? `hotel:${hotelBundleId}` : null,
      serviceKind: hasHotel ? 'hotel' : null,
      serviceId: hasHotel ? `hotel:${hotelBundleId}` : null,
      price: hasHotel ? hotelPrice : 0,
      actions: [
        { id: 'lodging', label: 'Найти жильё', icon: './assets/icons/lodging.svg' },
        { id: 'skip', label: 'Не нужно', compact: true },
      ],
    },
  ]

  if (outboundRailBooking && outboundFlightBooking) {
    sections.splice(1, 0, {
      id: 'outbound-flight',
      sourceSectionId: appendsToRoute ? 'custom' : 'outbound',
      type: 'transport',
      state: 'filled',
      date: { ...flightOutboundDate, tone: 'active' },
      title: `На чём поедем в ${cityInCase(outboundFlightBooking.toCity, 'accusative')}`,
      summary: `${outboundAirline} · ${outboundFlightBooking.flightNumber}`,
      booking: outboundFlightBooking,
      status: flightOutboundStatus,
      removable: true,
      serviceGroup: `${flightOutboundGroupKind}:${flightOutboundBundleId}`,
      serviceKind: flightOutboundGroupKind,
      serviceId: `flight:${flightOutboundBundleId}:outbound`,
      price: flightOutboundTotal,
      actions: [],
    })
  }

  if (hasReturnRoute) {
    sections.push({
      id: 'return',
      sourceSectionId: appendsToRoute ? 'custom' : 'return',
      type: 'transport',
      state: returnBooking ? 'filled' : 'empty',
      date: { ...returnServiceDate, tone: 'normal' },
      title: `На чём вернёмся в ${cityInCase(returnBooking?.toCity || originCity, 'accusative')}`,
      summary: returnRailBooking
        ? `${returnRailBooking.carrier} · поезд ${returnRailBooking.trainNumber}`
        : returnFlightBooking ? `${returnAirline} · ${returnFlightBooking.flightNumber}` : '',
      booking: returnBooking,
      status: returnStatus,
      removable: Boolean(returnBooking),
      serviceGroup: returnGroup,
      serviceKind: returnRailBooking ? railReturnGroupKind : returnFlightBooking ? flightReturnGroupKind : null,
      serviceId: returnRailBooking
        ? `rail:${railReturnBundleId}:return`
        : returnFlightBooking ? `flight:${flightReturnBundleId}:return` : null,
      price: returnPrice,
      actions: [
        { id: 'avia', label: 'Авиа', icon: './assets/icons/transport-plane.svg' },
        { id: 'train', label: 'Ж/д', icon: './assets/icons/transport-train.svg' },
        { id: 'skip', label: 'Не нужно', compact: true },
      ],
    })
    if (returnRailBooking && returnFlightBooking) {
      sections.push({
        id: 'return-flight',
        sourceSectionId: appendsToRoute ? 'custom' : 'return',
        type: 'transport',
        state: 'filled',
        date: { ...flightReturnDate, tone: 'normal' },
        title: `На чём вернёмся в ${cityInCase(returnFlightBooking.toCity, 'accusative')}`,
        summary: `${returnAirline} · ${returnFlightBooking.flightNumber}`,
        booking: returnFlightBooking,
        status: flightReturnStatus,
        removable: true,
        serviceGroup: `${flightReturnGroupKind}:${flightReturnBundleId}`,
        serviceKind: flightReturnGroupKind,
        serviceId: `flight:${flightReturnBundleId}:return`,
        price: flightReturnTotal,
        actions: [],
      })
    }
  }

  const mergedSections = buildChronologicalTimeline(
    mergePreservedTripServices(sections),
    departure,
    returning,
    destinationCity,
  )
  const filledSections = mergedSections.filter(section => section.state === 'filled' && section.status !== 'cancelled')
  const totalPrice = filledSections.reduce((sum, section) => sum + Math.max(0, Number(section.price) || 0), 0)
  const payablePrice = filledSections
    .filter(section => section.status === 'awaiting-payment')
    .reduce((sum, section) => sum + Math.max(0, Number(section.price) || 0), 0)
  const needsPayment = filledSections.some(section => section.status === 'awaiting-payment')
  const hasServices = filledSections.length > 0
  const costItems = buildCostItems(mergedSections)
  const cancelled = params.get('cancelled') === '1'
  const displayedTotal = !cancelled && needsPayment ? payablePrice : totalPrice

  return {
    title: params.has('tripFrom') || params.has('tripTo')
      ? `${originCity} – ${destinationCity}`
      : param('title', `${originCity} – ${destinationCity}`),
    dateRange: param('dates', formatDateRange(departure, returning)),
    direction: param('direction', hasReturnRoute ? 'туда – обратно' : 'в одну сторону'),
    originCity,
    destinationCity,
    traveller: tripTraveller,
    travellerNames,
    adults,
    children,
    cancelled,
    timelineStart: departure,
    timelineEnd: returning,
    sections: mergedSections,
    cost: {
      state: hasServices ? 'filled' : 'empty',
      message: hasServices ? '' : EMPTY_COST_MESSAGE,
      label: cancelled ? 'Итого' : 'Итого к оплате',
      total: formatMoney(displayedTotal),
      items: costItems,
      canPay: !cancelled && needsPayment,
      timer: null,
    },
  }
}

const trip = buildTripModel()
const notNeededSections = new Set(
  (params.get(NOT_NEEDED_QUERY_PARAM) || '').split(',').map(value => value.trim()).filter(Boolean),
)
const selections = new Map(
  trip.sections
    .filter(section => notNeededSections.has(section.sourceSectionId || section.id))
    .map(section => [section.id, 'skip']),
)
let tripLifecycleFinalized = trip.cancelled

function readBusinessDrafts() {
  try {
    const value = JSON.parse(window.localStorage.getItem(BUSINESS_DRAFTS_STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writeBusinessDrafts(drafts) {
  try {
    window.localStorage.setItem(BUSINESS_DRAFTS_STORAGE_KEY, JSON.stringify(drafts))
  } catch {
    // Черновик не должен мешать основному сценарию, если хранилище недоступно.
  }
}

function readCancelledBusinessTrips() {
  try {
    const value = JSON.parse(window.localStorage.getItem(BUSINESS_CANCELLED_TRIPS_STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writeCancelledBusinessTrips(cancelledTrips) {
  try {
    window.localStorage.setItem(BUSINESS_CANCELLED_TRIPS_STORAGE_KEY, JSON.stringify(cancelledTrips))
  } catch {
    // Отмена остаётся доступной на текущем экране, даже если хранилище недоступно.
  }
}

function readPaidBusinessTrips() {
  try {
    const value = JSON.parse(window.localStorage.getItem(BUSINESS_PAID_TRIPS_STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writePaidBusinessTrips(paidTrips) {
  try {
    window.localStorage.setItem(BUSINESS_PAID_TRIPS_STORAGE_KEY, JSON.stringify(paidTrips))
  } catch {
    // Оплаченная страница остаётся доступной, даже если хранилище недоступно.
  }
}

function hasAddedServices() {
  return trip.sections.some(section => section.state === 'filled')
}

function hasPaidServices() {
  return trip.sections.some(section => section.state === 'filled' && section.status === 'paid')
}

function removeCurrentDraft() {
  const draftId = params.get('draftId')
  if (!draftId) return
  writeBusinessDrafts(readBusinessDrafts().filter(draft => draft.id !== draftId))
}

function syncDraftLifecycle({ saveUnpaid = false } = {}) {
  const draftId = params.get('draftId')
  if (params.get('draft') !== '1' || !draftId) return
  const alreadyCancelled = readCancelledBusinessTrips().some(cancelledTrip => cancelledTrip.id === draftId)
  if (tripLifecycleFinalized || alreadyCancelled) {
    removeCurrentDraft()
    return
  }
  if (trip.cancelled || params.get('cancelled') === '1' || hasPaidServices()) {
    removeCurrentDraft()
    return
  }
  if (!saveUnpaid) return

  const from = param('from', 'Москва')
  const to = param('to', '')
  if (!to) return
  const depart = param('depart', '')
  const returning = param('return', '')
  const draft = {
    id: draftId,
    from,
    to,
    depart,
    return: returning,
    dates: [depart, returning].filter(Boolean).join(' — '),
    search: params.toString(),
    paidServices: 0,
  }
  const remainingDrafts = readBusinessDrafts().filter(item => item.id !== draftId)
  writeBusinessDrafts([draft, ...remainingDrafts].slice(0, 5))
}

function cancelledServiceLabel(section) {
  if (section.type === 'lodging') return 'Жильё'
  if (section.booking?.kind === 'rail') return 'Ж/д билеты'
  if (section.booking?.kind === 'flight') return 'Авиабилеты'
  return 'Услуга'
}

function cancelledTripSnapshot() {
  const filledSections = trip.sections.filter(section => section.state === 'filled')
  const lodging = filledSections.find(section => section.type === 'lodging')
  const transport = filledSections.find(section => section.type === 'transport')
  const serviceNames = [...new Set(filledSections.map(cancelledServiceLabel))]
  const transportType = transport?.booking?.kind === 'rail'
    ? 'train'
    : transport?.booking?.kind === 'flight'
      ? 'avia'
      : 'hotel'
  const serviceIcon = transportType === 'train'
    ? './assets/icons/trip-train-filled.svg'
    : transportType === 'avia'
      ? './assets/icons/trip-flight-filled.svg'
      : './assets/icons/lodging.svg'
  const id = params.get('tripId')?.trim()
    || params.get('draftId')?.trim()
    || `cancelled-${Date.now()}`
  const cancelledUrl = preserveTripServicesInUrl(new URL(window.location.href), trip.sections)
  const cancelledParams = cancelledUrl.searchParams
  cancelledParams.set('cancelled', '1')
  cancelledParams.set('tripId', id)

  return {
    id,
    state: 'cancelled',
    serviceCount: filledSections.length,
    paidServices: filledSections.filter(section => section.status === 'paid').length,
    city: trip.destinationCity,
    transport: transportType,
    route: `${trip.originCity} — ${trip.destinationCity}`,
    dates: trip.dateRange,
    title: lodging?.booking?.hotelName || serviceNames.join(' · '),
    detail: `${serviceNames.join(' · ')} · ${trip.traveller}`,
    status: 'Отменена',
    hotelImage: lodging?.booking?.image || './assets/images/trip-kazan.png',
    secondaryTitle: serviceNames.length > 1 ? 'Добавленные услуги' : serviceNames[0],
    secondaryDetail: serviceNames.join(' · '),
    secondaryIcon: serviceIcon,
    secondaryType: transportType,
    href: `./trip.html?${cancelledParams.toString()}`,
  }
}

function saveCancelledTrip() {
  const cancelledTrip = cancelledTripSnapshot()
  const remainingTrips = readCancelledBusinessTrips().filter(item => item.id !== cancelledTrip.id)
  writeCancelledBusinessTrips([cancelledTrip, ...remainingTrips].slice(0, 12))
  return cancelledTrip
}

function paidTripSnapshot(id, target) {
  const filledSections = trip.sections.filter(section => section.state === 'filled')
  const lodging = filledSections.find(section => section.type === 'lodging')
  const transport = filledSections.find(section => section.type === 'transport')
  const serviceNames = [...new Set(filledSections.map(cancelledServiceLabel))]
  const paidServices = filledSections.filter(section => section.status === 'paid').length
  const transportType = transport?.booking?.kind === 'rail'
    ? 'train'
    : transport?.booking?.kind === 'flight'
      ? 'avia'
      : 'hotel'
  const serviceIcon = transportType === 'train'
    ? './assets/icons/trip-train-filled.svg'
    : transportType === 'avia'
      ? './assets/icons/trip-flight-filled.svg'
      : './assets/icons/lodging.svg'

  return {
    id,
    state: 'upcoming',
    serviceCount: filledSections.length,
    paidServices,
    city: trip.destinationCity,
    transport: transportType,
    route: `${trip.originCity} — ${trip.destinationCity}`,
    dates: trip.dateRange,
    title: lodging?.booking?.hotelName || serviceNames.join(' · '),
    detail: `${serviceNames.join(' · ')} · ${trip.traveller}`,
    status: paidServices === filledSections.length ? 'Оплачено' : 'Частично оплачено',
    hotelImage: lodging?.booking?.image || './assets/images/trip-kazan.png',
    secondaryTitle: serviceNames.length > 1 ? 'Оплаченные услуги' : serviceNames[0],
    secondaryDetail: serviceNames.join(' · '),
    secondaryIcon: serviceIcon,
    secondaryType: transportType,
    href: `./trip.html?${target.searchParams.toString()}`,
  }
}

function savePaidTrip(id, target) {
  const paidTrip = paidTripSnapshot(id, target)
  const remainingTrips = readPaidBusinessTrips().filter(item => item?.id !== id)
  writePaidBusinessTrips([paidTrip, ...remainingTrips].slice(0, 12))
  return paidTrip
}

function syncPaidTripLifecycle() {
  if (trip.cancelled || !hasPaidServices()) return
  const tripId = params.get('tripId')?.trim() || params.get('draftId')?.trim()
  if (!tripId) return
  const target = preserveTripServicesInUrl(new URL(window.location.href), trip.sections)
  target.searchParams.set('tripId', tripId)
  savePaidTrip(tripId, target)
  removeCurrentDraft()
}

function renderSummary(model) {
  return `
    <button class="trip-back" type="button" data-action="back">
      <img class="trip-back__arrow" src="./assets/icons/arrow-long-left.svg" alt="">
      <span>Командировки</span>
    </button>
    <div class="trip-summary__content">
      <div class="trip-summary__copy">
        ${model.cancelled ? '<span class="trip-summary__cancelled">Командировка отменена</span>' : ''}
        <h1 id="trip-title" class="trip-title">${escapeHtml(model.title)}</h1>
        <p class="trip-meta">
          <span>${escapeHtml(model.dateRange)}</span>
          <span class="trip-meta__separator" aria-hidden="true">·</span>
          <span>${escapeHtml(model.direction)}</span>
          <span class="trip-meta__separator" aria-hidden="true">·</span>
          <span>${escapeHtml(model.traveller)}</span>
        </p>
        ${model.travellerNames ? `
          <p class="trip-traveller-names">
            <span>Кто едет</span>
            <strong>${escapeHtml(model.travellerNames)}</strong>
          </p>` : ''}
      </div>
      ${model.cancelled ? '' : `
        <div class="trip-summary__actions">
          ${isPastTrip ? '' : `<div class="trip-add-services">
            <button class="trip-control-button" type="button" data-action="add-services" aria-haspopup="menu" aria-expanded="false">
              <img src="./assets/icons/plus.svg" alt="">
              <span>Добавить услуги</span>
            </button>
            ${renderServiceMenu()}
          </div>`}
          <button class="trip-control-button" type="button" data-action="edit-details">Изменить детали</button>
          ${model.cost?.state === 'filled' && !model.cost.canPay
            ? ''
            : '<button class="trip-control-button" type="button" data-action="cancel-trip">Отменить</button>'}
        </div>`}
    </div>`
}

function renderServiceMenu() {
  return `
    <div class="trip-service-menu" role="menu" hidden>
      <button type="button" role="menuitem" data-add-service="hotel"><img src="./assets/icons/lodging.svg" alt=""><span>Отель</span></button>
      <button type="button" role="menuitem" data-add-service="avia"><img src="./assets/icons/transport-plane.svg" alt=""><span>Авиабилеты</span></button>
      <button type="button" role="menuitem" data-add-service="train"><img src="./assets/icons/transport-train.svg" alt=""><span>Ж/д билеты</span></button>
    </div>`
}

function renderDateChip(date) {
  if (date.tone === 'milestone') {
    return '<span class="trip-date-chip trip-date-chip--milestone" aria-hidden="true"><span class="trip-date-chip__dot"></span></span>'
  }

  const modifier = date.tone === 'active' ? ' trip-date-chip--active' : ''
  return `
    <span class="trip-date-chip${modifier}" aria-label="${escapeHtml(`${date.day} ${date.month}`)}">
      <span class="trip-date-chip__day">${escapeHtml(date.day)}</span>
      <span class="trip-date-chip__month">${escapeHtml(date.month)}</span>
    </span>`
}

function renderAddServicesCard(label = 'Добавить услуги') {
  return `
    <div class="trip-gap-booking-card">
      <div class="trip-gap-booking-card__inner">
        <div class="trip-gap-booking-card__actions" aria-label="${escapeHtml(label)}">
          <button class="trip-gap-booking-card__action" type="button" data-add-service="avia">
            <img src="./assets/icons/transport-plane.svg" alt="">
            <span>Авиа</span>
          </button>
          <button class="trip-gap-booking-card__action" type="button" data-add-service="train">
            <img src="./assets/icons/transport-train.svg" alt="">
            <span>Ж/д</span>
          </button>
          <button class="trip-gap-booking-card__action" type="button" data-add-service="hotel">
            <img src="./assets/icons/lodging.svg" alt="">
            <span>Жильё</span>
          </button>
          <button class="trip-gap-booking-card__action" type="button" data-action="dismiss-add-services">
            <span>Не нужно</span>
          </button>
        </div>
      </div>
    </div>`
}

function renderEmptyActions(section) {
  if (isAddingServicesLocked()) return '<p class="trip-booking-shell__cancelled-empty">Услуга не добавлялась</p>'
  return `
    <div class="trip-service-actions">
      ${section.actions.map(action => {
        const selected = selections.get(section.id) === action.id
        return `
          <button
            class="trip-service-action${action.compact ? ' trip-service-action--compact' : ''}${selected ? ' is-selected' : ''}"
            type="button"
            data-service-action="${escapeHtml(action.id)}"
            data-section-id="${escapeHtml(section.id)}"
            aria-pressed="${selected ? 'true' : 'false'}"
          >
            ${action.icon ? `<img src="${escapeHtml(action.icon)}" alt="">` : ''}
            <span>${escapeHtml(action.label)}</span>
          </button>`
      }).join('')}
    </div>`
}

function renderBookingFooterAction(section, className) {
  if (trip.cancelled) return ''
  if (section.status === 'paid') {
    return `<button class="${className} trip-booking-documents" type="button">
      <img src="./assets/icons/trip-paid-document.svg" alt="">
      <span>Скачать документы</span>
    </button>`
  }
  if (section.status === 'awaiting-payment') {
    return `<button class="${className}" type="button" data-action="pay-service" data-section-id="${escapeHtml(section.id)}">${escapeHtml(paymentButtonLabel(section.price))}</button>`
  }
  return ''
}

function renderRailBooking(section, booking) {
  const brand = booking.brand ? ` · ${booking.brand}` : ''
  const fare = booking.seats ? `${booking.coach} · ${booking.seats}` : booking.coach
  const passenger = booking.passenger || passengerViewModel(null)
  const footerAction = renderBookingFooterAction(section, 'trip-rail-booking__pay')
  return `
    <div class="trip-rail-booking">
      <div class="trip-rail-booking__header">
        <span class="trip-rail-booking__logo" aria-hidden="true"><img src="./assets/icons/trip-train-filled.svg" alt=""></span>
        <span class="trip-rail-booking__identity">
          <strong>${escapeHtml(`${booking.fromCity} — ${booking.toCity}`)}</strong>
          <small>${escapeHtml(`Поезд ${booking.trainNumber}${brand}`)}</small>
        </span>
        ${renderServiceStatus(section.status || 'awaiting-payment')}
      </div>
      <div class="trip-rail-booking__journey" aria-label="${escapeHtml(`${booking.duration} в пути`)}">
        <div class="trip-rail-booking__timeline">
          <strong>${escapeHtml(booking.departTime)}</strong>
          <i aria-hidden="true"></i>
          <span>${escapeHtml(booking.duration)}</span>
          <i aria-hidden="true"></i>
          <strong>${escapeHtml(booking.arrivalTime)}</strong>
        </div>
        <div class="trip-rail-booking__details">
          <span>
            <small>${escapeHtml(booking.dateLabel)}</small>
            <small>${escapeHtml(booking.fromStation)}</small>
          </span>
          <span>
            <small>${escapeHtml(booking.dateLabel)}</small>
            <small>${escapeHtml(booking.toStation)}</small>
          </span>
        </div>
      </div>
      <p class="trip-rail-booking__fare">${escapeHtml(fare)}</p>
      <div class="trip-rail-booking__passengers">
        <span class="trip-rail-booking__passenger">
          <strong>${escapeHtml(passenger.name)}</strong>
          <small>${escapeHtml(passenger.details)}</small>
        </span>
        ${footerAction}
      </div>
    </div>`
}

function renderFlightBooking(section, booking) {
  const passenger = booking.passenger || passengerViewModel(null)
  const footerAction = renderBookingFooterAction(section, 'trip-flight-booking__pay')
  return `
    <div class="trip-flight-booking">
      <div class="trip-flight-booking__header">
        <span class="trip-flight-booking__logo" aria-hidden="true"><img src="./assets/icons/trip-flight-filled.svg" alt=""></span>
        <span class="trip-flight-booking__identity">
          <strong>${escapeHtml(`${booking.fromCity} — ${booking.toCity}`)}</strong>
          <small>${escapeHtml(booking.flightNumber)}</small>
        </span>
        ${renderServiceStatus(section.status || 'awaiting-payment')}
      </div>
      <div class="trip-flight-booking__journey" aria-label="${escapeHtml(`${booking.duration} в пути`)}">
        <div class="trip-flight-booking__timeline">
          <strong>${escapeHtml(booking.departTime)}</strong>
          <i aria-hidden="true"></i>
          <span>${escapeHtml(booking.duration)}</span>
          <i aria-hidden="true"></i>
          <strong>${escapeHtml(booking.arrivalTime)}</strong>
        </div>
        <div class="trip-flight-booking__details">
          <span>
            <small>${escapeHtml(booking.dateLabel)}</small>
            <small>${escapeHtml(`${booking.fromCode}, ${booking.fromAirport}`)}</small>
          </span>
          <span>
            <small>${escapeHtml(booking.dateLabel)}</small>
            <small>${escapeHtml(`${booking.toCode}, ${booking.toAirport}`)}</small>
          </span>
        </div>
      </div>
      <p class="trip-flight-booking__fare">${escapeHtml(booking.tariff)}</p>
      <div class="trip-flight-booking__passengers">
        <span class="trip-flight-booking__passenger">
          <strong>${escapeHtml(passenger.name)}</strong>
          <small>${escapeHtml(passenger.details)}</small>
        </span>
        ${footerAction}
      </div>
    </div>`
}

function renderFilledContent(section) {
  if (section.type === 'transport' && section.booking?.kind === 'rail') {
    return renderRailBooking(section, section.booking)
  }

  if (section.type === 'transport' && section.booking) {
    return renderFlightBooking(section, section.booking)
  }

  if (section.type === 'lodging' && section.booking) {
    const booking = section.booking
    const passenger = booking.passenger || passengerViewModel(null)
    const roomTitle = booking.roomName.replace(/\s+с\s+двуспальной\s+кроватью$/iu, '')
    const bed = /двуспальной\s+кроватью/iu.test(booking.roomName) ? '1 двуспальная кровать' : '1 кровать'
    const birthDate = passenger.details.split(' · ')[0]
    const footerAction = renderBookingFooterAction(section, 'trip-hotel-booking__pay')
    return `
      <div class="trip-hotel-booking">
        <div class="trip-hotel-booking__header">
          <img class="trip-hotel-booking__image" src="${escapeHtml(booking.image)}" alt="">
          <span class="trip-hotel-booking__identity">
            <strong>${escapeHtml(booking.hotelName)}</strong>
            <small>${escapeHtml(booking.address)}</small>
          </span>
          ${renderServiceStatus(section.status || 'awaiting-payment')}
        </div>
        <span class="trip-hotel-booking__room">
          <strong>${escapeHtml(roomTitle)}</strong>
          <small>${escapeHtml(booking.dateRange)}</small>
          <small>${escapeHtml(bed)}</small>
        </span>
        <div class="trip-hotel-booking__conditions">
          <span><img src="./assets/icons/hotel-cancellation.svg" alt="">${escapeHtml(booking.cancellation)}</span>
          <span><img src="./assets/icons/hotel-meal.svg" alt="">${escapeHtml(booking.meal)}</span>
        </div>
        <div class="trip-hotel-booking__footer">
          <span class="trip-hotel-booking__traveller">
            <strong>${escapeHtml(passenger.name)}</strong>
            <small>${escapeHtml(birthDate)}</small>
          </span>
          ${footerAction}
        </div>
      </div>`
  }

  const summary = section.summary
    ? `<span class="trip-booking-shell__summary">${escapeHtml(section.summary)}</span>`
    : ''
  const status = renderServiceStatus(section.status || 'awaiting-payment')
  if (!summary && !status) return ''
  return `
    <div class="trip-booking-shell__filled">
      <div class="trip-booking-shell__filled-header">
        ${summary}
        ${status}
      </div>
    </div>`
}

function renderServiceStatus(statusId) {
  const resolvedStatusId = trip.cancelled ? 'cancelled' : statusId
  const status = SERVICE_STATUSES[resolvedStatusId]
  if (!status) return ''
  return `<span class="trip-status trip-status--${escapeHtml(status.tone)}" data-service-status="${escapeHtml(resolvedStatusId)}">${escapeHtml(status.label)}</span>`
}

function displaySectionTitle(section) {
  if (section.type !== 'transport' || section.state !== 'filled' || !section.booking) return section.title
  const transport = section.booking.kind === 'rail'
    ? 'Поезд'
    : section.booking.kind === 'flight'
      ? 'Самолёт'
      : ''
  if (!transport) return section.title

  const fallbackCity = (section.sourceSectionId || section.id) === 'return'
    ? param('from', 'Москва')
    : param('to', 'Санкт-Петербург')
  const destination = section.booking.toCity || fallbackCity
  return `${transport} в ${cityInCase(destination, 'accusative')}`
}

function renderBookingCardShell(section) {
  if (section.type === 'trip-card') {
    return `
      <div class="trip-day-card" data-booking-state="empty-day">
        <div class="trip-day-card__copy">
          <span class="trip-day-card__eyebrow">${escapeHtml(`${section.date.day} ${section.date.month}`)}</span>
          <strong>В ${escapeHtml(cityInCase(section.city, 'prepositional'))} пока нет услуг</strong>
          <small>Добавьте нужное бронирование на этот день</small>
        </div>
        ${isAddingServicesLocked() ? '' : '<button class="trip-day-card__action" type="button" data-action="add-services">Добавить услуги</button>'}
      </div>`
  }
  const isInteractive = section.state === 'filled'
  const content = isInteractive ? renderFilledContent(section) : renderEmptyActions(section)
  const title = displaySectionTitle(section)
  const interactiveAttributes = isInteractive
    ? ` class="trip-booking-shell trip-booking-shell--interactive" data-service-details="${escapeHtml(section.id)}" role="button" tabindex="0" aria-label="${escapeHtml(`Показать детали: ${title}`)}"`
    : ' class="trip-booking-shell"'
  return `
    <div${interactiveAttributes} data-booking-state="${escapeHtml(section.state)}">
      <div class="trip-booking-shell__inner">${content}</div>
    </div>`
}

function renderTripServiceSection(section) {
  if (section.type === 'hotel-checkout') {
    return `
      <article class="trip-service trip-service--hotel-checkout" data-section="${escapeHtml(section.id)}" data-section-type="hotel-checkout" data-section-state="display">
        <div class="trip-service__timeline">
          ${renderDateChip(section.date)}
          <span class="trip-service__line" aria-hidden="true"></span>
        </div>
        <div class="trip-service__content">
          <div class="trip-service__heading">
            <h2 class="trip-service__title">Выезд из отеля</h2>
            <span class="trip-service__status" aria-hidden="true"></span>
          </div>
          <div class="trip-hotel-checkout-card">
            <div class="trip-hotel-checkout-card__inner">
              <img src="./assets/images/worktrip-hotel-checkout.png" alt="">
              <strong>До 12:00</strong>
            </div>
          </div>
        </div>
      </article>`
  }

  if (section.type === 'service-gap') {
    if (isAddingServicesLocked()) return ''
    return `
      <article class="trip-service trip-service--add-services trip-service--service-gap" data-section="${escapeHtml(section.id)}" data-section-type="service-gap" data-section-state="empty-services">
        <div class="trip-service__timeline">
          ${renderDateChip(section.date)}
          <span class="trip-service__line" aria-hidden="true"></span>
        </div>
        <div class="trip-service__content trip-service__content--add-services">
          ${renderAddServicesCard(`Добавить услуги на ${section.date.day} ${section.date.month}`)}
        </div>
      </article>`
  }

  if (section.type === 'trip-card' && !isAddingServicesLocked()) {
    const endDate = section.endDate || section.date
    const intervalLabel = `${section.date.day} ${section.date.month} — ${endDate.day} ${MONTH_NAMES[endDate.month] || endDate.month}`
    return `
      <article class="trip-service trip-service--add-services trip-service--free-day" data-section="${escapeHtml(section.id)}" data-section-type="trip-card" data-section-state="empty-day">
        <div class="trip-service__timeline">
          ${renderDateChip(section.date)}
          <span class="trip-service__line" aria-hidden="true"></span>
        </div>
        <div class="trip-service__content trip-service__content--add-services">
          <div class="trip-service__heading">
            <h2 class="trip-service__title">${escapeHtml(displaySectionTitle(section))}</h2>
            <span class="trip-service__status" aria-hidden="true"></span>
          </div>
          ${renderAddServicesCard(`Добавить услуги · ${intervalLabel}`)}
        </div>
      </article>`
  }

  const title = displaySectionTitle(section)
  const canRemove = section.removable && section.status !== 'paid' && !trip.cancelled
  const removeControl = canRemove
    ? `
      <span class="trip-service__status">
        <button class="trip-remove-button" type="button" data-action="remove-service" data-section-id="${escapeHtml(section.id)}">
          <svg class="trip-remove-button__icon" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 4.5h9M6 4.5v-1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1m-5.5 0 .55 7.7a1 1 0 0 0 1 .93h3.9a1 1 0 0 0 1-.93l.55-7.7M6.75 7v3.75M9.25 7v3.75"/>
          </svg>
          <span>Удалить</span>
        </button>
      </span>`
    : '<span class="trip-service__status" aria-hidden="true"></span>'

  return `
    <article class="trip-service" data-section="${escapeHtml(section.id)}" data-section-type="${escapeHtml(section.type)}" data-section-state="${escapeHtml(section.state)}">
      <div class="trip-service__timeline">
        ${renderDateChip(section.date)}
        <span class="trip-service__line" aria-hidden="true"></span>
      </div>
      <div class="trip-service__content">
        <div class="trip-service__heading">
          <h2 class="trip-service__title">${escapeHtml(title)}</h2>
          ${removeControl}
        </div>
        ${renderBookingCardShell(section)}
      </div>
    </article>`
}

function renderCostSidebar(cost) {
  if (cost.state === 'filled' && !cost.canPay && !trip.cancelled) {
    return `
      <div class="trip-cost-card trip-paid-card" data-cost-state="paid" data-cost-payment-state="paid">
        <div class="trip-paid-card__header">
          <h2>Командировка</h2>
          <span class="trip-paid-card__badge">Оплачена</span>
        </div>
        <div class="trip-paid-card__actions">
          ${[
            ['edit-details', 'trip-paid-calendar.svg', 'Изменить даты'],
            ['trip-documents', 'trip-paid-document.svg', 'Документы по бронированию'],
            ['cancel-trip', 'trip-paid-cancel.svg', 'Отменить'],
            ['trip-support', 'trip-paid-support.svg', 'Чат с поддержкой'],
          ].map(([action, icon, label]) => `
            <button class="trip-paid-card__action" type="button" data-action="${action}">
              <img class="trip-paid-card__action-icon" src="./assets/icons/${icon}" alt="">
              <span>${label}</span>
              <img class="trip-paid-card__arrow" src="./assets/icons/trip-paid-arrow.svg" alt="">
            </button>`).join('')}
        </div>
        <div class="trip-paid-card__total">
          <span>Итого</span>
          <img src="./assets/icons/trip-paid-more.svg" alt="">
          <strong>${escapeHtml(cost.total)}</strong>
        </div>
      </div>`
  }
  const message = cost.message ? `<p class="trip-cost-card__message">${escapeHtml(cost.message)}</p>` : ''
  const items = Array.isArray(cost.items) ? cost.items : []
  const itemsMarkup = items.length > 0
    ? `<div class="trip-cost-card__items">${items.map(item => `
        <section class="trip-cost-item">
          <div class="trip-cost-item__row">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.amount)}</strong>
          </div>
        </section>`).join('')}</div>`
    : ''
  const isExpired = Boolean(cost.timer) && remainingPaymentSeconds(cost.timer) === 0
  const payButton = !trip.cancelled && cost.canPay
    ? isExpired
      ? '<button class="trip-cost-card__pay trip-cost-card__pay--secondary" type="button" data-action="check-availability">Проверить доступность услуг</button>'
      : '<button class="trip-cost-card__pay" type="button" data-action="pay-trip">Оплатить всё</button>'
    : ''
  const timer = renderPaymentTimer(cost.timer)
  const paymentMethods = cost.state === 'filled' && cost.canPay && !isExpired
    ? `<div class="trip-cost-card__payment-methods" role="group" aria-label="Способ оплаты">
        <button class="trip-cost-card__payment-method${selectedPaymentMethod === 'card' ? ' is-selected' : ''}" type="button" data-cost-payment-method="card" aria-pressed="${selectedPaymentMethod === 'card'}">
          <span class="trip-cost-card__payment-icon trip-cost-card__payment-icon--card" aria-hidden="true"></span>
          <strong>Карта или СБП</strong>
        </button>
        <button class="trip-cost-card__payment-method${selectedPaymentMethod === 'business' ? ' is-selected' : ''}" type="button" data-cost-payment-method="business" aria-pressed="${selectedPaymentMethod === 'business'}">
          <span class="trip-cost-card__payment-icon" aria-hidden="true"><img src="./assets/icons/briefcase.svg" alt=""></span>
          <span><strong>Бизнес-счёт</strong><small>100 000 ₽</small></span>
        </button>
      </div>`
    : ''
  return `
    ${timer}
    <div class="trip-cost-card" data-cost-state="${escapeHtml(cost.state)}" data-cost-payment-state="${cost.canPay ? 'payment-required' : 'paid'}">
      ${message}
      ${cost.state === 'filled' ? '<h2 class="trip-cost-card__title">Стоимость</h2>' : ''}
      ${itemsMarkup}
      ${paymentMethods}
      <div class="trip-cost-card__footer">
        <div class="trip-cost-card__summary">
          <span class="trip-cost-card__label-wrap">
            <span class="trip-cost-card__label">${escapeHtml(cost.label)}</span>
            ${cost.state === 'filled' ? '<span class="trip-cost-card__more" aria-hidden="true"></span>' : ''}
          </span>
          <strong class="trip-cost-card__amount">${escapeHtml(cost.total)}</strong>
        </div>
        ${payButton}
      </div>
    </div>`
}

function createPaymentTimer(durationSeconds = PAYMENT_TIMER_SECONDS) {
  const seconds = Math.max(0, Math.floor(Number(durationSeconds) || 0))
  return {
    durationSeconds: seconds,
    deadlineAt: Date.now() + seconds * 1000,
    state: seconds > 0 ? 'running' : 'expired',
  }
}

function remainingPaymentSeconds(timer) {
  if (!timer || !Number.isFinite(timer.deadlineAt)) return 0
  return Math.max(0, Math.ceil((timer.deadlineAt - Date.now()) / 1000))
}

function formatPaymentTime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0))
  const minutes = Math.floor(totalSeconds / 60)
  const remainder = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function renderPaymentTimer(timer) {
  if (!timer) return ''
  const remaining = remainingPaymentSeconds(timer)
  const expired = remaining === 0
  const value = expired ? '' : `<span class="trip-payment-timer__value" data-payment-timer-value>${formatPaymentTime(remaining)}</span>`
  const label = expired ? 'Время на оплату истекло' : ' на оплату заказа'
  return `
    <div class="trip-payment-timer" data-payment-timer-state="${expired ? 'expired' : 'running'}" role="timer" aria-label="${escapeHtml(expired ? label : `${formatPaymentTime(remaining)} на оплату заказа`)}">
      <span class="trip-payment-timer__icon" aria-hidden="true"><img src="./assets/images/payment-clock.png" alt=""></span>
      <strong class="trip-payment-timer__text">${value}<span data-payment-timer-label>${escapeHtml(label)}</span></strong>
    </div>`
}

function renderServices() {
  trip.sections = buildChronologicalTimeline(
    trip.sections,
    trip.timelineStart,
    trip.timelineEnd,
    trip.destinationCity,
  )
  servicesRoot.innerHTML = trip.sections.map(renderTripServiceSection).join('')
}

function stopPaymentTimerInterval() {
  window.clearInterval(paymentTimerInterval)
  paymentTimerInterval = null
}

function updatePaymentTimerDisplay() {
  const timer = trip.cost.timer
  const timerRoot = costRoot.querySelector('.trip-payment-timer')
  if (!timer || !timerRoot) {
    stopPaymentTimerInterval()
    return
  }

  const remaining = remainingPaymentSeconds(timer)
  const value = timerRoot.querySelector('[data-payment-timer-value]')
  const label = timerRoot.querySelector('[data-payment-timer-label]')
  if (remaining > 0) {
    if (value) value.textContent = formatPaymentTime(remaining)
    if (label) label.textContent = ' на оплату заказа'
    timerRoot.dataset.paymentTimerState = 'running'
    timerRoot.setAttribute('aria-label', `${formatPaymentTime(remaining)} на оплату заказа`)
    document.querySelectorAll('[data-action="pay-trip"], [data-action="pay-service"]').forEach(button => {
      button.disabled = false
    })
    return
  }

  const shouldAnnounce = timer.state !== 'expired'
  timer.state = 'expired'
  value?.remove()
  if (label) label.textContent = 'Время на оплату истекло'
  timerRoot.dataset.paymentTimerState = 'expired'
  timerRoot.setAttribute('aria-label', 'Время на оплату истекло')
  document.querySelectorAll('[data-action="pay-service"]').forEach(button => {
    button.disabled = true
  })
  const payTripButton = document.querySelector('[data-action="pay-trip"]')
  if (payTripButton) {
    payTripButton.dataset.action = 'check-availability'
    payTripButton.textContent = 'Проверить доступность услуг'
    payTripButton.classList.add('trip-cost-card__pay--secondary')
    payTripButton.disabled = false
  }
  stopPaymentTimerInterval()
  if (shouldAnnounce) announcer.textContent = 'Время на оплату заказа истекло'
}

function checkServiceAvailability(button) {
  if (!trip.cost.timer || remainingPaymentSeconds(trip.cost.timer) > 0) return
  button.disabled = true
  button.textContent = 'Проверяем…'
  announcer.textContent = 'Проверяем доступность услуг'
  window.setTimeout(() => {
    startPaymentTimer()
    announcer.textContent = 'Услуги доступны. Время на оплату обновлено'
  }, 650)
}

function schedulePaymentTimer() {
  stopPaymentTimerInterval()
  if (!trip.cost.timer) return
  updatePaymentTimerDisplay()
  if (remainingPaymentSeconds(trip.cost.timer) > 0) {
    paymentTimerInterval = window.setInterval(updatePaymentTimerDisplay, 1000)
  }
}

function renderCost() {
  costRoot.classList.toggle('trip-cost--with-timer', Boolean(trip.cost.timer))
  costRoot.innerHTML = renderCostSidebar(trip.cost)
  schedulePaymentTimer()
}

function renderPage() {
  summaryRoot.innerHTML = renderSummary(trip)
  renderServices()
  renderCost()
}

let popupTrigger = null
let pendingRemovalId = ''
let pendingPaymentSectionId = null
let selectedPaymentMethod = 'business'

function closeServiceMenu({ restoreFocus = false, except = null } = {}) {
  let focusButton = null
  document.querySelectorAll('.trip-add-services').forEach(container => {
    if (container === except) return
    const button = container.querySelector('[data-action="add-services"]')
    const menu = container.querySelector('.trip-service-menu')
    if (!button || !menu || menu.hidden) return
    menu.hidden = true
    button.setAttribute('aria-expanded', 'false')
    if (!focusButton) focusButton = button
  })
  if (restoreFocus) focusButton?.focus({ preventScroll: true })
}

function toggleServiceMenu(trigger) {
  const container = trigger?.closest('.trip-add-services') || summaryRoot.querySelector('.trip-add-services')
  const button = container?.querySelector('[data-action="add-services"]')
  const menu = container?.querySelector('.trip-service-menu')
  if (!button || !menu) return
  const willOpen = menu.hidden
  closeServiceMenu({ except: willOpen ? container : null })
  menu.hidden = !willOpen
  button.setAttribute('aria-expanded', String(willOpen))
  if (willOpen) window.requestAnimationFrame(() => menu.querySelector('[role="menuitem"]')?.focus({ preventScroll: true }))
}

function popupMarkup(kind) {
  if (kind === 'payment') {
    const requestedSection = pendingPaymentSectionId
      ? trip.sections.find(item => item.id === pendingPaymentSectionId)
      : null
    const requestedGroup = requestedSection?.serviceGroup
    const items = buildCostItems(trip.sections).filter(item => item.payable && (!requestedGroup || item.key === requestedGroup))
    const total = items.reduce((sum, item) => sum + item.payablePrice, 0)
    const title = requestedSection ? displaySectionTitle(requestedSection) : 'Все услуги командировки'
    return `
      <section class="trip-popup trip-popup--payment" role="dialog" aria-modal="true" aria-labelledby="trip-popup-title">
        <button class="trip-popup__close" type="button" data-popup-close aria-label="Закрыть">×</button>
        <div class="trip-popup__header">
          <h2 id="trip-popup-title">Оплата</h2>
          <p>${escapeHtml(title)}</p>
        </div>
        <div class="trip-popup__payment-methods" role="group" aria-label="Способ оплаты">
          <button class="trip-popup__payment-method${selectedPaymentMethod === 'card' ? ' is-selected' : ''}" type="button" data-popup-payment-method="card" aria-pressed="${selectedPaymentMethod === 'card'}">
            <span class="trip-popup__payment-icon trip-popup__payment-icon--card" aria-hidden="true"></span>
            <strong>Карта или СБП</strong>
          </button>
          <button class="trip-popup__payment-method${selectedPaymentMethod === 'business' ? ' is-selected' : ''}" type="button" data-popup-payment-method="business" aria-pressed="${selectedPaymentMethod === 'business'}">
            <span class="trip-popup__payment-icon" aria-hidden="true"><img src="./assets/icons/briefcase.svg" alt=""></span>
            <span><strong>Бизнес-счёт</strong><small>100 000 ₽</small></span>
          </button>
        </div>
        <div class="trip-popup__payment-total">
          <span>К оплате</span>
          <strong>${escapeHtml(formatMoney(total))}</strong>
        </div>
        <button class="trip-popup__payment-submit" type="button" data-popup-confirm-payment>Оплатить ${escapeHtml(formatMoney(total))}</button>
      </section>`
  }

  if (kind === 'edit-details') {
    return `
      <section class="trip-popup" role="dialog" aria-modal="true" aria-labelledby="trip-popup-title">
        <button class="trip-popup__close" type="button" data-popup-close aria-label="Закрыть">×</button>
        <div class="trip-popup__header">
          <h2 id="trip-popup-title">Изменить детали</h2>
          <p>Даты поездки и участники</p>
        </div>
        <form class="trip-popup__form" data-popup-form="edit-details">
          <div class="trip-popup__row">
            <label class="trip-popup__field"><span>Туда</span><input name="depart" value="${escapeHtml(param('depart', ''))}" required></label>
            <label class="trip-popup__field"><span>Обратно</span><input name="return" value="${escapeHtml(param('return', ''))}"></label>
          </div>
          <div class="trip-popup__row">
            <label class="trip-popup__field"><span>Взрослые</span><input name="adults" type="number" min="1" max="20" value="${trip.adults}"></label>
            <label class="trip-popup__field"><span>Дети</span><input name="children" type="number" min="0" max="20" value="${trip.children}"></label>
          </div>
          <div class="trip-popup__actions">
            <button class="trip-popup__button trip-popup__button--secondary" type="button" data-popup-close>Отмена</button>
            <button class="trip-popup__button trip-popup__button--primary" type="submit">Сохранить</button>
          </div>
        </form>
      </section>`
  }

  if (kind === 'remove-service') {
    const section = trip.sections.find(item => item.id === pendingRemovalId)
    const title = section ? displaySectionTitle(section) : 'эту услугу'
    return `
      <section class="trip-popup trip-popup--confirm" role="alertdialog" aria-modal="true" aria-labelledby="trip-popup-title" aria-describedby="trip-popup-description">
        <button class="trip-popup__close" type="button" data-popup-close aria-label="Закрыть">×</button>
        <div class="trip-popup__header">
          <h2 id="trip-popup-title">Удалить услугу?</h2>
          <p id="trip-popup-description">«${escapeHtml(title)}» исчезнет из командировки, а на её месте останется пустой этап.</p>
        </div>
        <div class="trip-popup__actions">
          <button class="trip-popup__button trip-popup__button--secondary" type="button" data-popup-close>Не удалять</button>
          <button class="trip-popup__button trip-popup__button--danger" type="button" data-popup-confirm-remove>Удалить услугу</button>
        </div>
      </section>`
  }

  return `
    <section class="trip-popup trip-popup--confirm" role="alertdialog" aria-modal="true" aria-labelledby="trip-popup-title" aria-describedby="trip-popup-description">
      <button class="trip-popup__close" type="button" data-popup-close aria-label="Закрыть">×</button>
      <div class="trip-popup__header">
        <h2 id="trip-popup-title">Отменить командировку?</h2>
        <p id="trip-popup-description">Добавленные и оплаченные услуги будут отменены по правилам тарифов.</p>
      </div>
      <div class="trip-popup__actions">
        <button class="trip-popup__button trip-popup__button--secondary" type="button" data-popup-close>Не отменять</button>
        <button class="trip-popup__button trip-popup__button--danger" type="button" data-popup-confirm-cancel>Отменить командировку</button>
      </div>
    </section>`
}

function openPopup(kind, trigger) {
  closeServiceMenu()
  popupTrigger = trigger || document.activeElement
  popupLayer.innerHTML = popupMarkup(kind)
  popupLayer.hidden = false
  document.body.classList.add('has-trip-popup')
  window.requestAnimationFrame(() => popupLayer.querySelector('input, [data-popup-close]')?.focus({ preventScroll: true }))
}

function closePopup({ restoreFocus = true } = {}) {
  if (popupLayer.hidden) return
  popupLayer.hidden = true
  popupLayer.innerHTML = ''
  document.body.classList.remove('has-trip-popup')
  if (restoreFocus) popupTrigger?.focus?.({ preventScroll: true })
  popupTrigger = null
  pendingRemovalId = ''
  pendingPaymentSectionId = null
}

function openPaymentPopup(sectionId, trigger) {
  pendingPaymentSectionId = sectionId || ''
  openPopup('payment', trigger)
}

function preferredTransportSectionId() {
  return trip.sections.find(section => section.type === 'transport' && section.state === 'empty')?.id || 'outbound'
}

function freeIntervalSearchContext(section) {
  if (!section || section.type !== 'trip-card') return null
  const start = normalizeTimelineDate(section.date)
  const end = normalizeTimelineDate(section.endDate)
  if (!start || !end) return null
  const startOrdinal = timelineDateOrdinal(start, trip.timelineStart)
  const endOrdinal = timelineDateOrdinal(end, trip.timelineStart)
  if (!Number.isFinite(startOrdinal) || !Number.isFinite(endOrdinal) || endOrdinal < startOrdinal) return null
  return {
    start: `${start.day} ${start.month}`,
    end: `${end.day} ${end.month}`,
    city: section.city || trip.destinationCity,
    from: section.city || trip.destinationCity,
    to: trip.originCity,
    hasRange: endOrdinal > startOrdinal,
  }
}

function openServiceSearch(kind, sectionId = '') {
  const section = trip.sections.find(item => item.id === sectionId)
  const gapContext = freeIntervalSearchContext(section)
  if (kind === 'hotel') goToHotelSearch({ gapContext })
  else if (kind === 'avia') {
    const hasEmptyTransportGap = trip.sections.some(section => section.type === 'transport' && section.state === 'empty')
    goToAviaSearch(preferredTransportSectionId(), { preferRoundTrip: !hasEmptyTransportGap, gapContext })
  }
  else if (kind === 'train') goToTrainSearch(preferredTransportSectionId(), { gapContext })
}

function saveTripDetails(form) {
  const data = new FormData(form)
  const depart = String(data.get('depart') || '').trim()
  const returning = String(data.get('return') || '').trim()
  const adults = Math.max(1, Number(data.get('adults')) || 1)
  const children = Math.max(0, Number(data.get('children')) || 0)
  const target = new URL(window.location.href)
  const updates = {
    depart,
    return: returning,
    adults: String(adults),
    children: String(children),
    traveller: participantSummary(adults, children),
    tripAdults: String(adults),
    tripChildren: String(children),
    tripTraveller: participantSummary(adults, children),
  }
  for (const [name, value] of Object.entries(updates)) {
    params.set(name, value)
    if (value) target.searchParams.set(name, value)
    else target.searchParams.delete(name)
  }
  target.searchParams.delete('dates')
  window.location.href = target.href
}

function cancelEmptyTrip() {
  tripLifecycleFinalized = true
  removeCurrentDraft()
  const target = new URL('./index.html', window.location.href)
  window.location.replace(target.href)
}

function requestTripCancellation(trigger) {
  if (!hasAddedServices()) {
    cancelEmptyTrip()
    return
  }
  openPopup('cancel-trip', trigger)
}

function confirmTripCancellation() {
  tripLifecycleFinalized = true
  const cancelledTrip = saveCancelledTrip()
  trip.cancelled = true
  trip.cost.canPay = false
  trip.cost.timer = null
  trip.cost.label = 'Итого'
  params.set('cancelled', '1')
  params.set('tripId', cancelledTrip.id)
  removeCurrentDraft()
  try {
    const target = new URL(window.location.href)
    target.searchParams.set('cancelled', '1')
    target.searchParams.set('tripId', cancelledTrip.id)
    preserveTripServicesInUrl(target, trip.sections)
    window.history.replaceState(null, '', target.href)
  } catch {
    // Визуальное состояние остаётся рабочим, даже если история недоступна.
  }
  closePopup({ restoreFocus: false })
  renderPage()
  announce('Командировка отменена')
}

function announce(message) {
  announcer.textContent = message
}

function goToIndex() {
  const target = new URL('./index.html', window.location.href)
  window.location.href = target.href
}

function focusFirstEmptyAction() {
  const firstAction = servicesRoot.querySelector('[data-section-state="empty"] [data-service-action]')
  if (!firstAction) return
  firstAction.scrollIntoView({ behavior: 'smooth', block: 'center' })
  window.requestAnimationFrame(() => firstAction.focus({ preventScroll: true }))
}

function suggestedLodgingSearchRange() {
  const lodgingSection = trip.sections.find(section => section.type === 'lodging' && section.state === 'empty')
  const checkin = normalizeTimelineDate(lodgingSection?.suggestedRange?.checkin)
  const checkout = normalizeTimelineDate(lodgingSection?.suggestedRange?.checkout)
  if (!checkin || !checkout) return null
  if (timelineDateOrdinal(checkout, trip.timelineStart) <= timelineDateOrdinal(checkin, trip.timelineStart)) return null
  return {
    checkin: `${checkin.day} ${checkin.month}`,
    checkout: `${checkout.day} ${checkout.month}`,
  }
}

function goToHotelSearch({ gapContext = null } = {}) {
  const target = new URL('./hotel-search.html', window.location.href)
  params.forEach((value, name) => target.searchParams.set(name, value))
  preserveTripServicesInUrl(target, trip.sections)
  target.searchParams.delete(SECTION_REMOVED_QUERY_PARAMS.lodging)
  target.searchParams.delete('hotelBookingId')
  clearNotNeededSection('lodging', target)
  target.searchParams.set('workTrip', '1')
  target.searchParams.set('addToTrip', '1')
  target.searchParams.set('tripKind', 'existing')
  if (gapContext) target.searchParams.set('serviceSlot', 'append')
  else target.searchParams.delete('serviceSlot')
  target.searchParams.set('tripFrom', trip.originCity)
  target.searchParams.set('tripTo', trip.destinationCity)

  target.searchParams.set('city', gapContext?.city || trip.destinationCity)
  target.searchParams.set('to', gapContext?.city || trip.destinationCity)
  const suggestedRange = suggestedLodgingSearchRange()
  target.searchParams.set('checkin', gapContext?.start || suggestedRange?.checkin || param('checkin', param('depart', '23 окт')))
  const checkoutValue = gapContext?.end || suggestedRange?.checkout || params.get('checkout')?.trim() || params.get('return')?.trim() || ''
  if (checkoutValue) target.searchParams.set('checkout', checkoutValue)
  else target.searchParams.delete('checkout')
  const adults = Math.max(1, Number(params.get('adults')) || 1)
  const children = Math.max(0, Number(params.get('children')) || 0)
  const adultWord = adults % 10 === 1 && adults % 100 !== 11 ? 'взрослый' : 'взрослых'
  const childPart = children > 0 ? `, ${children} ${children === 1 ? 'ребёнок' : 'детей'}` : ''
  target.searchParams.set('traveller', params.get('traveller')?.trim() || `${adults} ${adultWord}${childPart}`)
  window.location.href = target.href
}

function goToAviaSearch(sectionId, { preferRoundTrip = false, gapContext = null } = {}) {
  const target = new URL('./avia-search.html', window.location.href)
  params.forEach((value, name) => target.searchParams.set(name, value))
  preserveTripServicesInUrl(target, trip.sections)
  target.searchParams.delete(SECTION_REMOVED_QUERY_PARAMS[sectionId])
  clearNotNeededSection(sectionId, target)
  target.searchParams.delete(sectionId === 'return' ? 'flightReturnRemoved' : 'flightOutboundRemoved')
  const legacyFlightBookingId = target.searchParams.get('bookingId')?.trim()
  const legacyFlightStatus = target.searchParams.get('flightStatus')?.trim()
  const legacyFlightAdded = target.searchParams.get('flightAdded') === '1'
  const legacyFlightScope = target.searchParams.get('flightScope') === 'roundtrip' ? 'roundtrip' : 'oneway'
  if (legacyFlightBookingId && (legacyFlightAdded || target.searchParams.get('flightOutboundAdded') === '1')) {
    if (!target.searchParams.has('flightOutboundBookingId')) target.searchParams.set('flightOutboundBookingId', legacyFlightBookingId)
    if (legacyFlightStatus && !target.searchParams.has('flightOutboundStatus')) target.searchParams.set('flightOutboundStatus', legacyFlightStatus)
  }
  if (legacyFlightBookingId && ((legacyFlightAdded && legacyFlightScope === 'roundtrip') || target.searchParams.get('flightReturnAdded') === '1')) {
    if (!target.searchParams.has('flightReturnBookingId')) target.searchParams.set('flightReturnBookingId', legacyFlightBookingId)
    if (legacyFlightStatus && !target.searchParams.has('flightReturnStatus')) target.searchParams.set('flightReturnStatus', legacyFlightStatus)
  }
  target.searchParams.delete('bookingId')
  const origin = trip.originCity
  const destination = trip.destinationCity
  const isReturn = sectionId === 'return'
  const tripReturnDate = params.get('return')?.trim() || ''
  const hasFilledReturnTransport = trip.sections.some(section => (
    section.type === 'transport'
    && section.sourceSectionId === 'return'
    && section.state === 'filled'
  ))
  const searchRoundTrip = gapContext?.hasRange || (!isReturn
    && hasReturnValue(tripReturnDate)
    && (preferRoundTrip || !hasFilledReturnTransport))
  target.searchParams.set('tripFrom', origin)
  target.searchParams.set('tripTo', destination)
  target.searchParams.set('from', gapContext?.from || (isReturn ? destination : origin))
  target.searchParams.set('to', gapContext?.to || (isReturn ? origin : destination))
  target.searchParams.set('flightOutboundDate', gapContext?.start || (isReturn ? param('return', '30 сентября') : param('depart', '29 сентября')))
  if (searchRoundTrip) {
    target.searchParams.set('flightReturnDate', gapContext?.end || tripReturnDate)
    target.searchParams.set('flightScope', 'roundtrip')
    target.searchParams.delete(SECTION_REMOVED_QUERY_PARAMS.return)
    target.searchParams.delete('flightReturnRemoved')
  } else {
    target.searchParams.delete('flightReturnDate')
    target.searchParams.set('flightScope', 'oneway')
  }
  target.searchParams.set('traveller', param('traveller', '1 взрослый'))
  if (gapContext) {
    target.searchParams.delete('flightOutboundBookingId')
    target.searchParams.delete('flightReturnBookingId')
    target.searchParams.delete('segment')
    target.searchParams.set('serviceSlot', 'append')
  } else {
    target.searchParams.set('segment', sectionId)
    target.searchParams.delete('serviceSlot')
  }
  target.searchParams.set('workTrip', '1')
  target.searchParams.set('addToTrip', '1')
  target.searchParams.set('tripKind', 'existing')
  window.location.href = target.href
}

function goToTrainSearch(sectionId, { gapContext = null } = {}) {
  const target = new URL('./train-search.html', window.location.href)
  params.forEach((value, name) => target.searchParams.set(name, value))
  preserveTripServicesInUrl(target, trip.sections)
  target.searchParams.delete(SECTION_REMOVED_QUERY_PARAMS[sectionId])
  clearNotNeededSection(sectionId, target)
  target.searchParams.delete(sectionId === 'return' ? 'railReturnRemoved' : 'railOutboundRemoved')
  const legacyRailBookingId = target.searchParams.get('railBookingId')?.trim()
  const legacyRailStatus = target.searchParams.get('railStatus')?.trim()
  const legacyRailAdded = target.searchParams.get('railAdded') === '1'
  const legacyRailScope = target.searchParams.get('railScope') === 'roundtrip' ? 'roundtrip' : 'oneway'
  const hasRailOutbound = Boolean(target.searchParams.get('railOutboundTrainId') || target.searchParams.get('railOutboundTrainNumber'))
  const hasRailReturn = Boolean(target.searchParams.get('railReturnTrainId') || target.searchParams.get('railReturnTrainNumber'))
  if (legacyRailBookingId && hasRailOutbound && (legacyRailAdded || target.searchParams.get('railOutboundAdded') === '1')) {
    if (!target.searchParams.has('railOutboundBookingId')) target.searchParams.set('railOutboundBookingId', legacyRailBookingId)
    if (legacyRailStatus && !target.searchParams.has('railOutboundStatus')) target.searchParams.set('railOutboundStatus', legacyRailStatus)
  }
  if (legacyRailBookingId && hasRailReturn && ((legacyRailAdded && legacyRailScope === 'roundtrip') || target.searchParams.get('railReturnAdded') === '1')) {
    if (!target.searchParams.has('railReturnBookingId')) target.searchParams.set('railReturnBookingId', legacyRailBookingId)
    if (legacyRailStatus && !target.searchParams.has('railReturnStatus')) target.searchParams.set('railReturnStatus', legacyRailStatus)
  }
  target.searchParams.delete('railBookingId')
  const adults = Math.max(1, Number(params.get('adults')) || 1)
  const children = Math.max(0, Number(params.get('children')) || 0)
  const adultWord = adults % 10 === 1 && adults % 100 !== 11 ? 'взрослый' : 'взрослых'
  const childWord = children % 10 === 1 && children % 100 !== 11 ? 'ребёнок' : 'детей'
  const childPart = children > 0 ? `, ${children} ${childWord}` : ''
  const origin = trip.originCity
  const destination = trip.destinationCity
  const isReturn = sectionId === 'return'
  const serviceDate = gapContext?.start || (isReturn ? param('return', '30 сентября') : param('depart', '29 сентября'))
  target.searchParams.set('tripFrom', origin)
  target.searchParams.set('tripTo', destination)
  target.searchParams.set('from', gapContext?.from || (isReturn ? destination : origin))
  target.searchParams.set('to', gapContext?.to || (isReturn ? origin : destination))
  if (gapContext) {
    target.searchParams.set('railOutboundDate', serviceDate)
    if (gapContext.hasRange) target.searchParams.set('railReturnDate', gapContext.end)
    else target.searchParams.delete('railReturnDate')
    target.searchParams.set('railScope', gapContext.hasRange ? 'roundtrip' : 'oneway')
  } else {
    target.searchParams.set(isReturn ? 'railReturnDate' : 'railOutboundDate', serviceDate)
    target.searchParams.set('railScope', 'oneway')
  }
  target.searchParams.set('traveller', params.get('traveller')?.trim() || `${adults} ${adultWord}${childPart}`)
  if (gapContext) {
    target.searchParams.delete('railOutboundBookingId')
    target.searchParams.delete('railReturnBookingId')
    target.searchParams.delete('railSegment')
    target.searchParams.delete('tripSegment')
    target.searchParams.set('serviceSlot', 'append')
  } else {
    target.searchParams.set('railSegment', sectionId)
    target.searchParams.set('tripSegment', sectionId)
    target.searchParams.delete('serviceSlot')
  }
  target.searchParams.set('workTrip', '1')
  target.searchParams.set('tripKind', 'existing')
  window.location.href = target.href
}

function selectServiceAction(button) {
  const sectionId = button.dataset.sectionId
  const actionId = button.dataset.serviceAction
  if (!sectionId || !actionId) return
  const section = trip.sections.find(item => item.id === sectionId)
  const action = section?.actions.find(item => item.id === actionId)
  if (!section || !action) return

  if (section.id === 'lodging' && action.id === 'lodging') {
    goToHotelSearch()
    return
  }

  if ((section.id === 'outbound' || section.id === 'return') && action.id === 'avia') {
    goToAviaSearch(section.id)
    return
  }

  if ((section.id === 'outbound' || section.id === 'return') && action.id === 'train') {
    goToTrainSearch(section.id)
    return
  }

  const sourceSectionId = section.sourceSectionId || section.id
  if (action.id === 'skip' && notNeededSections.has(sourceSectionId)) {
    notNeededSections.delete(sourceSectionId)
    selections.delete(sectionId)
    const target = new URL(window.location.href)
    persistNotNeededSections(target)
    window.history.replaceState(window.history.state, '', target)
    renderServices()
    syncDraftLifecycle()
    announce('Потребность в услуге снова открыта')
    return
  }

  selections.set(sectionId, actionId)
  if (action.id === 'skip') {
    notNeededSections.add(sourceSectionId)
    const target = new URL(window.location.href)
    persistNotNeededSections(target)
    window.history.replaceState(window.history.state, '', target)
  }
  renderServices()
  syncDraftLifecycle()
  const replacement = servicesRoot.querySelector(`[data-section-id="${CSS.escape(sectionId)}"][data-service-action="${CSS.escape(actionId)}"]`)
  replacement?.focus({ preventScroll: true })
  announce(action.id === 'skip' ? 'Услуга не нужна' : `Выбрано: ${action.label}`)
}

function persistNotNeededSections(target) {
  const value = [...notNeededSections].join(',')
  if (value) {
    params.set(NOT_NEEDED_QUERY_PARAM, value)
    target.searchParams.set(NOT_NEEDED_QUERY_PARAM, value)
  } else {
    params.delete(NOT_NEEDED_QUERY_PARAM)
    target.searchParams.delete(NOT_NEEDED_QUERY_PARAM)
  }
}

function clearNotNeededSection(sectionId, target) {
  if (!notNeededSections.delete(sectionId)) return
  selections.delete(sectionId)
  persistNotNeededSections(target)
}

function updateTripService(sectionId, patch) {
  const section = trip.sections.find(item => item.id === sectionId)
  if (!section || !patch || typeof patch !== 'object') return false
  Object.assign(section, patch)
  if (section.state === 'filled' && !SERVICE_STATUSES[section.status]) {
    section.status = 'awaiting-payment'
  }
  renderServices()
  reconcilePaymentTimer()
  syncDraftLifecycle()
  return true
}

function updateTripCost(patch) {
  if (!patch || typeof patch !== 'object') return false
  Object.assign(trip.cost, patch)
  if (Object.hasOwn(patch, 'timer') && patch.timer && !Number.isFinite(patch.timer.deadlineAt)) {
    trip.cost.timer = createPaymentTimer(patch.timer.durationSeconds)
  }
  renderCost()
  return true
}

function startPaymentTimer(durationSeconds = PAYMENT_TIMER_SECONDS) {
  trip.cost.state = 'filled'
  trip.cost.message = ''
  trip.cost.timer = createPaymentTimer(durationSeconds)
  renderCost()
  return trip.cost.timer.deadlineAt
}

function reconcilePaymentTimer() {
  const filledSections = trip.sections.filter(section => section.state === 'filled' && section.status !== 'cancelled')
  const needsPayment = filledSections.some(section => section.status === 'awaiting-payment')
  const totalPrice = filledSections.reduce((sum, section) => sum + Math.max(0, Number(section.price) || 0), 0)
  const payablePrice = filledSections
    .filter(section => section.status === 'awaiting-payment')
    .reduce((sum, section) => sum + Math.max(0, Number(section.price) || 0), 0)
  trip.cost.items = buildCostItems(trip.sections)
  trip.cost.canPay = needsPayment

  if (filledSections.length === 0) {
    trip.cost.state = 'empty'
    trip.cost.message = EMPTY_COST_MESSAGE
    trip.cost.total = '0 ₽'
    trip.cost.timer = null
  } else {
    trip.cost.state = 'filled'
    trip.cost.message = ''
    trip.cost.total = formatMoney(!trip.cancelled && needsPayment ? payablePrice : totalPrice)
    trip.cost.timer = null
  }
  renderCost()
}

function requestTripPayment(sectionId = '') {
  const requestedSection = sectionId ? trip.sections.find(section => section.id === sectionId) : null
  const requestedGroup = requestedSection?.serviceGroup
  const items = buildCostItems(trip.sections).filter(item => item.payable && (!requestedGroup || item.key === requestedGroup))
  if (items.length === 0) return

  document.dispatchEvent(new CustomEvent('trip:payment-requested', {
    detail: {
      sectionId: sectionId || null,
      serviceGroup: requestedGroup || null,
      items: items.map(item => ({
        ...item,
        price: item.payablePrice,
        amount: item.payableAmount,
        details: [...item.details],
      })),
      total: items.reduce((sum, item) => sum + item.payablePrice, 0),
    },
  }))

  const payableSections = trip.sections.filter(section => (
    section.state === 'filled'
    && section.status === 'awaiting-payment'
    && (!requestedGroup || section.serviceGroup === requestedGroup)
  ))
  if (payableSections.length === 0) return

  const target = new URL(window.location.href)
  payableSections.forEach(section => {
    section.status = 'paid'
    if (section.isPreserved) return
    const sourceSectionId = section.sourceSectionId || section.id
    if (section.type === 'lodging') {
      params.set('hotelStatus', 'paid')
      target.searchParams.set('hotelStatus', 'paid')
    } else if (section.booking?.kind === 'rail') {
      params.set('railStatus', 'paid')
      target.searchParams.set('railStatus', 'paid')
      const statusParam = sourceSectionId === 'return' ? 'railReturnStatus' : 'railOutboundStatus'
      params.set(statusParam, 'paid')
      target.searchParams.set(statusParam, 'paid')
    } else if (section.booking?.kind === 'flight') {
      params.set('flightStatus', 'paid')
      target.searchParams.set('flightStatus', 'paid')
      const statusParam = sourceSectionId === 'return' ? 'flightReturnStatus' : 'flightOutboundStatus'
      params.set(statusParam, 'paid')
      target.searchParams.set(statusParam, 'paid')
    }
  })
  preserveTripServicesInUrl(target, trip.sections)

  const tripId = params.get('tripId')?.trim()
    || params.get('draftId')?.trim()
    || window.crypto?.randomUUID?.()
    || `paid-${Date.now()}`
  target.searchParams.set('tripId', tripId)
  target.searchParams.delete('draft')
  target.searchParams.delete('draftId')
  target.searchParams.delete('cancelled')

  tripLifecycleFinalized = true
  removeCurrentDraft()
  savePaidTrip(tripId, target)
  stopPaymentTimerInterval()
  announce(sectionId ? 'Услуга оплачена' : 'Командировка оплачена')
  window.location.assign(target.href)
}

function showServiceDetails(sectionId) {
  const section = trip.sections.find(item => item.id === sectionId)
  if (!section) return

  const relatedSections = section.booking?.kind === 'flight'
    ? trip.sections.filter(item => item.booking?.kind === 'flight' && (
      section.serviceGroup && item.serviceGroup === section.serviceGroup
      || section.booking.bookingId && item.booking.bookingId === section.booking.bookingId
    ))
    : []

  document.dispatchEvent(new CustomEvent('trip:service-details', {
    detail: {
      section: { ...section, title: displaySectionTitle(section) },
      relatedSections,
    },
  }))
  announce(section.type === 'lodging' || section.booking?.kind === 'flight'
    ? `Открыты детали услуги «${displaySectionTitle(section)}»`
    : `Детали услуги «${displaySectionTitle(section)}» подключим отдельно`)
}

function removeTripService(sectionId) {
  const requestedSection = trip.sections.find(item => item.id === sectionId)
  if (!requestedSection || requestedSection.state !== 'filled' || requestedSection.status === 'paid') return

  const removedTitle = displaySectionTitle(requestedSection)
  const cancelledHistory = {
    ...requestedSection,
    id: `cancelled-${stableHash(`${serviceIdentity(requestedSection)}-${Date.now()}`)}`,
    serviceId: serviceIdentity(requestedSection),
    status: 'cancelled',
    removable: false,
    isPreserved: true,
    actions: [],
  }
  const serviceGroup = requestedSection.serviceGroup || ''
  const removedPrice = Math.max(0, Number(requestedSection.price) || 0)
  const isAviaService = serviceGroup.startsWith('avia-')
  const isRailService = serviceGroup.startsWith('rail-')
  const sourceSectionId = requestedSection.sourceSectionId || requestedSection.id
  const emptyTitle = sourceSectionId === 'lodging'
    ? `Жильё в ${cityInCase(trip.destinationCity, 'prepositional')}`
    : sourceSectionId === 'return'
      ? `На чём вернёмся в ${cityInCase(trip.originCity, 'accusative')}`
      : `На чём поедем в ${cityInCase(trip.destinationCity, 'accusative')}`
  const emptyActions = sourceSectionId === 'lodging'
    ? [
        { id: 'lodging', label: 'Найти жильё', icon: './assets/icons/lodging.svg' },
        { id: 'skip', label: 'Не нужно', compact: true },
      ]
    : [
        { id: 'avia', label: 'Авиа', icon: './assets/icons/transport-plane.svg' },
        { id: 'train', label: 'Ж/д', icon: './assets/icons/transport-train.svg' },
        { id: 'skip', label: 'Не нужно', compact: true },
      ]

  Object.assign(requestedSection, {
    state: 'empty',
    title: emptyTitle,
    summary: '',
    booking: null,
    status: null,
    removable: false,
    serviceGroup: null,
    price: 0,
    actions: emptyActions,
  })
  const requestedIndex = trip.sections.indexOf(requestedSection)
  trip.sections.splice(Math.max(0, requestedIndex), 0, cancelledHistory)
  selections.delete(sectionId)

  if (isAviaService || isRailService) {
    const remainingTransport = trip.sections.find(section => (
      section.state === 'filled'
      && section.type === 'transport'
      && (section.serviceGroup === serviceGroup
        || (isAviaService && section.serviceGroup?.startsWith('avia-'))
        || (isRailService && section.serviceGroup?.startsWith('rail-')))
    ))
    if (remainingTransport) {
      const bundleSuffix = String(remainingTransport.serviceGroup || '').split(':').slice(1).join(':')
      const serviceKind = isAviaService ? 'avia-oneway' : 'rail-oneway'
      remainingTransport.serviceKind = serviceKind
      remainingTransport.serviceGroup = bundleSuffix ? `${serviceKind}:${bundleSuffix}` : serviceKind
      if (isAviaService && remainingTransport.price === 0) remainingTransport.price = removedPrice
    }
  }

  const queryName = serviceRemovedQueryName(requestedSection)
  const updatedUrl = Reflect.construct(window.URL, [window.location.href])
  if (queryName && !requestedSection.isPreserved) {
    params.set(queryName, '1')
    updatedUrl.searchParams.set(queryName, '1')
  }
  preserveTripServicesInUrl(updatedUrl, trip.sections)
  const preservedValue = updatedUrl.searchParams.get(TRIP_SERVICES_QUERY_PARAM)
  if (preservedValue) params.set(TRIP_SERVICES_QUERY_PARAM, preservedValue)
  else params.delete(TRIP_SERVICES_QUERY_PARAM)
  window.history.replaceState(window.history.state, '', updatedUrl)

  renderServices()
  reconcilePaymentTimer()

  const focusTarget = servicesRoot.querySelector(
    `[data-section="${CSS.escape(sectionId)}"] [data-service-action]`,
  )
  focusTarget?.focus({ preventScroll: true })
  announce(`Услуга «${removedTitle}» удалена`)
}

document.addEventListener('click', event => {
  const costPaymentMethod = event.target.closest('[data-cost-payment-method]')
  if (costPaymentMethod) {
    selectedPaymentMethod = costPaymentMethod.dataset.costPaymentMethod
    renderCost()
    costRoot.querySelector(`[data-cost-payment-method="${CSS.escape(selectedPaymentMethod)}"]`)?.focus({ preventScroll: true })
    announce(`Выбран способ оплаты: ${costPaymentMethod.textContent.trim()}`)
    return
  }

  const addService = event.target.closest('[data-add-service]')
  if (addService) {
    if (isAddingServicesLocked()) return
    const sectionId = addService.closest('[data-section]')?.dataset.section || ''
    openServiceSearch(addService.dataset.addService, sectionId)
    return
  }

  if (!event.target.closest('.trip-add-services')) closeServiceMenu()

  const serviceAction = event.target.closest('[data-service-action]')
  if (serviceAction) {
    selectServiceAction(serviceAction)
    return
  }

  const actionTarget = event.target.closest('[data-action]')
  const action = actionTarget?.dataset.action
  if (action === 'add-services' && isAddingServicesLocked()) return
  if (action === 'dismiss-add-services') {
    actionTarget.closest('.trip-service--add-services')?.remove()
    announce('Добавление услуг пропущено')
    return
  }

  if (action === 'remove-service') {
    pendingRemovalId = actionTarget.dataset.sectionId
    openPopup('remove-service', actionTarget)
    return
  }

  if (action === 'pay-service') {
    openPaymentPopup(actionTarget.dataset.sectionId, actionTarget)
    return
  }

  if (action === 'check-availability') {
    checkServiceAvailability(actionTarget)
    return
  }

  if (action === 'pay-trip') {
    actionTarget.disabled = true
    actionTarget.classList.add('is-processing')
    actionTarget.textContent = 'Оплачиваем…'
    document.querySelector('.trip-page')?.classList.add('is-payment-transitioning')
    window.setTimeout(() => requestTripPayment(), 280)
    return
  }

  if (action === 'back') goToIndex()
  else if (action === 'add-services') toggleServiceMenu(actionTarget)
  else if (action === 'edit-details') openPopup('edit-details', actionTarget)
  else if (action === 'cancel-trip') requestTripCancellation(actionTarget)
  else if (action === 'trip-documents') announce('Открыты документы по бронированию')
  else if (action === 'trip-support') announce('Открыт чат с поддержкой')

  const detailsTarget = event.target.closest('[data-service-details]')
  const nestedControl = event.target.closest('button, a, input, select, textarea')
  if (detailsTarget && !nestedControl) showServiceDetails(detailsTarget.dataset.serviceDetails)

  const headerAction = event.target.closest('[data-header-action]')?.dataset.headerAction
  if (headerAction === 'Мои поездки') window.location.href = './trips.html#business'
  else if (headerAction) announce(`${headerAction}: действие пока не подключено`)
})

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !popupLayer.hidden) {
    event.preventDefault()
    closePopup()
    return
  }
  if (event.key === 'Escape' && document.querySelector('.trip-service-menu:not([hidden])')) {
    event.preventDefault()
    closeServiceMenu({ restoreFocus: true })
    return
  }
  const detailsTarget = event.target.closest('[data-service-details]')
  if (!detailsTarget || event.target !== detailsTarget || !['Enter', ' '].includes(event.key)) return
  event.preventDefault()
  showServiceDetails(detailsTarget.dataset.serviceDetails)
})

popupLayer.addEventListener('click', event => {
  if (event.target === popupLayer || event.target.closest('[data-popup-close]')) {
    closePopup()
    return
  }
  if (event.target.closest('[data-popup-confirm-cancel]')) confirmTripCancellation()
  if (event.target.closest('[data-popup-confirm-remove]')) {
    const sectionId = pendingRemovalId
    pendingRemovalId = ''
    closePopup({ restoreFocus: false })
    removeTripService(sectionId)
  }
  const paymentMethod = event.target.closest('[data-popup-payment-method]')
  if (paymentMethod) {
    selectedPaymentMethod = paymentMethod.dataset.popupPaymentMethod
    popupLayer.querySelectorAll('[data-popup-payment-method]').forEach(button => {
      const selected = button.dataset.popupPaymentMethod === selectedPaymentMethod
      button.classList.toggle('is-selected', selected)
      button.setAttribute('aria-pressed', String(selected))
    })
    announce(`Выбран способ оплаты: ${paymentMethod.textContent.trim()}`)
    return
  }
  const confirmPayment = event.target.closest('[data-popup-confirm-payment]')
  if (confirmPayment) {
    const sectionId = pendingPaymentSectionId || ''
    confirmPayment.disabled = true
    confirmPayment.textContent = 'Оплачиваем…'
    window.setTimeout(() => {
      closePopup({ restoreFocus: false })
      requestTripPayment(sectionId)
    }, 360)
  }
})

popupLayer.addEventListener('submit', event => {
  const form = event.target.closest('[data-popup-form="edit-details"]')
  if (!form) return
  event.preventDefault()
  saveTripDetails(form)
})

document.addEventListener('trip:update-service', event => {
  const { sectionId, patch } = event.detail || {}
  if (sectionId) updateTripService(sectionId, patch)
})

document.addEventListener('trip:update-cost', event => {
  updateTripCost(event.detail)
})

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updatePaymentTimerDisplay()
})

window.addEventListener('pagehide', () => {
  syncDraftLifecycle({ saveUnpaid: !tripLifecycleFinalized })
  stopPaymentTimerInterval()
})

window.TripPagePrototype = Object.freeze({
  SERVICE_STATUSES,
  buildTripModel,
  renderTripServiceSection,
  renderBookingCardShell,
  renderServiceStatus,
  renderCostSidebar,
  buildCostItems,
  sortTripSectionsByDate,
  buildChronologicalTimeline,
  snapshotTripSection,
  preserveTripServicesInUrl,
  createPaymentTimer,
  formatPaymentTime,
  startPaymentTimer,
  updateTripService,
  updateTripCost,
  goToAviaSearch,
  goToTrainSearch,
  showServiceDetails,
  requestTripPayment,
  removeTripService,
})

syncPaidTripLifecycle()
renderPage()
document.querySelector('.trip-page')?.setAttribute('data-ready', 'true')
