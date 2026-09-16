(() => {
  const SERVICES_PARAM = 'tripServices'
  const STATE_KEY_PARAM = 'tripStateKey'
  const STORAGE_PREFIX = 'business-trip-services'
  const NativeURLSearchParams = window.URLSearchParams
  const virtualServices = new WeakMap()

  function versionFor(url = window.location.href) {
    try {
      return new URL(url, window.location.href).pathname.includes('/v2/') ? 'v2' : 'v1'
    } catch {
      return window.location.pathname.includes('/v2/') ? 'v2' : 'v1'
    }
  }

  function createStateKey() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID()
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }

  function storageKey(version, stateKey) {
    return `${STORAGE_PREFIX}:${version}:${stateKey}`
  }

  function readStored(version, stateKey) {
    if (!stateKey) return ''
    const key = storageKey(version, stateKey)
    try {
      return window.sessionStorage.getItem(key) || window.localStorage.getItem(key) || ''
    } catch {
      return ''
    }
  }

  function writeStored(version, stateKey, value) {
    if (!stateKey || !value) return false
    const key = storageKey(version, stateKey)
    let stored = false
    try {
      window.sessionStorage.setItem(key, value)
      stored = true
    } catch {
      // localStorage remains a fallback when session storage is unavailable.
    }
    try {
      window.localStorage.setItem(key, value)
      stored = true
    } catch {
      // The current page still works even if browser storage is unavailable.
    }
    return stored
  }

  function ensureStateKey(params) {
    let stateKey = NativeURLSearchParams.prototype.get.call(params, STATE_KEY_PARAM)
      || NativeURLSearchParams.prototype.get.call(params, 'tripId')
      || NativeURLSearchParams.prototype.get.call(params, 'draftId')
    if (!stateKey) stateKey = createStateKey()
    NativeURLSearchParams.prototype.set.call(params, STATE_KEY_PARAM, stateKey)
    return stateKey
  }

  function storeOnParams(params, value, version = versionFor()) {
    const stateKey = ensureStateKey(params)
    writeStored(version, stateKey, String(value || ''))
    return stateKey
  }

  class CompactURLSearchParams extends NativeURLSearchParams {
    constructor(init) {
      super(init)
      const inlineValue = NativeURLSearchParams.prototype.get.call(this, SERVICES_PARAM)
      if (inlineValue) {
        virtualServices.set(this, inlineValue)
        storeOnParams(this, inlineValue)
        NativeURLSearchParams.prototype.delete.call(this, SERVICES_PARAM)
        return
      }
      const stateKey = NativeURLSearchParams.prototype.get.call(this, STATE_KEY_PARAM)
      const storedValue = readStored(versionFor(), stateKey)
      if (storedValue) virtualServices.set(this, storedValue)
    }

    get(name) {
      if (name === SERVICES_PARAM) return virtualServices.get(this) || null
      return super.get(name)
    }

    getAll(name) {
      if (name === SERVICES_PARAM) {
        const value = virtualServices.get(this)
        return value ? [value] : []
      }
      return super.getAll(name)
    }

    has(name, value) {
      if (name === SERVICES_PARAM) {
        const current = virtualServices.get(this)
        if (arguments.length > 1) return current === String(value)
        return Boolean(current)
      }
      return arguments.length > 1 ? super.has(name, value) : super.has(name)
    }

    set(name, value) {
      if (name === SERVICES_PARAM) {
        const normalized = String(value || '')
        if (!normalized) return this.delete(name)
        virtualServices.set(this, normalized)
        storeOnParams(this, normalized)
        super.delete(SERVICES_PARAM)
        return this
      }
      return super.set(name, value)
    }

    append(name, value) {
      if (name === SERVICES_PARAM) return this.set(name, value)
      return super.append(name, value)
    }

    delete(name, value) {
      if (name === SERVICES_PARAM) {
        virtualServices.delete(this)
        super.delete(SERVICES_PARAM)
        super.delete(STATE_KEY_PARAM)
        return
      }
      if (arguments.length > 1) return super.delete(name, value)
      return super.delete(name)
    }
  }

  function compactUrl(input) {
    const target = input instanceof URL ? input : new URL(String(input), window.location.href)
    const inlineValue = target.searchParams.get(SERVICES_PARAM)
    if (!inlineValue) return target
    const stateKey = target.searchParams.get(STATE_KEY_PARAM)
      || target.searchParams.get('tripId')
      || target.searchParams.get('draftId')
      || createStateKey()
    if (writeStored(versionFor(target.href), stateKey, inlineValue)) {
      target.searchParams.set(STATE_KEY_PARAM, stateKey)
      target.searchParams.delete(SERVICES_PARAM)
    }
    return target
  }

  function migrateStoredUrls() {
    const keys = [
      'business-trip-drafts-v1', 'business-trip-paid-v1', 'business-trip-cancelled-v1',
      'business-trip-drafts-v2', 'business-trip-paid-v2', 'business-trip-cancelled-v2',
    ]
    keys.forEach(key => {
      try {
        const records = JSON.parse(window.localStorage.getItem(key) || '[]')
        if (!Array.isArray(records)) return
        let changed = false
        records.forEach(record => {
          if (!record || typeof record !== 'object') return
          if (typeof record.search === 'string' && record.search.includes(SERVICES_PARAM)) {
            const url = compactUrl(new URL(`./trip.html?${record.search}`, window.location.href))
            record.search = url.searchParams.toString()
            changed = true
          }
          ;['href', 'successTarget'].forEach(field => {
            if (typeof record[field] !== 'string' || !record[field].includes(SERVICES_PARAM)) return
            record[field] = compactUrl(new URL(record[field], window.location.href)).href
            changed = true
          })
        })
        if (changed) window.localStorage.setItem(key, JSON.stringify(records))
      } catch {
        // Ignore malformed legacy prototype data.
      }
    })
  }

  const currentUrl = new URL(window.location.href)
  if (currentUrl.searchParams.has(SERVICES_PARAM)) {
    compactUrl(currentUrl)
    window.history.replaceState(window.history.state, '', currentUrl.href)
  }

  window.URLSearchParams = CompactURLSearchParams
  window.TripStateTransport = Object.freeze({ compactUrl })
  migrateStoredUrls()
})()
