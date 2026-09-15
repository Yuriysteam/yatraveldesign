(() => {
  const header = document.querySelector('[data-travel-header]')
  if (!header) return

  const currentParams = new URLSearchParams(window.location.search)
  const isTripV2Embed = currentParams.get('embed') === 'trip-v2' && window.parent !== window
  const parentTargetOrigin = window.location.protocol === 'file:' ? '*' : window.location.origin

  function returnToTrip(target, metadata = {}) {
    if (!isTripV2Embed) return false
    const tripTarget = target instanceof URL ? new URL(target.href) : new URL(String(target), window.location.href)
    tripTarget.searchParams.delete('embed')
    const message = {
      type: 'trip-v2:return',
      href: tripTarget.href,
      search: tripTarget.search,
    }
    if (metadata?.result === 'service-added') message.result = 'service-added'
    if (['hotel', 'avia', 'rail'].includes(metadata?.kind)) message.kind = metadata.kind
    if (Array.isArray(metadata?.segments)) {
      message.segments = metadata.segments.filter(segment => ['outbound', 'lodging', 'return'].includes(segment))
    }
    window.parent.postMessage(message, parentTargetOrigin)
    return true
  }

  window.TripV2Bridge = Object.freeze({
    embedded: isTripV2Embed,
    returnToTrip,
  })

  if (isTripV2Embed) {
    document.documentElement.classList.add('trip-shell-embed')
    const embedStyles = document.createElement('link')
    embedStyles.rel = 'stylesheet'
    embedStyles.href = './trip-shell-embed.css?v=2'
    embedStyles.dataset.tripV2EmbedStyles = ''
    document.head.append(embedStyles)
  }

  const active = ['hotel', 'avia', 'rail'].includes(header.dataset.active)
    ? header.dataset.active
    : 'hotel'

  const tab = (id, label, route) => {
    const isActive = id === active
    return `<a class="shared-product-tab${isActive ? ' is-active' : ''}" data-route="${route}"${isActive ? ' aria-current="page"' : ''}>${label}</a>`
  }

  header.innerHTML = `
    <div class="shared-search-header__inner">
      <div class="search-header__left">
        <a class="travel-brand" data-route="./index.html" aria-label="Яндекс Путешествия, на главную">
          <img class="travel-brand__yandex" src="./assets/shared-header/figma-header-yandex.svg" alt="">
          <span class="travel-brand__planet-slot" aria-hidden="true"><img class="travel-brand__planet" src="./assets/shared-header/figma-header-planet.svg" alt=""></span>
          <img class="travel-brand__wordmark" src="./assets/shared-header/figma-header-wordmark.svg" alt="Путешествия">
        </a>
        <nav class="product-tabs" aria-label="Разделы Путешествий">
          ${tab('hotel', 'Отели', './hotel-search.html')}
          ${tab('avia', 'Авиабилеты', './avia-search.html')}
          ${tab('rail', 'Ж/д билеты', './train-search.html')}
          <button class="shared-product-tab shared-product-tab--optional" type="button" data-service="bus">Автобусы</button>
          <button class="shared-product-tab shared-product-tab--optional" type="button" data-service="tour">Туры</button>
        </nav>
      </div>

      <div class="search-header__right">
        <nav class="utility-actions" aria-label="Сервисы">
          <button class="utility-button" type="button" aria-label="Скидки"><img src="./assets/shared-header/figma-header-discount.svg" alt=""></button>
          <button class="utility-button" type="button" aria-label="Сообщения"><img src="./assets/shared-header/figma-header-message.svg" alt=""></button>
          <button class="utility-button" type="button" aria-label="Избранное"><img src="./assets/shared-header/figma-header-heart.svg" alt=""></button>
          <button class="utility-button" type="button" aria-label="Заказы"><img src="./assets/shared-header/figma-header-orders.svg" alt=""></button>
          <a class="utility-button" data-route="./trip.html" aria-label="Командировки"><img src="./assets/shared-header/figma-header-briefcase.svg" alt=""></a>
        </nav>
        <button class="level-pill" type="button" aria-label="Профиль, 1-й уровень, 5% кешбэк">
          <span class="level-pill__copy"><strong>1-й уровень</strong><small><img src="./assets/shared-header/figma-header-cashback.svg" alt="">5% кешбэк</small></span>
          <img class="level-pill__avatar" src="./assets/shared-header/figma-header-avatar.png" alt="">
        </button>
      </div>
    </div>`

  header.querySelectorAll('[data-route]').forEach(link => {
    const target = new URL(link.dataset.route, window.location.href)
    currentParams.forEach((value, key) => target.searchParams.set(key, value))
    link.href = target.href
    if (isTripV2Embed && target.pathname.endsWith('/trip.html')) {
      link.addEventListener('click', event => {
        event.preventDefault()
        returnToTrip(target)
      })
    }
  })
})()
