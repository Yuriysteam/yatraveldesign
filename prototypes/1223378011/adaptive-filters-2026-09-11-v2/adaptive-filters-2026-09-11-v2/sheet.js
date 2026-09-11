// One shared selection state for popular filters, full sections and active copies.
const { createDemoFacets } = await import('./demo-facets.mjs' + new URL(import.meta.url).search);
const { createFilterMotion } = await import('./filter-motion.mjs' + new URL(import.meta.url).search);
const { createScenarioController, DEFAULT_SNAPSHOT } = await import('./scenario-controller.mjs' + new URL(import.meta.url).search);
const { inspectRecommendations } = await import('./recommendation-engine.mjs' + new URL(import.meta.url).search);
const { createExplanationView } = await import('./explanation.mjs' + new URL(import.meta.url).search);
const capture = new URLSearchParams(location.search).get('capture') === 'full';
// Keep the original Figma comparison separate from the authored enrichment.
if (capture) {
  document.querySelectorAll('.filter-section').forEach(section => section.remove());
  document.querySelector('.sheet-content').append(document.querySelector('#source-filter-template').content.cloneNode(true));
}
const device = document.querySelector('#device');
const sheet = document.querySelector('#sheet');
const closedState = document.querySelector('#closed-state');
const closedSticker = document.querySelector('#closed-sticker');
const content = document.querySelector('.sheet-content');
const chips = [...document.querySelectorAll('.filter-chip[data-filter]')];
const summary = document.querySelector('#result-summary');
const activeFilters = document.querySelector('#active-filters');
const activeTemplate = document.querySelector('#active-filter-template');
const reset = document.querySelector('#reset');
const selected = new Set();
let committed = [];
let committedPrice = [0, 60000];
let scenarioController = null;
let explanationSnapshot = null;
const price = { min: 0, max: 60000 };
const fields = { min: document.querySelector('#price-min'), max: document.querySelector('#price-max') };
const handles = { min: document.querySelector('[data-handle="min"]'), max: document.querySelector('[data-handle="max"]') };
const format = n => n.toLocaleString('ru-RU');
const priceIsActive = () => price.min > 0 || price.max < 60000;
const labels = new Map();
for (const chip of chips) {
  if (!labels.has(chip.dataset.filter)) labels.set(chip.dataset.filter, chip.dataset.sourceLabel.trim());
}
const facets = createDemoFacets(chips.map(chip => ({
  id: chip.dataset.filter,
  label: chip.dataset.sourceLabel,
  section: chip.closest('.filter-section').querySelector('h2').textContent.trim(),
})));

if (capture) {
  document.documentElement.dataset.capture = 'full';
  sheet.dataset.countsMode = 'figma-snapshot';
} else {
  sheet.dataset.countsMode = 'demo';
}
function fit() {
  device.style.zoom = String(capture ? 1 : Math.min(1, (document.documentElement.clientWidth - 48) / 375, (window.innerHeight - 64) / 812));
}
fit();
window.addEventListener('resize', fit);
const motion = createFilterMotion({ sheet, content, capture });
const recommendationSection = document.querySelector('[data-role="recommendations"]');
const recommendationGroup = recommendationSection?.querySelector('.chip-rows');
const recommendationChips = recommendationGroup ? [...recommendationGroup.querySelectorAll('.filter-chip')] : [];
function layoutRecommendations(visible) {
  if (!recommendationGroup) return;
  const hidden = recommendationChips.filter(chip => !visible.includes(chip));
  const capacity = recommendationGroup.clientWidth - 8;
  const fragment = document.createDocumentFragment();
  let row = null;
  let used = 0;
  for (const chip of visible) {
    const width = Number(chip.dataset.layoutWidth) || chip.offsetWidth;
    if (!row || used + 4 + width > capacity) {
      row = document.createElement('div');
      row.className = 'chip-row';
      fragment.append(row);
      used = 0;
    }
    row.append(chip);
    used += (used ? 4 : 0) + width;
  }
  if (hidden.length) {
    const reserve = document.createElement('div');
    reserve.className = 'recommendation-reserve';
    reserve.hidden = true;
    reserve.append(...hidden);
    fragment.append(reserve);
  }
  recommendationGroup.replaceChildren(fragment);
}
function updateRecommendations(context) {
  if (capture || !recommendationGroup || !recommendationChips.length) return;
  const result = facets.evaluate(selected, price);
  const inspection = inspectRecommendations(context, { selected, counts: result.counts });
  const recommendations = inspection.recommendations;
  explanationSnapshot = { context: structuredClone(context), inspection };
  const ordered = recommendations.map(item => recommendationChips.find(chip => chip.dataset.filter === item.id)).filter(Boolean);
  motion.run(() => {
    layoutRecommendations(ordered);
    recommendationSection.hidden = ordered.length === 0;
  }, { anchor: recommendationSection });
  recommendationSection.dataset.adaptive = 'true';
  scenarioController?.setRecommendations(recommendations);
}

function priceLabel() {
  if (price.min === 0) return 'До ' + format(price.max) + ' ₽';
  if (price.max === 60000) return 'От ' + format(price.min) + ' ₽';
  return format(price.min) + '–' + format(price.max) + ' ₽';
}
function renderActiveFilters() {
  const ids = [...selected, ...(priceIsActive() ? ['__price__'] : [])];
  const existing = new Map([...activeFilters.children].map(node => [node.dataset.removeFilter, node]));
  for (const [id, node] of existing) if (!ids.includes(id)) node.remove();
  ids.forEach((id, index) => {
    const label = id === '__price__' ? priceLabel() : labels.get(id);
    let node = existing.get(id);
    if (!node) {
      node = activeTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.removeFilter = id;
      node.addEventListener('click', () => removeFilter(id, node));
    }
    node.querySelector('.active-filter-name').textContent = label;
    node.setAttribute('aria-label', 'Убрать фильтр «' + label + '»');
    // Keep stable nodes and focus while other selections or counts change.
    if (activeFilters.children[index] !== node) activeFilters.insertBefore(node, activeFilters.children[index] || null);
  });
  activeFilters.hidden = ids.length === 0;
  reset.hidden = ids.length === 0;
}
function repaint() {
  // The unfolded source-comparison mode keeps Figma's snapshot counts.
  // Normal interaction uses one synthetic catalog, never random click multipliers.
  const result = capture ? null : facets.evaluate(selected, price);
  for (const chip of chips) {
    const id = chip.dataset.filter;
    const active = selected.has(id);
    chip.setAttribute('aria-pressed', String(active));
    chip.classList.toggle('ui__auto-064', active);
    chip.classList.toggle('button--secondary', !active);
    const count = chip.querySelector('.chip-count');
    if (count) {
      count.hidden = active;
      if (result) {
        const value = format(result.counts[id]);
        if (count.textContent !== value) count.textContent = value;
      }
    }
  }
  renderActiveFilters();
  const total = result ? result.total : 15000;
  summary.dataset.total = String(total);
  summary.textContent = total ? 'Нашли ' + format(total) + ' предложений' : 'Ничего не найдено';
}
function lockFilterRows() {
  if (capture) return;
  const gap = 4;
  const safety = 8;
  const scale = content.getBoundingClientRect().width / content.offsetWidth || 1;
  for (const group of document.querySelectorAll('.chip-rows')) {
    const items = [...group.querySelectorAll('.filter-chip')];
    const capacity = group.clientWidth - safety;
    const widths = new Map(items.map(chip => [chip, chip.getBoundingClientRect().width / scale]));
    for (const [chip, width] of widths) chip.dataset.layoutWidth = String(width);
    const fragment = document.createDocumentFragment();
    let row;
    let used = 0;
    for (const chip of items) {
      const width = widths.get(chip);
      if (!row || used + gap + width > capacity) {
        row = document.createElement('div');
        row.className = 'chip-row';
        fragment.append(row);
        used = 0;
      }
      row.append(chip);
      used += (used ? gap : 0) + width;
    }
    group.replaceChildren(fragment);
  }
  sheet.dataset.rowsLocked = 'true';
}
function preservePosition(anchor, update) {
  motion.run(update, { anchor });
}
function removeFilter(id, node) {
  const next = node.nextElementSibling || node.previousElementSibling;
  const hadFocus = document.activeElement === node;
  motion.run(() => {
    if (id === '__price__') {
      price.min = 0;
      price.max = 60000;
      renderPrice();
    } else {
      selected.delete(id);
      repaint();
    }
  });
  if (hadFocus) {
    const original = id === '__price__' ? fields.min : chips.find(chip => chip.dataset.filter === id && chip.getClientRects().length);
    (next?.isConnected ? next : original || document.querySelector('#apply')).focus({ preventScroll: true });
  }
}
for (const chip of chips) {
  chip.addEventListener('click', () => preservePosition(chip, () => {
    const id = chip.dataset.filter;
    selected.has(id) ? selected.delete(id) : selected.add(id);
    repaint();
  }));
}
document.querySelectorAll('.section-toggle').forEach(button => button.addEventListener('click', () => {
  motion.finish();
  const open = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!open));
  document.getElementById(button.getAttribute('aria-controls')).hidden = open;
}));
function renderPrice() {
  fields.min.value = format(price.min) + ' ₽';
  fields.max.value = format(price.max) + (price.max === 60000 ? '+' : '') + ' ₽';
  for (const key of ['min', 'max']) {
    handles[key].style.left = price[key] / 600 + '%';
    handles[key].setAttribute('aria-valuenow', String(price[key]));
  }
  handles.min.setAttribute('aria-valuemax', String(price.max));
  handles.max.setAttribute('aria-valuemin', String(price.min));
  const track = document.querySelector('[data-qa="0-track"]');
  track.style.left = price.min / 600 + '%';
  track.style.width = (price.max - price.min) / 600 + '%';
  repaint();
}
function updatePrice(key, value) {
  const n = Math.round(Math.max(0, Math.min(60000, value)) / 100) * 100;
  preservePosition(document.querySelector('.price-section'), () => {
    price[key] = key === 'min' ? Math.min(n, price.max) : Math.max(n, price.min);
    renderPrice();
  });
}
for (const key of ['min', 'max']) {
  fields[key].addEventListener('focus', () => { fields[key].value = String(price[key]); fields[key].select(); });
  fields[key].addEventListener('change', () => updatePrice(key, Number(fields[key].value.replace(/\D/g, '')) || 0));
  fields[key].addEventListener('blur', renderPrice);
  fields[key].addEventListener('keydown', e => { if (e.key === 'Enter') { fields[key].blur(); e.preventDefault(); } });
  handles[key].addEventListener('keydown', e => {
    let n = price[key];
    if (['ArrowLeft', 'ArrowDown'].includes(e.key)) n -= 500;
    else if (['ArrowRight', 'ArrowUp'].includes(e.key)) n += 500;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = 60000;
    else return;
    e.preventDefault();
    updatePrice(key, n);
  });
  handles[key].addEventListener('pointerdown', e => {
    e.preventDefault();
    handles[key].focus({ preventScroll: true });
    handles[key].setPointerCapture(e.pointerId);
    const move = event => {
      const rect = handles[key].parentElement.getBoundingClientRect();
      updatePrice(key, (event.clientX - rect.left) / rect.width * 60000);
    };
    const end = () => {
      handles[key].removeEventListener('pointermove', move);
      handles[key].removeEventListener('pointerup', end);
      handles[key].removeEventListener('pointercancel', end);
    };
    handles[key].addEventListener('pointermove', move);
    handles[key].addEventListener('pointerup', end);
    handles[key].addEventListener('pointercancel', end);
  });
}
reset.addEventListener('click', () => {
  motion.run(() => {
    selected.clear();
    price.min = 0;
    price.max = 60000;
    renderPrice();
    content.scrollTop = 0;
  }, { animate: content.scrollTop < 8 });
  document.querySelector('#apply').focus({ preventScroll: true });
});
function close(commit) {
  motion.finish();
  if (commit) {
    committed = [...selected];
    committedPrice = [price.min, price.max];
    window.dispatchEvent(new CustomEvent('filters:apply', { detail: { filters: [...committed], price: [...committedPrice], context: scenarioController?.getSnapshot() } }));
  } else {
    selected.clear();
    committed.forEach(id => selected.add(id));
    [price.min, price.max] = committedPrice;
    renderPrice();
  }
  sheet.hidden = true;
  closedState.hidden = false;
  closedSticker.muted = true;
  // The close/apply gesture starts playback; looping continues while this screen is open.
  // Reopening can cancel a pending play request, so handle that promise as well.
  closedSticker.play().catch(() => {});
  document.querySelector('#reopen').focus();
}
document.querySelector('.close-button').addEventListener('click', () => close(false));
document.querySelector('#apply').addEventListener('click', () => close(true));
document.querySelector('#reopen').addEventListener('click', () => {
  closedSticker.pause();
  closedState.hidden = true;
  sheet.hidden = false;
  content.scrollTop = 0;
  document.querySelector('.close-button').focus({ preventScroll: true });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !sheet.hidden && document.querySelector('#explanation-view').hidden && document.documentElement.dataset.scenarioOpen !== 'true') { close(false); e.preventDefault(); }
});
await document.fonts.ready;
repaint();
lockFilterRows();
scenarioController = createScenarioController({ capture, onChange: updateRecommendations });
updateRecommendations(DEFAULT_SNAPSHOT);
createExplanationView({ capture, getSnapshot: () => explanationSnapshot, beforeOpen: () => motion.finish() });
sheet.dataset.ready = 'true';
