/**
 * Local prototype data, NOT Yandex Travel inventory or a production search rule.
 * Counts are exact intersections of a deterministic, synthetic 15,000-offer set.
 */
const TOTAL_SIZE = 15000;
const MAX_PRICE = 60000;
const ALIASES = Object.freeze({
  'Включён завтрак': 'Завтрак',
  'Своя кухня': 'Кухня',
  'Отложенный платёж': 'Отложенный платеж',
  'Крытый бассейн': 'Крытый',
  'Квартиры': 'Квартира',
  'Загородные дома': 'Загородный дом',
});

export function canonicalFilter(label) {
  if (typeof label !== 'string') throw new TypeError('A filter label must be a string.');
  const normalized = label.trim().replace(/\s+/gu, ' ');
  return ALIASES[normalized] ?? normalized;
}

const FACETS = Object.freeze({
  type: ['Гостиница', 'Квартира', 'Санаторий', 'Дом отдыха', 'Хостел', 'Турбаза', 'Кемпинг', 'Глэмпинг', 'Гостевые дома и дома в аренду', 'Загородный дом', 'Таунхаус'],
  rooms: ['1 комната', '2 комнаты', '3 комнаты', '4 комнаты', '5 и больше'],
  beds: ['Односпальная', 'Двуспальная'],
  meals: ['Завтрак', 'Завтрак, обед', 'Завтрак, ужин', 'Завтрак, обед или ужин', 'Завтрак, обед и ужин', 'Ужин', 'Всё включено', 'Без питания'],
  stars: ['Без звёзд', '1*', '2*', '3*', '4*', '5*'],
  rating: ['Очень хорошо (4.5+)', 'Хорошо (4+)', 'Приемлемо (3+)'],
});
const FACET_BY_LABEL = new Map(Object.entries(FACETS).flatMap(([facet, labels]) => labels.map(label => [label, facet])));
const TYPE_WEIGHTS = [33, 28, 4, 4, 5, 4, 3, 3, 7, 6, 3];

function randomGenerator(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(random, values, weights) {
  const target = random() * weights.reduce((sum, weight) => sum + weight, 0);
  let accumulated = 0;
  for (let i = 0; i < values.length; i++) {
    accumulated += weights[i];
    if (target < accumulated) return values[i];
  }
  return values.at(-1);
}

function makeOffer(index, random) {
  const type = pickWeighted(random, FACETS.type, TYPE_WEIGHTS);
  const apartment = type === 'Квартира';
  const hotel = ['Гостиница', 'Санаторий', 'Дом отдыха'].includes(type);
  const camping = ['Кемпинг', 'Глэмпинг', 'Турбаза'].includes(type);
  const house = ['Гостевые дома и дома в аренду', 'Загородный дом', 'Таунхаус'].includes(type);
  const rooms = pickWeighted(random, [1, 2, 3, 4, 5], apartment || house ? [37, 31, 20, 8, 4] : [76, 18, 4, 1, 1]);
  const stars = hotel ? pickWeighted(random, [0, 1, 2, 3, 4, 5], [8, 3, 10, 37, 31, 11]) : 0;
  const premium = stars >= 4;
  const geo = pickWeighted(random, ['city', 'sea', 'mountains', 'country'], [45, 27, 13, 15]);
  const rural = camping || house || geo === 'country';
  const sea = geo === 'sea';
  const centerDistance = geo === 'city' ? random() * 7 : 2 + random() * 20;
  // Bit 1 = breakfast, bit 2 = lunch, bit 4 = dinner. A flat has no catered meals.
  const mealPlan = apartment ? 0 : pickWeighted(random, [0, 1, 3, 5, 7, 4], hotel ? [20, 42, 8, 15, 12, 3] : [76, 17, 1, 3, 1, 2]);
  const allInclusive = mealPlan === 7 && hotel && random() < (sea ? 0.7 : 0.25);
  const rating = Math.round((2.5 + Math.pow(random(), 0.45) * 2.5) * 10) / 10;
  const doubleBed = type !== 'Хостел' && random() < (apartment || house ? 0.93 : 0.77);
  const singleBed = !doubleBed || rooms > 1 || random() < 0.32;
  const ac = random() < (sea ? 0.91 : premium ? 0.85 : camping ? 0.2 : 0.64);
  const kitchen = apartment || house ? random() < 0.97 : random() < (camping ? 0.51 : type === 'Хостел' ? 0.75 : 0.1);
  const pool = random() < (premium ? 0.63 : sea && hotel ? 0.6 : apartment ? 0.035 : 0.17);
  const indoorPool = pool && random() < (sea ? 0.25 : 0.74);
  const outdoorPool = pool && (!indoorPool || random() < 0.25);
  const heatedPool = pool && (indoorPool || random() < 0.37);
  const parking = random() < (rural ? 0.94 : hotel ? 0.78 : 0.51);
  const restaurant = !apartment && random() < (hotel ? 0.86 : 0.21);
  const sauna = random() < (premium ? 0.57 : rural ? 0.3 : 0.1);
  const spa = !apartment && random() < (premium ? 0.61 : hotel ? 0.16 : 0.015);
  const refundable = random() < (hotel ? 0.74 : 0.62);
  const delayedPayment = refundable && random() < (hotel ? 0.86 : 0.53);
  const cashback = random() < 0.47;
  const discount = cashback || random() < 0.34;
  const superhost = (apartment || house) && rating >= 4.5 && random() < 0.47;
  const accessibleRoom = !camping && random() < (hotel ? 0.23 : 0.055);
  const ramp = accessibleRoom || (!camping && random() < 0.19);
  const accessibleLift = !rural && (accessibleRoom || random() < 0.23);
  const groundFloor = rural || accessibleRoom || random() < 0.14;
  const ownBeach = sea && (hotel || camping || house) && random() < 0.18;
  const firstLine = sea && (ownBeach || random() < 0.23);
  const nearSea = sea && (firstLine || random() < 0.74);
  const nightBase = type === 'Хостел' ? 600 : camping ? 1600 : apartment ? 1900 : 1800 + stars * 650;
  const price = Math.min(MAX_PRICE, Math.max(500, Math.round((nightBase + rooms * 480 + Number(pool) * 800 + Number(sea) * 500) * (0.8 + random() * 1.9) * 2 / 50) * 50));
  const features = new Set([
    type, `${rooms === 5 ? '5 и больше' : `${rooms} ${rooms === 1 ? 'комната' : 'комнаты'}`}`,
    stars === 0 ? 'Без звёзд' : `${stars}*`,
  ]);
  const add = (label, present) => { if (present) features.add(label); };
  add('Односпальная', singleBed);
  add('Двуспальная', doubleBed);
  add('Завтрак', Boolean(mealPlan & 1));
  add('Завтрак, обед', (mealPlan & 3) === 3);
  add('Завтрак, ужин', (mealPlan & 5) === 5);
  add('Завтрак, обед или ужин', Boolean(mealPlan & 1) && Boolean(mealPlan & 6));
  add('Завтрак, обед и ужин', mealPlan === 7);
  add('Ужин', Boolean(mealPlan & 4));
  add('Всё включено', allInclusive);
  add('Без питания', mealPlan === 0);
  add('Очень хорошо (4.5+)', rating >= 4.5);
  add('Хорошо (4+)', rating >= 4);
  add('Приемлемо (3+)', rating >= 3);
  add('Все скидки и бонусы', discount);
  add('Кэшбэк Плюса', cashback);
  add('Бесплатная отмена', refundable);
  add('Отложенный платеж', delayedPayment);
  add('Сплит', random() < (price >= 5000 ? 0.81 : 0.49));
  add('Частичная оплата на месте', delayedPayment || random() < 0.17);
  add('Суперхозяин', superhost);
  add('Кондиционер', ac);
  add('Кухня', kitchen);
  add('Стиральная машина', random() < (apartment || house ? 0.86 : 0.065));
  add('Балкон', random() < (sea ? 0.64 : apartment ? 0.6 : 0.24));
  add('Ванна', random() < (apartment ? 0.72 : premium ? 0.5 : 0.2));
  add('Wi-Fi', random() < (camping ? 0.51 : 0.95));
  add('Холодильник', kitchen || random() < (camping ? 0.3 : 0.71));
  add('Детская кроватка', random() < (hotel ? 0.61 : apartment || house ? 0.34 : 0.11));
  add('Рядом подъемник', geo === 'mountains' && random() < 0.64);
  add('Первая линия у моря', firstLine);
  add('Рядом море', nearSea);
  add('Рядом аэропорт', geo === 'city' && centerDistance > 2 && random() < 0.23);
  add('Рядом парк', rural || random() < 0.4);
  add('До центра меньше 1 км', centerDistance < 1);
  add('До центра меньше 2 км', centerDistance < 2);
  add('До центра меньше 3 км', centerDistance < 3);
  add('Парковка', parking);
  add('Мангальная зона', random() < (rural ? 0.72 : apartment ? 0.035 : 0.11));
  add('Бассейн', pool);
  add('Крытый', indoorPool);
  add('Открытый', outdoorPool);
  add('С подогревом', heatedPool);
  add('Детская площадка', random() < (rural || sea ? 0.59 : apartment ? 0.42 : 0.3));
  add('Собственный пляж', ownBeach);
  add('Ресторан', restaurant);
  add('Баня', random() < (rural ? 0.44 : 0.065));
  add('Сауна', sauna);
  add('Spa', spa);
  add('Кафе', restaurant || random() < 0.22);
  add('Фитнес', !apartment && random() < (premium ? 0.68 : hotel ? 0.26 : 0.025));
  add('Аквапарк', outdoorPool && sea && hotel && random() < 0.16);
  add('Можно курить', random() < (rural ? 0.39 : 0.1));
  add('Можно с животными', random() < (house ? 0.64 : apartment ? 0.36 : 0.25));
  add('Разрешены вечеринки', random() < (house ? 0.31 : camping ? 0.2 : 0.035));
  add('Заселение без депозита', random() < (hotel ? 0.9 : 0.44));
  add('Лифт подходит для инвалидной коляски', accessibleLift);
  add('Номер и удобства на первом этаже', groundFloor);
  add('Пандус', ramp);
  add('Парковка для людей с инвалидностью', parking && (accessibleRoom || random() < 0.2));
  add('Номера для людей с инвалидностью', accessibleRoom);
  add('Трансфер', !apartment && random() < (hotel ? 0.62 : 0.21));
  add('Ранний заезд', random() < (hotel ? 0.68 : 0.39));
  add('Поздний выезд', random() < (hotel ? 0.63 : 0.35));
  add('Круглосуточная стойка регистрации', hotel || (type === 'Хостел' && random() < 0.81));
  // Independent stream preserves the existing fixtures and counts on enrichment.
  // These are illustrative predicates, not claimed production feature coverage.
  const extra = randomGenerator(0xA9A70000 + index);
  add('Посудомоечная машина', kitchen && (apartment || house) && extra() < 0.36);
  add('Затемняющие шторы', extra() < (hotel ? 0.72 : 0.48));
  add('Москитные сетки', extra() < (rural || sea ? 0.7 : 0.32));
  add('Рабочая зона', extra() < (apartment ? 0.43 : hotel ? 0.66 : 0.22));
  add('Обогреватель', extra() < (apartment || house ? 0.43 : 0.14));
  add('Вид на море', sea && extra() < 0.36);
  add('Вид на горы', geo === 'mountains' && extra() < 0.67);
  add('Вид на лес', (rural || geo === 'mountains') && extra() < 0.53);
  add('Закрытая территория', extra() < (rural ? 0.63 : 0.28));
  add('Хранение лыж', geo === 'mountains' && extra() < (hotel ? 0.72 : 0.25));
  add('Курение запрещено', !features.has('Можно курить') && extra() < 0.81);
  add('Самостоятельное заселение', (apartment || house) && extra() < 0.55);
  add('Круглосуточное заселение', features.has('Круглосуточная стойка регистрации') || extra() < 0.4);
  add('Хранение багажа', extra() < (hotel ? 0.93 : 0.28));
  return Object.freeze({id: index, price, filterIds: Object.freeze([...features])});
}

function popcount(value) {
  value -= (value >>> 1) & 0x55555555;
  value = (value & 0x33333333) + ((value >>> 2) & 0x33333333);
  return (((value + (value >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24;
}

/**
 * definitions: [{id, label, section}]. id is the UI key; aliases share a predicate.
 * evaluate accepts an Array/Set of those ids and an inclusive total-price range.
 * Multiple selected values in one categorical facet are OR; other groups are AND.
 * Categorical counts exclude selected values of their own facet (disjunctive counts).
 */
export function createDemoFacets(definitions) {
  if (!Array.isArray(definitions)) throw new TypeError('Filter definitions must be an array.');
  const random = randomGenerator(20260910);
  const records = Object.freeze(Array.from({length: TOTAL_SIZE}, (_, index) => makeOffer(index, random)));
  const wordCount = Math.ceil(TOTAL_SIZE / 32);
  const allBits = new Uint32Array(wordCount).fill(0xFFFFFFFF);
  allBits[wordCount - 1] = 0xFFFFFFFF >>> (32 - (TOTAL_SIZE % 32 || 32));
  const indexes = new Map();
  for (const record of records) {
    for (const label of record.filterIds) {
      if (!indexes.has(label)) indexes.set(label, new Uint32Array(wordCount));
      indexes.get(label)[record.id >>> 5] |= 1 << (record.id & 31);
    }
  }
  const canonicalById = Object.create(null);
  const facetById = Object.create(null);
  for (const definition of definitions) {
    if (!definition || typeof definition.id !== 'string' || !definition.id.trim()) throw new TypeError('Every filter needs a non-empty string id.');
    const canonical = canonicalFilter(definition.label);
    if (!indexes.has(canonical)) throw new RangeError(`Unsupported demo filter: ${definition.label}`);
    if (Object.hasOwn(canonicalById, definition.id) && canonicalById[definition.id] !== canonical) throw new RangeError(`Conflicting definitions for id: ${definition.id}`);
    canonicalById[definition.id] = canonical;
    facetById[definition.id] = FACET_BY_LABEL.get(canonical) ?? null;
  }
  Object.freeze(canonicalById);
  Object.freeze(facetById);

  function evaluate(selectedIds = [], price = {min: 0, max: MAX_PRICE}) {
    if (!selectedIds || typeof selectedIds === 'string' || typeof selectedIds[Symbol.iterator] !== 'function') throw new TypeError('Selected ids must be an Array, Set or iterable.');
    const selected = new Set();
    for (const id of selectedIds) {
      if (!Object.hasOwn(canonicalById, id)) throw new RangeError(`Unknown selected filter id: ${String(id)}`);
      selected.add(canonicalById[id]);
    }
    const min = price?.min ?? 0;
    const max = price?.max ?? MAX_PRICE;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) throw new RangeError('Price must have finite bounds with 0 <= min <= max.');
    const priceBits = min === 0 && max >= MAX_PRICE ? allBits : new Uint32Array(wordCount);
    if (priceBits !== allBits) {
      for (const record of records) {
        if (record.price >= min && record.price <= max) priceBits[record.id >>> 5] |= 1 << (record.id & 31);
      }
    }
    const grouped = new Map();
    for (const label of selected) {
      const key = FACET_BY_LABEL.get(label) ?? `amenity:${label}`;
      if (!grouped.has(key)) grouped.set(key, new Uint32Array(wordCount));
      const group = grouped.get(key);
      const index = indexes.get(label);
      for (let word = 0; word < wordCount; word++) group[word] |= index[word];
    }
    const baseFor = skipFacet => {
      const result = priceBits.slice();
      for (const [groupKey, groupBits] of grouped) {
        if (groupKey === skipFacet) continue;
        for (let word = 0; word < wordCount; word++) result[word] &= groupBits[word];
      }
      return result;
    };
    const base = baseFor(null);
    let total = 0;
    for (const word of base) total += popcount(word);
    const facetBases = new Map();
    const canonicalCounts = new Map();
    const counts = Object.create(null);
    for (const [id, label] of Object.entries(canonicalById)) {
      if (!canonicalCounts.has(label)) {
        const facet = FACET_BY_LABEL.get(label);
        let countBase = base;
        if (facet && grouped.has(facet)) {
          if (!facetBases.has(facet)) facetBases.set(facet, baseFor(facet));
          countBase = facetBases.get(facet);
        }
        const candidateBits = indexes.get(label);
        let count = 0;
        for (let word = 0; word < wordCount; word++) count += popcount(countBase[word] & candidateBits[word]);
        canonicalCounts.set(label, count);
      }
      counts[id] = canonicalCounts.get(label);
    }
    return {total, counts};
  }

  return Object.freeze({evaluate, totalSize: TOTAL_SIZE, records, canonicalById, facetById, isDemo: true});
}
