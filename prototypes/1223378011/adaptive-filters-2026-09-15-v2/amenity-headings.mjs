// Presentation only: these labels do not change the catalog or recommendation rules.
const DEFAULT_HEADINGS = Object.freeze({
  interior: 'Удобства в номере',
  territory: 'Общие удобства',
});
const HEADINGS_BY_HOUSING = Object.freeze({
  all: DEFAULT_HEADINGS,
  hotel: DEFAULT_HEADINGS,
  apartment: Object.freeze({ interior: 'Удобства в квартире', territory: 'На территории' }),
  countryHouse: Object.freeze({ interior: 'Удобства в доме', territory: 'На территории' }),
});
const HOUSING_BY_FILTER = new Map([
  ['Гостиница', 'hotel'],
  ['Квартира', 'apartment'],
  ['Загородный дом', 'countryHouse'],
]);

export function resolveHousing({ housing = 'all', selectedHousing = [] } = {}) {
  const selected = [...new Set(selectedHousing)];
  // A mixed selection must not be described as one particular kind of housing.
  if (selected.length > 1) return 'all';
  if (selected.length === 1) housing = HOUSING_BY_FILTER.get(selected[0]) ?? 'all';
  return Object.hasOwn(HEADINGS_BY_HOUSING, housing) ? housing : 'all';
}

export function getAmenityHeadings(options = {}) {
  return HEADINGS_BY_HOUSING[resolveHousing(options)];
}
