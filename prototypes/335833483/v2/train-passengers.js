const page = document.querySelector('.rail-passengers-page')
const journeyLegs = document.querySelector('#journey-legs')
const cardsRoot = document.querySelector('#rail-passenger-cards')
const form = document.querySelector('#rail-passenger-form')
const priceBreakdown = document.querySelector('#rail-passenger-price-breakdown')
const totalElement = document.querySelector('#rail-passenger-total')
const submitButton = document.querySelector('#rail-add-to-trip')
const announcer = document.querySelector('#rail-passenger-announcer')
const businessTripRow = document.querySelector('#business-trip-row')

if (!page || !journeyLegs || !cardsRoot || !form || !priceBreakdown || !totalElement || !submitButton || !announcer || !businessTripRow) {
  throw new Error('Не найдены обязательные элементы страницы данных пассажиров поезда')
}

const params = new URLSearchParams(window.location.search)
const requestedTripSegment = params.get('tripSegment') || params.get('segment')
const tripSegment = requestedTripSegment === 'return'
  ? 'return'
  : requestedTripSegment === 'outbound' ? 'outbound' : null
const hasExistingTripReference = Boolean(params.get('tripId')?.trim() || params.get('draftId')?.trim())
const hasExistingTripContext = params.get('tripKind') === 'existing'
  && hasExistingTripReference
  && (params.get('workTrip') === '1' || params.get('addToTrip') === '1')
const isExistingTripFlow = Boolean(
  tripSegment
  || hasExistingTripContext
)
const isBusinessTripFlow = isExistingTripFlow
  || params.get('workTrip') === '1'
  || params.get('addToTrip') === '1'
const isSingleReturn = tripSegment === 'return'
const generatedBookingId = window.crypto?.randomUUID?.() || `rail-${Date.now().toString(36)}`
const bookingId = params.get('railBookingId')?.trim() || generatedBookingId
const storageKey = `rail-booking-v2:${bookingId}`

function applyExistingTripContext(target) {
  if (!isExistingTripFlow) return target
  target.searchParams.set('workTrip', '1')
  target.searchParams.set('addToTrip', '1')
  target.searchParams.set('tripKind', 'existing')
  return target
}

function renderTripContext() {
  page.dataset.tripContext = isBusinessTripFlow ? 'business' : 'standalone'
  businessTripRow.hidden = true
  document.querySelectorAll('[data-standalone-only]').forEach(element => { element.hidden = isBusinessTripFlow })
  if (isBusinessTripFlow) submitButton.dataset.submitMode = 'add-to-trip'
  else delete submitButton.dataset.submitMode
  submitButton.textContent = isBusinessTripFlow ? 'Добавить в командировку' : 'Перейти к подтверждению'
}

function readStoredBooking() {
  try {
    return JSON.parse(window.sessionStorage.getItem(storageKey) || '{}')
  } catch {
    return {}
  }
}

const storedBooking = readStoredBooking()
const demoMode = !params.get('railOutboundTrainId') && !params.get('railReturnTrainId')
  && !storedBooking.trains?.outbound && !storedBooking.trains?.return

function hasReturnValue(value) {
  const normalized = String(value ?? '').trim()
  return Boolean(normalized) && !/^(?:нет|без|—|-|one[\s-]?way)$/iu.test(normalized)
}

function positiveInteger(value, fallback = 0) {
  const number = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

function nonNegativeNumber(value, fallback = 0) {
  const number = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

function parseSeats(value) {
  if (Array.isArray(value)) return value.map(item => String(item).replace('-', ':')).filter(item => /^\d+:\d+$/u.test(item))
  if (!value) return []
  return String(value).split(',').map(item => item.trim().replace('-', ':')).filter(item => /^\d+:\d+$/u.test(item))
}

function travellerCounts() {
  const traveller = params.get('traveller') || storedBooking.route?.traveller || ''
  const numbers = [...traveller.matchAll(/\d+/gu)].map(match => Number(match[0]))
  const adults = Math.max(1, positiveInteger(params.get('adults') ?? storedBooking.counts?.adults, numbers[0] || 1))
  const childWithSeat = positiveInteger(
    params.get('childWithSeat') ?? storedBooking.counts?.childWithSeat ?? params.get('children'),
    numbers[1] || 0,
  )
  const childWithoutSeat = positiveInteger(params.get('childWithoutSeat') ?? storedBooking.counts?.childWithoutSeat, numbers[2] || 0)
  return { adults, childWithSeat, childWithoutSeat }
}

const route = {
  from: params.get('from')?.trim() || storedBooking.route?.from || 'Москва',
  to: params.get('to')?.trim() || storedBooking.route?.to || 'Санкт-Петербург',
  depart: params.get('depart')?.trim() || storedBooking.route?.depart || '15 августа',
  return: params.get('return')?.trim() || storedBooking.route?.return || (demoMode ? '19 августа' : ''),
  railOutboundDate: params.get('railOutboundDate')?.trim() || storedBooking.route?.railOutboundDate || params.get('depart')?.trim() || storedBooking.route?.depart || '15 августа',
  railReturnDate: params.get('railScope') === 'oneway'
    ? (isSingleReturn
        ? params.get('railReturnDate')?.trim() || params.get('railDate')?.trim() || params.get('return')?.trim() || ''
        : '')
    : params.get('railReturnDate')?.trim() || storedBooking.route?.railReturnDate || params.get('return')?.trim() || storedBooking.route?.return || (demoMode ? '19 августа' : ''),
}
const hasReturn = demoMode || (
  params.get('railScope') !== 'oneway'
  && hasReturnValue(route.railReturnDate)
  && (params.get('railScope') === 'roundtrip' || storedBooking.scope === 'roundtrip' || Boolean(params.get('railReturnTrainId') || storedBooking.trains?.return))
)
const segments = tripSegment ? [tripSegment] : hasReturn ? ['outbound', 'return'] : ['outbound']
const counts = travellerCounts()
const seats = {
  outbound: parseSeats(params.get('railOutboundSeats') || storedBooking.seats?.outbound || (demoMode ? ['4:6'] : [])),
  return: parseSeats(params.get('railReturnSeats') || storedBooking.seats?.return || (demoMode ? ['4:46'] : [])),
}
const totals = {
  outbound: nonNegativeNumber(params.get('railOutboundTotal'), nonNegativeNumber(storedBooking.totals?.outbound, demoMode ? 2834.71 : 0)),
  return: nonNegativeNumber(params.get('railReturnTotal'), nonNegativeNumber(storedBooking.totals?.return, demoMode ? 2834.71 : 0)),
}

const state = {
  route,
  hasReturn,
  segments,
  counts,
  seats,
  totals,
  submitting: false,
  fares: storedBooking.fares || {},
  passengers: Array.isArray(storedBooking.passengers) ? storedBooking.passengers : [],
  contact: storedBooking.contact || {},
}

const passengerProfiles = Object.freeze([
  Object.freeze({ id: 'ivanov', label: 'Иван Иванов', surname: 'ИВАНОВ', givenName: 'ИВАН', middleName: 'ИВАНОВИЧ', birthDate: '21.02.2002', gender: 'male', documentType: 'passport-rf', documentNumber: '4510 123456' }),
  Object.freeze({ id: 'petrova', label: 'Мария Петрова', surname: 'ПЕТРОВА', givenName: 'МАРИЯ', middleName: 'АЛЕКСЕЕВНА', birthDate: '11.11.1990', gender: 'female', documentType: 'passport-rf', documentNumber: '4511 654321' }),
  Object.freeze({ id: 'sokolov', label: 'Алексей Соколов', surname: 'СОКОЛОВ', givenName: 'АЛЕКСЕЙ', middleName: 'ПЕТРОВИЧ', birthDate: '07.03.1988', gender: 'male', documentType: 'passport-rf', documentNumber: '4512 102030' }),
  Object.freeze({ id: 'orlova', label: 'Елена Орлова', surname: 'ОРЛОВА', givenName: 'ЕЛЕНА', middleName: 'СЕРГЕЕВНА', birthDate: '19.09.1994', gender: 'female', documentType: 'passport-rf', documentNumber: '4513 405060' }),
])

const buyerContacts = Object.freeze({
  ivanov: Object.freeze({ email: 'ivan.ivanov@example.com', phone: '+7 999 123-45-67' }),
  petrova: Object.freeze({ email: 'maria.petrova@example.com', phone: '+7 999 234-56-78' }),
  sokolov: Object.freeze({ email: 'alexey.sokolov@example.com', phone: '+7 999 345-67-89' }),
  orlova: Object.freeze({ email: 'elena.orlova@example.com', phone: '+7 999 456-78-90' }),
})

const coachLabels = Object.freeze({ platz: 'Плацкарт', coupe: 'Купе', sv: 'СВ', lux: 'Люкс' })

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatMoney(value) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: Number(value) % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0).replaceAll('\u00a0', ' ') + ' ₽'
}

function shortDate(value) {
  const months = {
    января: 'янв', февраля: 'фев', марта: 'мар', апреля: 'апр', мая: 'мая', июня: 'июн',
    июля: 'июл', августа: 'авг', сентября: 'сен', октября: 'окт', ноября: 'ноя', декабря: 'дек',
  }
  const match = String(value).toLocaleLowerCase('ru').match(/(\d{1,2})\s+([а-яё]+)/u)
  if (!match) return String(value)
  return `${match[1]} ${months[match[2]] || match[2].slice(0, 3)}`
}

function routeFor(segment) {
  return segment === 'return'
    ? { from: state.route.to, to: state.route.from, date: state.route.railReturnDate }
    : { from: state.route.from, to: state.route.to, date: state.route.railOutboundDate }
}

function prefixFor(segment) {
  return segment === 'return' ? 'railReturn' : 'railOutbound'
}

function trainFor(segment) {
  const prefix = prefixFor(segment)
  const stored = storedBooking.trains?.[segment] || {}
  const currentRoute = routeFor(segment)
  const fallback = segment === 'return'
    ? { carrier: 'Тверской экспресс', number: '020У', brand: '«Мегаполис»', depart: '00:20', arrival: '09:01', duration: '9 ч 40 мин', fromStation: 'Московский вокзал', toStation: 'Ленинградский вокзал' }
    : { carrier: 'РЖД/ФПК', number: '119А', brand: '', depart: '00:12', arrival: '09:52', duration: '9 ч 40 мин', fromStation: 'Ленинградский вокзал', toStation: 'Московский вокзал' }
  return {
    id: params.get(`${prefix}TrainId`) || stored.id || `${segment}-demo`,
    carrier: params.get(`${prefix}Carrier`) || stored.carrier || fallback.carrier,
    number: params.get(`${prefix}TrainNumber`) || stored.number || fallback.number,
    brand: params.get(`${prefix}Brand`) || stored.brand || fallback.brand,
    depart: params.get(`${prefix}DepartTime`) || stored.depart || fallback.depart,
    arrival: params.get(`${prefix}ArrivalTime`) || stored.arrival || fallback.arrival,
    duration: params.get(`${prefix}Duration`) || stored.duration || fallback.duration,
    fromStation: params.get(`${prefix}FromStation`) || stored.fromStation || fallback.fromStation,
    toStation: params.get(`${prefix}ToStation`) || stored.toStation || fallback.toStation,
    from: params.get(`${prefix}From`) || stored.from || currentRoute.from,
    to: params.get(`${prefix}To`) || stored.to || currentRoute.to,
    date: params.get(`${prefix}Date`) || stored.date || currentRoute.date,
  }
}

function travellerLabel() {
  const parts = []
  const adultsWord = state.counts.adults % 10 === 1 && state.counts.adults % 100 !== 11 ? 'взрослый' : 'взрослых'
  parts.push(`${state.counts.adults} ${adultsWord}`)
  const children = state.counts.childWithSeat + state.counts.childWithoutSeat
  if (children) parts.push(`${children} ${children === 1 ? 'ребёнок' : 'детей'}`)
  return parts.join(', ')
}

function passengerKinds() {
  const kinds = []
  for (let index = 0; index < state.counts.adults; index += 1) kinds.push({ type: 'adult', label: 'Взрослый', hasSeat: true })
  for (let index = 0; index < state.counts.childWithSeat; index += 1) kinds.push({ type: 'child-seat', label: 'Ребёнок до 10 лет', hasSeat: true })
  for (let index = 0; index < state.counts.childWithoutSeat; index += 1) kinds.push({ type: 'child-no-seat', label: 'Ребёнок до 5 лет, без места', hasSeat: false })
  return kinds
}

function seatNumber(segment, passengerIndex) {
  return state.seats[segment]?.[passengerIndex]?.split(':')[1] || null
}

function renderJourney() {
  document.querySelector('#journey-route').textContent = `${state.route.from} — ${state.route.to}`
  document.querySelector('#journey-dates').textContent = isSingleReturn
    ? `обратно, ${shortDate(state.route.railReturnDate)}`
    : state.hasReturn
      ? `туда и обратно, ${shortDate(state.route.railOutboundDate)} — ${shortDate(state.route.railReturnDate)}`
      : `туда, ${shortDate(state.route.railOutboundDate)}`
  journeyLegs.innerHTML = state.segments.map(segment => {
    const train = trainFor(segment)
    const segmentLabel = segment === 'return' ? 'обратно' : 'туда'
    return `
      <article class="journey-leg" data-journey-segment="${segment}">
        <div class="journey-leg__content">
          <div class="journey-leg__train">
            <strong>${escapeHtml(train.carrier)}</strong>
            <p>Поезд ${escapeHtml(train.number)}, ${escapeHtml(train.from)} — ${escapeHtml(train.to)}${train.brand ? `<em>${escapeHtml(train.brand)}</em>` : ''}</p>
          </div>
          <div class="journey-leg__time">
            <div>
              <div class="journey-leg__date-row"><span>${escapeHtml(shortDate(train.date))}</span><em>Время местное</em><span>${escapeHtml(shortDate(train.date))}</span></div>
              <div class="journey-leg__timeline"><strong>${escapeHtml(train.depart)}</strong><i></i><span>${escapeHtml(train.duration)}</span><i></i><strong>${escapeHtml(train.arrival)}</strong></div>
            </div>
            <div class="journey-leg__station-row"><span>${escapeHtml(train.fromStation)}</span><span>${escapeHtml(train.toStation)}</span></div>
          </div>
        </div>
        <button class="journey-leg__change" type="button" data-action="change-train" data-segment="${segment}">Изменить поезд ${segmentLabel}</button>
      </article>`
  }).join('')
}

function profileChips() {
  return passengerProfiles.map(profile => `
    <button class="rail-profile-chip" type="button" data-action="profile" data-profile="${profile.id}" aria-pressed="false">
      <strong>${escapeHtml(profile.label)}</strong><small>${escapeHtml(profile.birthDate)}, Паспорт РФ</small>
    </button>`).join('')
}

function formValue(passenger, field) {
  return escapeHtml(passenger?.[field] || '')
}

function tariffGroupMarkup(segment, passengerIndex) {
  const label = segment === 'return' ? 'Обратно' : 'Туда'
  const selectedFare = state.fares?.[passengerIndex]?.[segment] || 'full'
  const seat = seatNumber(segment, passengerIndex)
  return `
    <div class="rail-tariff-group" data-tariff-segment="${segment}">
      <strong>${label}, ${seat ? `место ${escapeHtml(seat)}` : 'без места'}</strong>
      <div class="rail-tariff-options">
        <label class="rail-tariff-option">
          <input type="radio" name="fare-${passengerIndex}-${segment}" value="full" data-fare-segment="${segment}" ${selectedFare !== 'birthday' ? 'checked' : ''}>
          <span class="rail-tariff-option__body"><span class="rail-tariff-option__copy"><strong>Полный</strong><span>Базовый тариф без скидок и специальных условий</span></span><i class="rail-tariff-radio" aria-hidden="true"></i></span>
        </label>
        <label class="rail-tariff-option">
          <input type="radio" name="fare-${passengerIndex}-${segment}" value="birthday" data-fare-segment="${segment}" ${selectedFare === 'birthday' ? 'checked' : ''}>
          <span class="rail-tariff-option__body"><span class="rail-tariff-option__copy"><strong>День рождения</strong><span>Скидка до 30%, действует 7 дней до и 7 дней после дня рождения*</span></span><i class="rail-tariff-radio" aria-hidden="true"></i></span>
        </label>
      </div>
    </div>`
}

function passengerCardMarkup(passenger, kind, index) {
  const noMiddleName = Boolean(passenger?.noMiddleName)
  const gender = passenger?.gender === 'female' ? 'female' : 'male'
  const documentType = passenger?.documentType || 'passport-rf'
  const fareGroups = kind.hasSeat ? state.segments.map(segment => tariffGroupMarkup(segment, index)).join('') : ''
  return `
    <section class="rail-card rail-passenger-card" data-passenger-index="${index}" aria-labelledby="rail-passenger-title-${index}">
      <h2 id="rail-passenger-title-${index}">${index + 1}. ${escapeHtml(kind.label)}</h2>
      <div class="rail-profile-chips" aria-label="Сохранённые пассажиры">${profileChips()}</div>
      <div class="rail-passenger-body">
        <div class="rail-identity-fields">
          <div class="rail-field-row rail-field-row--names">
            <label class="rail-form-control" data-field="surname"><span>Фамилия</span><input name="passengers[${index}][surname]" autocomplete="family-name" placeholder="Фамилия" value="${formValue(passenger, 'surname')}" required><small class="rail-field-error" aria-live="polite"></small></label>
            <label class="rail-form-control" data-field="givenName"><span>Имя</span><input name="passengers[${index}][givenName]" autocomplete="given-name" placeholder="Имя" value="${formValue(passenger, 'givenName')}" required><small class="rail-field-error" aria-live="polite"></small></label>
            <div class="rail-middle-name-field">
              <label class="rail-form-control" data-field="middleName"><span>Отчество</span><input name="passengers[${index}][middleName]" autocomplete="additional-name" placeholder="Отчество" value="${formValue(passenger, 'middleName')}" ${noMiddleName ? 'disabled' : 'required'}><small class="rail-field-error" aria-live="polite"></small></label>
              <label class="rail-checkbox-label"><input type="checkbox" data-field-toggle="middleName" ${noMiddleName ? 'checked' : ''}><span class="rail-checkbox-mark" aria-hidden="true"></span><span>Нет отчества</span></label>
            </div>
          </div>
          <div class="rail-field-row rail-field-row--personal">
            <fieldset class="rail-gender-control"><legend>Пол</legend><div class="rail-gender-options"><label><input type="radio" name="passengers[${index}][gender]" value="male" ${gender === 'male' ? 'checked' : ''}><span>Мужской</span></label><label><input type="radio" name="passengers[${index}][gender]" value="female" ${gender === 'female' ? 'checked' : ''}><span>Женский</span></label></div></fieldset>
            <label class="rail-form-control rail-form-control--date" data-field="birthDate"><span>Дата рождения</span><input name="passengers[${index}][birthDate]" inputmode="numeric" autocomplete="bday" placeholder="ДД.ММ.ГГГГ" value="${formValue(passenger, 'birthDate')}" maxlength="10" required><small class="rail-field-help">ДД.ММ.ГГГГ</small><small class="rail-field-error" aria-live="polite"></small></label>
          </div>
          <div class="rail-field-row rail-field-row--document">
            <label class="rail-form-control" data-field="documentType"><span>Документ</span><select name="passengers[${index}][documentType]"><option value="passport-rf" ${documentType === 'passport-rf' ? 'selected' : ''}>Паспорт РФ</option><option value="foreign-passport" ${documentType === 'foreign-passport' ? 'selected' : ''}>Загранпаспорт РФ</option><option value="foreign-document" ${documentType === 'foreign-document' ? 'selected' : ''}>Иностранный документ</option></select><small class="rail-field-error" aria-live="polite"></small></label>
            <label class="rail-form-control" data-field="documentNumber"><span>Серия и номер</span><input name="passengers[${index}][documentNumber]" inputmode="numeric" autocomplete="off" placeholder="0000 012345" value="${formValue(passenger, 'documentNumber')}" required><small class="rail-field-help">Десять цифр</small><small class="rail-field-error" aria-live="polite"></small></label>
          </div>
        </div>
        <div class="rail-tariffs">
          <h3>Льготы и тарифы со скидкой</h3>
          <div class="rail-tariff-groups">${fareGroups}</div>
          <p class="rail-tariff-note">Точный размер скидки будет известен на шаге подтверждения данных</p>
        </div>
        <div class="rail-loyalty">
          <button class="rail-loyalty-toggle" type="button" data-action="toggle-loyalty" aria-expanded="true">РЖД Бонус, дорожная карта <img src="./assets/rail/passenger-arrow-up.svg" alt=""></button>
          <div class="rail-loyalty-fields">
            <label class="rail-form-control" data-field="rzdBonus"><span>РЖД Бонус</span><input name="passengers[${index}][rzdBonus]" inputmode="numeric" autocomplete="off" value="${formValue(passenger, 'rzdBonus')}"><small class="rail-field-error" aria-live="polite"></small></label>
            <label class="rail-form-control" data-field="roadCard"><span>Дорожная карта</span><input name="passengers[${index}][roadCard]" inputmode="numeric" autocomplete="off" value="${formValue(passenger, 'roadCard')}"><small class="rail-field-error" aria-live="polite"></small></label>
          </div>
        </div>
      </div>
    </section>`
}

function renderPassengerCards() {
  cardsRoot.innerHTML = passengerKinds().map((kind, index) => passengerCardMarkup(state.passengers[index], kind, index)).join('')
  form.elements.email.value = state.contact.email || ''
  form.elements.phone.value = state.contact.phone || ''
}

function segmentPrice(segment) {
  return nonNegativeNumber(state.totals[segment], 0)
}

function totalPrice() {
  if (demoMode) return 10634.71
  return state.segments.reduce((sum, segment) => sum + segmentPrice(segment), 0)
}

function renderPrice() {
  const pricedSegments = state.hasReturn ? [...state.segments].reverse() : state.segments
  const kinds = passengerKinds()
  priceBreakdown.innerHTML = pricedSegments.map(segment => {
    const currentRoute = routeFor(segment)
    const seatedPassengers = kinds.filter(kind => kind.hasSeat)
    const perPassengerPrice = seatedPassengers.length ? segmentPrice(segment) / seatedPassengers.length : 0
    const lines = kinds.map((kind, index) => {
      const seat = kind.hasSeat ? seatNumber(segment, index) : null
      const price = kind.hasSeat ? perPassengerPrice : 0
      return `<div class="rail-passenger-price-line"><span>${escapeHtml(kind.label)}${seat ? `, место ${escapeHtml(seat)}` : ', без места'}<small>Тариф Полный</small></span><b>${price ? escapeHtml(formatMoney(price)) : 'Бесплатно'}</b></div>`
    }).join('')
    return `<section class="rail-passenger-price-leg" data-price-segment="${segment}"><strong>${escapeHtml(currentRoute.from)} — ${escapeHtml(currentRoute.to)}</strong>${lines}</section>`
  }).join('')
  totalElement.textContent = formatMoney(totalPrice())
}

function renderProgress() {
  page.dataset.tripScope = state.hasReturn ? 'roundtrip' : 'oneway'
  document.querySelectorAll('[data-return-only]').forEach(element => { element.hidden = !state.hasReturn })
}

function passengerControl(card, field) {
  return card.querySelector(`[data-field="${CSS.escape(field)}"]`)
}

function inputFor(card, field) {
  return passengerControl(card, field)?.querySelector('input, select') || null
}

function clearError(input) {
  const control = input.closest('.rail-form-control')
  if (!control) return
  control.classList.remove('is-invalid')
  input.removeAttribute('aria-invalid')
  const error = control.querySelector('.rail-field-error')
  if (error) error.textContent = ''
}

function setError(input, message) {
  const control = input.closest('.rail-form-control')
  if (!control) return input
  control.classList.add('is-invalid')
  input.setAttribute('aria-invalid', 'true')
  const error = control.querySelector('.rail-field-error')
  if (error) error.textContent = message
  return input
}

function validBirthDate(value) {
  const match = String(value).match(/^(\d{2})\.(\d{2})\.(\d{4})$/u)
  if (!match) return false
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && year >= 1900 && date < new Date()
}

function validateForm() {
  const errors = []
  form.querySelectorAll('.rail-form-control').forEach(control => control.classList.remove('is-invalid'))
  form.querySelectorAll('[aria-invalid="true"]').forEach(input => input.removeAttribute('aria-invalid'))
  const namePattern = /^[A-Za-zА-ЯЁа-яё][A-Za-zА-ЯЁа-яё\s'-]{1,}$/u
  form.querySelectorAll('[data-passenger-index]').forEach(card => {
    for (const field of ['surname', 'givenName']) {
      const input = inputFor(card, field)
      if (!input.value.trim()) errors.push(setError(input, field === 'surname' ? 'Укажите фамилию' : 'Укажите имя'))
      else if (!namePattern.test(input.value.trim())) errors.push(setError(input, 'Проверьте написание'))
    }
    const middleName = inputFor(card, 'middleName')
    if (!middleName.disabled && !middleName.value.trim()) errors.push(setError(middleName, 'Укажите отчество'))
    else if (!middleName.disabled && !namePattern.test(middleName.value.trim())) errors.push(setError(middleName, 'Проверьте написание'))
    const birthDate = inputFor(card, 'birthDate')
    if (!validBirthDate(birthDate.value.trim())) errors.push(setError(birthDate, 'Укажите дату полностью'))
    const documentNumber = inputFor(card, 'documentNumber')
    const documentType = inputFor(card, 'documentType').value
    const digits = documentNumber.value.replace(/\D/gu, '')
    if (!digits) errors.push(setError(documentNumber, 'Укажите номер документа'))
    else if (documentType === 'passport-rf' && digits.length !== 10) errors.push(setError(documentNumber, 'Нужно 10 цифр'))
    else if (documentType !== 'passport-rf' && documentNumber.value.trim().length < 6) errors.push(setError(documentNumber, 'Проверьте номер'))
  })
  const email = form.elements.email
  if (!email.value.trim()) errors.push(setError(email, 'Укажите почту'))
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.value.trim())) errors.push(setError(email, 'Проверьте адрес'))
  const phone = form.elements.phone
  const phoneDigits = phone.value.replace(/\D/gu, '')
  if (!phoneDigits) errors.push(setError(phone, 'Укажите телефон'))
  else if (phoneDigits.length !== 11) errors.push(setError(phone, 'Нужно 11 цифр'))
  return errors
}

function collectPassengers() {
  return [...form.querySelectorAll('[data-passenger-index]')].map((card, index) => ({
    id: `passenger-${index + 1}`,
    category: passengerKinds()[index].type,
    surname: inputFor(card, 'surname').value.trim(),
    givenName: inputFor(card, 'givenName').value.trim(),
    middleName: inputFor(card, 'middleName').disabled ? '' : inputFor(card, 'middleName').value.trim(),
    noMiddleName: inputFor(card, 'middleName').disabled,
    birthDate: inputFor(card, 'birthDate').value.trim(),
    gender: card.querySelector('input[type="radio"][name$="[gender]"]:checked')?.value || 'male',
    documentType: inputFor(card, 'documentType').value,
    documentNumber: inputFor(card, 'documentNumber').value.trim(),
    rzdBonus: inputFor(card, 'rzdBonus').value.trim(),
    roadCard: inputFor(card, 'roadCard').value.trim(),
    seats: Object.fromEntries(state.segments.map(segment => [segment, seatNumber(segment, index)])),
    fares: Object.fromEntries(state.segments.map(segment => [segment, card.querySelector(`input[data-fare-segment="${segment}"]:checked`)?.value || 'full'])),
  }))
}

function saveBooking(passengers, contact) {
  const now = new Date().toISOString()
  const trains = {
    ...(storedBooking.trains || {}),
    ...Object.fromEntries(state.segments.map(segment => [segment, trainFor(segment)])),
  }
  const coach = {
    ...(storedBooking.coach || {}),
    ...Object.fromEntries(state.segments.map(segment => [segment, params.get(`${prefixFor(segment)}Coach`) || storedBooking.coach?.[segment] || (segment === 'return' ? 'coupe' : 'platz')])),
  }
  const seats = {
    ...(storedBooking.seats || {}),
    ...Object.fromEntries(state.segments.map(segment => [segment, [...state.seats[segment]]])),
  }
  const bedding = {
    ...(storedBooking.bedding && typeof storedBooking.bedding === 'object' ? storedBooking.bedding : {}),
    ...Object.fromEntries(state.segments.map(segment => [segment, storedBooking.bedding?.[segment] ?? true])),
  }
  const totals = {
    ...(storedBooking.totals || {}),
    ...Object.fromEntries(state.segments.map(segment => [segment, segmentPrice(segment)])),
  }
  const inheritedStatus = params.get('railStatus')?.trim() || storedBooking.status || 'awaiting-payment'
  const statuses = {
    ...(storedBooking.statuses || {}),
    ...Object.fromEntries(
      ['outbound', 'return']
        .filter(segment => trains[segment])
        .map(segment => [segment, params.get(`${prefixFor(segment)}Status`)?.trim() || storedBooking.statuses?.[segment] || inheritedStatus]),
    ),
    ...Object.fromEntries(state.segments.map(segment => [segment, 'awaiting-payment'])),
  }
  const bookingRoute = {
    ...(storedBooking.route || {}),
    from: state.route.from,
    to: state.route.to,
    depart: state.route.depart,
    return: state.route.return,
    traveller: travellerLabel(),
    ...(tripSegment !== 'return' ? { railOutboundDate: state.route.railOutboundDate } : {}),
    ...(tripSegment !== 'outbound' ? { railReturnDate: state.route.railReturnDate } : {}),
  }
  const booking = {
    ...storedBooking,
    version: 1,
    bookingId,
    createdAt: storedBooking.createdAt || now,
    updatedAt: now,
    completedAt: now,
    status: params.get('railStatus')?.trim() || storedBooking.status || 'awaiting-payment',
    statuses,
    scope: trains.outbound && trains.return ? 'roundtrip' : 'oneway',
    route: bookingRoute,
    counts: { ...state.counts },
    trains,
    coach,
    seats,
    bedding,
    totals,
    totalPrice: Object.values(totals).reduce((sum, value) => sum + nonNegativeNumber(value), 0),
    passengers,
    contact,
  }
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(booking))
  } catch {
    // Краткий состав услуги всё равно передаётся на страницу командировки через адрес.
  }
  return booking
}

const temporaryRailParams = Object.freeze([
  'railSegment', 'railSeatSegment', 'railSeatComplete', 'railResetSegment',
  'railTrainId', 'railTrainNumber', 'railPrice', 'railDepartTime', 'railArrivalTime', 'railDuration',
  'railFromStation', 'railToStation', 'railFrom', 'railTo', 'railDate', 'railCarrier',
])

function buildTripLink() {
  const target = Reflect.construct(window.URL, ['./trip.html', window.location.href])
  params.forEach((value, key) => target.searchParams.set(key, value))
  applyExistingTripContext(target)
  temporaryRailParams.forEach(key => target.searchParams.delete(key))
  target.searchParams.set('from', params.get('tripFrom')?.trim() || state.route.from)
  target.searchParams.set('to', params.get('tripTo')?.trim() || state.route.to)
  target.searchParams.set('depart', state.route.depart)
  if (hasReturnValue(state.route.return)) target.searchParams.set('return', state.route.return)
  else target.searchParams.delete('return')
  if (!isSingleReturn) target.searchParams.set('railOutboundDate', state.route.railOutboundDate)
  if (isSingleReturn || state.hasReturn) target.searchParams.set('railReturnDate', state.route.railReturnDate)
  target.searchParams.set('traveller', travellerLabel())
  target.searchParams.set('adults', String(state.counts.adults))
  target.searchParams.set('childWithSeat', String(state.counts.childWithSeat))
  target.searchParams.set('childWithoutSeat', String(state.counts.childWithoutSeat))
  target.searchParams.set('children', String(state.counts.childWithSeat + state.counts.childWithoutSeat))
  target.searchParams.set('railBookingId', bookingId)
  target.searchParams.set('railPassengerComplete', '1')
  const inheritedRailStatus = target.searchParams.get('railStatus')?.trim() || 'awaiting-payment'
  const hadLegacyRailAdded = target.searchParams.get('railAdded') === '1'
  const inheritedRailScope = target.searchParams.get('railScope') === 'roundtrip' ? 'roundtrip' : 'oneway'
  for (const segment of ['outbound', 'return']) {
    const prefix = prefixFor(segment)
    const hasExistingSegment = Boolean(target.searchParams.get(`${prefix}TrainId`) || target.searchParams.get(`${prefix}TrainNumber`))
      && nonNegativeNumber(target.searchParams.get(`${prefix}Total`)) > 0
    if (hasExistingSegment && !target.searchParams.get(`${prefix}Status`)) {
      target.searchParams.set(`${prefix}Status`, inheritedRailStatus)
    }
    if (hasExistingSegment && hadLegacyRailAdded && (segment === 'outbound' || inheritedRailScope === 'roundtrip')) {
      target.searchParams.set(`${prefix}Added`, '1')
    }
  }
  for (const segment of state.segments) {
    const prefix = prefixFor(segment)
    const train = trainFor(segment)
    target.searchParams.set(`${prefix}TrainId`, train.id)
    target.searchParams.set(`${prefix}TrainNumber`, train.number)
    target.searchParams.set(`${prefix}Carrier`, train.carrier)
    if (train.brand) target.searchParams.set(`${prefix}Brand`, train.brand)
    else target.searchParams.delete(`${prefix}Brand`)
    target.searchParams.set(`${prefix}DepartTime`, train.depart)
    target.searchParams.set(`${prefix}ArrivalTime`, train.arrival)
    target.searchParams.set(`${prefix}Duration`, train.duration)
    target.searchParams.set(`${prefix}From`, train.from)
    target.searchParams.set(`${prefix}To`, train.to)
    target.searchParams.set(`${prefix}Date`, train.date)
    target.searchParams.set(`${prefix}FromStation`, train.fromStation)
    target.searchParams.set(`${prefix}ToStation`, train.toStation)
    target.searchParams.set(`${prefix}Coach`, params.get(`${prefix}Coach`) || storedBooking.coach?.[segment] || (segment === 'return' ? 'coupe' : 'platz'))
    target.searchParams.set(`${prefix}Seats`, state.seats[segment].map(seat => seat.replace(':', '-')).join(','))
    target.searchParams.set(`${prefix}Total`, String(segmentPrice(segment)))
    target.searchParams.set(`${prefix}Added`, '1')
    target.searchParams.set(`${prefix}BookingId`, bookingId)
    target.searchParams.set(`${prefix}Status`, 'awaiting-payment')
  }
  if (!state.hasReturn && !tripSegment && !isExistingTripFlow) {
    ;[...target.searchParams.keys()].filter(key => key.startsWith('railReturn')).forEach(key => target.searchParams.delete(key))
  }
  const hasRailSegment = segment => {
    const prefix = prefixFor(segment)
    return target.searchParams.get(`${prefix}Added`) === '1'
      && Boolean(target.searchParams.get(`${prefix}TrainId`) || target.searchParams.get(`${prefix}TrainNumber`))
      && nonNegativeNumber(target.searchParams.get(`${prefix}Total`)) > 0
  }
  const hasOutbound = hasRailSegment('outbound')
  const hasReturnSegment = hasRailSegment('return')
  target.searchParams.set('railScope', hasOutbound && hasReturnSegment ? 'roundtrip' : 'oneway')
  target.searchParams.set('railAdded', hasOutbound && hasReturnSegment ? '1' : '0')
  if (!target.searchParams.get('railStatus')) target.searchParams.set('railStatus', 'awaiting-payment')
  const mergedRailTotal = ['outbound', 'return'].reduce((sum, segment) => {
    return sum + (hasRailSegment(segment) ? nonNegativeNumber(target.searchParams.get(`${prefixFor(segment)}Total`)) : 0)
  }, 0)
  target.searchParams.set('railTotalPrice', String(mergedRailTotal))
  if (isBusinessTripFlow && !isExistingTripFlow) {
    const draftId = params.get('draftId')?.trim() || `business-rail-${bookingId}`
    target.searchParams.set('workTrip', '1')
    target.searchParams.set('addToTrip', '1')
    target.searchParams.set('tripKind', 'new')
    target.searchParams.set('draft', '1')
    target.searchParams.set('draftId', draftId)
    target.searchParams.delete('tripId')
  }
  return target
}

function buildLink(path, extra = {}) {
  const target = Reflect.construct(window.URL, [path, window.location.href])
  params.forEach((value, key) => target.searchParams.set(key, value))
  Object.entries(extra).forEach(([key, value]) => {
    if (value === null) target.searchParams.delete(key)
    else target.searchParams.set(key, String(value))
  })
  return applyExistingTripContext(target)
}

function applyProfile(card, profile) {
  for (const field of ['surname', 'givenName', 'middleName', 'birthDate', 'documentType', 'documentNumber']) {
    const input = inputFor(card, field)
    if (!input) continue
    input.disabled = false
    input.value = profile[field]
    clearError(input)
  }
  const noMiddleName = card.querySelector('[data-field-toggle="middleName"]')
  noMiddleName.checked = false
  card.querySelector(`input[type="radio"][name$="[gender]"][value="${profile.gender}"]`).checked = true
  card.querySelectorAll('[data-action="profile"]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.profile === profile.id)))
  const email = form.elements.email
  const phone = form.elements.phone
  const contact = buyerContacts[profile.id]
  const isPrimaryPassenger = card.dataset.passengerIndex === '0'
  const buyerContactIsEmpty = !email.value.trim() && !phone.value.trim()
  if (contact && (isPrimaryPassenger || buyerContactIsEmpty)) {
    email.value = contact.email
    phone.value = formatPhoneInput(contact.phone)
    state.contact = { email: email.value, phone: phone.value }
    clearError(email)
    clearError(phone)
    announcer.textContent = 'Данные пассажира и контакты подставлены'
  } else {
    announcer.textContent = 'Данные пассажира подставлены'
  }
}

function formatDateInput(value) {
  const digits = String(value).replace(/\D/gu, '').slice(0, 8)
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('.')
}

function formatPassportInput(value) {
  const digits = String(value).replace(/\D/gu, '').slice(0, 10)
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits
}

function formatPhoneInput(value) {
  let digits = String(value).replace(/\D/gu, '').slice(0, 11)
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`
  if (!digits) return ''
  const country = digits.slice(0, 1)
  const area = digits.slice(1, 4)
  const first = digits.slice(4, 7)
  const second = digits.slice(7, 9)
  const third = digits.slice(9, 11)
  let result = `+${country}`
  if (area) result += ` (${area}`
  if (area.length === 3) result += ')'
  if (first) result += ` ${first}`
  if (second) result += `-${second}`
  if (third) result += `-${third}`
  return result
}

form.addEventListener('submit', event => {
  event.preventDefault()
  const errors = validateForm()
  if (errors.length) {
    errors[0].focus()
    announcer.textContent = `Проверьте поля: ${errors.length}`
    return
  }
  if (state.submitting) return
  state.submitting = true
  submitButton.disabled = true
  submitButton.textContent = isBusinessTripFlow ? 'Добавляем…' : 'Переходим…'
  const passengers = collectPassengers()
  const contact = { email: form.elements.email.value.trim(), phone: form.elements.phone.value.trim() }
  saveBooking(passengers, contact)
  window.setTimeout(() => {
    const target = buildTripLink()
    if (isBusinessTripFlow) {
      if (!window.TripV2Bridge?.returnToTrip(target, { result: 'service-added', kind: 'rail', segments })) window.location.href = target.href
      return
    }
    target.pathname = target.pathname.replace(/\/trip\.html$/u, '/train-confirmation.html')
    window.location.href = target.href
  }, 350)
})

form.addEventListener('input', event => {
  const input = event.target
  if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return
  if (input.name.endsWith('[birthDate]')) input.value = formatDateInput(input.value)
  if (input.name.endsWith('[documentNumber]') && input.closest('[data-passenger-index]') && inputFor(input.closest('[data-passenger-index]'), 'documentType').value === 'passport-rf') input.value = formatPassportInput(input.value)
  if (input.name === 'phone') input.value = formatPhoneInput(input.value)
  clearError(input)
})

form.addEventListener('change', event => {
  const toggle = event.target.closest('[data-field-toggle="middleName"]')
  if (toggle) {
    const card = toggle.closest('[data-passenger-index]')
    const middleName = inputFor(card, 'middleName')
    middleName.disabled = toggle.checked
    if (toggle.checked) {
      middleName.value = ''
      clearError(middleName)
    }
  }
})

document.addEventListener('click', event => {
  const profileButton = event.target.closest('[data-action="profile"]')
  if (profileButton) {
    const profile = passengerProfiles.find(item => item.id === profileButton.dataset.profile)
    const card = profileButton.closest('[data-passenger-index]')
    if (profile && card) applyProfile(card, profile)
    return
  }
  const actionTarget = event.target.closest('[data-action]')
  const action = actionTarget?.dataset.action
  if (action === 'toggle-loyalty') {
    const expanded = actionTarget.getAttribute('aria-expanded') === 'true'
    actionTarget.setAttribute('aria-expanded', String(!expanded))
    actionTarget.nextElementSibling.hidden = expanded
    return
  }
  if (action === 'change-train') {
    event.preventDefault()
    const segment = actionTarget.dataset.segment === 'return' ? 'return' : 'outbound'
    window.location.href = buildLink('./train-search.html', { railSegment: segment, railSeatSegment: segment }).href
    return
  }
  if (action === 'change-seats') {
    const segment = actionTarget.dataset.segment === 'return' ? 'return' : 'outbound'
    window.location.href = buildLink('./train-booking.html', { railSeatSegment: segment, railSeatComplete: null }).href
    return
  }
  const placeholder = event.target.closest('a[href="#"]')
  if (placeholder) event.preventDefault()
  const announceTarget = event.target.closest('[data-announce]')
  if (announceTarget) announcer.textContent = announceTarget.dataset.announce
})

document.querySelectorAll('[data-preserve-query]').forEach(link => {
  const href = link.getAttribute('href')
  if (!href || href === '#') return
  link.href = buildLink(href).href
})

function syncBookingId() {
  const target = Reflect.construct(window.URL, [window.location.href])
  if (!params.get('railBookingId')) {
    target.searchParams.set('railBookingId', bookingId)
    target.searchParams.set('railScope', state.hasReturn ? 'roundtrip' : 'oneway')
  }
  applyExistingTripContext(target)
  if (target.href !== window.location.href) window.history.replaceState(null, '', target)
}

syncBookingId()
renderTripContext()
renderProgress()
renderJourney()
renderPassengerCards()
renderPrice()
page.dataset.ready = 'true'

window.businessTripRailPassengersPrototype = {
  getState: () => JSON.parse(JSON.stringify({ ...state, bookingId, isExistingTripFlow })),
  buildTripLink,
  validateForm,
}
