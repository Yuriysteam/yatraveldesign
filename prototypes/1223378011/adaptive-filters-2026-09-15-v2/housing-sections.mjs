import { resolveHousing } from './amenity-headings.mjs';

export const APARTMENT_ONLY_SECTIONS = Object.freeze(['Общая площадь', 'Спальные места']);
const HOTEL_SECTIONS = Object.freeze(['Питание', 'Звездность']);
export const HOUSING_DEPENDENT_SECTIONS = Object.freeze([...HOTEL_SECTIONS, ...APARTMENT_ONLY_SECTIONS]);

// These types share apartment-specific filter shelves in this local concept.
// This is deliberately separate from amenity headings: a country house still
// uses the more accurate heading «Удобства в доме».
export const APARTMENT_FILTER_HOUSING_TYPES = Object.freeze([
  'Квартира',
  'Дом отдыха',
  'Кемпинг',
  'Глэмпинг',
  'Гостевые дома и дома в аренду',
  'Загородный дом',
  'Таунхаус',
]);
const APARTMENT_FILTER_HOUSING_SET = new Set(APARTMENT_FILTER_HOUSING_TYPES);

export function hasApartmentFilterContext({ housing = 'all', selectedHousing = [] } = {}) {
  const selected = [...new Set(selectedHousing)];
  // A combination of types has no unambiguous set of type-specific controls.
  if (selected.length > 1) return false;
  // A single live selection always takes precedence over the scenario sidebar.
  if (selected.length === 1) return APARTMENT_FILTER_HOUSING_SET.has(selected[0]);
  return resolveHousing({ housing }) === 'apartment';
}

// Only section visibility changes. Existing selections remain removable above.
export function getHiddenHousingSections(options = {}) {
  return hasApartmentFilterContext(options) ? HOTEL_SECTIONS : APARTMENT_ONLY_SECTIONS;
}
