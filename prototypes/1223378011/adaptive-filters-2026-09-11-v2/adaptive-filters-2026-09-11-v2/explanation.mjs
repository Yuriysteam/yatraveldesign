const data = await import('./explanation-data.mjs' + new URL(import.meta.url).search);
const { applyExplanationTypography } = await import('./explanation-typography.mjs' + new URL(import.meta.url).search);
const { createFlowTooltips } = await import('./explanation-tooltips.mjs' + new URL(import.meta.url).search);
const { mountExplanationTabs } = await import('./explanation-tabs/generated.mjs' + new URL(import.meta.url).search);
const { mountFluidTables, disposeFluidTables } = await import('./explanation-fluid/generated.mjs' + new URL(import.meta.url).search);
const {
  EXPLANATION_INPUTS,
  EXPLANATION_HOUSING,
  EXPLANATION_PRIORITIES,
  EXPLANATION_STEPS,
  MIN_RECOMMENDATION_SCORE,
  SCORE_CAP,
} = data;
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const sections = [
  ['inputs', 'Какие вводные учитываем'],
  ['housing', 'Допустимость по типу жилья'],
  ['priorities', 'Как начисляются баллы'],
  ['assembly', 'Как складываются рекомендации'],
];
const statusLabels = { excluded_housing: 'Не подходит типу', no_supply: 'Нет предложений', below_threshold: 'Ниже порога', limit: 'За пределами топа', recommended: 'В рекомендации' };
const signedPoints = value => `${value >= 0 ? '+' : '−'}${Math.abs(value)}`;
const score = value => `<span class="explanation-score" data-level="${value >= 75 ? 'high' : value === 0 ? 'zero' : 'normal'}" aria-label="Итого ${escape(value)} баллов">${escape(value)}</span>`;
const factor = item => `<span class="explanation-factor" data-kind="${escape(item.kind)}" aria-label="${escape(item.label)}: ${escape(signedPoints(item.points))} баллов"><span>${escape(item.label)}</span><strong aria-hidden="true">${escape(signedPoints(item.points))}</strong></span>`;
const factorList = (items, { formula = false, empty = 'Нет условий' } = {}) => items.length
  ? `<div class="explanation-factor-list${formula ? ' is-formula' : ''}">${items.map((item, index) => formula ? `<span class="explanation-formula-term">${index ? '<span class="explanation-formula-plus" aria-hidden="true">+</span>' : ''}${factor(item)}</span>` : factor(item)).join('')}</div>`
  : `<span class="explanation-factor-empty">${escape(empty)}</span>`;
const badge = allowed => `<span class="explanation-badge" data-tone="${allowed ? 'yes' : 'no'}">${allowed ? 'Да' : 'Нет'}</span>`;
const intro = text => `<p class="explanation-intro">${escape(text)}</p>`;
const table = (headers, rows, className, label) => `<div class="explanation-table-wrap" tabindex="0" role="region" aria-label="${escape(label)}"><table class="${className}"><thead><tr>${headers.map(value => `<th scope="col">${escape(value)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
const hint = '<p class="explanation-scroll-hint">Таблицу можно прокручивать в сторону.</p>';
const flowConnector = '<svg class="explanation-flow-connector" viewBox="0 0 44 40" fill="none" aria-hidden="true" focusable="false"><path class="explanation-flow-connector-halo" d="M2 28C14 28 10 12 24 12H40"/><path d="M2 28C14 28 10 12 24 12H40M34 6L40 12L34 18"/><circle cx="2" cy="28" r="2"/></svg>';

function assemblyFlow() {
  const nodes = EXPLANATION_STEPS.map((step, index) => `<li><button type="button" class="explanation-flow-node" aria-describedby="explanation-step-tip-${index}" aria-expanded="false"><span class="explanation-flow-index" aria-hidden="true">${escape(step.index || String(index + 1).padStart(2, '0'))}</span><span class="explanation-flow-name">${escape(step.name)}</span><span class="explanation-flow-detail">${escape(step.detail)}</span><span class="explanation-flow-caption">${escape(step.rule)}</span></button>${index < EXPLANATION_STEPS.length - 1 ? flowConnector : ''}</li>`).join('');
  // Tooltips stay outside the horizontal scroller so its edges cannot clip them.
  const tooltips = EXPLANATION_STEPS.map((step, index) => `<span class="explanation-flow-tooltip" id="explanation-step-tip-${index}" role="tooltip" aria-hidden="true">${escape(step.note)}</span>`).join('');
  return '<h2 id="explanation-flow-heading">Порядок сборки</h2>' +
    `<div class="explanation-flow-wrap" tabindex="0" role="region" aria-labelledby="explanation-flow-heading"><ol class="explanation-flow" aria-labelledby="explanation-flow-heading">${nodes}</ol></div>` +
    '<p class="explanation-flow-hint">Детали — по наведению или нажатию на шаг.</p>' + tooltips;
}

function staticPanels() {
  const inputs = intro('Тип жилья ограничивает выбор. Остальные вводные добавляют баллы подходящим фильтрам.') + table(
    ['Вводная', 'Что считываем', 'Как влияет'],
    EXPLANATION_INPUTS.map(row => `<tr><td>${escape(row.name)}</td><td>${escape(row.values)}</td><td>${escape(row.effect)}</td></tr>`).join(''),
    'explanation-inputs-table', 'Вводные для рекомендаций') + hint;
  const housing = table(
    ['Фильтр', 'Любое жильё', 'Отель', 'Апартаменты', 'Загородное жильё', 'Почему так'],
    EXPLANATION_HOUSING.map(row => `<tr><td>${escape(row.label)}</td><td>${badge(row.all)}</td><td>${badge(row.hotel)}</td><td>${badge(row.apartment)}</td><td>${badge(row.countryHouse)}</td><td class="explanation-muted">${escape(row.note)}</td></tr>`).join(''),
    'explanation-housing-table', 'Допустимость рекомендованных фильтров по типу жилья') + hint;
  const priorities = intro('Для каждого фильтра есть основа и усилители. Складываем все сработавшие условия; усилители учитываем, только если сработала хотя бы одна основа.') + table(
    ['Фильтр', 'Основа', 'Усилители', 'Пояснение'],
    EXPLANATION_PRIORITIES.map(row => {
      const bases = row.factors.filter(item => item.kind === 'base');
      const boosts = row.factors.filter(item => item.kind === 'boost');
      return `<tr data-candidate-id="${escape(row.id)}"><td>${escape(row.label)}</td><td>${factorList(bases)}</td><td>${factorList(boosts, { empty: 'Нет усилителей' })}</td><td class="explanation-muted">${escape(row.note)}</td></tr>`;
    }).join(''),
    'explanation-priorities-table', 'Начисление баллов для всех фильтров') + hint + `<div class="explanation-notes"><p><strong>Итог — сумма вкладов.</strong> Например, летние даты +70 и «У моря» +19 дают кондиционеру 89 баллов. Если сумма выше ${SCORE_CAP}, итог ограничиваем ${SCORE_CAP}.</p><p><strong>Порог — ${MIN_RECOMMENDATION_SCORE}.</strong> Тип жилья не добавляет баллы: он только допускает или исключает фильтр. Баллы — гипотеза прототипа, не измеренный рост конверсии.</p></div>`;
  return { inputs, housing, priorities };
}

const dateRangeFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const pluralRules = new Intl.PluralRules('ru-RU');
const quantity = (count, one, few, many) => `${count} ${{ one, few, many }[pluralRules.select(count)] || many}`;
function scenarioSummary({ context, inspection }) {
  const { trip, recommendations } = inspection;
  const guests = quantity(trip.adults, 'взрослый', 'взрослых', 'взрослых') + ' · ' +
    (trip.children ? quantity(trip.children, 'ребёнок', 'ребёнка', 'детей') : 'без детей');
  const dates = dateRangeFormat.formatRange(new Date(`${context.dates.checkIn}T00:00:00Z`), new Date(`${context.dates.checkOut}T00:00:00Z`));
  const inputs = [
    guests,
    { sea: 'У моря', forest: 'У леса', city: 'Город', mountains: 'У гор' }[trip.geo],
    { all: 'Любое жильё', hotel: 'Отель', apartment: 'Апартаменты', countryHouse: 'Загородное жильё' }[trip.housing],
    `${dates} · ${quantity(trip.nights, 'ночь', 'ночи', 'ночей')}`,
    ...(trip.summer ? ['Летние даты'] : []),
    ...(trip.cool ? ['Прохладный сезон'] : []),
  ];
  const inputChips = inputs.map(value => `<span class="explanation-summary-chip">${escape(value)}</span>`).join('');
  const resultChips = recommendations.map(item => `<span class="explanation-summary-chip" data-filter-id="${escape(item.id)}">${escape(item.label)}</span>`).join('') ||
    '<span class="explanation-summary-empty">Нет подходящих фильтров</span>';
  return `<dl class="explanation-summary" aria-label="Вводные и рекомендации"><div class="explanation-summary-row"><dt>Вводные</dt><dd id="explanation-context">${inputChips}</dd></div><div class="explanation-summary-row"><dt>Рекомендации</dt><dd id="explanation-results">${resultChips}</dd></div></dl>`;
}

function assemblyPanel(snapshot) {
  if (!snapshot) return intro('Расчёт появится после загрузки параметров поездки.');
  const { candidates } = snapshot.inspection;
  const candidateRows = [...candidates].sort((a, b) => b.score - a.score || a.order - b.order).map(candidate => {
    const calculation = candidate.status === 'excluded_housing'
      ? '<span class="explanation-formula-empty">Тип жилья исключает фильтр</span>'
      : factorList(candidate.contributions, { formula: true, empty: 'Нет сработавших условий' });
    const cap = candidate.rawScore > candidate.score
      ? `<span class="explanation-formula-cap">Сумма ${escape(candidate.rawScore)} → максимум ${escape(candidate.score)}</span>`
      : '';
    return `<tr data-status="${candidate.status}" data-candidate-id="${escape(candidate.id)}"><td>${escape(candidate.label)}</td><td><div class="explanation-formula">${calculation}${cap}</div></td><td>${score(candidate.score)}</td><td><span class="explanation-badge" data-tone="${candidate.status === 'recommended' ? 'yes' : candidate.status === 'excluded_housing' ? 'no' : 'neutral'}">${statusLabels[candidate.status] || escape(candidate.status)}</span></td></tr>`;
  }).join('');
  return scenarioSummary(snapshot) + table(['Фильтр', 'Расчёт', 'Итог', 'Результат'], candidateRows, 'explanation-assembly-table', 'Расчёт рекомендаций для текущей поездки') + hint + assemblyFlow();
}

export function createExplanationView({ getSnapshot, capture = false, beforeOpen = () => {} }) {
  const toggle = document.querySelector('#explanation-toggle');
  const view = document.querySelector('#explanation-view');
  if (capture) { toggle.hidden = true; view.hidden = true; return; }
  const panels = staticPanels();
  const navigation = mountExplanationTabs(view, { sections, panels });
  applyExplanationTypography(view);
  mountFluidTables(view);
  const tooltips = createFlowTooltips(view);
  const tabs = [...view.querySelectorAll('[role="tab"]')];
  const scroll = view.querySelector('.explanation-scroll');
  const surfaces = ['#device', '#scenario-shell', '#scenario-launcher', '#scenario-backdrop'].map(selector => document.querySelector(selector));
  const saved = new Map();
  let open = false;
  let timer = 0;
  let frame = 0;
  let pausedSticker = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const sticker = document.querySelector('#closed-sticker');
  document.body.dataset.view = 'prototype';
  view.addEventListener('explanation:tab-change', () => {
    tooltips.hide();
    scroll.scrollTop = 0;
  });
  function restoreSurfaces() {
    for (const [surface, state] of saved) {
      surface.inert = state.inert;
      if (state.ariaHidden === null) surface.removeAttribute('aria-hidden');
      else surface.setAttribute('aria-hidden', state.ariaHidden);
    }
    const sidebar = document.querySelector('#scenario-shell');
    sidebar.setAttribute('aria-hidden', String(matchMedia('(max-width: 839px)').matches && sidebar.dataset.open !== 'true'));
    saved.clear();
  }
  function setOpen(next) {
    tooltips.hide();
    open = next;
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.innerHTML = open ? '<span>К прототипу</span>' : '<span>Как это работает</span>';
    if (open) {
      beforeOpen();
      const assembly = document.querySelector('#explanation-panel-assembly');
      disposeFluidTables(assembly);
      assembly.innerHTML = assemblyPanel(getSnapshot());
      applyExplanationTypography(assembly);
      mountFluidTables(assembly);
      view.hidden = false;
      view.inert = false;
      view.removeAttribute('aria-hidden');
      for (const surface of surfaces) {
        if (!saved.has(surface)) saved.set(surface, { inert: surface.inert, ariaHidden: surface.getAttribute('aria-hidden') });
        surface.inert = true;
        surface.setAttribute('aria-hidden', 'true');
      }
      if (sticker && !sticker.paused) { pausedSticker = true; sticker.pause(); }
      // Establish the entry frame before changing its transition target.
      void view.offsetHeight;
      frame = requestAnimationFrame(() => { document.body.dataset.view = 'explanation'; });
      navigation.select('inputs');
      scroll.scrollTop = 0;
      view.querySelector('.explanation-tabs').scrollLeft = 0;
      timer = setTimeout(() => { if (open) tabs[0].focus({ preventScroll: true }); }, reducedMotion.matches ? 0 : 680);
    } else {
      document.body.dataset.view = 'prototype';
      toggle.focus({ preventScroll: true });
      view.inert = true;
      view.setAttribute('aria-hidden', 'true');
      timer = setTimeout(() => {
        if (open) return;
        view.hidden = true;
        restoreSurfaces();
        if (pausedSticker && sticker && !document.querySelector('#closed-state').hidden) sticker.play().catch(() => {});
        pausedSticker = false;
      }, reducedMotion.matches ? 0 : 680);
    }
  }
  toggle.addEventListener('click', () => setOpen(!open));
  document.addEventListener('keydown', event => {
    if (open && event.key === 'Escape' && tooltips.hide()) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    if (open && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); setOpen(false); }
  }, true);
  return { isOpen: () => open };
}
