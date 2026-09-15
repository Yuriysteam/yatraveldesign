(() => {
  const page = document.querySelector('.trip-payment-page')
  const servicesRoot = document.querySelector('#trip-payment-services')
  const caption = document.querySelector('#trip-payment-caption')
  const route = document.querySelector('#trip-payment-route')
  const meta = document.querySelector('#trip-payment-meta')
  const breakdown = document.querySelector('#trip-payment-breakdown')
  const total = document.querySelector('#trip-payment-total')
  const submit = document.querySelector('#trip-payment-submit')
  const back = document.querySelector('#trip-payment-back')
  const announcer = document.querySelector('#trip-payment-announcer')

  if (!page || !servicesRoot || !caption || !route || !meta || !breakdown || !total || !submit || !back || !announcer) {
    throw new Error('Не найдены обязательные элементы страницы оплаты командировки')
  }

  const params = new URLSearchParams(window.location.search)

  function readArray(name) {
    try {
      const value = JSON.parse(params.get(name) || '[]')
      return Array.isArray(value) ? value : []
    } catch {
      return []
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function formatMoney(value) {
    return `${new Intl.NumberFormat('ru-RU').format(Math.max(0, Math.round(Number(value) || 0)))} ₽`
  }

  function serviceWord(value) {
    const count = Math.abs(Number(value) || 0) % 100
    const last = count % 10
    if (count > 10 && count < 20) return 'услуг'
    if (last === 1) return 'услугу'
    if (last >= 2 && last <= 4) return 'услуги'
    return 'услуг'
  }

  function serviceKind(service) {
    if (service.type === 'lodging' || service.booking?.kind === 'hotel') return 'hotel'
    if (service.booking?.kind === 'rail') return 'rail'
    return 'avia'
  }

  function serviceIcon(service) {
    const kind = serviceKind(service)
    return kind === 'hotel' ? '⌂' : kind === 'rail' ? '▤' : '✈'
  }

  function serviceDetails(service) {
    const booking = service.booking || {}
    const kind = serviceKind(service)
    if (kind === 'hotel') return [booking.hotelName, booking.roomName].filter(Boolean).join(' · ')
    if (kind === 'rail') return [booking.carrier, booking.trainNumber && `поезд ${booking.trainNumber}`].filter(Boolean).join(' · ')
    return [booking.airline, booking.flightNumber].filter(Boolean).join(' · ')
  }

  function serviceHeadline(service) {
    const booking = service.booking || {}
    const kind = serviceKind(service)
    if (kind === 'hotel') return booking.hotelName || service.title || 'Жильё'
    const from = booking.fromCity || params.get('from') || 'Откуда'
    const to = booking.toCity || params.get('to') || 'Куда'
    return `${from} — ${to}`
  }

  function serviceSchedule(service) {
    const booking = service.booking || {}
    const kind = serviceKind(service)
    if (kind === 'hotel') return [booking.dateRange, booking.roomName].filter(Boolean).join(' · ')
    return [
      [booking.departTime, booking.arrivalTime].filter(Boolean).join(' — '),
      booking.flightNumber || booking.trainNumber,
    ].filter(Boolean).join(' · ')
  }

  function serviceConditions(service) {
    const booking = service.booking || {}
    const kind = serviceKind(service)
    if (kind === 'hotel') return [booking.cancellation, booking.meal].filter(Boolean).join(' · ')
    return booking.tariff || ''
  }

  function categoryLabel(kind) {
    if (kind === 'hotel') return 'Жильё'
    if (kind === 'rail') return 'Ж/д билеты'
    return 'Авиабилеты'
  }

  const requestedIds = new Set(readArray('payIds').map(String))
  const services = readArray('tripServices')
    .filter(service => service && typeof service === 'object' && service.status !== 'paid' && service.status !== 'cancelled')
    .filter(service => !requestedIds.size || requestedIds.has(String(service.serviceId || service.id)))
    .slice(0, 20)
  const serviceIds = services.map(service => String(service.serviceId || service.id)).filter(Boolean)
  const amount = services.reduce((sum, service) => sum + Math.max(0, Number(service.price) || 0), 0)

  const from = params.get('from') || 'Москва'
  const to = params.get('to') || 'Санкт-Петербург'
  const depart = params.get('depart') || params.get('checkin') || ''
  const returning = params.get('return') || params.get('checkout') || ''
  const traveller = params.get('tripTraveller') || params.get('traveller') || '1 взрослый'
  route.textContent = `${from} — ${to}`
  meta.textContent = [depart && returning ? `${depart} — ${returning}` : depart, returning ? 'туда — обратно' : 'в одну сторону', traveller].filter(Boolean).join(' · ')

  servicesRoot.innerHTML = services.length
    ? services.map(service => `
      <article class="trip-payment-service" data-service-kind="${serviceKind(service)}">
        <span class="trip-payment-service__icon" aria-hidden="true">${serviceIcon(service)}</span>
        <span class="trip-payment-service__copy">
          <span class="trip-payment-service__eyebrow">${escapeHtml(categoryLabel(serviceKind(service)))}</span>
          <strong>${escapeHtml(serviceHeadline(service))}</strong>
          <span>${escapeHtml(serviceSchedule(service) || serviceDetails(service) || 'Проверьте детали услуги')}</span>
          ${serviceConditions(service) ? `<small>${escapeHtml(serviceConditions(service))}</small>` : ''}
        </span>
        <span class="trip-payment-service__side"><span class="trip-payment-service__status">Ожидает оплаты</span><strong class="trip-payment-service__price">${escapeHtml(formatMoney(service.price))}</strong></span>
      </article>`).join('')
    : '<div class="trip-payment-empty">Нет услуг, ожидающих оплаты.</div>'

  const categoryTotals = new Map()
  services.forEach(service => {
    const kind = serviceKind(service)
    categoryTotals.set(kind, (categoryTotals.get(kind) || 0) + Math.max(0, Number(service.price) || 0))
  })
  breakdown.innerHTML = [...categoryTotals.entries()].map(([kind, price]) => `
    <p><span>${escapeHtml(categoryLabel(kind))}</span><strong>${escapeHtml(formatMoney(price))}</strong></p>`).join('')

  caption.textContent = services.length === 1
    ? 'Проверьте услугу перед оплатой'
    : `Проверьте ${services.length} ${serviceWord(services.length)} перед оплатой`
  total.textContent = formatMoney(amount)
  submit.textContent = services.length > 1 ? 'Оплатить всё' : 'Оплатить'
  submit.disabled = !services.length

  function postToTrip(type, details = {}) {
    if (window.parent === window) return false
    const targetOrigin = window.location.protocol === 'file:' ? '*' : window.location.origin
    window.parent.postMessage({ type, ...details }, targetOrigin)
    return true
  }

  back.addEventListener('click', () => {
    if (!postToTrip('trip-v2:open-services')) window.history.back()
  })

  submit.addEventListener('click', () => {
    if (!serviceIds.length || submit.disabled) return
    submit.disabled = true
    submit.textContent = 'Оплачиваем…'
    announcer.textContent = 'Оплачиваем выбранные услуги'
    window.setTimeout(() => {
      if (!postToTrip('trip-v2:payment-complete', { serviceIds })) {
        submit.textContent = 'Оплачено'
        announcer.textContent = 'Услуги оплачены'
      }
    }, 550)
  })

  window.requestAnimationFrame(() => { page.dataset.ready = 'true' })
})()
