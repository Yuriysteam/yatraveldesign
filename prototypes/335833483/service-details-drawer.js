(() => {
  const detailsEventName = 'trip:service-details'
  const editEventName = 'trip:edit-service-details'
  const closeDelay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280
  const params = new URLSearchParams(window.location.search)
  const closeIcon = new URL('../service-details-close.svg', document.baseURI).href
  const flightRouteIcon = new URL('../service-details-flight-route.svg', document.baseURI).href
  const flightFeatureIcons = Object.freeze({
    baggage: new URL('../service-details-flight-no-baggage.svg', document.baseURI).href,
    handLuggage: new URL('../service-details-flight-hand-luggage.svg', document.baseURI).href,
    return: new URL('../service-details-flight-no-return.svg', document.baseURI).href,
    exchange: new URL('../service-details-flight-paid-return.svg', document.baseURI).href,
  })
  const configuredAssetBase = document.currentScript?.dataset.assetBase || './assets/'
  const assetBase = new URL(configuredAssetBase, document.baseURI).href
  let activeSection = null
  let returnFocus = null
  let closeTimer = 0

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function clampCount(value, fallback = 0) {
    const number = Number.parseInt(String(value ?? ''), 10)
    return Number.isFinite(number) && number >= 0 ? number : fallback
  }

  function countFromLabel(value) {
    const match = String(value || '').match(/\d+/u)
    return match ? clampCount(match[0]) : 0
  }

  function adultLabel(count) {
    return `${count} ${count === 1 ? 'взрослый' : 'взрослых'}`
  }

  function childLabel(count) {
    if (count === 0) return 'без детей'
    if (count === 1) return '1 ребёнок'
    if (count >= 2 && count <= 4) return `${count} ребёнка`
    return `${count} детей`
  }

  function guestCounts(booking) {
    const travellerLabel = params.get('guests') || params.get('traveller') || params.get('tripTraveller') || booking.traveller || ''
    const passengerCount = Array.isArray(booking.passengers) ? booking.passengers.length : booking.passenger ? 1 : 0
    const adults = clampCount(params.get('adults'), countFromLabel(travellerLabel) || passengerCount || 1)
    const children = clampCount(params.get('children'), 0)
    return { adults, children }
  }

  function dateParts(value) {
    if (value && typeof value === 'object') {
      const day = String(value.day || '').trim()
      const month = String(value.month || '').trim()
      if (day || month) return { day, month }
    }
    const match = String(value || '').trim().match(/(\d{1,2})\s+([а-яё]{3,})/iu)
    return match ? { day: match[1], month: match[2] } : { day: '', month: '' }
  }

  function rangeEnd(value) {
    const parts = String(value || '').split(/\s+[—–-]\s+/u)
    return parts.length > 1 ? dateParts(parts.at(-1)) : { day: '', month: '' }
  }

  function dateLabel(value) {
    const date = dateParts(value)
    return [date.day, date.month].filter(Boolean).join(' ') || 'Не указано'
  }

  function checkoutDate(section, booking) {
    return booking.endDate
      || params.get('checkout')
      || params.get('return')
      || rangeEnd(booking.dateRange)
      || null
  }

  function passengers(booking) {
    const list = Array.isArray(booking.passengers)
      ? booking.passengers
      : Array.isArray(booking.guests)
        ? booking.guests
        : booking.passenger
          ? [booking.passenger]
          : []
    return list.filter(item => item && typeof item === 'object')
  }

  function passengerDetails(passenger) {
    if (passenger.details) return String(passenger.details)
    return [
      passenger.documentType,
      passenger.documentNumber,
      passenger.birthDate,
    ].filter(Boolean).join(' · ')
  }

  function inferredBed(roomName) {
    if (/двуспальн/iu.test(roomName)) return '1 двуспальная кровать'
    if (/двухместн/iu.test(roomName)) return 'Двухместное размещение'
    if (/одноместн/iu.test(roomName)) return 'Одноместное размещение'
    return ''
  }

  function roomFeatures(booking) {
    const source = booking.amenities || booking.roomFeatures || booking.features
    const features = Array.isArray(source) ? source.filter(Boolean).map(String) : []
    const bed = booking.bedDescription || inferredBed(booking.roomName || '')
    if (bed && !features.includes(bed)) features.unshift(bed)
    return features.slice(0, 10)
  }

  function isHotelSection(section) {
    const booking = section?.booking || {}
    return section?.type === 'lodging'
      || section?.kind === 'hotel'
      || booking.kind === 'hotel'
      || Boolean(booking.hotelName)
  }

  function isFlightSection(section) {
    const booking = section?.booking || {}
    return booking.kind === 'flight' || section?.kind === 'avia'
  }

  function isRailSection(section) {
    const booking = section?.booking || {}
    return booking.kind === 'rail' || section?.kind === 'rail'
  }

  function airlineLogo(booking) {
    if (booking.logo) return booking.logo
    const normalized = String(booking.airline || '').toLocaleLowerCase('ru')
    if (normalized.includes('побед')) return new URL('./assets/avia/pobeda-tile.svg', document.baseURI).href
    if (normalized.includes('southwind')) return new URL('./assets/avia/southwind.svg', document.baseURI).href
    if (normalized.includes('ajet')) return new URL('./assets/avia/ajet.svg', document.baseURI).href
    if (normalized.includes('росси')) return new URL('./assets/avia-confirmation/rossiya.png', document.baseURI).href
    return new URL('./assets/avia-booking/aeroflot.png', document.baseURI).href
  }

  function flightFareFeatures(booking) {
    if (Array.isArray(booking.fareFeatures)) return booking.fareFeatures.filter(Boolean).map(String)
    const fareId = params.get('flightTariff')
    const featuresByFare = {
      light: ['Ручная кладь 1 место, 10 кг, 55×40×25 см', 'Без багажа', 'Невозвратный', 'Обмен с доплатой'],
      optimum: ['Ручная кладь 1 место, 10 кг, 55×40×25 см', 'Багаж 1 место, 23 кг', 'Возврат со сбором', 'Обмен с доплатой'],
      maximum: ['Ручная кладь 1 место, 10 кг, 55×40×25 см', 'Багаж 1 место, 30 кг', 'Возврат включён', 'Обмен включён'],
    }
    return featuresByFare[fareId] || []
  }

  function flightFeatureView(feature) {
    const value = String(feature || '').trim()
    const normalized = value.toLocaleLowerCase('ru')
    if (normalized.includes('ручн')) {
      return { icon: flightFeatureIcons.handLuggage, label: value.replace(/^Ручная кладь\s*/iu, 'Ручная кладь: ') }
    }
    if (normalized.includes('багаж')) return { icon: flightFeatureIcons.baggage, label: value }
    if (normalized.includes('невозврат')) return { icon: flightFeatureIcons.return, label: 'Возврат: запрещён' }
    if (normalized.includes('возврат')) return { icon: flightFeatureIcons.return, label: value.replace(/^Возврат\s*/iu, 'Возврат: ') }
    if (normalized.includes('обмен')) return { icon: flightFeatureIcons.exchange, label: value.replace(/^Обмен\s*/iu, 'Обмен: ') }
    return { icon: flightFeatureIcons.exchange, label: value }
  }

  function flightSections(section, relatedSections) {
    const result = []
    const seen = new Set()
    ;[section, ...(Array.isArray(relatedSections) ? relatedSections : [])].forEach(item => {
      if (!isFlightSection(item)) return
      const key = item.serviceId || item.id || `${item.sourceSectionId}:${item.booking?.flightNumber}`
      if (seen.has(key)) return
      seen.add(key)
      result.push(item)
    })
    const order = { outbound: 0, return: 1 }
    return result.sort((first, second) => (
      (order[first.sourceSectionId] ?? 2) - (order[second.sourceSectionId] ?? 2)
    ))
  }

  function flightPassengerList(sections) {
    const result = []
    const seen = new Set()
    sections.forEach(item => {
      passengers(item.booking || {}).forEach(passenger => {
        const key = `${passenger.name || ''}|${passengerDetails(passenger)}`
        if (seen.has(key)) return
        seen.add(key)
        result.push(passenger)
      })
    })
    return result
  }

  function renderPassengerRows(list) {
    if (!list.length) {
      return '<div class="service-details-drawer__guest"><strong>Данные пассажира не указаны</strong></div>'
    }
    return list.map(passenger => {
      const details = passengerDetails(passenger)
      return `
        <div class="service-details-drawer__guest">
          <strong>${escapeHtml(passenger.name || 'Пассажир')}</strong>
          ${details ? `<small>${escapeHtml(details)}</small>` : ''}
        </div>`
    }).join('')
  }

  function renderFlightFeatures(booking) {
    const featureOrder = feature => {
      const normalized = String(feature || '').toLocaleLowerCase('ru')
      if (normalized.includes('багаж') && !normalized.includes('ручн')) return 0
      if (normalized.includes('ручн')) return 1
      if (normalized.includes('возврат')) return 2
      if (normalized.includes('обмен')) return 3
      return 4
    }
    const features = [...flightFareFeatures(booking)].sort((first, second) => featureOrder(first) - featureOrder(second))
    if (!features.length) return ''
    return `<div class="service-details-drawer__flight-feature-list">${features.map(feature => {
      const view = flightFeatureView(feature)
      return `<div class="service-details-drawer__flight-feature"><img src="${escapeHtml(view.icon)}" alt=""><span>${escapeHtml(view.label)}</span></div>`
    }).join('')}</div>`
  }

  function renderFlightSegment(section) {
    const booking = section.booking || {}
    const route = [booking.fromCity, booking.toCity].filter(Boolean).join(' — ')
    const date = booking.dateLabel || dateLabel(section.date)
    const duration = booking.duration || ''
    const secondary = [date, duration ? `${duration} в пути` : ''].filter(Boolean).join(' · ')
    const aircraft = booking.aircraft || booking.aircraftName || booking.plane || ''
    const cabinNote = booking.cabinNote || booking.seatConfiguration || ''
    const carrierDetails = [cabinNote, aircraft].filter(Boolean)
    const logo = airlineLogo(booking)
    return `
      <section class="service-details-drawer__flight-segment">
        <header class="service-details-drawer__flight-heading">
          <h2>${escapeHtml(route || 'Перелёт')}</h2>
          ${secondary ? `<p>${escapeHtml(secondary)}</p>` : ''}
        </header>
        <div class="service-details-drawer__flight-card">
          <div class="service-details-drawer__flight-card-inner">
            <div class="service-details-drawer__flight-route">
              <div class="service-details-drawer__flight-carrier">
                <div><strong>${escapeHtml(booking.airline || 'Авиакомпания')}</strong>${carrierDetails.map(detail => `<span>${escapeHtml(detail)}</span>`).join('')}</div>
                <div class="service-details-drawer__flight-number"><span>${escapeHtml(booking.flightNumber || '')}</span><img src="${escapeHtml(logo)}" alt=""></div>
              </div>
              <div class="service-details-drawer__flight-timeline" aria-label="${escapeHtml(duration ? `${duration} в пути` : 'Маршрут перелёта')}">
                <strong>${escapeHtml(booking.departTime || '—')}</strong>
                <img src="${escapeHtml(flightRouteIcon)}" alt="">
                <span>${escapeHtml(duration || 'в пути')}</span>
                <img src="${escapeHtml(flightRouteIcon)}" alt="">
                <strong>${escapeHtml(booking.arrivalTime || '—')}</strong>
              </div>
              <div class="service-details-drawer__flight-locations">
                <div><strong>${escapeHtml(booking.fromCity || '')}</strong><span>${escapeHtml(booking.fromAirport || '')}</span><small>${escapeHtml(booking.fromCode || '')}</small></div>
                <div><strong>${escapeHtml(booking.toCity || '')}</strong><span>${escapeHtml(booking.toAirport || '')}</span><small>${escapeHtml(booking.toCode || '')}</small></div>
              </div>
            </div>
            <div class="service-details-drawer__flight-fare">
              <strong>${escapeHtml(`Тариф «${booking.tariff || 'Не указан'}»`)}</strong>
              ${renderFlightFeatures(booking)}
            </div>
          </div>
        </div>
      </section>`
  }

  function renderFlightSection(section, relatedSections) {
    const sections = flightSections(section, relatedSections)
    return `
      <h1 class="service-details-drawer__title" id="service-details-title">Авиабилеты</h1>
      <div class="service-details-drawer__flight-list">${sections.map(renderFlightSegment).join('')}</div>
      <section class="service-details-drawer__guests service-details-drawer__guests--flight" aria-labelledby="service-details-guests-title">
        <h2 id="service-details-guests-title">Пассажиры</h2>
        <div class="service-details-drawer__guest-list">${renderPassengerRows(flightPassengerList(sections))}</div>
      </section>`
  }

  function renderRailSection(section) {
    const booking = section.booking || {}
    const route = [booking.fromCity, booking.toCity].filter(Boolean).join(' — ')
    const date = booking.dateLabel || dateLabel(section.date)
    const duration = booking.duration || ''
    const passengerList = passengers(booking)
    const trainIcon = new URL('icons/trip-train-filled.svg', assetBase).href
    const fare = [booking.coach, booking.seats].filter(Boolean).join(' · ')
    return `
      <h1 class="service-details-drawer__title" id="service-details-title">Ж/д билет</h1>
      <section class="service-details-drawer__flight-segment">
        <header class="service-details-drawer__flight-heading"><h2>${escapeHtml(route || 'Поезд')}</h2><p>${escapeHtml([date, duration ? `${duration} в пути` : ''].filter(Boolean).join(' · '))}</p></header>
        <div class="service-details-drawer__flight-card"><div class="service-details-drawer__flight-card-inner">
          <div class="service-details-drawer__flight-route">
            <div class="service-details-drawer__flight-carrier"><div><strong>${escapeHtml(booking.carrier || 'РЖД')}</strong><span>${escapeHtml(booking.brand || '')}</span></div><div class="service-details-drawer__flight-number"><span>${escapeHtml(`Поезд ${booking.trainNumber || ''}`)}</span><img src="${escapeHtml(trainIcon)}" alt=""></div></div>
            <div class="service-details-drawer__flight-timeline" aria-label="${escapeHtml(duration ? `${duration} в пути` : 'Маршрут поезда')}"><strong>${escapeHtml(booking.departTime || '—')}</strong><img src="${escapeHtml(flightRouteIcon)}" alt=""><span>${escapeHtml(duration || 'в пути')}</span><img src="${escapeHtml(flightRouteIcon)}" alt=""><strong>${escapeHtml(booking.arrivalTime || '—')}</strong></div>
            <div class="service-details-drawer__flight-locations"><div><strong>${escapeHtml(booking.fromCity || '')}</strong><span>${escapeHtml(booking.fromStation || '')}</span></div><div><strong>${escapeHtml(booking.toCity || '')}</strong><span>${escapeHtml(booking.toStation || '')}</span></div></div>
          </div>
          ${fare ? `<div class="service-details-drawer__flight-fare"><strong>${escapeHtml(fare)}</strong></div>` : ''}
        </div></div>
      </section>
      <section class="service-details-drawer__guests service-details-drawer__guests--flight" aria-labelledby="service-details-guests-title"><h2 id="service-details-guests-title">Пассажиры</h2><div class="service-details-drawer__guest-list">${renderPassengerRows(passengerList)}</div></section>`
  }

  function titleFor(section, booking) {
    if (section.title) return section.title
    const city = booking.city || booking.toCity || params.get('city') || params.get('to')
    return city ? `Жильё: ${city}` : 'Жильё'
  }

  function renderGuestRows(booking) {
    const list = passengers(booking)
    if (!list.length) {
      return '<div class="service-details-drawer__guest"><strong>Данные гостя не указаны</strong></div>'
    }
    return list.map(passenger => {
      const details = passengerDetails(passenger)
      return `
        <div class="service-details-drawer__guest">
          <strong>${escapeHtml(passenger.name || 'Гость')}</strong>
          ${details ? `<small>${escapeHtml(details)}</small>` : ''}
        </div>`
    }).join('')
  }

  function renderFeatureList(booking) {
    const features = roomFeatures(booking)
    if (!features.length) return ''
    return `<div class="service-details-drawer__features">${features.map(feature => `<span class="service-details-drawer__feature">${escapeHtml(feature)}</span>`).join('')}</div>`
  }

  function renderSection(section) {
    const booking = section.booking || {}
    const counts = guestCounts(booking)
    const roomName = booking.roomName || booking.room || 'Номер'
    const hotelName = booking.hotelName || ''
    const address = booking.address || booking.hotelAddress || ''
    const image = booking.image || new URL('./assets/hotel-detail/hero-main.png', document.baseURI).href
    const cancellation = booking.cancellation || 'Условия отмены не указаны'
    const cancellationDetails = booking.cancellationDetails || booking.cancellationNote || ''
    const meal = booking.meal || 'Питание не указано'
    const checkin = dateLabel(section.date || params.get('checkin') || params.get('depart') || booking.dateRange)
    const checkout = dateLabel(checkoutDate(section, booking))
    const cancellationIcon = new URL('icons/hotel-cancellation.svg', assetBase).href
    const mealIcon = new URL('icons/hotel-meal.svg', assetBase).href

    return `
      <h1 class="service-details-drawer__title" id="service-details-title">${escapeHtml(titleFor(section, booking))}</h1>
      <section class="service-details-drawer__booking" aria-label="Детали проживания">
        <div class="service-details-drawer__resume">
          <div class="service-details-drawer__resume-item"><span>Заезд</span><strong>${escapeHtml(checkin)}</strong><small>после 14:00</small></div>
          <div class="service-details-drawer__resume-item"><span>Выезд</span><strong>${escapeHtml(checkout)}</strong><small>до 12:00</small></div>
          <div class="service-details-drawer__resume-item"><span>Гости</span><strong>${escapeHtml(adultLabel(counts.adults))}</strong><small>${escapeHtml(childLabel(counts.children))}</small></div>
        </div>
        <div class="service-details-drawer__room">
          <img class="service-details-drawer__room-image" src="${escapeHtml(image)}" alt="">
          <div class="service-details-drawer__room-copy">
            <h2>${escapeHtml(roomName)}</h2>
            ${hotelName ? `<p class="service-details-drawer__room-hotel">${escapeHtml(hotelName)}</p>` : ''}
            ${address ? `<p class="service-details-drawer__room-meta">${escapeHtml(address)}</p>` : ''}
            ${renderFeatureList(booking)}
          </div>
        </div>
        <div class="service-details-drawer__conditions">
          <div class="service-details-drawer__condition">
            <span class="service-details-drawer__condition-label">Условия отмены</span>
            <div class="service-details-drawer__condition-main">
              <img src="${escapeHtml(cancellationIcon)}" alt="">
              <div><span class="service-details-drawer__condition-value">${escapeHtml(cancellation)}</span>${cancellationDetails ? `<span class="service-details-drawer__condition-details">${escapeHtml(cancellationDetails)}</span>` : ''}</div>
            </div>
          </div>
          <div class="service-details-drawer__condition">
            <span class="service-details-drawer__condition-label">Питание</span>
            <div class="service-details-drawer__condition-main">
              <img src="${escapeHtml(mealIcon)}" alt="">
              <span class="service-details-drawer__condition-value">${escapeHtml(meal)}</span>
            </div>
          </div>
        </div>
      </section>
      <section class="service-details-drawer__guests" aria-labelledby="service-details-guests-title">
        <h2 id="service-details-guests-title">Гости</h2>
        <div class="service-details-drawer__guest-list">${renderGuestRows(booking)}</div>
      </section>`
  }

  const root = document.createElement('div')
  root.className = 'service-details-drawer'
  root.hidden = true
  root.innerHTML = `
    <button class="service-details-drawer__scrim" type="button" data-service-details-close aria-label="Закрыть детали услуги"></button>
    <button class="service-details-drawer__close" type="button" data-service-details-close aria-label="Закрыть"><img src="${escapeHtml(closeIcon)}" alt=""></button>
    <aside class="service-details-drawer__panel" role="dialog" aria-modal="true" aria-labelledby="service-details-title" tabindex="-1">
      <div class="service-details-drawer__scroll" data-service-details-content></div>
      <footer class="service-details-drawer__footer"><button class="service-details-drawer__edit" type="button" data-service-details-edit>Изменить детали</button></footer>
      <span class="visually-hidden" data-service-details-announcer aria-live="polite"></span>
    </aside>`
  document.body.append(root)

  const panel = root.querySelector('.service-details-drawer__panel')
  const content = root.querySelector('[data-service-details-content]')
  const announcer = root.querySelector('[data-service-details-announcer]')

  function findReturnFocus(section) {
    const id = String(section?.id || '')
    if (id && window.CSS?.escape) {
      return document.querySelector(`[data-service-details="${CSS.escape(id)}"]`)
        || document.querySelector(`[data-trip-service-id="${CSS.escape(id)}"] .trip-service-card`)
    }
    return document.activeElement instanceof HTMLElement ? document.activeElement : null
  }

  function open(section, relatedSections = []) {
    const type = isHotelSection(section) ? 'hotel' : isFlightSection(section) ? 'flight' : isRailSection(section) ? 'rail' : ''
    if (!type) return false
    window.clearTimeout(closeTimer)
    activeSection = section
    returnFocus = findReturnFocus(section)
    root.dataset.serviceDetailsType = type
    root.classList.toggle('is-readonly', Boolean(section.readonly))
    content.innerHTML = type === 'flight'
      ? renderFlightSection(section, relatedSections)
      : type === 'rail'
        ? renderRailSection(section)
        : renderSection(section)
    root.hidden = false
    document.body.classList.add('service-details-drawer-open')
    window.requestAnimationFrame(() => {
      root.classList.add('is-open')
      panel.focus({ preventScroll: true })
    })
    return true
  }

  function close({ restoreFocus = true } = {}) {
    if (root.hidden) return
    root.classList.remove('is-open')
    document.body.classList.remove('service-details-drawer-open')
    closeTimer = window.setTimeout(() => {
      root.hidden = true
      content.innerHTML = ''
      delete root.dataset.serviceDetailsType
      root.classList.remove('is-readonly')
      activeSection = null
      if (restoreFocus && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true })
      returnFocus = null
    }, closeDelay)
  }

  function focusableElements() {
    return [...root.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
      .filter(element => element.getClientRects().length > 0)
  }

  root.addEventListener('click', event => {
    if (event.target.closest('[data-service-details-close]')) {
      close()
      return
    }
    if (!event.target.closest('[data-service-details-edit]') || !activeSection) return
    document.dispatchEvent(new CustomEvent(editEventName, { detail: { section: activeSection } }))
    announcer.textContent = 'Редактирование деталей подключим отдельно'
  })

  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    if (event.key !== 'Tab') return
    event.stopPropagation()
    const elements = focusableElements()
    if (!elements.length) return
    const first = elements[0]
    const last = elements.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  })

  document.addEventListener(detailsEventName, event => open(event.detail?.section, event.detail?.relatedSections))

  window.ServiceDetailsDrawer = Object.freeze({ open, close })
})()
