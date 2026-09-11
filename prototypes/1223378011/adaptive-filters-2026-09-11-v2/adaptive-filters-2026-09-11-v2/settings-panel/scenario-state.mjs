import { MAX_STAY_NIGHTS } from '../trip-limits.mjs';
import { calendarNights } from './calendar-state.mjs';

export const SCENARIO_VERSION = 1;

export const GEO_OPTIONS = Object.freeze([
  Object.freeze({ id: 'sea', label: 'У моря', signals: Object.freeze(['sea']) }),
  Object.freeze({ id: 'forest', label: 'У леса', signals: Object.freeze(['forest', 'nature', 'countryside']) }),
  Object.freeze({ id: 'city', label: 'Город', signals: Object.freeze(['city']) }),
  Object.freeze({ id: 'mountains', label: 'У гор', signals: Object.freeze(['mountains']) }),
]);

export const HOUSING_OPTIONS = Object.freeze([
  Object.freeze({ id: 'all', label: 'Любое' }),
  Object.freeze({ id: 'hotel', label: 'Отель' }),
  Object.freeze({ id: 'apartment', label: 'Апартаменты' }),
  Object.freeze({ id: 'countryHouse', label: 'Загородное жильё' }),
]);

export const DEFAULT_SCENARIO = Object.freeze({
  version: SCENARIO_VERSION,
  adults: 2,
  children: 0,
  geo: GEO_OPTIONS[0],
  dates: Object.freeze({ checkIn: '2027-07-10', checkOut: '2027-07-24' }),
  housing: 'all',
});

function integerInRange(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function validISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function normalizeGeo(value, fallback) {
  const id = typeof value === 'string' ? value : value?.id;
  const known = GEO_OPTIONS.find(option => option.id === id);
  if (known) return { id: known.id, label: known.label, signals: [...known.signals] };

  return { id: fallback.id, label: fallback.label, signals: [...fallback.signals] };
}

export function cloneScenario(value = DEFAULT_SCENARIO) {
  return {
    version: SCENARIO_VERSION,
    adults: value.adults,
    children: value.children,
    geo: { id: value.geo.id, label: value.geo.label, signals: [...value.geo.signals] },
    dates: { checkIn: value.dates.checkIn, checkOut: value.dates.checkOut },
    housing: value.housing,
  };
}

export function normalizeScenario(candidate, fallbackCandidate = DEFAULT_SCENARIO) {
  const fallback = fallbackCandidate === DEFAULT_SCENARIO
    ? cloneScenario(DEFAULT_SCENARIO)
    : normalizeScenario(fallbackCandidate, DEFAULT_SCENARIO);
  const value = candidate && typeof candidate === 'object' ? candidate : {};
  const fallbackGeo = fallback.geo;
  let checkIn = validISODate(value.dates?.checkIn) ? value.dates.checkIn : fallback.dates.checkIn;
  let checkOut = validISODate(value.dates?.checkOut) ? value.dates.checkOut : fallback.dates.checkOut;
  if (checkOut <= checkIn || calendarNights(checkIn, checkOut) > MAX_STAY_NIGHTS) {
    checkIn = fallback.dates.checkIn;
    checkOut = fallback.dates.checkOut;
  }

  const housing = HOUSING_OPTIONS.some(option => option.id === value.housing)
    ? value.housing
    : fallback.housing;

  return {
    version: SCENARIO_VERSION,
    adults: integerInRange(value.adults, fallback.adults, 1, 8),
    children: integerInRange(value.children, fallback.children, 0, 6),
    geo: normalizeGeo(value.geo, fallbackGeo),
    dates: { checkIn, checkOut },
    housing,
  };
}

export function sameScenario(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
