import { GEO_OPTIONS, HOUSING_OPTIONS } from './settings-panel/scenario-state.mjs';
import { MAX_STAY_NIGHTS } from './trip-limits.mjs';

const DEFAULT_SNAPSHOT = Object.freeze({
  version: 1,
  adults: 2,
  children: 0,
  geo: Object.freeze({ id: GEO_OPTIONS[0].id, signals: GEO_OPTIONS[0].signals }),
  dates: Object.freeze({ checkIn: '2027-07-10', checkOut: '2027-07-24' }),
  housing: 'all',
});

const HOUSING = new Set(HOUSING_OPTIONS.map(option => option.id));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function copy(snapshot) {
  return {
    version: 1,
    adults: snapshot.adults,
    children: snapshot.children,
    geo: { id: snapshot.geo.id, signals: [...snapshot.geo.signals] },
    dates: { checkIn: snapshot.dates.checkIn, checkOut: snapshot.dates.checkOut },
    housing: snapshot.housing,
  };
}

function isRealIsoDate(value) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function normalizeSnapshot(value) {
  if (!value || value.version !== 1) return null;
  const adults = Number(value.adults);
  const children = Number(value.children);
  const geoId = typeof value.geo?.id === 'string' ? value.geo.id : '';
  const geo = GEO_OPTIONS.find(option => option.id === geoId);
  const checkIn = value.dates?.checkIn;
  const checkOut = value.dates?.checkOut;
  const housing = value.housing;
  if (!Number.isInteger(adults) || adults < 1 || adults > 8) return null;
  if (!Number.isInteger(children) || children < 0 || children > 6) return null;
  if (!geo || !HOUSING.has(housing)) return null;
  if (!isRealIsoDate(checkIn) || !isRealIsoDate(checkOut) || checkOut <= checkIn) return null;
  const nights = (Date.parse(checkOut + 'T12:00:00Z') - Date.parse(checkIn + 'T12:00:00Z')) / 86400000;
  if (nights < 1 || nights > MAX_STAY_NIGHTS) return null;
  return {
    version: 1,
    adults,
    children,
    geo: { id: geo.id, signals: [...geo.signals] },
    dates: { checkIn, checkOut },
    housing,
  };
}

export function createScenarioController({ capture = false, onChange } = {}) {
  const shell = document.querySelector('#scenario-shell');
  const frame = document.querySelector('#scenario-panel');
  const launcher = document.querySelector('#scenario-launcher');
  const backdrop = document.querySelector('#scenario-backdrop');
  const overlayQuery = matchMedia('(max-width: 839px)');
  let snapshot = copy(DEFAULT_SNAPSHOT);
  let lastRevision = -1;
  let open = false;
  let recommendations = [];

  if (!shell || !frame || !launcher || !backdrop) {
    return Object.freeze({ getSnapshot: () => copy(snapshot), reset() {}, setRecommendations() {} });
  }
  if (capture) {
    shell.hidden = true;
    launcher.hidden = true;
    backdrop.hidden = true;
    return Object.freeze({ getSnapshot: () => copy(snapshot), reset() {}, setRecommendations() {} });
  }

  function presentation() {
    return overlayQuery.matches ? 'overlay' : 'rail';
  }
  function post(type, extra = {}) {
    if (!frame.contentWindow || !frame.src) return;
    frame.contentWindow.postMessage({ type, ...extra }, location.origin);
  }
  function setOpen(next, { restoreFocus = true } = {}) {
    open = overlayQuery.matches && Boolean(next);
    shell.dataset.open = String(open);
    launcher.setAttribute('aria-expanded', String(open));
    launcher.hidden = open;
    backdrop.hidden = !open;
    document.documentElement.dataset.scenarioOpen = String(open);
    if (!open && restoreFocus && overlayQuery.matches) launcher.focus({ preventScroll: true });
    post('scenario:init', { snapshot: copy(snapshot), presentation: presentation() });
  }
  function syncPresentation() {
    if (!overlayQuery.matches) setOpen(false, { restoreFocus: false });
    shell.setAttribute('aria-hidden', String(overlayQuery.matches && !open));
    post('scenario:init', { snapshot: copy(snapshot), presentation: presentation() });
  }
  function apply(next, revision) {
    const normalized = normalizeSnapshot(next);
    if (!normalized || !Number.isInteger(revision) || revision <= lastRevision) return;
    lastRevision = revision;
    snapshot = normalized;
    document.documentElement.dataset.contextHousing = snapshot.housing;
    document.documentElement.dataset.contextGeo = snapshot.geo.id;
    const detail = copy(snapshot);
    window.dispatchEvent(new CustomEvent('filters:context-change', { detail }));
    onChange?.(detail);
  }

  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    const message = event.data;
    if (!message || typeof message.type !== 'string') return;
    if (message.type === 'scenario:ready') {
      // The embedded panel starts its revision counter again after a reload.
      lastRevision = -1;
      post('scenario:init', { snapshot: copy(snapshot), presentation: presentation() });
      post('scenario:recommendations', { payload: { recommendations } });
    } else if (message.type === 'scenario:change') {
      apply(message.snapshot, message.revision);
    } else if (message.type === 'scenario:close') {
      setOpen(false);
    }
  });
  launcher.addEventListener('click', () => setOpen(true, { restoreFocus: false }));
  backdrop.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  });
  overlayQuery.addEventListener('change', syncPresentation);
  frame.src = frame.dataset.src;
  syncPresentation();

  return Object.freeze({
    getSnapshot: () => copy(snapshot),
    setRecommendations(items) {
      recommendations = items.map(({ id, label, reason, score, rawScore, contributions }) => ({
        id, label, reason, score, rawScore,
        contributions: contributions.map(({ id, label, points, kind }) => ({ id, label, points, kind })),
      }));
      post('scenario:recommendations', { payload: { recommendations } });
    },
    reset() {
      snapshot = copy(DEFAULT_SNAPSHOT);
      lastRevision = -1;
      post('scenario:reset', { snapshot: copy(snapshot) });
      onChange?.(copy(snapshot));
    },
  });
}

export { DEFAULT_SNAPSHOT };
