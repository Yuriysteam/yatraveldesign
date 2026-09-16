(() => {
  const version = window.location.pathname.match(/\/(v[123])\//u)?.[1] || 'v1'
  const read = key => {
    try {
      const value = JSON.parse(window.localStorage.getItem(`${key}-${version}`) || '[]')
      return Array.isArray(value) ? value : []
    } catch {
      return []
    }
  }
  const trips = () => {
    const cancelled = new Set(read('business-trip-cancelled').map(item => item?.id).filter(Boolean))
    const result = [...read('business-trip-drafts'), ...read('business-trip-paid')]
      .filter(item => item?.id && !cancelled.has(item.id))
    return [...new Map(result.map(item => [item.id, item])).values()]
  }
  const label = trip => {
    const route = trip.route || [trip.from, trip.to].filter(Boolean).join(' — ') || 'Командировка'
    const dates = trip.dates || [trip.depart, trip.return].filter(Boolean).join(' — ')
    return `${route}${dates ? ` · ${dates}` : ''}`
  }
  const targetParams = trip => {
    if (typeof trip.search === 'string' && trip.search) return new URLSearchParams(trip.search.replace(/^\?/u, ''))
    try { return new URL(trip.href || '', window.location.href).searchParams } catch { return new URLSearchParams() }
  }
  const navigateToTrip = trip => {
    const url = new URL(window.location.href)
    const source = targetParams(trip)
    url.searchParams.set('workTrip', '1')
    url.searchParams.set('addToTrip', '1')
    url.searchParams.set('tripKind', 'existing')
    url.searchParams.set('tripId', trip.id)
    ;['from', 'to', 'depart', 'return'].forEach(name => {
      const value = source.get(name) || trip[name]
      if (value) url.searchParams.set(name, value)
    })
    window.location.href = url.href
  }
  const render = () => {
    const available = trips()
    const params = new URLSearchParams(window.location.search)
    const isExistingV2TripFlow = version === 'v2'
      && params.get('workTrip') === '1'
      && params.get('addToTrip') === '1'
      && params.get('tripKind') === 'existing'
      && Boolean(params.get('tripId')?.trim() || params.get('draftId')?.trim())
    document.querySelectorAll('#business-trip-select').forEach(select => {
      const current = params.get('tripId') || ''
      const placeholder = document.createElement('option')
      placeholder.value = ''
      placeholder.textContent = 'Выберите командировку'
      placeholder.disabled = true
      select.replaceChildren(placeholder, ...available.map(trip => {
        const option = document.createElement('option')
        option.value = trip.id
        option.textContent = label(trip)
        option.selected = trip.id === current
        return option
      }))
      select.value = available.some(trip => trip.id === current) ? current : ''
    })
    const kind = params.get('tripKind')
    document.querySelectorAll('#business-trip-existing').forEach(node => { node.hidden = kind !== 'existing' || !available.length })
    document.querySelectorAll('#business-trip-empty').forEach(node => { node.hidden = kind !== 'existing' || Boolean(available.length) })
    document.querySelectorAll('.rail-business-trip-target').forEach(node => {
      node.hidden = isExistingV2TripFlow || params.get('workTrip') !== '1'
    })
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-trip-kind="existing"]')
    if (!button) return
    const available = trips()
    document.querySelectorAll('#business-trip-existing').forEach(node => { node.hidden = !available.length })
    document.querySelectorAll('#business-trip-empty').forEach(node => { node.hidden = Boolean(available.length) })
  }, true)
  document.addEventListener('change', event => {
    if (event.target.id !== 'business-trip-select') return
    const trip = trips().find(item => item.id === event.target.value)
    if (trip) navigateToTrip(trip)
  })
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render)
  else render()
})()
