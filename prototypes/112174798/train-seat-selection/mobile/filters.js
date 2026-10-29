/* This iteration exposes only carriage types / Sapsan service classes.
   Multiple chips can be selected; no selection means all categories. */
(() => {
  const typeKeys = window.SeatSelectionSapsan?.filterTypes || window.SeatSelectionDoubleDeck?.filterTypes || ['platskart', 'coupe', 'sv'];
  const chips = [...document.querySelectorAll('.m-filters [data-filter]')]
    .filter(chip => typeKeys.includes(chip.dataset.filter));
  const applied = new Set(chips.filter(chip => chip.getAttribute('aria-pressed') === 'true')
    .map(chip => chip.dataset.filter));
  const sync = () => {
    chips.forEach(chip => chip.setAttribute('aria-pressed', String(applied.has(chip.dataset.filter))));
    window.dispatchEvent(new CustomEvent('seat-filters-change', {detail: [...applied]}));
  };
  chips.forEach(chip => chip.addEventListener('click', () => {
    const key = chip.dataset.filter;
    if (applied.has(key)) applied.delete(key);
    else applied.add(key);
    sync();
  }));
  document.querySelector('[data-reset-filters]')?.addEventListener('click', () => {
    applied.clear();
    sync();
  });
  sync();
})();
