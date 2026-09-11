/**
 * Editorial prototype rules, not a learned ranking or measured conversion uplift.
 * FOMO supports kitchen / washing for families and kitchen for groups; observed
 * filter use supports breakfast and pools in some resort / countryside searches.
 * Exact weights, duration boundaries and seasons below are hypotheses.
 * A candidate score is the sum of its visible context contributions, capped at 100.
 * The new apartment / country-house models define attributes, not inventory coverage.
 * Country houses reuse comparable prototype weights; see country-house-admission.md.
 */
import { MAX_STAY_NIGHTS } from './trip-limits.mjs';

const DAY = 86_400_000;
const MAX_RECOMMENDATIONS = 5;
export const MIN_RECOMMENDATION_SCORE = 30;
export const SCORE_CAP = 100;

const DEFINITIONS = Object.freeze([
  ['Кондиционер', 'Кондиционер'],
  ['Кухня', 'Своя кухня'],
  ['Стиральная машина', 'Стиральная машина'],
  ['Балкон', 'Балкон'],
  ['Ванна', 'Ванна'],
  ['Завтрак', 'Включён завтрак'],
  ['Посудомоечная машина', 'Посудомоечная машина'],
  ['Москитные сетки', 'Москитные сетки'],
  ['Рабочая зона', 'Рабочая зона'],
  ['Вид на море', 'Вид на море'],
  ['Вид на горы', 'Вид на горы'],
  ['Вид на лес', 'Вид на лес'],
  ['Бассейн', 'Бассейн'],
  ['Крытый', 'Крытый бассейн'],
  ['Детская площадка', 'Детская площадка'],
  ['Мангальная зона', 'Мангальная зона'],
  ['Баня', 'Баня'],
  ['Рядом море', 'Рядом море'],
  ['Самостоятельное заселение', 'Самостоятельное заселение'],
  ['Разрешены вечеринки', 'Разрешены вечеринки'],
  ['Детская кроватка', 'Детская кроватка'],
  ['Квартира', 'Квартиры'],
  ['Загородный дом', 'Загородные дома'],
].map(([id, label]) => Object.freeze({ id, label })));

export const RECOMMENDATION_IDS = Object.freeze(DEFINITIONS.map(({ id }) => id));
const ID_BY_LABEL = new Map(DEFINITIONS.map(({ id, label }) => [label, id]));

// This describes admission to the recommendation rules, not visibility in the
// full filter catalog or physical availability in every real housing property.
function isHousingEligible(id, housing) {
  if (id === 'Самостоятельное заселение') return housing === 'apartment' || housing === 'countryHouse';
  if (id === 'Разрешены вечеринки') return housing !== 'hotel';
  if (id === 'Квартира') return housing === 'all' || housing === 'apartment';
  if (id === 'Загородный дом') return housing === 'all' || housing === 'countryHouse';
  if (['Кухня', 'Стиральная машина', 'Посудомоечная машина'].includes(id)) return housing !== 'hotel';
  if (id === 'Завтрак') return housing === 'all' || housing === 'hotel';
  if (['Мангальная зона', 'Баня'].includes(id)) return housing !== 'apartment';
  return true;
}

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError('Recommendation dates must be ISO calendar dates.');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError('Recommendation date does not exist.');
  }
  return date;
}

function readContext(context) {
  if (!context || typeof context !== 'object') throw new TypeError('A trip context is required.');
  const { adults, children, housing } = context;
  const geo = typeof context.geo === 'string' ? context.geo : context.geo?.id;
  if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0) {
    throw new RangeError('Guest counts must be non-negative integers, with at least one adult.');
  }
  if (!['sea', 'forest', 'city', 'mountains'].includes(geo)) throw new RangeError('Unknown recommendation geo.');
  if (!['all', 'hotel', 'apartment', 'countryHouse'].includes(housing)) throw new RangeError('Unknown recommendation housing type.');
  const start = parseDate(context.dates?.checkIn);
  const end = parseDate(context.dates?.checkOut);
  const nights = (end - start) / DAY;
  if (nights < 1 || nights > MAX_STAY_NIGHTS) throw new RangeError(`Recommendation stays must contain 1–${MAX_STAY_NIGHTS} nights.`);

  // Count occupied nights across every month, excluding checkout. UTC avoids DST.
  let summerNights = 0;
  let coolNights = 0;
  let cursor = new Date(start);
  while (cursor < end) {
    const month = cursor.getUTCMonth();
    const boundary = new Date(cursor);
    boundary.setUTCMonth(month + 1, 1);
    const monthNights = (Math.min(boundary.getTime(), end.getTime()) - cursor.getTime()) / DAY;
    if ([5, 6, 7].includes(month)) summerNights += monthNights;
    if ([0, 1, 2, 3, 9, 10, 11].includes(month)) coolNights += monthNights;
    cursor = boundary;
  }

  return {
    adults, children, housing, geo, nights,
    family: children > 0,
    company: adults >= 3,
    largeCompany: adults + children >= 5,
    pair: adults === 2 && children === 0,
    long: nights > 7,
    extendedStay: nights >= 14,
    short: nights <= 3,
    summer: summerNights / nights >= 0.5,
    cool: coolNights / nights >= 0.5,
  };
}

const factor = (id, label, points, when, kind = 'base') => Object.freeze({ id, label, points, when, kind });
const scoringRule = (id, factors, note, reason) => Object.freeze({
  id,
  factors: Object.freeze(factors),
  note,
  reason,
});

// Base factors can start a score. Boosts are added only when at least one base
// factor matched, so a secondary signal cannot recommend a filter on its own.
// Housing is deliberately absent: it is an admission gate, never a contribution.
const SCORING_RULES = Object.freeze([
  scoringRule('Кондиционер', [
    factor('summer', 'Летние даты', 70, trip => trip.summer),
    factor('sea', 'У моря', 19, trip => trip.geo === 'sea', 'boost'),
    factor('city', 'Город', 10, trip => trip.geo === 'city', 'boost'),
    factor('forest', 'У леса', 5, trip => trip.geo === 'forest', 'boost'),
  ], 'Летние даты дают основу; направление может усилить её.',
  'Летом кондиционер может быть полезнее; направление дополнительно уточняет приоритет.'),
  scoringRule('Кухня', [
    factor('children', 'Поездка с детьми', 50, trip => trip.family),
    factor('company', 'Компания от 3 взрослых', 40, trip => trip.company),
    factor('long', '8–30 ночей', 60, trip => trip.long),
  ], 'Все сработавшие потребности складываются.',
  trip => `Состав гостей и поездка на ${trip.nights} ночей могут усилить потребность готовить самостоятельно.`),
  scoringRule('Стиральная машина', [
    factor('children', 'Поездка с детьми', 60, trip => trip.family),
    factor('long', '8–30 ночей', 70, trip => trip.long),
  ], 'Дети и длительность усиливают друг друга.',
  trip => `Состав гостей и поездка на ${trip.nights} ночей могут усилить потребность в стирке.`),
  scoringRule('Балкон', [
    factor('summer', 'Летние даты', 20, trip => trip.summer),
    factor('scenic', 'Море, лес или горы', 15, trip => trip.geo !== 'city', 'boost'),
  ], 'В городе географического усилителя нет.',
  'Летом на природном направлении балкон может дать дополнительное место для отдыха на воздухе.'),
  scoringRule('Ванна', [
    factor('cool', 'Прохладный сезон', 15, trip => trip.cool),
    factor('short', '1–3 ночи', 15, trip => trip.short, 'boost'),
  ], 'Каждый сигнал по отдельности остаётся ниже порога.',
  'В короткой поездке в прохладный сезон ванна может стать дополнительным способом отдохнуть.'),
  scoringRule('Завтрак', [
    factor('short', '1–3 ночи', 45, trip => trip.short),
    factor('children', 'Поездка с детьми', 30, trip => trip.family),
    factor('city', 'Город', 25, trip => trip.geo === 'city', 'boost'),
  ], 'Завтрак должен входить в доступный тариф.',
  'В короткой или семейной поездке включённый завтрак может упростить утро; в городе экономия времени важнее.'),
  scoringRule('Посудомоечная машина', [
    factor('company', 'Компания от 3 взрослых', 15, trip => trip.company),
    factor('long', '8–30 ночей', 15, trip => trip.long, 'boost'),
  ], 'Порог достигается только при совпадении компании и долгой поездки.',
  trip => `Для ${trip.adults} взрослых на ${trip.nights} ночей посудомойка может сократить бытовые хлопоты.`),
  scoringRule('Москитные сетки', [
    factor('summer', 'Летние даты', 20, trip => trip.summer),
    factor('forest', 'У леса', 40, trip => trip.geo === 'forest', 'boost'),
    factor('sea', 'У моря', 10, trip => trip.geo === 'sea', 'boost'),
  ], 'География усиливает сетки только при летней основе.',
  'Летом у моря или леса москитные сетки могут помочь проветривать помещение без насекомых.'),
  scoringRule('Рабочая зона', [], 'Пока нет вводной о цели поездки.', ''),
  scoringRule('Вид на море', [
    factor('sea', 'У моря', 50, trip => trip.geo === 'sea'),
    factor('pair', 'Двое взрослых без детей', 20, trip => trip.pair, 'boost'),
  ], 'Двое взрослых без детей усиливают вид только у моря. Вид не означает близость к пляжу.',
  trip => trip.pair
    ? 'Для поездки вдвоём к морю усиливаем приоритет вида на воду; он не означает близость к пляжу.'
    : 'Для поездки к морю можно выбрать жильё с видом на него; это не близость к пляжу.'),
  scoringRule('Вид на горы', [
    factor('mountains', 'У гор', 50, trip => trip.geo === 'mountains'),
    factor('pair', 'Двое взрослых без детей', 20, trip => trip.pair, 'boost'),
  ], 'Двое взрослых без детей усиливают вид только у гор. Близость подъёмника не подразумевается.',
  trip => trip.pair
    ? 'Для поездки вдвоём в горы усиливаем приоритет вида на горы, независимо от сезона.'
    : 'В горном направлении можно выбрать вид на горы, независимо от сезона.'),
  scoringRule('Вид на лес', [
    factor('forest', 'У леса', 45, trip => trip.geo === 'forest'),
    factor('pair', 'Двое взрослых без детей', 20, trip => trip.pair, 'boost'),
  ], 'Двое взрослых без детей усиливают вид только у леса. Вид не означает близость к нему.',
  trip => trip.pair
    ? 'Для поездки вдвоём к лесу усиливаем приоритет вида на лес как дополнения к отдыху.'
    : 'В поездке к лесу вид на него может быть приятным дополнением к отдыху.'),
  scoringRule('Бассейн', [
    factor('summer', 'Летние даты', 20, trip => trip.summer),
    factor('sea', 'У моря', 15, trip => trip.geo === 'sea', 'boost'),
    factor('forest', 'У леса', 10, trip => trip.geo === 'forest', 'boost'),
    factor('children', 'С детьми у моря или леса', 10, trip => trip.family && ['sea', 'forest'].includes(trip.geo), 'boost'),
  ], 'Доступ и сезон работы нужно уточнить.',
  'В летнем курортном или загородном контексте бассейн может дополнить отдых.'),
  scoringRule('Крытый', [
    factor('cool', 'Прохладный сезон', 20, trip => trip.cool),
    factor('pool-geo', 'У моря или леса', 10, trip => ['sea', 'forest'].includes(trip.geo), 'boost'),
    factor('children', 'С детьми у моря или леса', 10, trip => trip.family && ['sea', 'forest'].includes(trip.geo), 'boost'),
  ], 'Крыша не гарантирует подогрев или работу на даты.',
  'В прохладный сезон крытый бассейн может быть удобнее; подогрев и работу на даты нужно уточнить.'),
  scoringRule('Детская площадка', [
    factor('children', 'Поездка с детьми', 50, trip => trip.family),
    factor('pool-geo', 'У моря или леса', 15, trip => ['sea', 'forest'].includes(trip.geo), 'boost'),
  ], 'Оснащение площадки нужно уточнить.',
  'С детьми площадка на территории может дать ещё один вариант досуга.'),
  scoringRule('Мангальная зона', [
    factor('summer', 'Летние даты', 15, trip => trip.summer),
    factor('forest', 'У леса', 15, trip => trip.geo === 'forest', 'boost'),
    factor('company', 'Компания от 3 взрослых у леса', 25, trip => trip.company && trip.geo === 'forest', 'boost'),
  ], 'Без лесного направления сумма остаётся ниже порога.',
  'Летом у леса мангальная зона может пригодиться для совместного ужина; компания усиливает приоритет.'),
  scoringRule('Баня', [
    factor('cool', 'Прохладный сезон', 25, trip => trip.cool),
    factor('natural', 'У леса или гор', 25, trip => ['forest', 'mountains'].includes(trip.geo), 'boost'),
  ], 'Природное направление усиливает баню только в прохладный сезон.',
  'В прохладный сезон у леса или гор баня может быть одним из вариантов отдыха.'),
  scoringRule('Рядом море', [
    factor('sea', 'У моря', 50, trip => trip.geo === 'sea'),
    factor('long', '8–30 ночей', 10, trip => trip.long, 'boost'),
  ], 'Близость моря и вид на него — разные условия.',
  'У моря близкое расположение может сократить ежедневную дорогу к воде; долгая поездка усиливает приоритет.'),
  scoringRule('Самостоятельное заселение', [
    factor('short', '1–3 ночи', 70, trip => trip.short),
  ], 'Нужен подтверждённый вход без встречи.',
  trip => trip.housing === 'countryHouse'
    ? 'На короткую поездку самостоятельное заселение может упростить приезд; нужен подтверждённый вход без встречи.'
    : 'На короткую поездку самостоятельное заселение может упростить приезд; это не круглосуточный заезд.'),
  scoringRule('Разрешены вечеринки', [
    factor('large-company', 'От 5 гостей', 80, trip => trip.largeCompany),
  ], 'Считаем всех гостей, включая детей. Допускаем любое жильё, апартаменты и загородное жильё.',
  'Для компании от 5 гостей предлагаем проверить жильё, где разрешены вечеринки; правила объекта определяют условия.'),
  scoringRule('Детская кроватка', [
    factor('children', 'Поездка с детьми', 85, trip => trip.family),
  ], 'Срабатывает при любом количестве детей от 1; возраст в текущем контексте не указан.',
  'В поездке с детьми предлагаем детскую кроватку; подходящий возраст и возможность её предоставления нужно уточнить.'),
  scoringRule('Квартира', [
    factor('extended-stay', '14–30 ночей в городе или у моря', 80, trip => trip.extendedStay && ['city', 'sea'].includes(trip.geo)),
  ], 'От 14 ночей в городе или у моря, при любом жилье или апартаментах. У леса и гор не рекомендуем.',
  trip => `Для поездки на ${trip.nights} ночей предлагаем квартиры как вариант жилья для длительного проживания.`),
  scoringRule('Загородный дом', [
    factor('natural-geo', 'У леса или гор', 80, trip => ['forest', 'mountains'].includes(trip.geo)),
  ], 'У леса или гор, при любом жилье или загородном жилье. Длительность и сезон не ограничиваем.',
  trip => trip.geo === 'forest'
    ? 'Для поездки к лесу предлагаем загородные дома.'
    : 'Для поездки в горы предлагаем загородные дома.'),
]);

const RULE_BY_ID = new Map(SCORING_RULES.map(rule => [rule.id, rule]));
export const SCORING_MODEL = Object.freeze(DEFINITIONS.map(({ id, label }) => {
  const rule = RULE_BY_ID.get(id);
  return Object.freeze({
    id,
    label,
    note: rule.note,
    factors: Object.freeze(rule.factors.map(({ when, ...publicFactor }) => Object.freeze(publicFactor))),
  });
}));

function calculateScore(rule, trip) {
  const bases = rule.factors.filter(item => item.kind === 'base' && item.when(trip));
  const matched = bases.length
    ? [...bases, ...rule.factors.filter(item => item.kind === 'boost' && item.when(trip))]
    : [];
  const contributions = matched.map(({ id, label, points, kind }) => ({ id, label, points, kind }));
  const rawScore = contributions.reduce((total, item) => total + item.points, 0);
  const score = Math.min(SCORE_CAP, rawScore);
  const reason = contributions.length
    ? (typeof rule.reason === 'function' ? rule.reason(trip, contributions) : rule.reason)
    : '';
  return { rawScore, score, contributions, reason };
}

/**
 * Call when trip context changes, not after every chip toggle: source rows stay
 * stable while the user selects filters. Unknown counts do not mean zero supply.
 * `counts` may be the canonical-id object returned by demo facets, or a Map.
 */
export function recommendFilters(context, { selected = [], counts = null } = {}) {
  return inspectRecommendations(context, { selected, counts }).recommendations;
}

/**
 * Read-only explanation of the same scoring and selection pass. Candidates are
 * in catalog order; recommendations retain their ranked, public output shape.
 * Status precedence: housing, supply for unselected candidates, threshold, total cap.
 * Selection alone never removes or promotes a candidate. Its own zero facet count
 * also does not remove it; trip eligibility and the ordinary score ranking remain.
 */
export function inspectRecommendations(context, { selected = [], counts = null } = {}) {
  const trip = readContext(context);
  if (!Array.isArray(selected) && !(selected instanceof Set)) throw new TypeError('Selected filters must be an array or Set.');
  if ([...selected].some(id => typeof id !== 'string')) throw new TypeError('Selected filter ids must be strings.');
  if (counts !== null && (typeof counts !== 'object' || Array.isArray(counts))) throw new TypeError('Counts must be an object, Map or null.');
  const selectedIds = new Set([...selected].map(id => ID_BY_LABEL.get(id) ?? id));
  const candidates = new Map(DEFINITIONS.map((definition, order) => [definition.id, {
    ...definition, order, rawScore: 0, score: 0, contributions: [], reason: '',
  }]));
  for (const definition of DEFINITIONS) {
    if (!isHousingEligible(definition.id, trip.housing)) continue;
    Object.assign(candidates.get(definition.id), calculateScore(RULE_BY_ID.get(definition.id), trip));
  }

  // Work area is deliberately retained in the catalog but has no supported
  // contribution: duration does not establish a work trip. The pair signal means
  // exactly two adults without children; it does not establish their relationship.
  // We never infer pets, children's ages, cars or skiing.
  const sorted = [...candidates.values()].sort((a, b) => b.score - a.score || a.order - b.order);
  const results = [];
  for (const candidate of sorted) {
    const count = counts instanceof Map ? counts.get(candidate.id) : counts?.[candidate.id];
    if (!isHousingEligible(candidate.id, trip.housing)) candidate.status = 'excluded_housing';
    else if (!selectedIds.has(candidate.id) && Number.isFinite(count) && count <= 0) candidate.status = 'no_supply';
    else if (candidate.score < MIN_RECOMMENDATION_SCORE) candidate.status = 'below_threshold';
    else if (results.length >= MAX_RECOMMENDATIONS) candidate.status = 'limit';
    else candidate.status = 'recommended';
    if (candidate.status !== 'recommended') continue;
    const { order, status, ...recommendation } = candidate;
    results.push(recommendation);
  }
  return { trip, candidates: [...candidates.values()], recommendations: results };
}
