/**
 * Human-readable documentation of recommendation-engine.mjs in this prototype.
 * Scores and boundaries are editorial hypotheses, not measured probabilities.
 * Arrays follow the engine's catalog order, including candidates with score 0.
 */
const { SCORING_MODEL, MIN_RECOMMENDATION_SCORE, SCORE_CAP } = await import(
  './recommendation-engine.mjs' + new URL(import.meta.url).search
);

export { MIN_RECOMMENDATION_SCORE, SCORE_CAP };

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze({ ...row,
    ...(row.factors ? { factors: Object.freeze(row.factors.map(factor => Object.freeze({ ...factor }))) } : {}),
  })));
}

export const EXPLANATION_INPUTS = freezeRows([
  {
    name: 'Количество гостей', values: 'До двух · Компании · 5+ гостей',
    effect: 'Компания усиливает кухню, посудомойку и мангальную зону. От 5 гостей, включая детей, рекомендуем разрешённые вечеринки. Двоим взрослым без детей усиливаем вид по направлению.',
    note: 'Компания — от 3 взрослых. Для вечеринок считаем взрослых и детей вместе. Двое взрослых без детей — условное приближение пары для демонстрации, не установленная цель поездки.',
  },
  {
    name: 'Дети', values: 'Без детей · С детьми',
    effect: 'Добавляют баллы кухне, стирке, бассейнам и завтраку. Дают базовые баллы детской площадке и кроватке.',
    note: 'Возраст известен из формы поиска. В прототипе пока учитываем только количество детей: кроватку рекомендуем, если указан хотя бы один ребёнок.',
  },
  {
    name: 'Направление', values: 'Море · Лес · Город · Горы',
    effect: 'Даёт баллы подходящим видам и близости моря. У леса и гор рекомендуем загородные дома, квартиры не рекомендуем. Может усилить кондиционер, бассейны, сетки и площадку.',
    note: 'Горы + зима: усилить «Рядом подъемник» и «Хранение лыж». Пока не включено в расчёт.',
  },
  {
    name: 'Даты и длительность', values: '1–3 ночи — короткая\n4–7 — средняя\n8–30 — долгая',
    effect: 'Добавляют баллы бытовым удобствам, близости моря, завтраку, заселению и ванне. От 14 ночей в городе или у моря рекомендуем квартиры.',
    note: 'Максимум 30 ночей. День выезда не считаем.',
  },
  {
    name: 'Сезон', values: 'Лето, межсезонье, зима',
    effect: 'Добавляет базовые баллы сезонным фильтрам. Учитываем сезон, на который приходится не меньше половины ночей.',
    note: 'Три сезона — новая схема. В расчёте пока летний и прохладный периоды.',
  },
  {
    name: 'Тип жилья', values: 'Все типы · Отели · Апартаменты · Загородное жильё',
    effect: 'Допускает или исключает фильтры. Баллы не добавляет.',
    note: 'Ограничения касаются рекомендаций, не всего каталога фильтров. Тип жилья не входит в сумму.',
  },
]);

const generalHousingNote = 'Рекомендуем по контексту поездки.';
const domesticHousingNote = 'Не рекомендуем для отелей.';
const territoryHousingNote = 'Не рекомендуем для апартаментов.';

// Country-house admission is an editorial proposal, authorized 2026-09-11.
// Source mapping and reused prototype weights: country-house-admission.md.
export const EXPLANATION_HOUSING = freezeRows([
  { label: 'Кондиционер', all: true, hotel: true, apartment: true, countryHouse: true, note: generalHousingNote },
  { label: 'Своя кухня', all: true, hotel: false, apartment: true, countryHouse: true, note: domesticHousingNote },
  { label: 'Стиральная машина', all: true, hotel: false, apartment: true, countryHouse: true, note: domesticHousingNote },
  { label: 'Балкон', all: true, hotel: true, apartment: true, countryHouse: true, note: generalHousingNote },
  { label: 'Ванна', all: true, hotel: true, apartment: true, countryHouse: true, note: generalHousingNote },
  { label: 'Включён завтрак', all: true, hotel: true, apartment: false, countryHouse: false, note: 'Не рекомендуем для апартаментов и домов.' },
  { label: 'Посудомоечная машина', all: true, hotel: false, apartment: true, countryHouse: true, note: domesticHousingNote },
  { label: 'Москитные сетки', all: true, hotel: true, apartment: true, countryHouse: true, note: generalHousingNote },
  { label: 'Рабочая зона', all: true, hotel: true, apartment: true, countryHouse: true, note: 'Допустима, но для неё пока нет условий с баллами.' },
  { label: 'Вид на море', all: true, hotel: true, apartment: true, countryHouse: true, note: generalHousingNote },
  { label: 'Вид на горы', all: true, hotel: true, apartment: true, countryHouse: true, note: generalHousingNote },
  { label: 'Вид на лес', all: true, hotel: true, apartment: true, countryHouse: true, note: generalHousingNote },
  { label: 'Бассейн', all: true, hotel: true, apartment: true, countryHouse: true, note: generalHousingNote },
  { label: 'Крытый бассейн', all: true, hotel: true, apartment: true, countryHouse: true, note: generalHousingNote },
  { label: 'Детская площадка', all: true, hotel: true, apartment: true, countryHouse: true, note: generalHousingNote },
  { label: 'Мангальная зона', all: true, hotel: true, apartment: false, countryHouse: true, note: territoryHousingNote },
  { label: 'Баня', all: true, hotel: true, apartment: false, countryHouse: true, note: territoryHousingNote },
  { label: 'Рядом море', all: true, hotel: true, apartment: true, countryHouse: true, note: generalHousingNote },
  { label: 'Самостоятельное заселение', all: false, hotel: false, apartment: true, countryHouse: true, note: 'Для апартаментов и домов; нужен вход без встречи.' },
  { label: 'Разрешены вечеринки', all: true, hotel: false, apartment: true, countryHouse: true, note: 'Для апартаментов и домов; разрешение должно быть указано в правилах.' },
  { label: 'Детская кроватка', all: true, hotel: true, apartment: true, countryHouse: true, note: generalHousingNote },
  { label: 'Квартиры', all: true, hotel: false, apartment: true, countryHouse: false, note: 'При любом жилье или апартаментах; для отелей и загородного жилья не рекомендуем.' },
  { label: 'Загородные дома', all: true, hotel: false, apartment: false, countryHouse: true, note: 'При любом жилье или загородном жилье; для отелей и апартаментов не рекомендуем.' },
]);

// Reuse the engine's public model so the explanation cannot drift from scoring.
export const EXPLANATION_PRIORITIES = freezeRows(SCORING_MODEL);

export const EXPLANATION_STEPS = freezeRows([
  {
    name: 'Вводные', rule: 'Гости и поездка',
    detail: 'Учитываем гостей, направление, сезон и длительность.',
    note: 'Гости, гео, тип жилья, сезон и срок задают контекст. Семья с детьми может одновременно быть компанией из 3+ взрослых.',
  },
  {
    name: 'Тип жилья', rule: 'Допуск фильтров',
    detail: 'Оставляем фильтры, подходящие выбранному жилью.',
    note: 'Исключаем неподходящие для типа жилья фильтры. Только из рекомендаций, не из всего каталога.',
  },
  {
    name: 'Считаем балл', rule: 'Сумма вкладов',
    detail: 'Складываем базовые баллы и усилители.',
    note: `Например, кондиционер: летние даты +70, у моря +19 — итого 89. Итог не может быть выше ${SCORE_CAP}.`,
  },
  {
    name: 'Отсев', rule: `От ${MIN_RECOMMENDATION_SCORE} баллов`,
    detail: 'Проверяем балл и наличие вариантов. Сам выбор не убирает фильтр.',
    note: `Пропускаем фильтры ниже ${MIN_RECOMMENDATION_SCORE} баллов и невыбранные без предложений. Уже выбранный фильтр не убираем из-за выбора или нулевого счётчика. Неизвестный счётчик не мешает показу.`,
  },
  {
    index: '05', name: 'Порядок и подборка', rule: 'По баллу · до 5',
    detail: 'Сначала больший балл, затем первые 5 без групп.',
    note: 'При равенстве сохраняем порядок матрицы. Если подходящих фильтров меньше пяти, показываем меньше.',
  },
]);
