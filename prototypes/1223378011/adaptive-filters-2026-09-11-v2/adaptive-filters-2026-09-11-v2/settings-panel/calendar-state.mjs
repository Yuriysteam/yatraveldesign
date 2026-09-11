import { MAX_STAY_NIGHTS } from '../trip-limits.mjs';

// Calendar days are local dates; never serialize them through UTC/toISOString.
export function calendarDate(iso) {
  if (!iso) return undefined;
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function calendarISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function nextCalendarDay(iso) {
  const date = calendarDate(iso);
  date.setDate(date.getDate() + 1);
  return date;
}

export function lastCheckoutDate(iso) {
  const date = calendarDate(iso);
  date.setDate(date.getDate() + MAX_STAY_NIGHTS);
  return date;
}

// Count calendar nights, not elapsed local hours (a DST night can be 23/25h).
export function calendarNights(checkIn, checkOut) {
  return (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000;
}

export function pickCalendarDate(draft, target, date) {
  const iso = calendarISO(date);
  if (target === 'checkIn') {
    return { draft: { checkIn: iso, checkOut: undefined }, target: 'checkOut', complete: false };
  }
  const nights = calendarNights(draft.checkIn, iso);
  if (!draft.checkIn || !Number.isFinite(nights) || nights < 1 || nights > MAX_STAY_NIGHTS) return null;
  return { draft: { checkIn: draft.checkIn, checkOut: iso }, target: 'checkOut', complete: true };
}
