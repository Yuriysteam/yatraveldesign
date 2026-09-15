const CARD_TITLES = [
  'Нью-Йорк на рассвете', 'Париж зимой', 'Лондон на автобусе', 'Колизей в Риме', 'Каналы Амстердама',
  'Стамбул у Босфора', 'Дубай с высоты', 'Сингапур у залива', 'Сиднейская опера', 'Киото и пагода',
  'Тропа в Альпах', 'Тропа инков', 'Озеро в Альпах', 'Фьорды Норвегии', 'Скалистые горы',
  'Гималаи осенью', 'Доломиты в июне', 'Озеро в горах', 'Перевал в Австрии', 'Поход по Кавказу',
  'Острова Пхи-Пхи', 'Амальфи летом', 'Пляжи Палау', 'Мальдивы в июле', 'Лагуна Занзибара',
  'Парус у Сардинии', 'Санторини в мае', 'Бухты Палавана', 'Розовый пляж', 'Скалы Таиланда',
  'Домик в Лапландии', 'Северное сияние', 'Лофотены зимой', 'Ледник в Исландии', 'Ледяная пещера',
  'Лыжи в Альпах', 'Замок зимой', 'Ночь в Финляндии', 'Деревня в Альпах', 'Хаски в Лапландии',
  'Сакура в Осаке', 'Тюльпаны в Голландии', 'Глицинии в апреле', 'Сад в Киото', 'Фудзи весной',
  'Цветение сакуры', 'Весна у озера', 'Пионы в Сеуле', 'Сакура в Токио', 'Гортензии в июне',
  'Холи в Индии', 'Фестиваль шаров', 'Карнавал в Рио', 'Фестиваль фонарей', 'Концерт под небом',
  'Праздник в Португалии', 'Летний фестиваль', 'Ярмарка в июле', 'Забег быков', 'Костры в Шотландии',
  'Клёны в Киото', 'Осень в Эльзасе', 'Гинкго в ноябре', 'Озеро в Канаде', 'Ферма тыкв',
  'Мост в Киото', 'Тоскана осенью', 'Замок в Баварии', 'Осень в Японии', 'Река в Колорадо',
  'Акрополь в Афинах', 'Медресе в Самарканде', 'Флоренция с высоты', 'Лувр изнутри', 'Храмы Ангкора',
  'Саграда Фамилия', 'Петра на рассвете', 'Тадж-Махал', 'Запретный город', 'Чичен-Ица',
  'Поезд в Швейцарии', 'Экспресс по Альпам', 'Дорога над морем', 'Роуд-трип по Исландии', 'Поезд у озера',
  'Швейцарский экспресс', 'Дорога в Норвегии', 'Веломаршрут в Альпах', 'Канатка над долиной', 'Круиз по фьордам',
  'Сахара на закате', 'Водопад на Бали', 'Вулкан в Индонезии', 'Гранд-Каньон', 'Баобабы Мадагаскара',
  'Гейзеры Йеллоустона', 'Каньон Антилопы', 'Ночь в пустыне', 'Солончак Уюни', 'Водопад в джунглях'
];

function keepPrepositionsWithNextWord(text) {
  return text.replace(/(^|[\s(])(в|во|на|по|к|ко|с|со|у|о|об|от|до|из|за|для|под|над|при)\s+/giu, '$1$2\u00a0');
}

const CARD_DATA = CARD_TITLES.map((title, index) => {
  return {
    image: `assets/cards/travel-${String(index + 1).padStart(3, '0')}.jpg`,
    title: keepPrepositionsWithNextWord(title),
    pos: '50% 50%'
  };
});

const prompts = [
  ['Что вас вдохновляет?', 'Выберите 4 идеи'],
  ['Хорошее начало', 'Осталось выбрать 3'],
  ['Отличные идеи!', 'Осталось выбрать 2'],
  ['Уже близко к мечте', 'Осталось выбрать 1'],
  ['Готово!', 'Ваши четыре идеи собраны']
];

const GRID_REPEAT = 2;
const GRID_COLUMNS = 10 * GRID_REPEAT;
const GRID_ROWS = 10 * GRID_REPEAT;
const TILE_WIDTH = 10 * (124 + 12);
const TILE_HEIGHT = 10 * (206 + 12);
const FIELD_ORIGIN = -20;
const ALL_EVENT_INDICES = CARD_DATA.map((_, index) => index);

function makeMonthEventSets() {
  let seed = 202612;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const sharedPool = ALL_EVENT_INDICES.slice(12);
  return Array.from({ length: 12 }, (_, monthIndex) => {
    const candidates = [...sharedPool];
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    return [monthIndex, ...candidates.slice(0, 11)];
  });
}

const MONTH_EVENT_SETS = makeMonthEventSets();
const EVENT_DESCRIPTIONS = [
  'Городские маршруты, знаковые места и новые впечатления',
  'Горные тропы, просторные виды и свежий воздух',
  'Тёплое море, красивые бухты и неспешный отдых',
  'Снег, северные пейзажи и уютные зимние вечера',
  'Цветущие сады, мягкое солнце и длинные прогулки',
  'Яркое событие, ради которого стоит отправиться в путь',
  'Осенние краски, тихие дороги и красивые панорамы',
  'Архитектура, история и места с особой атмосферой',
  'Живописный маршрут и сама дорога как приключение',
  'Природное чудо, которое хочется увидеть своими глазами'
];

const intro = document.querySelector('#intro');
const introStart = document.querySelector('#introStart');
const explore = document.querySelector('#explore');
const viewport = document.querySelector('#viewport');
const cardfield = document.querySelector('#cardfield');
const progressToast = document.querySelector('#progressToast');
const progressRing = document.querySelector('#progressRing');
const progressCount = document.querySelector('#progressCount');
const progressTitle = document.querySelector('#progressTitle');
const progressHint = document.querySelector('#progressHint');
const viewButton = document.querySelector('#viewButton');
const focusMode = document.querySelector('#focusMode');
const focusStage = document.querySelector('#focusStage');
const focusBack = document.querySelector('#focusBack');
const finale = document.querySelector('#finale');
const finalGrid = document.querySelector('#finalGrid');
const confetti = document.querySelector('#confetti');
const device = document.querySelector('#device');
const liveRegion = document.querySelector('#liveRegion');

let selected = new Set();
let interacted = false;
let finalizing = false;
let dragging = false;
let moved = false;
let pressedCard = null;
let pointerStart = { x: 0, y: 0 };
let fieldStart = { x: 0, y: 0 };
let fieldPosition = { x: -20, y: -20 };
let velocity = { x: -0.015, y: 0.021 };
let lastFrame = performance.now();
let autoScroll = false;
let autoStartTimer = 0;
let isRepeatingGrid = true;
let currentGridColumns = GRID_COLUMNS;
let currentEventOrder = [...ALL_EVENT_INDICES];
let logicalGridColumns = 10;
let focusIndex = 0;
let focusAnimating = false;
const gridTouches = new Map();
const focusTouches = new Map();
let gridPinchStart = 0;
let gridPinching = false;
let focusPinchStart = 0;
let focusPinching = false;
let focusSwipeStart = null;

function pointerDistance(points) {
  const [first, second] = [...points.values()];
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function startExplore() {
  clearTimeout(autoStartTimer);
  autoScroll = false;
  fieldPosition = { x: FIELD_ORIGIN, y: FIELD_ORIGIN };
  velocity = { x: -0.015, y: 0.021 };
  renderField();
  intro.classList.add('is-hidden');
  intro.setAttribute('aria-hidden', 'true');
  lastFrame = performance.now();
  autoStartTimer = window.setTimeout(() => {
    if (!interacted && intro.classList.contains('is-hidden')) {
      autoScroll = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      lastFrame = performance.now();
    }
  }, 350);
}

function makeCard(data, index, row, column) {
  const card = document.createElement('button');
  const isSelected = selected.has(index);
  card.className = 'card';
  card.type = 'button';
  card.dataset.index = index;
  card.dataset.row = row;
  card.dataset.column = column;
  card.setAttribute('aria-pressed', String(isSelected));
  card.setAttribute('aria-label', `Выбрать: ${data.title}`);
  card.classList.toggle('is-selected', isSelected);
  card.innerHTML = `
    <img class="card__image" src="${data.image}" alt="" draggable="false" decoding="async">
    <span class="card__content">
      <span class="card__label">${data.title}</span>
      <span class="card__heart" aria-hidden="true"><img src="${isSelected ? 'assets/favorite-selected.svg' : 'assets/favorite.svg'}" alt=""></span>
    </span>`;
  card.addEventListener('click', event => {
    if (event.detail !== 0 || moved || finalizing) return;
    chooseCard(card, index);
  });
  return card;
}

function renderCards(indices = ALL_EVENT_INDICES, repeat = true) {
  const fragment = document.createDocumentFragment();
  cardfield.replaceChildren();
  isRepeatingGrid = repeat;
  currentEventOrder = [...indices];
  logicalGridColumns = repeat ? 10 : 3;

  if (repeat) {
    currentGridColumns = GRID_COLUMNS;
    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let column = 0; column < GRID_COLUMNS; column += 1) {
        const index = (row % 10) * 10 + (column % 10);
        fragment.appendChild(makeCard(CARD_DATA[index], index, row, column));
      }
    }
  } else {
    currentGridColumns = 3;
    indices.forEach((index, position) => {
      fragment.appendChild(makeCard(CARD_DATA[index], index, Math.floor(position / 3), position % 3));
    });
  }

  cardfield.appendChild(fragment);
  const rows = repeat ? GRID_ROWS : Math.ceil(indices.length / currentGridColumns);
  cardfield.style.width = `${currentGridColumns * 124 + Math.max(0, currentGridColumns - 1) * 12 + 28}px`;
  cardfield.style.height = `${rows * 206 + Math.max(0, rows - 1) * 12 + 28}px`;
  cardfield.style.gridTemplateColumns = `repeat(${currentGridColumns}, 124px)`;
}

function captureVisibleCards() {
  const deviceRect = device.getBoundingClientRect();
  const positions = new Map();
  document.querySelectorAll('.cardfield .card').forEach(card => {
    const rect = card.getBoundingClientRect();
    const visible = rect.right > deviceRect.left && rect.left < deviceRect.right && rect.bottom > deviceRect.top && rect.top < deviceRect.bottom;
    if (!visible) return;
    const index = Number(card.dataset.index);
    const distance = Math.abs(rect.left + rect.width / 2 - (deviceRect.left + 187.5)) + Math.abs(rect.top + rect.height / 2 - (deviceRect.top + 406));
    const current = positions.get(index);
    if (!current || distance < current.distance) positions.set(index, { card, rect, distance });
  });
  return { deviceRect, positions };
}

function rebuildGrid(indices, repeat) {
  const { deviceRect, positions } = captureVisibleCards();
  const nextIndices = new Set(indices);

  positions.forEach(({ card, rect }, index) => {
    if (nextIndices.has(index)) return;
    const ghost = card.cloneNode(true);
    ghost.classList.add('grid-transition-card');
    ghost.style.left = `${rect.left - deviceRect.left}px`;
    ghost.style.top = `${rect.top - deviceRect.top}px`;
    device.appendChild(ghost);
    ghost.animate([
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(.9)' }
    ], { duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)' });
    setTimeout(() => ghost.remove(), 470);
  });

  renderCards(indices, repeat);
  if (repeat) {
    fieldPosition = { x: FIELD_ORIGIN, y: FIELD_ORIGIN };
  } else {
    const maxX = 6;
    const minX = Math.min(maxX, 369 - cardfield.offsetWidth);
    const maxY = 126;
    const minY = Math.min(maxY, 666 - cardfield.offsetHeight);
    fieldPosition = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }
  constrainPosition();
  renderField();

  requestAnimationFrame(() => {
    document.querySelectorAll('.cardfield .card').forEach(card => {
      const rect = card.getBoundingClientRect();
      const visible = rect.right > deviceRect.left && rect.left < deviceRect.right && rect.bottom > deviceRect.top && rect.top < deviceRect.bottom;
      if (!visible) return;
      const previous = positions.get(Number(card.dataset.index));
      const fromTransform = previous
        ? `translate(${previous.rect.left - rect.left}px, ${previous.rect.top - rect.top}px) scale(.96)`
        : 'scale(.9)';
      card.animate([
        { opacity: previous ? 1 : 0, transform: fromTransform },
        { opacity: 1, transform: 'none' }
      ], { duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  });
}

function descriptionFor(index) {
  return EVENT_DESCRIPTIONS[Math.min(EVENT_DESCRIPTIONS.length - 1, Math.floor(index / 10))];
}

function focusTarget(direction) {
  const position = currentEventOrder.indexOf(focusIndex);
  if (position < 0) return focusIndex;
  const columns = logicalGridColumns;
  const rows = Math.ceil(currentEventOrder.length / columns);
  const row = Math.floor(position / columns);
  const column = position % columns;
  let targetRow = row;
  let targetColumn = column;

  if (direction === 'left') targetColumn -= 1;
  if (direction === 'right') targetColumn += 1;
  if (direction === 'up') targetRow -= 1;
  if (direction === 'down') targetRow += 1;

  if (isRepeatingGrid) {
    targetRow = (targetRow + rows) % rows;
    targetColumn = (targetColumn + columns) % columns;
  } else if (targetRow < 0 || targetRow >= rows || targetColumn < 0 || targetColumn >= columns) {
    return focusIndex;
  }

  const targetPosition = targetRow * columns + targetColumn;
  return currentEventOrder[targetPosition] ?? focusIndex;
}

const FOCUS_CARD_WIDTH = 280;
const FOCUS_CARD_HEIGHT = 520;
const FOCUS_CARD_GAP = 30;
const FOCUS_STEP_X = FOCUS_CARD_WIDTH + FOCUS_CARD_GAP;
const FOCUS_STEP_Y = FOCUS_CARD_HEIGHT + FOCUS_CARD_GAP;
const FOCUS_GRID_OFFSETS = [-1, 0, 1, 2, 3];
const FOCUS_NEIGHBOURS = FOCUS_GRID_OFFSETS.flatMap(offsetRow => (
  FOCUS_GRID_OFFSETS.map(offsetColumn => {
    let direction = `cell-${offsetColumn}-${offsetRow}`;
    if (offsetColumn === 0 && offsetRow === 0) direction = 'center';
    if (offsetColumn === -1 && offsetRow === 0) direction = 'left';
    if (offsetColumn === 1 && offsetRow === 0) direction = 'right';
    if (offsetColumn === 0 && offsetRow === -1) direction = 'up';
    if (offsetColumn === 0 && offsetRow === 1) direction = 'down';
    return [offsetColumn, offsetRow, direction];
  })
));

function focusCardMarkup(index, direction, offsetColumn, offsetRow, sourceCard) {
  const data = CARD_DATA[index];
  const selectedState = selected.has(index);
  const card = document.createElement('article');
  card.className = `focus-card${direction === 'center' ? '' : ' focus-card--neighbour'}`;
  card.dataset.direction = direction;
  card.dataset.index = index;
  card.dataset.sourceRow = sourceCard.dataset.row;
  card.dataset.sourceColumn = sourceCard.dataset.column;
  card.style.left = `${47.5 + offsetColumn * FOCUS_STEP_X}px`;
  card.style.top = `${130 + offsetRow * FOCUS_STEP_Y}px`;
  card.innerHTML = `
    <img class="focus-card__image" src="${data.image}" alt="">
    <div class="focus-card__backdrop focus-card__backdrop--compact" aria-hidden="true"></div>
    <div class="focus-card__backdrop focus-card__backdrop--detail" aria-hidden="true"></div>
    <div class="focus-card__compact" aria-hidden="true">
      <span>${data.title}</span>
      <img src="${selectedState ? 'assets/favorite-selected.svg' : 'assets/favorite.svg'}" alt="">
    </div>
    <div class="focus-card__content">
      <strong class="focus-card__title">${data.title}</strong>
      <span class="focus-card__description">${descriptionFor(index)}</span>
      <button class="focus-card__heart" type="button" aria-label="${selectedState ? 'Убрать из выбранного' : 'Выбрать направление'}">
        <img src="${selectedState ? 'assets/favorite-selected.svg' : 'assets/favorite.svg'}" alt="">
      </button>
    </div>`;
  card.querySelector('.focus-card__heart').addEventListener('click', event => {
    event.stopPropagation();
    const source = document.querySelector(`.card[data-index="${index}"]`);
    if (source) chooseCard(source, index);
    const selectedState = selected.has(index);
    focusStage.querySelectorAll(`.focus-card[data-index="${index}"]`).forEach(focusCard => {
      const iconPath = selectedState ? 'assets/favorite-selected.svg' : 'assets/favorite.svg';
      focusCard.querySelector('.focus-card__heart img').src = iconPath;
      focusCard.querySelector('.focus-card__compact img').src = iconPath;
      focusCard.querySelector('.focus-card__heart').setAttribute(
        'aria-label',
        selectedState ? 'Убрать из выбранного' : 'Выбрать направление'
      );
    });
  });
  return card;
}

function renderFocusCards() {
  cardfield.querySelectorAll('.card.is-focus-source').forEach(card => {
    card.classList.remove('is-focus-source');
  });
  focusStage.replaceChildren();
  const centerSource = nearestCopyOf(focusIndex)?.card;
  if (!centerSource) return;
  const centerRow = Number(centerSource.dataset.row);
  const centerColumn = Number(centerSource.dataset.column);

  FOCUS_NEIGHBOURS.forEach(([offsetColumn, offsetRow, direction]) => {
    const sourceCard = cardfield.querySelector(
      `.card[data-row="${centerRow + offsetRow}"][data-column="${centerColumn + offsetColumn}"]`
    );
    if (!sourceCard) return;
    const index = Number(sourceCard.dataset.index);
    focusStage.appendChild(focusCardMarkup(index, direction, offsetColumn, offsetRow, sourceCard));
  });

  if (focusMode.classList.contains('is-active') && !focusMode.classList.contains('is-preparing')) {
    hideFocusSourceCards();
  }
}

function hideFocusSourceCards() {
  focusStage.querySelectorAll('.focus-card').forEach(card => {
    sourceCardForFocusCard(card)?.classList.add('is-focus-source');
  });
}

function revealFocusSourceCards() {
  cardfield.querySelectorAll('.card.is-focus-source').forEach(card => {
    card.classList.remove('is-focus-source');
  });
}

function sourceCardForFocusCard(focusCard) {
  return cardfield.querySelector(
    `.card[data-row="${focusCard.dataset.sourceRow}"][data-column="${focusCard.dataset.sourceColumn}"]`
  );
}

function rectKeyframe(rect, containerRect) {
  return {
    left: `${rect.left - containerRect.left}px`,
    top: `${rect.top - containerRect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`
  };
}

function nearestCardToCenter() {
  const deviceRect = device.getBoundingClientRect();
  const centerX = deviceRect.left + 187.5;
  const centerY = deviceRect.top + 406;
  return [...document.querySelectorAll('.cardfield .card')].reduce((nearest, card) => {
    const rect = card.getBoundingClientRect();
    const distance = Math.hypot(rect.left + rect.width / 2 - centerX, rect.top + rect.height / 2 - centerY);
    return !nearest || distance < nearest.distance ? { card, rect, distance } : nearest;
  }, null);
}

function nearestCopyOf(index) {
  const deviceRect = device.getBoundingClientRect();
  const centerX = deviceRect.left + 187.5;
  const centerY = deviceRect.top + 390;
  return [...document.querySelectorAll(`.cardfield .card[data-index="${index}"]`)].reduce((nearest, card) => {
    const rect = card.getBoundingClientRect();
    const distance = Math.hypot(rect.left + rect.width / 2 - centerX, rect.top + rect.height / 2 - centerY);
    return !nearest || distance < nearest.distance ? { card, rect, distance } : nearest;
  }, null);
}

function enterFocusMode() {
  if (focusMode.classList.contains('is-active') || finalizing) return;
  const nearest = nearestCardToCenter();
  if (!nearest) return;
  activateInteraction();
  focusIndex = Number(nearest.card.dataset.index);
  focusAnimating = true;
  renderFocusCards();
  focusMode.classList.remove('is-exiting');
  focusMode.classList.add('is-preparing');
  focusMode.classList.add('is-active');
  focusMode.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const focusRect = focusMode.getBoundingClientRect();
    const cards = [...focusStage.querySelectorAll('.focus-card')];
    const animations = [];
    cards.forEach(card => {
      const sourceCard = sourceCardForFocusCard(card);
      if (!sourceCard) return;
      const sourceRect = sourceCard.getBoundingClientRect();
      const targetRect = card.getBoundingClientRect();
      const neighbour = card.classList.contains('focus-card--neighbour');
      const compactBackdropAnimation = card.querySelector('.focus-card__backdrop--compact')?.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 560, delay: 80, easing: 'linear', fill: 'both' }
      );
      const detailBackdropAnimation = card.querySelector('.focus-card__backdrop--detail')?.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 560, delay: 80, easing: 'linear', fill: 'both' }
      );
      const compactAnimation = card.querySelector('.focus-card__compact')?.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 80, easing: 'linear', fill: 'forwards' }
      );
      const contentAnimation = card.querySelector('.focus-card__content')?.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 140, delay: 640, easing: 'linear', fill: 'both' }
      );
      const cardAnimation = card.animate([
        {
          ...rectKeyframe(sourceRect, focusRect),
          borderRadius: '24px',
          opacity: 1
        },
        {
          ...rectKeyframe(targetRect, focusRect),
          borderRadius: '48px',
          opacity: neighbour ? .3 : 1
        }
      ], { duration: 560, delay: 80, easing: 'cubic-bezier(.22,.74,.16,1)', fill: 'both' });
      animations.push(cardAnimation);
      if (compactBackdropAnimation) animations.push(compactBackdropAnimation);
      if (detailBackdropAnimation) animations.push(detailBackdropAnimation);
      if (compactAnimation) animations.push(compactAnimation);
      if (contentAnimation) animations.push(contentAnimation);
    });
    hideFocusSourceCards();
    focusMode.classList.remove('is-preparing');
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      focusAnimating = false;
    });
  }));
}

function exitFocusMode(immediate = false) {
  if (!focusMode.classList.contains('is-active')) return;
  if (immediate) {
    focusMode.classList.remove('is-active', 'is-exiting', 'is-preparing');
    focusMode.setAttribute('aria-hidden', 'true');
    revealFocusSourceCards();
    focusAnimating = false;
    return;
  }
  if (focusAnimating) return;
  focusAnimating = true;
  const cards = [...focusStage.querySelectorAll('.focus-card')];
  if (!cards.length) {
    focusMode.classList.remove('is-active');
    focusMode.setAttribute('aria-hidden', 'true');
    focusAnimating = false;
    return;
  }
  focusMode.classList.add('is-exiting');
  const focusRect = focusMode.getBoundingClientRect();
  const animations = [];
  cards.forEach(card => {
    const sourceCard = sourceCardForFocusCard(card);
    if (!sourceCard) return;
    const sourceRect = sourceCard.getBoundingClientRect();
    const targetRect = card.getBoundingClientRect();
    const neighbour = card.classList.contains('focus-card--neighbour');
    const detailBackdropAnimation = card.querySelector('.focus-card__backdrop--detail')?.animate(
      [
        { opacity: 1, offset: 0 },
        { opacity: .96, offset: .18 },
        { opacity: .55, offset: .66 },
        { opacity: 0, offset: 1 }
      ],
      { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' }
    );
    const compactBackdropAnimation = card.querySelector('.focus-card__backdrop--compact')?.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 300, delay: 400, easing: 'linear', fill: 'both' }
    );
    const contentAnimation = card.querySelector('.focus-card__content')?.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 80, easing: 'linear', fill: 'forwards' }
    );
    const compactAnimation = card.querySelector('.focus-card__compact')?.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 140, delay: 640, easing: 'linear', fill: 'both' }
    );
    const cardAnimation = card.animate([
      {
        ...rectKeyframe(targetRect, focusRect),
        borderRadius: '48px',
        opacity: neighbour ? .3 : 1
      },
      {
        ...rectKeyframe(sourceRect, focusRect),
        borderRadius: '24px',
        opacity: 1
      }
    ], { duration: 560, delay: 80, easing: 'cubic-bezier(.22,.74,.16,1)', fill: 'both' });
    animations.push(cardAnimation);
    if (detailBackdropAnimation) animations.push(detailBackdropAnimation);
    if (compactBackdropAnimation) animations.push(compactBackdropAnimation);
    if (contentAnimation) animations.push(contentAnimation);
    if (compactAnimation) animations.push(compactAnimation);
  });
  Promise.all(animations.map(animation => animation.finished)).then(() => {
    focusMode.classList.remove('is-active', 'is-exiting', 'is-preparing');
    focusMode.setAttribute('aria-hidden', 'true');
    revealFocusSourceCards();
    focusAnimating = false;
  });
}

function moveFocus(direction) {
  if (focusAnimating) return;
  const target = focusTarget(direction);
  if (target === focusIndex) return;
  focusAnimating = true;
  const movement = {
    left: [FOCUS_STEP_X, 0],
    right: [-FOCUS_STEP_X, 0],
    up: [0, FOCUS_STEP_Y],
    down: [0, -FOCUS_STEP_Y]
  }[direction];
  const targetCard = focusStage.querySelector(`[data-direction="${direction}"]`);
  const centralCard = focusStage.querySelector('[data-direction="center"]');
  targetCard?.animate([{ opacity: .3 }, { opacity: 1 }], { duration: 420, easing: 'ease', fill: 'forwards' });
  centralCard?.animate([{ opacity: 1 }, { opacity: .3 }], { duration: 420, easing: 'ease', fill: 'forwards' });
  const animation = focusStage.animate([
    { transform: 'translate(0, 0)' },
    { transform: `translate(${movement[0]}px, ${movement[1]}px)` }
  ], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
  animation.addEventListener('finish', () => {
    focusIndex = target;
    const fieldMovement = {
      left: [136, 0],
      right: [-136, 0],
      up: [0, 218],
      down: [0, -218]
    }[direction];
    fieldPosition.x += fieldMovement[0];
    fieldPosition.y += fieldMovement[1];
    constrainPosition();
    renderField();
    renderFocusCards();
    focusAnimating = false;
  });
}

function activateInteraction() {
  if (interacted) return;
  interacted = true;
  autoScroll = false;
  explore.classList.add('is-interacted');
  liveRegion.textContent = 'Автодвижение остановлено. Выберите четыре идеи.';
}

function wrapPosition() {
  const shift = { x: 0, y: 0 };
  while (fieldPosition.x <= FIELD_ORIGIN - TILE_WIDTH) {
    fieldPosition.x += TILE_WIDTH;
    shift.x += TILE_WIDTH;
  }
  while (fieldPosition.x > FIELD_ORIGIN) {
    fieldPosition.x -= TILE_WIDTH;
    shift.x -= TILE_WIDTH;
  }
  while (fieldPosition.y <= FIELD_ORIGIN - TILE_HEIGHT) {
    fieldPosition.y += TILE_HEIGHT;
    shift.y += TILE_HEIGHT;
  }
  while (fieldPosition.y > FIELD_ORIGIN) {
    fieldPosition.y -= TILE_HEIGHT;
    shift.y -= TILE_HEIGHT;
  }
  return shift;
}

function constrainPosition() {
  if (isRepeatingGrid) return wrapPosition();
  const maxX = 6;
  const maxY = 126;
  const minX = Math.min(maxX, 369 - cardfield.offsetWidth);
  const minY = Math.min(maxY, 666 - cardfield.offsetHeight);
  const requestedX = fieldPosition.x;
  const requestedY = fieldPosition.y;
  fieldPosition.x = Math.max(minX, Math.min(maxX, fieldPosition.x));
  fieldPosition.y = Math.max(minY, Math.min(maxY, fieldPosition.y));
  return { x: fieldPosition.x - requestedX, y: fieldPosition.y - requestedY };
}

function renderField() {
  cardfield.style.transform = `translate3d(${fieldPosition.x}px, ${fieldPosition.y}px, 0)`;
}

function autoMove(now) {
  const dt = Math.min(40, now - lastFrame);
  lastFrame = now;
  if (autoScroll && !dragging && !finalizing) {
    fieldPosition.x += velocity.x * dt;
    fieldPosition.y += velocity.y * dt;
    constrainPosition();
    renderField();
  }
  requestAnimationFrame(autoMove);
}

function chooseCard(card, index) {
  activateInteraction();
  const isSelected = selected.has(index);
  if (!isSelected && selected.size === 4) {
    card.classList.remove('is-locked');
    void card.offsetWidth;
    card.classList.add('is-locked');
    liveRegion.textContent = 'Уже выбрано четыре идеи. Снимите один выбор, чтобы заменить его.';
    return;
  }

  if (isSelected) selected.delete(index); else selected.add(index);
  document.querySelectorAll(`.card[data-index="${index}"]`).forEach(copy => {
    copy.classList.toggle('is-selected', !isSelected);
    copy.setAttribute('aria-pressed', String(!isSelected));
    copy.querySelector('.card__heart img').src = isSelected ? 'assets/favorite.svg' : 'assets/favorite-selected.svg';
  });
  bounce(card, isSelected ? 0.985 : 0.975);
  wobbleNeighbours(card);
  updateProgress();
}

function bounce(card, depth) {
  card.animate([
    { transform: 'translateY(0) scale(1)', offset: 0 },
    { transform: 'translateY(1.5px) scale(.995)', offset: .18 },
    { transform: `translateY(5px) scale(${depth})`, offset: .4 },
    { transform: 'translateY(-1.5px) scale(1.008)', offset: .66 },
    { transform: 'translateY(.5px) scale(.998)', offset: .84 },
    { transform: 'translateY(0) scale(1)', offset: 1 }
  ], { duration: 1050, easing: 'cubic-bezier(.25,.75,.25,1)' });
}

function wobbleNeighbours(card) {
  const cards = [...document.querySelectorAll('.card')];
  const index = cards.indexOf(card);
  [cards[index - 1], cards[index + 1], cards[index - currentGridColumns], cards[index + currentGridColumns]].filter(Boolean).forEach((neighbour, order) => {
    neighbour.animate([
      { transform: 'rotate(0deg) translateY(0)' },
      { transform: `rotate(${order % 2 ? -.65 : .65}deg) translateY(1.25px)` },
      { transform: `rotate(${order % 2 ? .28 : -.28}deg) translateY(-.5px)` },
      { transform: 'rotate(0deg) translateY(0)' }
    ], { duration: 980, delay: 90 + order * 34, easing: 'cubic-bezier(.25,.75,.25,1)' });
  });
}

function updateProgress() {
  const count = selected.size;
  progressCount.textContent = count;
  progressRing.style.setProperty('--progress-offset', `${113.1 * (1 - count / 4)}`);
  progressTitle.textContent = prompts[count][0];
  progressHint.textContent = prompts[count][1];
  progressHint.hidden = count === 4;
  progressToast.classList.toggle('is-complete', count === 4);
  liveRegion.textContent = `${count} из 4. ${prompts[count][1]}`;
}

function burstConfetti() {
  confetti.replaceChildren();
  const colors = ['#ff2d55', '#fed42b', '#00d4ff', '#b8ff5a', '#b48cff', '#ffffff', '#ff7a45'];
  const halfWidth = 187.5;
  const halfHeight = 406;
  for (let i = 0; i < 132; i += 1) {
    const piece = document.createElement('i');
    const angle = Math.random() * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const distanceToEdge = Math.min(
      halfWidth / Math.max(.01, Math.abs(cosine)),
      halfHeight / Math.max(.01, Math.abs(sine))
    );
    const distance = distanceToEdge + 24 + Math.random() * 90;
    piece.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    piece.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    piece.style.setProperty('--rot', `${(Math.random() - .5) * 1440}deg`);
    piece.style.setProperty('--w', `${7 + Math.random() * 10}px`);
    piece.style.setProperty('--h', `${i % 4 === 0 ? 7 + Math.random() * 6 : 3 + Math.random() * 5}px`);
    piece.style.setProperty('--radius', i % 4 === 0 ? '50%' : '2px');
    piece.style.setProperty('--color', colors[i % colors.length]);
    piece.style.setProperty('--duration', `${1550 + Math.random() * 850}ms`);
    piece.style.setProperty('--delay', `${Math.random() * 130}ms`);
    confetti.appendChild(piece);
  }
}

function showFinale() {
  if (selected.size !== 4 || finalizing) return;
  finalizing = true;
  autoScroll = false;
  finalGrid.replaceChildren();
  const deviceRect = device.getBoundingClientRect();
  const chosenCards = [...selected].map(index => {
    const copies = [...document.querySelectorAll(`.card[data-index="${index}"]`)];
    const source = copies.sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      const aDistance = Math.abs(aRect.left + aRect.width / 2 - (deviceRect.left + 187.5)) + Math.abs(aRect.top + aRect.height / 2 - (deviceRect.top + 406));
      const bDistance = Math.abs(bRect.left + bRect.width / 2 - (deviceRect.left + 187.5)) + Math.abs(bRect.top + bRect.height / 2 - (deviceRect.top + 406));
      return aDistance - bDistance;
    })[0];
    return { index, source };
  });
  const targets = [
    { left: 57, top: 214 }, { left: 193, top: 214 },
    { left: 57, top: 432 }, { left: 193, top: 432 }
  ];

  chosenCards.forEach(({ index, source }, order) => {
    const data = CARD_DATA[index];
    const finalCard = document.createElement('div');
    finalCard.className = 'final-card';
    finalCard.innerHTML = `<img class="card__image" src="${data.image}" alt="${data.title}">`;
    finalGrid.appendChild(finalCard);

    const rect = source
      ? source.getBoundingClientRect()
      : { left: deviceRect.left + 125, top: deviceRect.top + 303, width: 124, height: 206 };
    const flyer = document.createElement('div');
    flyer.className = 'flying-card';
    flyer.style.left = `${rect.left - deviceRect.left}px`;
    flyer.style.top = `${rect.top - deviceRect.top}px`;
    flyer.style.width = `${rect.width}px`;
    flyer.style.height = `${rect.height}px`;
    flyer.style.transform = `rotate(${(order - 1.5) * 2.2}deg)`;
    flyer.innerHTML = `<img class="card__image" src="${data.image}" alt="">`;
    device.appendChild(flyer);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      flyer.style.left = `${targets[order].left}px`;
      flyer.style.top = `${targets[order].top}px`;
      flyer.style.width = '124px';
      flyer.style.height = '206px';
      flyer.style.transform = 'rotate(0deg)';
    }));
    setTimeout(() => flyer.remove(), 1120);
  });

  finale.classList.add('is-active');
  finale.setAttribute('aria-hidden', 'false');
  burstConfetti();
  setTimeout(() => {
    finale.classList.add('is-settled');
    liveRegion.textContent = 'Четыре идеи собраны.';
  }, 900);
}

function resetPrototype(showIntro = false) {
  clearTimeout(autoStartTimer);
  selected = new Set();
  interacted = false;
  finalizing = false;
  exitFocusMode(true);
  gridTouches.clear();
  focusTouches.clear();
  autoScroll = showIntro ? false : !matchMedia('(prefers-reduced-motion: reduce)').matches;
  fieldPosition = { x: FIELD_ORIGIN, y: FIELD_ORIGIN };
  velocity = { x: -0.015, y: 0.021 };
  explore.classList.remove('is-interacted');
  intro.classList.toggle('is-hidden', !showIntro);
  intro.setAttribute('aria-hidden', String(!showIntro));
  finale.classList.remove('is-active', 'is-settled');
  finale.setAttribute('aria-hidden', 'true');
  finalGrid.replaceChildren();
  confetti.replaceChildren();
  document.querySelectorAll('.flying-card').forEach(card => card.remove());
  document.querySelectorAll('.filter').forEach(button => {
    button.classList.remove('is-active');
    button.setAttribute('aria-pressed', 'false');
  });
  renderCards(ALL_EVENT_INDICES, true);
  updateProgress();
  constrainPosition();
  renderField();
}

function returnToIntro() {
  device.classList.add('is-instant-screen-change');
  void device.offsetWidth;
  resetPrototype(true);
  requestAnimationFrame(() => device.classList.remove('is-instant-screen-change'));
}

viewport.addEventListener('pointerdown', event => {
  if (finalizing) return;
  if (event.pointerType === 'touch') {
    gridTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gridTouches.size === 2) {
      gridPinching = true;
      gridPinchStart = pointerDistance(gridTouches);
      dragging = false;
      pressedCard = null;
      moved = true;
      viewport.setPointerCapture(event.pointerId);
      return;
    }
  }
  activateInteraction();
  dragging = true;
  moved = false;
  pressedCard = event.target.closest('.card');
  pointerStart = { x: event.clientX, y: event.clientY };
  fieldStart = { ...fieldPosition };
  viewport.classList.add('is-dragging');
  viewport.setPointerCapture(event.pointerId);
});

viewport.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch' && gridTouches.has(event.pointerId)) {
    gridTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gridPinching && gridTouches.size >= 2) {
      if (pointerDistance(gridTouches) - gridPinchStart > 34) enterFocusMode();
      return;
    }
  }
  if (!dragging) return;
  const dx = event.clientX - pointerStart.x;
  const dy = event.clientY - pointerStart.y;
  if (Math.hypot(dx, dy) > 6) moved = true;
  fieldPosition.x = fieldStart.x + dx;
  fieldPosition.y = fieldStart.y + dy;
  const shift = constrainPosition();
  fieldStart.x += shift.x;
  fieldStart.y += shift.y;
  renderField();
});

function endDrag() {
  dragging = false;
  pressedCard = null;
  viewport.classList.remove('is-dragging');
  setTimeout(() => { moved = false; }, 0);
}

viewport.addEventListener('pointerup', event => {
  if (event.pointerType === 'touch' && gridPinching) {
    gridTouches.delete(event.pointerId);
    if (gridTouches.size === 0) {
      gridPinching = false;
      moved = false;
    }
    return;
  }
  if (event.pointerType === 'touch') gridTouches.delete(event.pointerId);
  if (!dragging) return;
  const tappedCard = !moved ? pressedCard : null;
  if (tappedCard) chooseCard(tappedCard, Number(tappedCard.dataset.index));
  endDrag();
});
viewport.addEventListener('pointercancel', event => {
  gridTouches.delete(event.pointerId);
  if (gridTouches.size === 0) gridPinching = false;
  endDrag();
});
viewport.addEventListener('wheel', event => {
  event.preventDefault();
  if (event.ctrlKey) {
    if (event.deltaY < 0) enterFocusMode();
    return;
  }
  activateInteraction();
  fieldPosition.x -= event.deltaX || event.deltaY * .28;
  fieldPosition.y -= event.deltaY;
  constrainPosition();
  renderField();
}, { passive: false });

viewport.addEventListener('gestureend', event => {
  if (event.scale > 1.08) enterFocusMode();
});

focusMode.addEventListener('pointerdown', event => {
  if (event.target.closest('.focus-back, .focus-card__heart')) return;
  focusTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
  focusMode.setPointerCapture(event.pointerId);
  if (focusTouches.size === 1) focusSwipeStart = { x: event.clientX, y: event.clientY };
  if (focusTouches.size === 2) {
    focusPinching = true;
    focusPinchStart = pointerDistance(focusTouches);
  }
});

focusMode.addEventListener('pointermove', event => {
  if (!focusTouches.has(event.pointerId)) return;
  focusTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (focusPinching && focusTouches.size >= 2 && focusPinchStart - pointerDistance(focusTouches) > 34) {
    exitFocusMode();
  }
});

focusMode.addEventListener('pointerup', event => {
  const wasSinglePointer = focusTouches.size === 1 && !focusPinching;
  focusTouches.delete(event.pointerId);
  if (wasSinglePointer && focusSwipeStart) {
    const dx = event.clientX - focusSwipeStart.x;
    const dy = event.clientY - focusSwipeStart.y;
    if (Math.hypot(dx, dy) > 44) {
      if (Math.abs(dx) > Math.abs(dy)) moveFocus(dx < 0 ? 'right' : 'left');
      else moveFocus(dy < 0 ? 'down' : 'up');
    }
  }
  if (focusTouches.size === 0) {
    focusPinching = false;
    focusSwipeStart = null;
  }
});

focusMode.addEventListener('pointercancel', event => {
  focusTouches.delete(event.pointerId);
  if (focusTouches.size === 0) focusPinching = false;
});

focusMode.addEventListener('wheel', event => {
  if (!event.ctrlKey) return;
  event.preventDefault();
  if (event.deltaY > 0) exitFocusMode();
}, { passive: false });

focusMode.addEventListener('gestureend', event => {
  if (event.scale < .92) exitFocusMode();
});

document.addEventListener('keydown', event => {
  if (!intro.classList.contains('is-hidden')) return;
  if (!focusMode.classList.contains('is-active') && (event.key === '+' || event.key === '=')) {
    enterFocusMode();
    return;
  }
  if (!focusMode.classList.contains('is-active')) return;
  if (event.key === 'Escape') exitFocusMode();
  if (event.key === 'ArrowLeft') moveFocus('left');
  if (event.key === 'ArrowRight') moveFocus('right');
  if (event.key === 'ArrowUp') moveFocus('up');
  if (event.key === 'ArrowDown') moveFocus('down');
});

const filterButtons = [...document.querySelectorAll('.filter')];
filterButtons.forEach((button, monthIndex) => {
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    activateInteraction();
    const isActive = button.classList.toggle('is-active');
    button.setAttribute('aria-pressed', String(isActive));
    const activeMonths = filterButtons
      .map((item, index) => item.classList.contains('is-active') ? index : -1)
      .filter(index => index >= 0);
    const orderedMonths = isActive
      ? [monthIndex, ...activeMonths.filter(index => index !== monthIndex)]
      : activeMonths;
    const filteredEvents = [];
    const seenEvents = new Set();
    for (let position = 0; position < 12; position += 1) {
      orderedMonths.forEach(index => {
        const eventIndex = MONTH_EVENT_SETS[index][position];
        if (seenEvents.has(eventIndex)) return;
        seenEvents.add(eventIndex);
        filteredEvents.push(eventIndex);
      });
    }
    rebuildGrid(activeMonths.length ? filteredEvents : ALL_EVENT_INDICES, activeMonths.length === 0);
    liveRegion.textContent = activeMonths.length
      ? `Выбрано месяцев: ${activeMonths.length}. Событий: ${filteredEvents.length}.`
      : 'Фильтр снят. Показаны все события.';
  });
});

introStart.addEventListener('click', startExplore);
focusBack.addEventListener('click', () => exitFocusMode());
viewButton.addEventListener('click', showFinale);
document.querySelector('#desktopReset')?.addEventListener('click', () => resetPrototype(true));
document.querySelector('#finalReset').addEventListener('click', returnToIntro);
window.addEventListener('resize', () => { constrainPosition(); renderField(); });

renderCards();
updateProgress();
constrainPosition();
renderField();
requestAnimationFrame(autoMove);
