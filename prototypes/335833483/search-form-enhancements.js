(() => {
  'use strict'

  const versionMatch = window.location.pathname.match(/\/v(\d+)\//)
  const version = Number(versionMatch?.[1] || 1)
  const initialQuery = new URLSearchParams(window.location.search)
  const inTrip = initialQuery.get('workTrip') === '1' || initialQuery.get('addToTrip') === '1' || initialQuery.get('draft') === '1'
  const form = document.querySelector('#hotel-search-form, #avia-search-form, #train-search-form')
  if (!form) return

  const page = document.querySelector('.hotel-search-page')
    ? 'hotel'
    : document.querySelector('.avia-search-page')
      ? 'avia'
      : 'train'

  const cityCatalog = [
    { city: 'Москва', hotel: 'Россия', train: 'Ленинградский, Казанский, Курский вокзалы' },
    { city: 'Санкт-Петербург', hotel: 'Россия', train: 'Московский вокзал' },
    { city: 'Казань', hotel: 'Россия', train: 'Казань-Пассажирская' },
    { city: 'Сочи', hotel: 'Россия', train: 'Сочи' },
    { city: 'Екатеринбург', hotel: 'Россия', train: 'Екатеринбург-Пассажирский' },
    { city: 'Уфа', hotel: 'Россия', train: 'Уфа' },
    { city: 'Тюмень', hotel: 'Россия', train: 'Тюмень' },
    { city: 'Нижний Новгород', hotel: 'Россия', train: 'Нижний Новгород-Московский' },
    { city: 'Новосибирск', hotel: 'Россия', train: 'Новосибирск-Главный' }
  ]

  const escapeHtml = value => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  function setGlobalQueryValue(key, value) {
    try {
      if (typeof params !== 'undefined' && params instanceof URLSearchParams) params.set(key, value)
    } catch (_) {}
  }

  function replaceQuery(entries) {
    const query = new URLSearchParams(window.location.search)
    Object.entries(entries).forEach(([key, value]) => {
      query.set(key, String(value))
      setGlobalQueryValue(key, String(value))
    })
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${query.toString()}${window.location.hash}`)
    document.querySelectorAll('a[href]').forEach(anchor => {
      const target = new URL(anchor.href, window.location.href)
      if (target.origin !== window.location.origin || !target.pathname.includes(`/v${version}/`)) return
      Object.entries(entries).forEach(([key, value]) => target.searchParams.set(key, String(value)))
      anchor.href = target.href
    })
  }

  function positionPopover(popover, anchor, minimumWidth) {
    const bounds = anchor.getBoundingClientRect()
    const width = Math.min(Math.max(minimumWidth, Math.round(bounds.width)), window.innerWidth - 24)
    const left = Math.max(12, Math.min(Math.round(bounds.left), window.innerWidth - width - 12))
    popover.style.left = `${left}px`
    popover.style.top = `${Math.round(bounds.bottom + 8)}px`
    popover.style.width = `${width}px`
  }

  function setupCitySuggestions() {
    const fields = page === 'hotel'
      ? [document.querySelector('#hotel-city')]
      : page === 'train'
        ? [document.querySelector('#train-origin'), document.querySelector('#train-destination')]
        : []
    const inputs = fields.filter(Boolean)
    if (!inputs.length) return

    const popover = document.createElement('div')
    popover.className = 'search-city-popover'
    popover.id = `search-city-popover-${page}-v${version}`
    popover.setAttribute('role', 'listbox')
    popover.hidden = true
    document.body.append(popover)
    let activeInput = null

    const close = () => {
      if (activeInput) activeInput.setAttribute('aria-expanded', 'false')
      activeInput = null
      popover.hidden = true
    }

    const open = (input, query = '') => {
      activeInput = input
      inputs.forEach(field => field.setAttribute('aria-expanded', String(field === input)))
      const normalized = String(query).trim().toLocaleLowerCase('ru')
      const choices = cityCatalog.filter(item => !normalized || item.city.toLocaleLowerCase('ru').includes(normalized))
      popover.innerHTML = choices.length
        ? choices.map(item => `
          <button class="search-city-option" type="button" role="option" data-city="${escapeHtml(item.city)}">
            <span><strong>${escapeHtml(item.city)}</strong><small>${escapeHtml(item[page])}</small></span>
            <b>${page === 'hotel' ? 'Город' : 'Ж/д'}</b>
          </button>`).join('')
        : '<span class="search-city-empty">Город не найден</span>'
      positionPopover(popover, input, 300)
      popover.hidden = false
    }

    inputs.forEach(input => {
      input.setAttribute('aria-autocomplete', 'list')
      input.setAttribute('aria-haspopup', 'listbox')
      input.setAttribute('aria-controls', popover.id)
      input.setAttribute('aria-expanded', 'false')
      input.addEventListener('focus', () => open(input))
      input.addEventListener('click', () => open(input))
      input.addEventListener('input', () => open(input, input.value))
    })

    popover.addEventListener('click', event => {
      const choice = event.target.closest('[data-city]')
      if (!choice || !activeInput) return
      event.preventDefault()
      const city = choice.dataset.city
      activeInput.value = city
      activeInput.dispatchEvent(new Event('input', { bubbles: true }))
      activeInput.dispatchEvent(new Event('change', { bubbles: true }))
      close()
      form.requestSubmit()
    })

    document.addEventListener('click', event => {
      if (popover.hidden || popover.contains(event.target) || inputs.includes(event.target)) return
      close()
    })
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close() })
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
  }

  function numberFromTraveller(value, kind) {
    const source = String(value || '')
    const pattern = kind === 'adults' ? /(\d+)\s*взрос/iu : /(\d+)\s*(?:реб|дет)/iu
    return Number(source.match(pattern)?.[1] || 0)
  }

  function adultWord(count) {
    return count % 10 === 1 && count % 100 !== 11 ? 'взрослый' : 'взрослых'
  }

  function childWord(count) {
    if (count % 10 === 1 && count % 100 !== 11) return 'ребёнок'
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'ребёнка'
    return 'детей'
  }

  function travellerLabel(adults, children) {
    return `${adults} ${adultWord(adults)}${children ? `, ${children} ${childWord(children)}` : ''}`
  }

  function setupParticipants() {
    const nativeControl = document.querySelector('#hotel-traveller, #avia-passengers, #train-passengers')
    if (!nativeControl || nativeControl.dataset.enhanced === 'true') return

    const initialLabel = initialQuery.get('traveller') || nativeControl.value
    const declaredAdults = Math.max(1, Number(initialQuery.get('tripAdults') || initialQuery.get('adults')) || numberFromTraveller(initialLabel, 'adults') || 1)
    const declaredChildren = Math.max(0, Number(initialQuery.get('tripChildren') || initialQuery.get('children')) || numberFromTraveller(initialLabel, 'children'))
    let adults = Math.max(1, Number(initialQuery.get('adults')) || numberFromTraveller(initialLabel, 'adults') || 1)
    const children = Math.max(0, Number(initialQuery.get('children')) || numberFromTraveller(initialLabel, 'children'))
    const maxAdults = inTrip && version < 3 ? declaredAdults : 20

    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.className = 'search-participants-trigger'
    trigger.setAttribute('aria-haspopup', 'dialog')
    trigger.setAttribute('aria-expanded', 'false')

    nativeControl.dataset.enhanced = 'true'
    nativeControl.classList.add('search-participants-native')
    nativeControl.before(trigger)

    const popover = document.createElement('div')
    popover.className = 'search-participants-popover'
    popover.id = `search-participants-popover-${page}-v${version}`
    popover.setAttribute('role', 'dialog')
    popover.setAttribute('aria-label', 'Количество пассажиров')
    popover.hidden = true
    document.body.append(popover)
    trigger.setAttribute('aria-controls', popover.id)

    const api = window.HotelSearchPrototype || window.AviaSearchPrototype || window.TrainSearchPrototype

    function sync() {
      const label = travellerLabel(adults, children)
      if (nativeControl.tagName === 'SELECT' && ![...nativeControl.options].some(option => option.value === label)) {
        nativeControl.add(new Option(label, label))
      }
      nativeControl.value = label
      trigger.textContent = label
      if (api?.state) api.state.traveller = label

      const entries = { adults, children, traveller: label }
      if (inTrip && version < 3) {
        entries.tripAdults = declaredAdults
        entries.tripChildren = declaredChildren
        entries.tripTraveller = travellerLabel(declaredAdults, declaredChildren)
      }
      if (inTrip && version >= 3) {
        entries.tripAdults = adults
        entries.tripChildren = children
        entries.tripTraveller = label
      }
      replaceQuery(entries)
      return label
    }

    function render() {
      const note = inTrip && version < 3
        ? `В командировке заявлено: ${declaredAdults}. Можно выбрать не больше.`
        : inTrip && version >= 3
          ? 'Изменение обновит состав командировки.'
          : 'Можно выбрать до 20 взрослых.'
      popover.innerHTML = `
        <div class="search-participants-row">
          <span class="search-participants-copy"><strong>Взрослые</strong><small>От 18 лет</small></span>
          <span class="search-participants-stepper">
            <button type="button" data-participant-action="minus" aria-label="Уменьшить количество взрослых" ${adults <= 1 ? 'disabled' : ''}>−</button>
            <span class="search-participants-count" aria-live="polite">${adults}</span>
            <button type="button" data-participant-action="plus" aria-label="Увеличить количество взрослых" ${adults >= maxAdults ? 'disabled' : ''}>+</button>
          </span>
        </div>
        <p class="search-participants-note">${escapeHtml(note)}</p>
        <button class="search-participants-done" type="button" data-participant-action="done">Готово</button>`
    }

    function close() {
      popover.hidden = true
      trigger.setAttribute('aria-expanded', 'false')
    }

    function open() {
      render()
      positionPopover(popover, trigger, 320)
      popover.hidden = false
      trigger.setAttribute('aria-expanded', 'true')
    }

    trigger.addEventListener('click', event => {
      event.preventDefault()
      if (popover.hidden) open(); else close()
    })

    popover.addEventListener('click', event => {
      event.stopPropagation()
      const action = event.target.closest('[data-participant-action]')?.dataset.participantAction
      if (!action) return
      if (action === 'minus' && adults > 1) adults -= 1
      if (action === 'plus' && adults < maxAdults) adults += 1
      if (action === 'done') {
        close()
        form.requestSubmit()
        return
      }
      sync()
      render()
    })

    document.addEventListener('click', event => {
      if (popover.hidden || popover.contains(event.target) || event.target === trigger) return
      close()
    })
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close() })
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)

    sync()
  }

  setupCitySuggestions()
  setupParticipants()
})()
