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
    name: 'Взрослые и состав', values: '1–2 взрослых · Компания: 3+ взрослых · 5+ гостей всего',
    effect: 'Двое взрослых без детей усиливают вид по направлению. Компания усиливает кухню и посудомойку, а летом у леса — мангальную зону. При 5+ гостях, включая детей, рекомендуем разрешённые вечеринки.',
    note: 'Компания — от 3 взрослых. Для вечеринок считаем взрослых и детей вместе. Двое взрослых без детей — условное приближение пары для демонстрации, не установленная цель поездки.',
  },
  {
    name: 'Количество детей', values: 'Без детей · 1–6 детей',
    effect: 'Если есть хотя бы один ребёнок, усиливаем кухню, стиральную машину и завтрак. Дети входят в общий порог 5+ гостей для рекомендации разрешённых вечеринок.',
    note: 'Общие семейные сигналы работают даже при неуказанном возрасте ребёнка.',
  },
  {
    name: 'Возраст детей', values: 'Возраст каждого на момент выезда: Не указан · Младше года · 1–17 лет',
    effect: '0–1 год — детская кроватка; 2–11 лет — детская площадка. Возраст 2–17 лет усиливает бассейны у моря или леса: обычный — летом, крытый — в прохладный период. Для 12–17 лет отдельной рекомендации пока нет. Неуказанный возраст не даёт возрастных баллов.',
    note: 'Точный возраст каждого ребёнка объединяем только для расчёта: 0–1, 2–11 и 12–17 лет. Возраст одного ребёнка не заменяет и не сбрасывает возраст другого.',
  },
  {
    name: 'Направление', values: 'Море · Лес · Город · Горы',
    effect: 'Определяет подходящий вид, близость моря и рекомендацию загородных домов у леса или гор. Вместе с другими сигналами усиливает кондиционер, завтрак, бассейны, сетки, площадку, мангальную зону и баню. Квартиры рекомендуем только в городе или у моря при 14+ ночах.',
    note: 'Горы + зима: усилить «Рядом подъемник» и «Хранение лыж». Пока не включено в расчёт.',
  },
  {
    name: 'Даты и длительность', values: '1–3 ночи — короткая\n4–6 — средняя\n7–30 — долгая',
    effect: '1–3 ночи усиливают завтрак и самостоятельное заселение, а в прохладный период — ванну. 7–30 ночей усиливают кухню, стирку, посудомойку и близость моря. Для городской поездки от недели отдельные основания получают завтрак и ванна. От 14 ночей в городе или у моря рекомендуем квартиры.',
    note: 'Максимум 30 ночей. День выезда не считаем.',
  },
  {
    name: 'Сезон', values: 'Лето: июнь–август · Межсезонье: май и сентябрь · Прохладный период: октябрь–апрель',
    effect: 'Период, на который приходится не меньше половины ночей, даёт сезонную основу: летом — кондиционеру, сеткам и бассейну; в прохладный период — ванне, крытому бассейну и бане. Май и сентябрь сезонных баллов не дают.',
    note: 'Три сезона — новая схема. В расчёте пока летний и прохладный периоды.',
  },
  {
    name: 'Тип жилья', values: 'Любое жильё · Отель · Апартаменты · Загородное жильё',
    effect: 'Определяет, какие рекомендации допустимы, но не добавляет баллов. Подробные ограничения показаны в соседней вкладке.',
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
    detail: 'Учитываем гостей и возраст детей, направление, сезон и длительность.',
    note: 'Гости, возраст детей, гео, тип жилья, сезон и срок задают контекст. Семья с детьми может одновременно быть компанией из 3+ взрослых.',
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
    note: 'При равенстве сохраняем порядок матрицы. Для частого сценария «город · 7–30 ночей» отдельные основания дополняют полку до пяти рекомендаций; в других контекстах, если подходящих фильтров меньше пяти, показываем меньше.',
  },
]);
