const page = document.querySelector('.avia-passengers-page')
const form = document.querySelector('#passenger-form')
const tariffTrack = document.querySelector('#tariff-track')
const submitButton = document.querySelector('.flight-payment__submit')
const announcer = document.querySelector('#passenger-announcer')
const paymentSetup = document.querySelector('.passenger-payment-setup')
const paymentTotalLabel = document.querySelector('#payment-total-label')
const paymentLegal = document.querySelector('#passenger-payment-legal')
const workPurposeToggle = document.querySelector('#work-purpose-toggle')
const addToTripToggle = document.querySelector('#add-to-trip-toggle')
const businessTripRow = document.querySelector('#business-trip-row')
const businessTripKind = document.querySelector('#business-trip-kind')

if (!page || !form || !tariffTrack || !submitButton || !announcer || !paymentSetup || !paymentTotalLabel || !paymentLegal || !workPurposeToggle || !addToTripToggle || !businessTripRow || !businessTripKind) {
  throw new Error('Не найдены обязательные элементы страницы данных пассажира')
}

const params = new URLSearchParams(window.location.search)
const legacyStorageKey = 'business-trip-avia-passenger-draft-v2'
const confirmationStorageKey = 'business-trip-avia-confirmation-v2'
const tripDepart = params.get('depart')?.trim() || '11 июл, среда'
const tripReturn = params.get('return')?.trim() || ''
const requestedOutbound = params.get('flightOutboundDate')?.trim() || tripDepart
const requestedReturn = params.get('flightReturnDate')?.trim() || tripReturn
const requestedScope = params.get('flightScope')?.trim()
const initialFlightScope = requestedScope === 'oneway'
  ? 'oneway'
  : requestedScope === 'roundtrip'
    ? 'roundtrip'
    : params.has('flightReturnDate') && !params.get('flightReturnDate')?.trim()
      ? 'oneway'
      : 'roundtrip'
const requestedTripSegment = ['outbound', 'return'].includes(params.get('segment')) ? params.get('segment') : ''
const isTripSegmentFlow = Boolean(requestedTripSegment)
const isExistingTripFlow = isTripSegmentFlow || (
  params.get('addToTrip') === '1'
  && params.get('tripKind') === 'existing'
  && Boolean(params.get('tripId')?.trim() || params.get('draftId')?.trim())
)
const returnParamNames = Object.freeze([
  'flightReturnDate',
  'returnAirline',
  'returnFlightNumber',
  'returnDepartTime',
  'returnArrivalTime',
  'returnDuration',
  'returnFromCode',
  'returnToCode',
  'returnFromAirport',
  'returnToAirport',
])

function generatedBookingId() {
  return `YT-${Date.now().toString(36).toLocaleUpperCase('en-US')}`
}

function segmentParamName(suffix) {
  if (!requestedTripSegment) return ''
  return `${requestedTripSegment === 'return' ? 'flightReturn' : 'flightOutbound'}${suffix}`
}

const tariffCatalog = Object.freeze({
  light: Object.freeze({
    title: 'Эконом Лайт',
    delta: 0,
    features: Object.freeze([
      'Ручная кладь 1 место, 10 кг, 55×40×25 см',
      'Без багажа',
      'Невозвратный',
      'Обмен с доплатой',
    ]),
  }),
  optimum: Object.freeze({
    title: 'Эконом Оптимум',
    delta: 2827,
    features: Object.freeze([
      'Ручная кладь 1 место, 10 кг, 55×40×25 см',
      'Багаж 1 место, 23 кг',
      'Возврат со сбором',
      'Обмен с доплатой',
    ]),
  }),
  maximum: Object.freeze({
    title: 'Эконом Максимум',
    delta: 13057,
    features: Object.freeze([
      'Ручная кладь 1 место, 10 кг, 55×40×25 см',
      'Багаж 1 место, 30 кг',
      'Возврат включён',
      'Обмен включён',
    ]),
  }),
})

const passengerProfiles = Object.freeze({
  ivanov: Object.freeze({
    surname: 'IVANOV',
    givenName: 'IVAN',
    middleName: 'IVANOVICH',
    birthDate: '11.11.1990',
    gender: 'male',
    documentType: 'passport-rf',
    documentNumber: '4510 123456',
    country: 'RU',
    loyaltyProgram: 'aeroflot',
    loyaltyNumber: 'SU 123456789',
  }),
  petrov: Object.freeze({
    surname: 'PETROV',
    givenName: 'ALEXEY',
    middleName: 'SERGEEVICH',
    birthDate: '24.06.1987',
    gender: 'male',
    documentType: 'passport-rf',
    documentNumber: '4512 456789',
    country: 'RU',
    loyaltyProgram: 'none',
    loyaltyNumber: '',
  }),
  sidorov: Object.freeze({
    surname: 'SIDOROVA',
    givenName: 'ANNA',
    middleName: 'PETROVNA',
    birthDate: '03.04.1992',
    gender: 'female',
    documentType: 'foreign-passport',
    documentNumber: '72 9876543',
    country: 'RU',
    loyaltyProgram: 'aeroflot',
    loyaltyNumber: 'SU 987654321',
  }),
})

const buyerContacts = Object.freeze({
  ivanov: Object.freeze({ email: 'ivan.ivanov@example.com', phone: '+7 999 123-45-67' }),
  petrov: Object.freeze({ email: 'alexey.petrov@example.com', phone: '+7 999 234-56-78' }),
  sidorov: Object.freeze({ email: 'anna.sidorova@example.com', phone: '+7 999 345-67-89' }),
})

const parsedBasePrice = Number(params.get('flightPrice'))
const initialPaymentMethod = params.get('paymentMethod') === 'business' ? 'business' : 'card'
const initialWorkTrip = isExistingTripFlow || params.get('workTrip') === '1' || initialPaymentMethod === 'business'
const state = {
  origin: params.get('from')?.trim() || 'Москва',
  destination: params.get('to')?.trim() || 'Санкт-Петербург',
  tripDepart,
  tripReturning: tripReturn,
  depart: requestedOutbound,
  returning: initialFlightScope === 'roundtrip' ? (requestedReturn || '18 июл, среда') : '',
  flightScope: initialFlightScope,
  traveller: params.get('traveller')?.trim() || '1 взрослый',
  flightId: params.get('flight')?.trim() || 'aeroflot-default',
  airline: params.get('flightAirline')?.trim() || 'Аэрофлот',
  flightNumber: params.get('flightNumber')?.trim() || 'SU 0038',
  departTime: params.get('flightDepartTime')?.trim() || '15:20',
  arrivalTime: params.get('flightArrivalTime')?.trim() || '17:30',
  duration: params.get('flightDuration')?.trim() || '2ч 10м',
  fromCode: params.get('flightFromCode')?.trim() || 'SVO',
  toCode: params.get('flightToCode')?.trim() || 'LED',
  fromAirport: params.get('flightFromAirport')?.trim() || 'Шереметьево',
  toAirport: params.get('flightToAirport')?.trim() || 'Пулково',
  returnAirline: params.get('returnAirline')?.trim() || params.get('flightAirline')?.trim() || 'Аэрофлот',
  returnFlightNumber: params.get('returnFlightNumber')?.trim() || 'SU 0039',
  returnDepartTime: params.get('returnDepartTime')?.trim() || '19:10',
  returnArrivalTime: params.get('returnArrivalTime')?.trim() || '21:20',
  returnDuration: params.get('returnDuration')?.trim() || '2 ч 10 м',
  returnFromCode: params.get('returnFromCode')?.trim() || 'LED',
  returnToCode: params.get('returnToCode')?.trim() || 'SVO',
  returnFromAirport: params.get('returnFromAirport')?.trim() || 'Пулково',
  returnToAirport: params.get('returnToAirport')?.trim() || 'Шереметьево',
  bookingId: (isTripSegmentFlow ? params.get('flightFlowBookingId') : params.get('bookingId'))?.trim() || generatedBookingId(),
  basePrice: Number.isFinite(parsedBasePrice) && parsedBasePrice > 0 ? parsedBasePrice : 3672,
  tariff: tariffCatalog[params.get('flightOutboundTariff')] ? params.get('flightOutboundTariff') : tariffCatalog[params.get('flightTariff')] ? params.get('flightTariff') : 'light',
  returnTariff: tariffCatalog[params.get('flightReturnTariff')] ? params.get('flightReturnTariff') : tariffCatalog[params.get('flightTariff')] ? params.get('flightTariff') : 'light',
  tariffShifted: false,
  returnTariffShifted: false,
  paymentMethod: initialPaymentMethod,
  workTrip: initialWorkTrip,
  addToTrip: isExistingTripFlow || (initialWorkTrip && params.get('addToTrip') === '1'),
  tripKind: isExistingTripFlow || params.get('tripKind') === 'existing' ? 'existing' : 'new',
  submitting: false,
}

const storageKey = `${legacyStorageKey}:${state.flightId}:${state.flightScope}`

function participantCount() {
  const adults = Math.max(1, Number(params.get('adults')) || 1)
  const children = Math.max(0, Number(params.get('children')) || 0)
  return adults + children
}

function passengerFormBlocks() {
  return [...form.querySelectorAll('.passenger-form')]
}

function controlIn(block, name) {
  return block.querySelector(`[name="${name}"]`) || block.querySelector(`[name^="${name}-"]`)
}

function passengerFromBlock(block) {
  const value = name => controlIn(block, name)?.value || ''
  const noMiddleName = Boolean(controlIn(block, 'noMiddleName')?.checked)
  return { surname: value('surname'), givenName: value('givenName'), middleName: noMiddleName ? '' : value('middleName'), noMiddleName, birthDate: value('birthDate'), gender: value('gender'), documentType: value('documentType'), documentNumber: value('documentNumber'), country: value('country'), loyaltyProgram: value('loyaltyProgram'), loyaltyNumber: value('loyaltyNumber') }
}

function renderPassengerForms() {
  const shell = form.querySelector('.passenger-form-shell')
  const template = shell?.querySelector('.passenger-form')
  if (!shell || !template) return
  shell.querySelectorAll('[data-generated-passenger]').forEach(block => block.remove())
  const profiles = ['ivanov', 'petrov', 'sidorov']
  for (let index = 1; index < participantCount(); index += 1) {
    const block = template.cloneNode(true)
    block.dataset.generatedPassenger = 'true'
    block.querySelector('h2').textContent = `Пассажир ${index + 1}, ${index < Math.max(1, Number(params.get('adults')) || 1) ? 'взрослый' : 'ребёнок'}`
    block.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'))
    block.querySelectorAll('[name]').forEach(element => { element.name = `${element.name}-${index + 1}`; if (element.type === 'radio') element.checked = element.value === 'male' })
    const profile = passengerProfiles[profiles[index % profiles.length]]
    Object.entries(profile).forEach(([name, value]) => { const control = controlIn(block, name); if (control) control.value = value })
    shell.append(block)
  }
}

function formatPrice(value) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function text(selector, value) {
  const element = document.querySelector(selector)
  if (element) element.textContent = value
}

function airlineLogo(airline) {
  if (/побед/u.test(airline.toLocaleLowerCase('ru'))) return './assets/avia/pobeda-tile.svg'
  if (/росси/u.test(airline.toLocaleLowerCase('ru'))) return './assets/avia-confirmation/rossiya.png'
  if (/s7/u.test(airline.toLocaleLowerCase('ru'))) return './assets/avia/s7.svg'
  return './assets/avia-booking/aeroflot.png'
}

function announce(message) {
  announcer.textContent = message
}

function fareFor(key = state.tariff, segment = 'outbound') {
  const tariff = tariffCatalog[key] || tariffCatalog.light
  const share = state.flightScope === 'roundtrip' ? (segment === 'return' ? 0.44 : 0.56) : 1
  return { ...tariff, id: key, price: Math.round((state.basePrice + tariff.delta) * share) }
}

function selectedFare(segment = 'outbound') {
  return fareFor(segment === 'return' ? state.returnTariff : state.tariff, segment)
}

function combinedFare() {
  const outbound = selectedFare('outbound')
  if (state.flightScope !== 'roundtrip' || !state.returning) return outbound
  const returning = selectedFare('return')
  const sameTariff = outbound.id === returning.id
  return {
    id: sameTariff ? outbound.id : `${outbound.id}-${returning.id}`,
    title: sameTariff ? outbound.title : 'Тарифы по перелётам',
    price: outbound.price + returning.price,
    features: sameTariff
      ? [...outbound.features]
      : [`${state.origin} — ${state.destination}: ${outbound.title}`, `${state.destination} — ${state.origin}: ${returning.title}`],
  }
}

function setupSegmentTariffPickers() {
  const outboundPicker = tariffTrack.closest('.tariff-picker')
  const returnFlight = document.querySelector('#selected-return-flight')
  const outboundWindow = outboundPicker?.querySelector('.tariff-window')
  if (!outboundPicker || !returnFlight || !outboundWindow || document.querySelector('.tariff-picker[data-fare-segment="return"]')) return

  outboundPicker.dataset.fareSegment = 'outbound'
  tariffTrack.dataset.fareSegment = 'outbound'
  tariffTrack.querySelectorAll('[data-tariff]').forEach(button => { button.dataset.fareSegment = 'outbound' })
  const outboundNext = outboundPicker.querySelector('[data-action="next-tariff"]')
  if (outboundNext) outboundNext.dataset.fareSegment = 'outbound'

  const returnPicker = document.createElement('section')
  returnPicker.className = 'tariff-picker tariff-picker--return'
  returnPicker.dataset.fareSegment = 'return'
  returnPicker.setAttribute('aria-label', 'Обратный рейс и тариф')
  returnPicker.hidden = true

  returnFlight.classList.remove('selected-flight--return')
  const returnWindow = outboundWindow.cloneNode(true)
  const returnTrack = returnWindow.querySelector('.tariff-track')
  returnTrack?.removeAttribute('id')
  if (returnTrack) {
    returnTrack.dataset.fareSegment = 'return'
    returnTrack.querySelectorAll('[data-tariff]').forEach(button => { button.dataset.fareSegment = 'return' })
  }
  const returnNext = returnWindow.querySelector('[data-action="next-tariff"]')
  if (returnNext) returnNext.dataset.fareSegment = 'return'
  returnPicker.append(returnFlight, returnWindow)
  outboundPicker.after(returnPicker)
}

function renderFlight() {
  text('#flight-from', state.origin)
  text('#flight-to', state.destination)
  text('#flight-date', state.depart)
  text('#flight-duration', state.duration)
  text('#flight-depart-time', state.departTime)
  text('#flight-arrival-time', state.arrivalTime)
  text('#flight-from-code', state.fromCode)
  text('#flight-to-code', state.toCode)

  const logo = document.querySelector('#selected-flight-logo')
  const logoMark = document.querySelector('#selected-flight-logo-mark')
  const isPobeda = /побед/u.test(state.airline.toLocaleLowerCase('ru'))
  logo.src = airlineLogo(state.airline)
  logo.alt = state.airline
  logo.classList.toggle('selected-flight__logo--wide', /росси/u.test(state.airline.toLocaleLowerCase('ru')))
  logoMark.hidden = !isPobeda

  const returnFlight = document.querySelector('#selected-return-flight')
  if (returnFlight) {
    const hasReturn = state.flightScope === 'roundtrip' && state.returning
    const returnPicker = returnFlight.closest('.tariff-picker')
    if (returnPicker?.dataset.fareSegment === 'return') returnPicker.hidden = !hasReturn
    returnFlight.hidden = !hasReturn
    if (hasReturn) returnFlight.innerHTML = `
      <img class="selected-flight__logo" src="${airlineLogo(state.returnAirline)}" alt="${state.returnAirline}">
      <div class="selected-flight__route"><strong>${state.destination} — ${state.origin}</strong><small>${state.returning} • ${state.returnDuration}</small></div>
      <div class="selected-flight__time"><strong>${state.returnDepartTime} – ${state.returnArrivalTime}</strong><small><span>${state.returnFromCode}</span><span>${state.returnToCode}</span></small></div>
      <button type="button" data-action="flight-details">Подробнее</button>`
  }

  const sellerDetails = document.querySelector('#seller-details')
  if (!/аэрофлот/u.test(state.airline.toLocaleLowerCase('ru'))) {
    sellerDetails.textContent = `Продавец билета — авиакомпания «${state.airline}». Реквизиты продавца будут указаны в подтверждении заказа.`
  }

}

function renderTariff() {
  document.querySelectorAll('.tariff-track[data-fare-segment]').forEach(track => {
    const segment = track.dataset.fareSegment
    const selectedKey = segment === 'return' ? state.returnTariff : state.tariff
    track.querySelectorAll('[data-tariff]').forEach(option => {
      const selected = option.dataset.tariff === selectedKey
      option.classList.toggle('is-selected', selected)
      option.setAttribute('aria-pressed', String(selected))
    })
    Object.keys(tariffCatalog).forEach(key => {
      track.querySelectorAll(`[data-tariff-price="${key}"]`).forEach(element => {
        element.textContent = formatPrice(fareFor(key, segment).price)
      })
    })
  })
  const fare = combinedFare()
  text('#payment-tariff', fare.title)
  text('#payment-price', formatPrice(fare.price))
  text('#payment-total', formatPrice(fare.price))
  const paymentSegments = document.querySelector('#payment-segments')
  if (paymentSegments) {
    const segments = [{ label: 'Туда', route: `${state.origin} — ${state.destination}`, date: state.depart, time: `${state.departTime} – ${state.arrivalTime}`, codes: `${state.fromCode} — ${state.toCode}` }]
    if (state.flightScope === 'roundtrip' && state.returning) segments.push({ label: 'Обратно', route: `${state.destination} — ${state.origin}`, date: state.returning, time: `${state.returnDepartTime} – ${state.returnArrivalTime}`, codes: `${state.returnFromCode} — ${state.returnToCode}` })
    paymentSegments.innerHTML = segments.map(segment => `<section class="payment-segment"><span>${escapeHtml(segment.label)}</span><strong>${escapeHtml(segment.route)}</strong><small>${escapeHtml(segment.date)} · ${escapeHtml(segment.time)} · ${escapeHtml(segment.codes)}</small></section>`).join('')
  }
  const featureList = document.querySelector('#payment-features')
  featureList.replaceChildren(...fare.features.map(feature => {
    const item = document.createElement('li')
    item.textContent = feature
    return item
  }))
}

function applyBookingContextParams(target) {
  target.searchParams.set('paymentMethod', state.paymentMethod)
  if (state.workTrip) target.searchParams.set('workTrip', '1')
  else target.searchParams.delete('workTrip')
  if (state.addToTrip) {
    target.searchParams.set('addToTrip', '1')
    target.searchParams.set('tripKind', state.tripKind)
  } else {
    target.searchParams.delete('addToTrip')
    target.searchParams.delete('tripKind')
  }
  return target
}

function syncBookingContextParams() {
  const target = applyBookingContextParams(new URL(window.location.href))
  window.history.replaceState(null, '', target)
}

function renderBookingContext() {
  if (isExistingTripFlow) {
    state.workTrip = true
    state.addToTrip = true
    state.tripKind = 'existing'
  }
  if (!state.workTrip) state.addToTrip = false
  paymentSetup.hidden = isExistingTripFlow
  paymentTotalLabel.textContent = isExistingTripFlow ? 'Стоимость' : 'К оплате'
  paymentLegal.hidden = isExistingTripFlow
  document.querySelectorAll('[data-payment-method]').forEach(button => {
    const selected = button.dataset.paymentMethod === state.paymentMethod
    button.classList.toggle('is-selected', selected)
    button.setAttribute('aria-pressed', String(selected))
  })
  workPurposeToggle.setAttribute('aria-checked', String(state.workTrip))
  businessTripRow.hidden = isExistingTripFlow || !state.workTrip
  addToTripToggle.setAttribute('aria-checked', String(state.addToTrip))
  businessTripKind.hidden = isExistingTripFlow || !state.addToTrip
  document.querySelectorAll('[data-trip-kind]').forEach(button => {
    const selected = button.dataset.tripKind === state.tripKind
    button.classList.toggle('is-selected', selected)
    button.setAttribute('aria-pressed', String(selected))
  })
  submitButton.textContent = state.addToTrip ? 'Проверить данные' : 'Проверить данные и оплатить'
}

function setTariff(key, segment = 'outbound') {
  if (!tariffCatalog[key]) return
  if (segment === 'return') state.returnTariff = key
  else state.tariff = key
  renderTariff()
  announce(`Для рейса ${segment === 'return' ? `${state.destination} — ${state.origin}` : `${state.origin} — ${state.destination}`} выбран тариф «${tariffCatalog[key].title.replace('Эконом ', '')}»`)
}

function setTariffShift(shifted, segment = 'outbound') {
  if (segment === 'return') state.returnTariffShifted = shifted
  else state.tariffShifted = shifted
  const track = document.querySelector(`.tariff-track[data-fare-segment="${segment}"]`)
  track?.classList.toggle('is-shifted', shifted)
  const button = document.querySelector(`[data-action="next-tariff"][data-fare-segment="${segment}"]`)
  button?.setAttribute('aria-label', shifted ? 'Показать предыдущие тарифы' : 'Показать следующий тариф')
}

function field(name) {
  return form.elements.namedItem(name)
}

function setFieldValue(name, value) {
  const control = field(name)
  if (!control) return
  if (control instanceof RadioNodeList) control.value = value
  else if (control.type === 'checkbox') control.checked = Boolean(value)
  else control.value = value ?? ''
}

function syncMiddleName() {
  const noMiddleName = field('noMiddleName').checked
  const middleName = field('middleName')
  middleName.disabled = noMiddleName
  middleName.required = !noMiddleName
  if (noMiddleName) {
    middleName.value = ''
    clearError(middleName)
  }
}

function syncDocument() {
  const isRussianDocument = field('documentType').value !== 'foreign-document'
  const country = field('country')
  country.disabled = isRussianDocument
  if (isRussianDocument) country.value = 'RU'
  field('documentNumber').inputMode = field('documentType').value === 'passport-rf' ? 'numeric' : 'text'
  clearError(field('documentNumber'))
}

function syncLoyalty() {
  const loyaltyNumber = field('loyaltyNumber')
  const disabled = field('loyaltyProgram').value === 'none'
  loyaltyNumber.disabled = disabled
  if (disabled) loyaltyNumber.value = ''
}

function updateProfileSelection(profileName) {
  document.querySelectorAll('[data-profile]').forEach(button => {
    const selected = button.dataset.profile === profileName
    button.classList.toggle('is-selected', selected)
    button.setAttribute('aria-pressed', String(selected))
  })
}

function applyProfile(profileName) {
  const profile = passengerProfiles[profileName]
  if (!profile) return
  Object.entries(profile).forEach(([name, value]) => setFieldValue(name, value))
  field('noMiddleName').checked = false
  syncMiddleName()
  syncDocument()
  syncLoyalty()
  const contact = buyerContacts[profileName]
  if (contact) {
    const emailField = form.querySelector('input[name="email"]')
    const phoneField = form.querySelector('input[name="phone"]')
    if (emailField) emailField.value = contact.email
    if (phoneField) phoneField.value = maskPhone(contact.phone)
  }
  clearAllErrors()
  updateProfileSelection(profileName)
  saveDraft()
  announce('Данные пассажира и контакты подставлены')
}

function formDataObject() {
  return Object.fromEntries(new FormData(form).entries())
}

function saveDraft() {
  try {
    const draft = { ...formDataObject(), noMiddleName: field('noMiddleName').checked, tariff: state.tariff, returnTariff: state.returnTariff }
    window.sessionStorage.setItem(storageKey, JSON.stringify(draft))
  } catch {
    // Прототип продолжает работать, даже если браузер запретил локальное хранилище.
  }
}

function restoreDraft() {
  try {
    const raw = window.sessionStorage.getItem(storageKey) || window.sessionStorage.getItem(legacyStorageKey)
    if (!raw) return
    const draft = JSON.parse(raw)
    ;['surname', 'givenName', 'middleName', 'birthDate', 'gender', 'documentType', 'documentNumber', 'country', 'loyaltyProgram', 'loyaltyNumber', 'email', 'phone']
      .forEach(name => {
        if (Object.hasOwn(draft, name)) setFieldValue(name, draft[name])
      })
    field('noMiddleName').checked = Boolean(draft.noMiddleName)
    if (tariffCatalog[draft.tariff]) state.tariff = draft.tariff
    if (tariffCatalog[draft.returnTariff]) state.returnTariff = draft.returnTariff
  } catch {
    // Повреждённый черновик игнорируется.
  }
}

function controlValue(name) {
  const control = field(name)
  return control ? control.value : ''
}

function createConfirmationSnapshot() {
  const fare = combinedFare()
  const outboundFare = selectedFare('outbound')
  const returnFare = state.flightScope === 'roundtrip' ? selectedFare('return') : null
  const snapshot = {
    version: 1,
    createdAt: new Date().toISOString(),
    bookingId: state.bookingId,
    paymentMethod: state.paymentMethod,
    workTrip: state.workTrip,
    addToTrip: state.addToTrip,
    tripKind: state.tripKind,
    scope: state.flightScope,
    route: {
      origin: state.origin,
      destination: state.destination,
      tripDepart: state.tripDepart,
      tripReturning: state.tripReturning,
      depart: state.depart,
      traveller: state.traveller,
      scope: state.flightScope,
      ...(state.flightScope === 'roundtrip' ? { returning: state.returning } : {}),
    },
    flight: {
      id: state.flightId,
      totalPrice: fare.price,
      outbound: {
        airline: state.airline,
        number: state.flightNumber,
        departTime: state.departTime,
        arrivalTime: state.arrivalTime,
        duration: state.duration,
        fromCode: state.fromCode,
        toCode: state.toCode,
        fromAirport: state.fromAirport,
        toAirport: state.toAirport,
      },
      ...(state.flightScope === 'roundtrip' ? { returning: {
        airline: state.returnAirline,
        number: state.returnFlightNumber,
        departTime: state.returnDepartTime,
        arrivalTime: state.returnArrivalTime,
        duration: state.returnDuration,
        fromCode: state.returnFromCode,
        toCode: state.returnToCode,
        fromAirport: state.returnFromAirport,
        toAirport: state.returnToAirport,
      } } : {}),
    },
    fare: {
      id: fare.id,
      title: fare.title,
      price: fare.price,
      features: [...fare.features],
    },
    fares: {
      outbound: { ...outboundFare, features: [...outboundFare.features] },
      ...(returnFare ? { returning: { ...returnFare, features: [...returnFare.features] } } : {}),
    },
    passengers: passengerFormBlocks().map(passengerFromBlock),
    contact: {
      email: controlValue('email'),
      phone: controlValue('phone'),
    },
  }

  try {
    window.sessionStorage.setItem(confirmationStorageKey, JSON.stringify(snapshot))
  } catch {
    // Страница подтверждения покажет безопасные демонстрационные данные.
  }
  return snapshot
}

function normalizeLatin(value) {
  return String(value).trim().toLocaleUpperCase('en-US').replace(/\s+/gu, ' ')
}

function maskBirthDate(value) {
  const digits = String(value).replace(/\D/gu, '').slice(0, 8)
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('.')
}

function maskRussianPassport(value) {
  const digits = String(value).replace(/\D/gu, '').slice(0, 10)
  return digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits
}

function maskPhone(value) {
  let digits = String(value).replace(/\D/gu, '').slice(0, 11)
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`
  if (!digits) return ''
  if (!digits.startsWith('7')) digits = `7${digits}`.slice(0, 11)
  const chunks = [`+${digits.slice(0, 1)}`]
  if (digits.length > 1) chunks.push(` (${digits.slice(1, 4)}` + (digits.length >= 4 ? ')' : ''))
  if (digits.length > 4) chunks.push(` ${digits.slice(4, 7)}`)
  if (digits.length > 7) chunks.push(`-${digits.slice(7, 9)}`)
  if (digits.length > 9) chunks.push(`-${digits.slice(9, 11)}`)
  return chunks.join('')
}

function parseBirthDate(value) {
  const match = String(value).match(/^(\d{2})\.(\d{2})\.(\d{4})$/u)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

function ageFromBirthDate(date) {
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const beforeBirthday = today.getMonth() < date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())
  if (beforeBirthday) age -= 1
  return age
}

function wrapperFor(control) {
  return control?.closest('.passenger-control')
}

function setError(control, message) {
  const wrapper = wrapperFor(control)
  if (!wrapper) return
  wrapper.dataset.error = message
  control.setAttribute('aria-invalid', 'true')
}

function clearError(control) {
  const wrapper = wrapperFor(control)
  if (!wrapper) return
  delete wrapper.dataset.error
  control.removeAttribute('aria-invalid')
}

function clearAllErrors() {
  page.querySelectorAll('.passenger-control[data-error]').forEach(wrapper => delete wrapper.dataset.error)
  page.querySelectorAll('[aria-invalid="true"]').forEach(control => control.removeAttribute('aria-invalid'))
}

function validateForm() {
  clearAllErrors()
  const errors = []
  const add = (name, message) => {
    const control = field(name)
    setError(control, message)
    errors.push(control)
  }

  ;['surname', 'givenName'].forEach(name => {
    const value = normalizeLatin(field(name).value)
    if (!value) add(name, 'Заполните поле')
    else if (!/^[A-Z][A-Z '\-]*$/u.test(value)) add(name, 'Только латиница')
  })

  if (!field('noMiddleName').checked) {
    const value = normalizeLatin(field('middleName').value)
    if (!value) add('middleName', 'Заполните поле')
    else if (!/^[A-Z][A-Z '\-]*$/u.test(value)) add('middleName', 'Только латиница')
  }

  const birthDate = parseBirthDate(field('birthDate').value)
  if (!birthDate) add('birthDate', 'Укажите дату ДД.ММ.ГГГГ')
  else if (ageFromBirthDate(birthDate) < 12) add('birthDate', 'Для взрослого — от 12 лет')
  else if (ageFromBirthDate(birthDate) > 120) add('birthDate', 'Проверьте дату')

  const documentDigits = field('documentNumber').value.replace(/\D/gu, '')
  if (!field('documentNumber').value.trim()) add('documentNumber', 'Заполните документ')
  else if (field('documentType').value === 'passport-rf' && documentDigits.length !== 10) add('documentNumber', 'Нужно 10 цифр')

  const email = field('email').value.trim()
  if (!email) add('email', 'Укажите почту')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) add('email', 'Проверьте адрес')

  const phoneDigits = field('phone').value.replace(/\D/gu, '')
  if (!phoneDigits) add('phone', 'Укажите телефон')
  else if (phoneDigits.length !== 11) add('phone', 'Нужно 11 цифр')

  return errors
}

function buildLink(path) {
  const target = Reflect.construct(window.URL, [path, window.location.href])
  params.forEach((value, name) => target.searchParams.set(name, value))
  target.searchParams.set('from', state.origin)
  target.searchParams.set('to', state.destination)
  target.searchParams.set('depart', state.tripDepart)
  if (state.tripReturning) target.searchParams.set('return', state.tripReturning)
  target.searchParams.set('traveller', state.traveller)
  target.searchParams.set('flightScope', state.flightScope)
  target.searchParams.set('flightOutboundDate', state.depart)
  if (state.flightScope === 'roundtrip' && state.returning) target.searchParams.set('flightReturnDate', state.returning)
  else if (!isTripSegmentFlow) returnParamNames.forEach(name => target.searchParams.delete(name))
  return applyBookingContextParams(target)
}

function buildConfirmationLink() {
  const fare = combinedFare()
  const outboundFare = selectedFare('outbound')
  const returnFare = state.flightScope === 'roundtrip' ? selectedFare('return') : null
  const target = buildLink('./avia-confirmation.html')
  if (isTripSegmentFlow) {
    target.searchParams.set('flightFlowBookingId', state.bookingId)
    target.searchParams.set(segmentParamName('BookingId'), state.bookingId)
    target.searchParams.set(segmentParamName('Status'), 'awaiting-payment')
    if (!target.searchParams.has('bookingId')) target.searchParams.set('bookingId', state.bookingId)
    if (!target.searchParams.has('flightStatus')) target.searchParams.set('flightStatus', 'awaiting-payment')
  } else {
    target.searchParams.set('bookingId', state.bookingId)
    target.searchParams.set('flightStatus', 'awaiting-payment')
  }
  target.searchParams.set('flight', state.flightId)
  target.searchParams.set('flightAirline', state.airline)
  target.searchParams.set('flightNumber', state.flightNumber)
  target.searchParams.set('flightDepartTime', state.departTime)
  target.searchParams.set('flightArrivalTime', state.arrivalTime)
  target.searchParams.set('flightDuration', state.duration)
  target.searchParams.set('flightFromCode', state.fromCode)
  target.searchParams.set('flightToCode', state.toCode)
  target.searchParams.set('flightFromAirport', state.fromAirport)
  target.searchParams.set('flightToAirport', state.toAirport)
  if (state.flightScope === 'roundtrip') {
    target.searchParams.set('returnAirline', state.returnAirline)
    target.searchParams.set('returnFlightNumber', state.returnFlightNumber)
    target.searchParams.set('returnDepartTime', state.returnDepartTime)
    target.searchParams.set('returnArrivalTime', state.returnArrivalTime)
    target.searchParams.set('returnDuration', state.returnDuration)
    target.searchParams.set('returnFromCode', state.returnFromCode)
    target.searchParams.set('returnToCode', state.returnToCode)
    target.searchParams.set('returnFromAirport', state.returnFromAirport)
    target.searchParams.set('returnToAirport', state.returnToAirport)
  }
  target.searchParams.set('flightTariff', state.tariff)
  target.searchParams.set('flightTariffName', fare.title)
  target.searchParams.set('flightTotalPrice', String(fare.price))
  target.searchParams.set('flightOutboundTariff', state.tariff)
  target.searchParams.set('flightOutboundTariffName', outboundFare.title)
  target.searchParams.set('flightOutboundTotal', String(outboundFare.price))
  if (returnFare) {
    target.searchParams.set('flightReturnTariff', state.returnTariff)
    target.searchParams.set('flightReturnTariffName', returnFare.title)
    target.searchParams.set('flightReturnTotal', String(returnFare.price))
  }
  target.searchParams.set('flightScope', state.flightScope)
  return target
}

function submitPassengerForm() {
  const errors = validateForm()
  if (errors.length) {
    errors[0]?.focus()
    announce(`Проверьте поля: ${errors.length}`)
    return
  }
  if (state.submitting) return
  state.submitting = true
  saveDraft()
  createConfirmationSnapshot()
  submitButton.disabled = true
  submitButton.classList.add('is-processing')
  submitButton.textContent = 'Проверяем данные…'
  window.setTimeout(() => {
    submitButton.classList.remove('is-processing')
    submitButton.textContent = 'Данные проверены'
    announce('Данные проверены. Переходим к подтверждению')
    window.setTimeout(() => {
      window.location.href = buildConfirmationLink().href
    }, 450)
  }, 700)
}

form.addEventListener('submit', event => {
  event.preventDefault()
  submitPassengerForm()
})

form.addEventListener('input', event => {
  const control = event.target
  if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) return
  clearError(control)
  updateProfileSelection('')
  if (control.name === 'birthDate') control.value = maskBirthDate(control.value)
  else if (control.name === 'documentNumber' && field('documentType').value === 'passport-rf') control.value = maskRussianPassport(control.value)
  else if (control.name === 'phone') control.value = maskPhone(control.value)
})

form.addEventListener('change', event => {
  const control = event.target
  if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement)) return
  if (control.name === 'noMiddleName') syncMiddleName()
  else if (control.name === 'documentType') syncDocument()
  else if (control.name === 'loyaltyProgram') syncLoyalty()
  saveDraft()
})

form.addEventListener('focusout', event => {
  const control = event.target
  if (!(control instanceof HTMLInputElement)) return
  if (['surname', 'givenName', 'middleName'].includes(control.name)) control.value = normalizeLatin(control.value)
  saveDraft()
})

document.addEventListener('click', event => {
  const headerMessage = event.target.closest('[data-header-message]')
  if (headerMessage) {
    event.preventDefault()
    announce(`${headerMessage.dataset.headerMessage}: раздел пока не подключён`)
    return
  }

  const paymentMethod = event.target.closest('[data-payment-method]')
  if (paymentMethod) {
    state.paymentMethod = paymentMethod.dataset.paymentMethod
    if (state.paymentMethod === 'business') state.workTrip = true
    renderBookingContext()
    syncBookingContextParams()
    announce(`Выбран способ оплаты: ${paymentMethod.querySelector('strong')?.textContent || ''}`)
    return
  }

  const tripKind = event.target.closest('[data-trip-kind]')
  if (tripKind) {
    state.tripKind = tripKind.dataset.tripKind
    renderBookingContext()
    syncBookingContextParams()
    announce(state.tripKind === 'new' ? 'Будет создана новая командировка' : 'Билеты будут добавлены в существующую командировку')
    return
  }

  const profile = event.target.closest('[data-profile]')
  if (profile) {
    applyProfile(profile.dataset.profile)
    return
  }

  const tariff = event.target.closest('[data-tariff]')
  if (tariff) {
    setTariff(tariff.dataset.tariff, tariff.dataset.fareSegment || 'outbound')
    saveDraft()
    return
  }

  const actionTarget = event.target.closest('[data-action]')
  const action = actionTarget?.dataset.action
  if (!action) return
  if (action === 'toggle-work-purpose') {
    state.workTrip = !state.workTrip
    if (!state.workTrip && state.paymentMethod === 'business') state.paymentMethod = 'card'
    renderBookingContext()
    syncBookingContextParams()
    announce(state.workTrip ? 'Включена рабочая поездка' : 'Рабочая поездка выключена')
  } else if (action === 'toggle-add-to-trip') {
    state.addToTrip = !state.addToTrip
    renderBookingContext()
    syncBookingContextParams()
    announce(state.addToTrip ? 'Билеты будут добавлены в командировку' : 'Билеты останутся в «Моих поездках»')
  } else if (action === 'next-tariff') {
    const segment = actionTarget.dataset.fareSegment || 'outbound'
    setTariffShift(segment === 'return' ? !state.returnTariffShifted : !state.tariffShifted, segment)
  }
  else if (action === 'back-to-results') window.location.href = buildLink('./avia-search.html').href
  else if (action === 'back-to-trip') {
    const target = buildLink('./trip.html')
    if (!window.TripV2Bridge?.returnToTrip(target)) window.location.href = target.href
  }
  else if (action === 'flight-details') announce(`${state.airline}: прямой рейс ${state.departTime}–${state.arrivalTime}`)
  else if (action === 'legal') {
    event.preventDefault()
    announce('Юридический документ откроется в рабочей версии')
  }
})

document.querySelectorAll('.passenger-footer a[href="#"]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault()
    announce('Ссылка откроется в рабочей версии')
  })
})

restoreDraft()
syncMiddleName()
syncDocument()
syncLoyalty()
renderPassengerForms()
setupSegmentTariffPickers()
renderFlight()
renderTariff()
renderBookingContext()
page.setAttribute('data-ready', 'true')

window.AviaPassengersPrototype = Object.freeze({
  state,
  tariffCatalog,
  passengerProfiles,
  buyerContacts,
  fareFor,
  setTariff,
  applyProfile,
  validateForm,
  renderBookingContext,
  buildLink,
  buildConfirmationLink,
  createConfirmationSnapshot,
})
