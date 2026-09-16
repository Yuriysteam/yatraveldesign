(() => {
  const page = document.querySelector('.train-success-page')
  if (!page) return

  const params = new URLSearchParams(window.location.search)

  function query(...names) {
    for (const name of names) {
      const value = params.get(name)?.trim()
      if (value) return value
    }
    return ''
  }

  function setText(selector, value) {
    const element = document.querySelector(selector)
    if (element) element.textContent = value
  }

  function money(value) {
    const amount = Number(value) || 0
    return `${new Intl.NumberFormat('ru-RU', { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(amount)} ₽`
  }

  function wordForm(value, forms) {
    const mod100 = value % 100
    const mod10 = value % 10
    if (mod100 >= 11 && mod100 <= 19) return forms[2]
    if (mod10 === 1) return forms[0]
    if (mod10 >= 2 && mod10 <= 4) return forms[1]
    return forms[2]
  }

  function passengerLabel() {
    const explicit = query('traveller')
    if (explicit) return explicit
    const adults = Math.max(1, Number(query('adults')) || 1)
    const children = Math.max(0, Number(query('children')) || 0)
    const adultsPart = `${adults} ${wordForm(adults, ['взрослый', 'взрослых', 'взрослых'])}`
    return children ? `${adultsPart}, ${children} ${wordForm(children, ['ребёнок', 'ребёнка', 'детей'])}` : adultsPart
  }

  function fillLeg(segment, fallback) {
    const prefix = segment === 'return' ? 'railReturn' : 'railOutbound'
    const from = query(`${prefix}From`) || fallback.from
    const to = query(`${prefix}To`) || fallback.to
    setText(`#train-success-${segment}-date`, query(`${prefix}Date`) || fallback.date)
    setText(`#train-success-${segment}-time`, query(`${prefix}DepartTime`) || '00:00')
    setText(`#train-success-${segment}-arrival`, query(`${prefix}ArrivalTime`) || '00:00')
    setText(`#train-success-${segment}-from`, from)
    setText(`#train-success-${segment}-to`, to)
    setText(`#train-success-${segment}-duration`, query(`${prefix}Duration`) || 'В пути')
    setText(`#train-success-${segment}-train`, `Поезд ${query(`${prefix}TrainNumber`) || '—'}${query(`${prefix}Carrier`) ? ` · ${query(`${prefix}Carrier`)}` : ''}`)
  }

  const from = query('from', 'railOutboundFrom') || 'Москва'
  const to = query('to', 'railOutboundTo') || 'Санкт-Петербург'
  const depart = query('depart', 'railOutboundDate') || '16 сентября'
  const returning = query('return', 'railReturnDate') || '18 сентября'
  const roundtrip = query('railScope') === 'roundtrip' || Boolean(query('railReturnTrainId', 'railReturnTrainNumber'))
  const total = Number(query('railOutboundTotal')) + Number(query('railReturnTotal')) || Number(query('totalPrice', 'railPrice'))
  const tripMode = query('successMode') === 'trip'

  setText('#train-success-route', `${from} — ${to}`)
  fillLeg('outbound', { from, to, date: depart })
  if (roundtrip) fillLeg('return', { from: to, to: from, date: returning })

  const returnSection = document.querySelector('#train-success-return')
  if (returnSection) returnSection.hidden = !roundtrip
  const legs = document.querySelector('#train-success-legs')
  if (legs) legs.dataset.scope = roundtrip ? 'roundtrip' : 'oneway'

  setText('#train-success-passengers', passengerLabel())
  setText('#train-success-scope', roundtrip ? 'Туда и обратно' : 'В одну сторону')
  setText('#train-success-total', money(total))
  setText('#train-success-copy', tripMode ? 'Билеты готовы. Осталось открыть командировку.' : 'Все детали сохранены в разделе «Мои поездки».')

  const workBadge = document.querySelector('#train-success-work')
  if (workBadge) workBadge.hidden = params.get('workTrip') !== '1'

  const primary = document.querySelector('#train-success-primary')
  if (primary) {
    const fallback = new URL(tripMode ? './trip.html' : './trips.html#personal', window.location.href)
    try {
      const requested = new URL(query('successTarget') || fallback.href, window.location.href)
      primary.href = requested.origin === window.location.origin ? requested.href : fallback.href
    } catch {
      primary.href = fallback.href
    }
    primary.textContent = tripMode ? 'Открыть командировку' : 'Мои поездки'
  }

  const home = document.querySelector('#train-success-home')
  if (home) home.href = new URL('./index.html', window.location.href).href

  page.dataset.ready = 'true'
})()
