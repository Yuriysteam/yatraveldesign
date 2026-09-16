(() => {
  const page = document.querySelector('.rail-confirmation-page')
  if (!page) return

  const version = window.location.pathname.match(/\/(v[123])\//u)?.[1] || 'v1'
  const usesSeparateAddToTrip = version === 'v1' || version === 'v2'
  const params = new URLSearchParams(window.location.search)
  const bookingId = params.get('railBookingId')?.trim() || ''
  const bookingKey = version === 'v1' ? `rail-booking:${bookingId}` : `rail-booking-${version}:${bookingId}`
  const personalTripsKey = `personal-trip-bookings-${version}`
  const businessDraftsKey = `business-trip-drafts-${version}`
  const businessPaidKey = `business-trip-paid-${version}`
  const businessCancelledKey = `business-trip-cancelled-${version}`

  const routeRoot = document.querySelector('#rail-confirmation-routes')
  const passengerRoot = document.querySelector('#rail-confirmation-passengers')
  const priceRoot = document.querySelector('#rail-confirmation-price-list')
  const totalRoot = document.querySelector('#rail-confirmation-total')
  const workToggle = document.querySelector('#rail-confirmation-work-toggle')
  const tripTarget = document.querySelector('#rail-confirmation-trip-target')
  const addToTripToggle = document.querySelector('#rail-confirmation-add-to-trip-toggle')
  const tripKindRoot = document.querySelector('.rail-confirmation-trip-kind')
  const tripExisting = document.querySelector('#rail-confirmation-trip-existing')
  const tripSelect = document.querySelector('#rail-confirmation-trip-select')
  const tripEmpty = document.querySelector('#rail-confirmation-trip-empty')
  const submitButton = document.querySelector('#rail-confirmation-submit')
  const announcer = document.querySelector('#rail-confirmation-announcer')
  const paymentCard = document.querySelector('.rail-confirmation-payment')
  const workCard = document.querySelector('.rail-confirmation-work')
  const benefitRow = document.querySelector('.rail-confirmation-benefit')
  const totalLabel = document.querySelector('.rail-confirmation-total > span')

  if (!routeRoot || !passengerRoot || !priceRoot || !totalRoot || !workToggle || !tripTarget || !tripKindRoot || !tripExisting || !tripSelect || !tripEmpty || !submitButton || !announcer || !paymentCard || !workCard || !benefitRow || !totalLabel || (usesSeparateAddToTrip && !addToTripToggle)) {
    throw new Error('Не найдены обязательные элементы страницы подтверждения ж/д билетов')
  }

  function readJson(storage, key, fallback) {
    try {
      const value = JSON.parse(storage.getItem(key) || 'null')
      return value ?? fallback
    } catch {
      return fallback
    }
  }

  const booking = readJson(window.sessionStorage, bookingKey, {})
  const initialAddToTrip = params.get('addToTrip') === '1'
  const state = {
    workTrip: params.get('workTrip') === '1' || params.get('paymentMethod') === 'business' || initialAddToTrip,
    addToTrip: usesSeparateAddToTrip ? initialAddToTrip : params.get('workTrip') === '1',
    tripKind: params.get('tripKind') === 'existing' ? 'existing' : 'new',
    selectedTripId: params.get('tripId')?.trim() || '',
    paymentMethod: params.get('paymentMethod') === 'business' ? 'business' : 'card',
    submitting: false,
  }

  const levelPill = document.querySelector('.shared-search-header .level-pill')
  if (levelPill && !document.querySelector('.rail-confirmation-plus-badge')) {
    const plusBadge = document.createElement('span')
    plusBadge.className = 'rail-confirmation-plus-badge'
    plusBadge.textContent = 'плюс'
    levelPill.before(plusBadge)
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function money(value) {
    return new Intl.NumberFormat('ru-RU', { minimumFractionDigits: Number(value) % 1 ? 2 : 0, maximumFractionDigits: 2 })
      .format(Number(value) || 0)
      .replaceAll('\u00a0', ' ') + ' ₽'
  }

  function prefix(segment) {
    return segment === 'return' ? 'railReturn' : 'railOutbound'
  }

  function seatParts(value) {
    const parts = String(value ?? '').trim().split(/[:-]/u).filter(Boolean)
    return {
      coach: parts.length > 1 ? parts[0] : '',
      seat: parts.at(-1) || '',
    }
  }

  function train(segment) {
    const key = prefix(segment)
    const stored = booking.trains?.[segment] || {}
    const outbound = segment === 'outbound'
    const from = params.get(`${key}From`) || stored.from || (outbound ? params.get('from') : params.get('to')) || 'Москва'
    const to = params.get(`${key}To`) || stored.to || (outbound ? params.get('to') : params.get('from')) || 'Санкт-Петербург'
    const rawSeats = (params.get(`${key}Seats`) || booking.seats?.[segment]?.join(',') || '32')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
    const parsedSeats = rawSeats.map(seatParts)
    return {
      number: params.get(`${key}TrainNumber`) || stored.number || (outbound ? '022А' : '016А'),
      carrier: params.get(`${key}Carrier`) || stored.carrier || 'РЖД/ФПК',
      brand: params.get(`${key}Brand`) || stored.brand || '',
      depart: params.get(`${key}DepartTime`) || stored.depart || '05:30',
      arrival: params.get(`${key}ArrivalTime`) || stored.arrival || '09:35',
      duration: params.get(`${key}Duration`) || stored.duration || '4 ч 5 мин',
      from,
      to,
      date: params.get(`${key}Date`) || stored.date || (outbound ? params.get('depart') : params.get('return')) || '24 апреля',
      fromStation: params.get(`${key}FromStation`) || stored.fromStation || 'Ленинградский вокзал',
      toStation: params.get(`${key}ToStation`) || stored.toStation || 'Московский вокзал',
      coach: params.get(`${key}Coach`) || booking.coach?.[segment] || 'Сидячий',
      coachNumber: params.get(`${key}CoachNumber`) || stored.coachNumber || parsedSeats.find(value => value.coach)?.coach || '',
      seats: parsedSeats.map(value => value.seat).filter(Boolean),
      total: Number(params.get(`${key}Total`) || booking.totals?.[segment] || 0),
    }
  }

  const hasOutbound = Boolean(params.get('railOutboundTrainId') || params.get('railOutboundTrainNumber') || booking.trains?.outbound)
  const hasReturn = Boolean(params.get('railReturnTrainId') || params.get('railReturnTrainNumber') || booking.trains?.return)
  const segments = [...(hasOutbound ? ['outbound'] : []), ...(hasReturn ? ['return'] : [])]
  if (!segments.length) segments.push('outbound')
  const trains = Object.fromEntries(segments.map(segment => [segment, train(segment)]))
  const passengers = Array.isArray(booking.passengers) && booking.passengers.length
    ? booking.passengers
    : [{ surname: 'Яковлева', givenName: 'Татьяна', middleName: 'Ивановна', birthDate: '17.08.1993', documentType: 'passport-rf', documentNumber: '2013 700517', fares: { outbound: 'full' }, seats: { outbound: '32' } }]
  const contact = booking.contact || { email: 'example@mail.com', phone: '+7 915 555-55-55' }

  function routeCard(segment) {
    const item = trains[segment]
    const seat = item.seats.join(', ')
    const coach = item.coach === 'platz' ? 'Плацкарт' : item.coach === 'coupe' ? 'Купе' : item.coach === 'sv' ? 'СВ' : item.coach
    const localDate = item.date.includes(item.depart) ? item.date : `${item.date} в ${item.depart}`
    const coachCopy = item.coachNumber ? `${item.coachNumber} вагон · ` : ''
    return `
      <article class="rail-confirmation-card rail-confirmation-route" data-segment="${segment}">
        <div class="rail-confirmation-route__head">
          <span class="rail-confirmation-route__icon" aria-hidden="true"><img src="./assets/icons/trip-train-filled.svg" alt=""></span>
          <span><strong>${escapeHtml(item.from)} — ${escapeHtml(item.to)}</strong><small>${escapeHtml(localDate)} по местному времени</small></span>
        </div>
        <div class="rail-confirmation-route__train">
          <div class="rail-confirmation-train-meta"><span>${escapeHtml(item.number)} ${escapeHtml(item.brand || item.carrier)}</span><span>Эл. регистрация</span></div>
          <div class="rail-confirmation-route__timeline">
            <div class="rail-confirmation-route__time"><strong>${escapeHtml(item.depart)}</strong><i></i><span>${escapeHtml(item.duration)}</span><i></i><strong>${escapeHtml(item.arrival)}</strong></div>
            <div class="rail-confirmation-route__details"><span>${escapeHtml(item.date)}<br>${escapeHtml(item.fromStation)}</span><span>${escapeHtml(item.date)}<br>${escapeHtml(item.toStation)}</span></div>
          </div>
          <p class="rail-confirmation-route__seat">${escapeHtml(coachCopy)}${escapeHtml(coach)} · ${item.seats.length === 1 ? 'Место' : 'Места'} ${escapeHtml(seat)}</p>
        </div>
      </article>`
  }

  function documentName(value) {
    return value === 'passport-rf' ? 'Паспорт РФ' : value === 'foreign-passport' ? 'Загранпаспорт РФ' : 'Документ'
  }

  function passengerName(passenger) {
    return [passenger.givenName, passenger.middleName, passenger.surname].filter(Boolean).join(' ') || 'Пассажир'
  }

  function renderCore() {
    routeRoot.innerHTML = segments.map(routeCard).join('')
    passengerRoot.innerHTML = passengers.map(passenger => `
      <article class="rail-confirmation-passenger">
        <strong>${escapeHtml(passengerName(passenger))}</strong>
        <small>${escapeHtml(passenger.birthDate || '')}${passenger.documentNumber ? ` · ${escapeHtml(documentName(passenger.documentType))} ${escapeHtml(passenger.documentNumber)}` : ''}</small>
      </article>`).join('')
    document.querySelector('#rail-confirmation-email').textContent = contact.email || 'example@mail.com'
    document.querySelector('#rail-confirmation-phone').textContent = contact.phone || '+7 915 555-55-55'
    const rows = []
    segments.forEach(segment => {
      const item = trains[segment]
      passengers.forEach((passenger, index) => {
        const seat = seatParts(passenger.seats?.[segment] || item.seats[index] || item.seats[0] || '—').seat
        rows.push({ label: `${passenger.category === 'child-seat' ? 'Ребёнок' : 'Взрослый'}, ${seat} место`, fare: 'Тариф Полный', value: item.total / Math.max(1, passengers.length) })
      })
    })
    priceRoot.innerHTML = rows.map(row => `<div class="rail-confirmation-price-row"><span><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(row.fare)}</small></span><span>${money(row.value)}</span></div>`).join('')
    const total = Number(booking.totalPrice) || segments.reduce((sum, segment) => sum + trains[segment].total, 0)
    totalRoot.textContent = money(total)
  }

  function readTrips(key) {
    const value = readJson(window.localStorage, key, [])
    return Array.isArray(value) ? value : []
  }

  function availableTrips() {
    const cancelled = new Set(readTrips(businessCancelledKey).map(item => item?.id).filter(Boolean))
    const all = [...readTrips(businessDraftsKey), ...readTrips(businessPaidKey)]
      .filter(item => item?.id && !cancelled.has(item.id) && !['past', 'cancelled'].includes(item.state))
    return [...new Map(all.map(item => [item.id, item])).values()]
  }

  function tripLabel(trip) {
    const route = trip.route || [trip.from, trip.to].filter(Boolean).join(' — ') || 'Командировка'
    const dates = trip.dates || [trip.depart, trip.return].filter(Boolean).join(' — ')
    return `${route}${dates ? ` · ${dates}` : ''}`
  }

  function renderWorkState() {
    const trips = availableTrips()
    if (!state.workTrip) state.addToTrip = false
    if (state.tripKind === 'existing' && !trips.length) state.tripKind = 'new'
    const addWithoutPayment = usesSeparateAddToTrip && state.workTrip && state.addToTrip
    paymentCard.hidden = false
    workCard.hidden = false
    benefitRow.hidden = usesSeparateAddToTrip && state.workTrip
    totalLabel.firstChild.textContent = addWithoutPayment ? 'Стоимость ' : 'Итого к оплате '
    workToggle.setAttribute('aria-checked', String(state.workTrip))
    tripTarget.hidden = !state.workTrip
    if (addToTripToggle) addToTripToggle.setAttribute('aria-checked', String(state.addToTrip))
    tripKindRoot.hidden = usesSeparateAddToTrip && !state.addToTrip
    document.querySelectorAll('[data-trip-kind]').forEach(button => {
      const selected = button.dataset.tripKind === state.tripKind
      button.setAttribute('aria-pressed', String(selected))
    })
    tripSelect.replaceChildren(...trips.map(trip => {
      const option = document.createElement('option')
      option.value = trip.id
      option.textContent = tripLabel(trip)
      option.selected = trip.id === state.selectedTripId
      return option
    }))
    if (!state.selectedTripId && trips[0]) state.selectedTripId = trips[0].id
    const canChooseTrip = state.workTrip && (!usesSeparateAddToTrip || state.addToTrip)
    tripExisting.hidden = !canChooseTrip || state.tripKind !== 'existing' || !trips.length
    tripEmpty.hidden = !canChooseTrip || state.tripKind !== 'existing' || Boolean(trips.length)
    document.querySelector('[data-payment-method="business"]')?.setAttribute('aria-pressed', String(state.paymentMethod === 'business'))
    document.querySelector('[data-payment-method="card"]')?.setAttribute('aria-pressed', String(state.paymentMethod === 'card'))
    submitButton.textContent = addWithoutPayment ? 'Добавить в командировку' : 'Оплатить'
    syncSemanticParams()
  }

  function syncSemanticParams() {
    const target = new URL(window.location.href)
    if (state.workTrip) target.searchParams.set('workTrip', '1')
    else target.searchParams.delete('workTrip')
    if (usesSeparateAddToTrip && state.addToTrip) target.searchParams.delete('paymentMethod')
    else target.searchParams.set('paymentMethod', state.paymentMethod)
    if (usesSeparateAddToTrip && state.addToTrip) {
      target.searchParams.set('addToTrip', '1')
      target.searchParams.set('tripKind', state.tripKind)
    } else if (usesSeparateAddToTrip) {
      target.searchParams.delete('addToTrip')
      target.searchParams.delete('tripKind')
      target.searchParams.delete('tripId')
    }
    window.history.replaceState(null, '', target)
  }

  function copyRailParams(target, status = 'paid') {
    params.forEach((value, name) => {
      if (name.startsWith('rail') || ['traveller', 'adults', 'children', 'childWithSeat', 'childWithoutSeat'].includes(name)) target.searchParams.set(name, value)
    })
    target.searchParams.set('railStatus', status)
    segments.forEach(segment => {
      const key = prefix(segment)
      target.searchParams.set(`${key}Status`, status)
      target.searchParams.set(`${key}Added`, '1')
    })
    target.searchParams.set('railAdded', segments.length ? '1' : '0')
  }

  function selectedTrip() {
    return availableTrips().find(trip => trip.id === state.selectedTripId) || null
  }

  function tripTargetUrl() {
    const selected = state.tripKind === 'existing' ? selectedTrip() : null
    const hasSelectedHref = Boolean(selected?.href && selected.href !== '#')
    const target = hasSelectedHref
      ? new URL(selected.href, window.location.href)
      : new URL('./trip.html', window.location.href)
    target.pathname = target.pathname.replace(/\/[^/]*$/u, '/trip.html')
    if (!hasSelectedHref) {
      params.forEach((value, name) => target.searchParams.set(name, value))
      target.searchParams.delete('successMode')
      target.searchParams.delete('successTarget')
    }
    copyRailParams(target, 'awaiting-payment')
    const outbound = trains.outbound || trains[segments[0]]
    const returning = trains.return
    target.searchParams.set('from', params.get('from') || outbound?.from || 'Москва')
    target.searchParams.set('to', params.get('to') || outbound?.to || 'Санкт-Петербург')
    target.searchParams.set('depart', params.get('depart') || outbound?.date || '')
    const tripReturn = params.get('return')?.trim() || ''
    if (returning) target.searchParams.set('return', tripReturn || returning.date || '')
    else if (tripReturn) target.searchParams.set('return', tripReturn)
    else target.searchParams.delete('return')
    target.searchParams.set('workTrip', '1')
    target.searchParams.set('addToTrip', '1')
    target.searchParams.set('tripKind', state.tripKind)
    if (state.tripKind === 'existing') {
      target.searchParams.set('tripId', selected?.id || params.get('tripId') || params.get('draftId') || `trip-${Date.now().toString(36)}`)
      target.searchParams.delete('draft')
      target.searchParams.delete('draftId')
    } else {
      target.searchParams.set('draft', '1')
      target.searchParams.set('draftId', params.get('draftId') || `business-rail-${Date.now().toString(36)}`)
      target.searchParams.delete('tripId')
    }
    return target
  }

  function savePersonalTrip() {
    const current = readTrips(personalTripsKey)
    const first = trains[segments[0]]
    const target = new URL('./trip.html', window.location.href)
    params.forEach((value, name) => target.searchParams.set(name, value))
    copyRailParams(target)
    target.searchParams.set('from', first.from)
    target.searchParams.set('to', first.to)
    const trip = {
      id: bookingId || `rail-${Date.now().toString(36)}`,
      state: 'upcoming',
      serviceCount: 1,
      paidServices: 1,
      city: first.to,
      transport: 'train',
      route: `${first.from} — ${first.to}`,
      dates: segments.map(segment => trains[segment].date).join(' — '),
      title: `Ж/д билеты · ${first.number}`,
      detail: `${passengers.length} ${passengers.length === 1 ? 'пассажир' : 'пассажира'}`,
      status: 'Оплачено',
      hotelImage: './assets/images/tab-train.png',
      secondaryTitle: 'Ж/д билеты',
      secondaryDetail: `${first.number} · ${first.depart} — ${first.arrival}`,
      secondaryIcon: './assets/icons/trip-train-filled.svg',
      secondaryType: 'train',
      href: target.href,
    }
    const remaining = current.filter(item => item?.id !== trip.id)
    try { window.localStorage.setItem(personalTripsKey, JSON.stringify([trip, ...remaining].slice(0, 12))) } catch {}
  }

  function successUrl(nextTarget, mode) {
    const target = new URL('./train-success.html', window.location.href)
    new URL(window.location.href).searchParams.forEach((value, name) => target.searchParams.set(name, value))
    target.searchParams.set('successMode', mode)
    target.searchParams.set('successTarget', nextTarget.href)
    if (state.workTrip) target.searchParams.set('workTrip', '1')
    else target.searchParams.delete('workTrip')
    if (state.addToTrip) target.searchParams.set('addToTrip', '1')
    else target.searchParams.delete('addToTrip')
    target.searchParams.set('tripKind', state.tripKind)
    return target
  }

  function pay() {
    if (state.submitting) return
    const shouldAddToTrip = state.workTrip && (!usesSeparateAddToTrip || state.addToTrip)
    if (shouldAddToTrip && state.tripKind === 'existing' && !selectedTrip()) {
      tripEmpty.hidden = false
      announcer.textContent = 'Выберите командировку'
      return
    }
    state.submitting = true
    submitButton.disabled = true
    submitButton.textContent = shouldAddToTrip ? 'Добавляем…' : 'Оплачиваем…'
    window.setTimeout(() => {
      if (shouldAddToTrip) {
        const target = tripTargetUrl()
        if (version === 'v2' && window.TripV2Bridge?.returnToTrip(target, { result: 'service-added', kind: 'rail', segments })) return
        window.location.href = target.href
        return
      }
      savePersonalTrip()
      const target = new URL('./trips.html#personal', window.location.href)
      window.location.href = successUrl(target, 'personal').href
    }, 450)
  }

  document.addEventListener('click', event => {
    const work = event.target.closest('#rail-confirmation-work-toggle')
    if (work) {
      state.workTrip = !state.workTrip
      if (!state.workTrip) {
        state.addToTrip = false
        if (state.paymentMethod === 'business') state.paymentMethod = 'card'
      }
      renderWorkState()
      announcer.textContent = state.workTrip ? 'Включён режим «Еду по работе»' : 'Режим «Еду по работе» выключен'
      return
    }
    const addToTrip = event.target.closest('#rail-confirmation-add-to-trip-toggle')
    if (addToTrip) {
      state.addToTrip = !state.addToTrip
      if (state.addToTrip) state.workTrip = true
      renderWorkState()
      announcer.textContent = state.addToTrip ? 'Билеты будут добавлены в командировку' : 'Билеты останутся в «Моих поездках»'
      return
    }
    const kind = event.target.closest('[data-trip-kind]')
    if (kind) {
      state.tripKind = kind.dataset.tripKind === 'existing' ? 'existing' : 'new'
      renderWorkState()
      return
    }
    const payment = event.target.closest('[data-payment-method]')
    if (payment) {
      state.paymentMethod = payment.dataset.paymentMethod === 'business' ? 'business' : 'card'
      if (state.paymentMethod === 'business') state.workTrip = true
      renderWorkState()
      return
    }
    if (event.target.closest('#rail-confirmation-submit')) pay()
    if (event.target.closest('a[href="#"]')) event.preventDefault()
  })

  tripSelect.addEventListener('change', () => {
    state.selectedTripId = tripSelect.value
    state.tripKind = 'existing'
    renderWorkState()
  })

  renderCore()
  renderWorkState()
  page.dataset.ready = 'true'

  window.railConfirmationPrototype = {
    getState: () => ({ ...state, version, bookingId }),
    availableTrips,
    tripTargetUrl,
  }
})()
