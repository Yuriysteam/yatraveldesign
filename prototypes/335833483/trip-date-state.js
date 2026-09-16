(() => {
  const DAY = 24 * 60 * 60 * 1000
  const PAST_MONTH_ROLLOVER_DAYS = 183
  const monthIndexes = Object.freeze({
    янв: 0,
    фев: 1,
    мар: 2,
    апр: 3,
    май: 4,
    мая: 4,
    июн: 5,
    июл: 6,
    авг: 7,
    сен: 8,
    окт: 9,
    ноя: 10,
    дек: 11,
  })

  function atDayStart(value = new Date()) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }

  function validDateParts(day, month, year = null) {
    const numericDay = Number(day)
    const numericMonth = Number(month)
    const numericYear = year == null ? null : Number(year) < 100 ? 2000 + Number(year) : Number(year)
    if (!Number.isInteger(numericDay) || numericDay < 1 || numericDay > 31) return null
    if (!Number.isInteger(numericMonth) || numericMonth < 0 || numericMonth > 11) return null
    if (numericYear != null && (!Number.isInteger(numericYear) || numericYear < 2000 || numericYear > 2100)) return null
    return { day: numericDay, month: numericMonth, year: numericYear }
  }

  function monthIndex(value) {
    const token = String(value || '').toLocaleLowerCase('ru-RU').replace(/[^а-яё]/gu, '').slice(0, 3)
    return monthIndexes[token] ?? monthIndexes[String(value || '').toLocaleLowerCase('ru-RU').replace(/[^а-яё]/gu, '')] ?? null
  }

  function parseDateValue(value) {
    const text = String(value || '').trim()
    if (!text) return null

    const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/u)
    if (iso) return validDateParts(iso[3], Number(iso[2]) - 1, iso[1])

    const numeric = text.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/u)
    if (numeric) return validDateParts(numeric[1], Number(numeric[2]) - 1, numeric[3] || null)

    const words = text.match(/\b(\d{1,2})\s+([а-яё]{3,10})\.?\s*(20\d{2})?/iu)
    if (!words) return null
    const month = monthIndex(words[2])
    return month == null ? null : validDateParts(words[1], month, words[3] || null)
  }

  function parseDateRange(value) {
    const text = String(value || '').trim()
    if (!text) return { start: null, end: null }

    const sameMonth = text.match(/\b(\d{1,2})\s*[–—-]\s*(\d{1,2})\s+([а-яё]{3,10})\.?\s*(20\d{2})?/iu)
    if (sameMonth) {
      const month = monthIndex(sameMonth[3])
      if (month != null) {
        return {
          start: validDateParts(sameMonth[1], month, sameMonth[4] || null),
          end: validDateParts(sameMonth[2], month, sameMonth[4] || null),
        }
      }
    }

    const wordDates = [...text.matchAll(/\b(\d{1,2})\s+([а-яё]{3,10})\.?\s*(20\d{2})?/giu)]
      .map(match => {
        const month = monthIndex(match[2])
        return month == null ? null : validDateParts(match[1], month, match[3] || null)
      })
      .filter(Boolean)
    if (wordDates.length) return { start: wordDates[0], end: wordDates[1] || wordDates[0] }

    const one = parseDateValue(text)
    return { start: one, end: one }
  }

  function searchParams(trip) {
    try {
      return new URL(trip?.href || '', window.location.href).searchParams
    } catch {
      return new URLSearchParams()
    }
  }

  function firstValue(...values) {
    return values.find(value => String(value || '').trim()) || ''
  }

  function dateRange(trip, today = atDayStart()) {
    const search = searchParams(trip)
    const startRaw = firstValue(
      trip?.startDate,
      trip?.departDate,
      trip?.depart,
      search.get('depart'),
      search.get('checkin'),
      search.get('railOutboundDate'),
      search.get('flightOutboundDate'),
      search.get('railDate'),
    )
    const endRaw = firstValue(
      trip?.endDate,
      trip?.returnDate,
      trip?.return,
      search.get('return'),
      search.get('checkout'),
      search.get('railReturnDate'),
      search.get('flightReturnDate'),
    )
    const displayedRange = parseDateRange(trip?.dates)
    const startParts = parseDateValue(startRaw) || displayedRange.start
    const endParts = parseDateValue(endRaw) || displayedRange.end || startParts
    if (!startParts && !endParts) return null

    const resolvedStartParts = startParts || endParts
    let startYear = resolvedStartParts.year ?? today.getFullYear()
    let start = new Date(startYear, resolvedStartParts.month, resolvedStartParts.day)
    if (resolvedStartParts.year == null && start < today && (today - start) / DAY > PAST_MONTH_ROLLOVER_DAYS) {
      startYear += 1
      start = new Date(startYear, resolvedStartParts.month, resolvedStartParts.day)
    }

    const resolvedEndParts = endParts || resolvedStartParts
    let endYear = resolvedEndParts.year ?? startYear
    let end = new Date(endYear, resolvedEndParts.month, resolvedEndParts.day)
    if (resolvedEndParts.year == null && end < start) {
      endYear += 1
      end = new Date(endYear, resolvedEndParts.month, resolvedEndParts.day)
    }
    if (end < start) return null
    return { start, end }
  }

  function normalizeTrip(trip, now = new Date()) {
    if (!trip || typeof trip !== 'object') return trip
    if (trip.state === 'cancelled') return { ...trip }
    const today = atDayStart(now)
    const range = dateRange(trip, today)
    if (!range) return { ...trip }

    const state = today < range.start ? 'upcoming' : today > range.end ? 'past' : 'active'
    let status = trip.status
    if (state === 'past' && ['Подтверждено', 'В поездке'].includes(status)) status = 'Завершена'
    if (state === 'active' && status === 'Подтверждено') status = 'В поездке'
    return { ...trip, state, status, __startTime: range.start.getTime(), __endTime: range.end.getTime() }
  }

  function sortTrips(trips, state) {
    const direction = state === 'past' ? -1 : 1
    const field = state === 'upcoming' ? '__startTime' : '__endTime'
    return [...trips].sort((left, right) => {
      const leftTime = Number(left?.[field])
      const rightTime = Number(right?.[field])
      if (!Number.isFinite(leftTime) && !Number.isFinite(rightTime)) return 0
      if (!Number.isFinite(leftTime)) return 1
      if (!Number.isFinite(rightTime)) return -1
      return (leftTime - rightTime) * direction
    })
  }

  window.TripDateState = Object.freeze({ dateRange, normalizeTrip, sortTrips })
})()
