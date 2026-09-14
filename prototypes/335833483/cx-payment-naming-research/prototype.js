/* Behaviours for the static research copy. Product controls retain their source markup. */
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const cards = $$('[data-seo="hotel_snippet"]');
  const initialOrder = cards.map(card => card.closest('li') || card);
  const numeric = text => Number(text.replace(/[^0-9]/g, ''));
  const price = card => numeric($('[data-qa="price"]', card)?.textContent || '0');
  const rating = card => Number(($('[aria-label^="Оценка"]', card)?.getAttribute('aria-label') || '').replace(/[^0-9,.]/g, '').replace(',', '.'));

  // Offline page: do not follow the captured product's links or submit its forms.
  document.addEventListener('click', event => {
    if (event.target.closest('a[href="#"]')) event.preventDefault();
  });
  document.addEventListener('submit', event => event.preventDefault());

  $$('button[data-qa="toggler"][aria-controls]').forEach(button => {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
      const chevron = $('.XX7K7', button);
      if (chevron) chevron.style.transform = expanded ? 'rotate(180deg)' : '';
    });
  });

  const clear = $$('button').find(button => button.textContent.trim() === 'Сбросить');
  const filters = $$('.IlVak input[type="checkbox"], .IlVak input[type="radio"]');
  const updateClear = () => { if (clear) clear.disabled = !filters.some(input => input.checked && !input.defaultChecked); };
  filters.forEach(input => input.addEventListener('change', updateClear));
  clear?.addEventListener('click', () => {
    filters.forEach(input => { input.checked = input.defaultChecked; });
    updateClear();
  });

  $$('[data-seo="hotel_snippet"] button[title]').filter(button => /избранное/.test(button.getAttribute('title'))).forEach(button => {
    button.classList.add('research-favorite');
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      const checked = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(checked));
      button.setAttribute('aria-label', checked ? 'Удалить из избранного' : 'Добавить в избранное');
      button.setAttribute('title', checked ? 'Удалить из избранного' : 'Добавить в избранное');
    });
  });

  const destination = $('.hotelsSearchForm input[role="combobox"]');
  $$('button[aria-label="Очистить поле"]').forEach(button => button.addEventListener('click', () => {
    if (destination) { destination.value = ''; destination.focus(); }
  }));

  // Exact published popup subtree, captured from the live sorting control.
  const trigger = $('[data-qa="trigger-control"]');
  const options = [
    ['relevant-first', 'Популярные'], ['cheap-first', 'Сначала дешевле'],
    ['expensive-first', 'Сначала дороже'], ['high-rating-first', 'Высокий рейтинг']
  ];
  const check = '<svg width="16" height="16" fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M13.7503 3.84004C14.1172 3.42725 14.7475 3.38312 15.1603 3.75004C15.5731 4.11695 15.6172 4.74725 15.2503 5.16004L8.11448 12.0018C8.06434 12.0564 8.06434 12.0564 8.01071 12.1076C7.40195 12.6694 6.45296 12.6314 5.89109 12.0226L2.75985 8.68004C2.38527 8.27419 2.41367 7.63461 2.81952 7.26004C3.22536 6.88546 3.85542 6.91419 4.23 7.32004L6.9864 10.2605L13.7503 3.84004Z" fill="currentColor"></path></svg>';
  const popup = document.createElement('div');
  popup.id = 'research-sort-popup';
  popup.className = '_8tU4s f49UU _9MOQ8 wDrws NPrA8 Eqn7e i9Gsh';
  popup.hidden = true;
  popup.innerHTML = '<div><div class="QBZ4D RC98J" data-qa="optionsPopup">' + options.map(([value, label], i) => '<div class="qakch' + (i === 0 ? ' H7kTN' : '') + '"><div class="fOUkL">' + (i === 0 ? check : '') + '</div><button class="wvj-M B-tNC" type="button" data-index="' + i + '" data-qa="' + value + '-option">' + label + '</button></div>').join('') + '</div></div>';
  document.body.append(popup);
  let selected = 0;
  const closeSort = () => { popup.hidden = true; trigger?.setAttribute('aria-expanded', 'false'); };
  const openSort = () => {
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    popup.hidden = false;
    const pop = popup.getBoundingClientRect();
    popup.style.left = Math.max(8, rect.right - pop.width) + 'px';
    popup.style.top = (rect.bottom + pop.height + 8 <= innerHeight ? rect.bottom + 4 : rect.top - pop.height - 4) + 'px';
    trigger.setAttribute('aria-expanded', 'true');
    $$('button', popup)[selected].focus();
  };
  trigger?.setAttribute('aria-label', 'Сортировка');
  trigger?.setAttribute('aria-haspopup', 'true');
  trigger?.setAttribute('aria-expanded', 'false');
  trigger?.addEventListener('click', () => popup.hidden ? openSort() : closeSort());
  $$('button', popup).forEach((button, index) => button.addEventListener('click', () => {
    selected = index;
    const ordered = [...initialOrder];
    if (index === 1 || index === 2) ordered.sort((a, b) => (price(a) - price(b)) * (index === 1 ? 1 : -1));
    if (index === 3) ordered.sort((a, b) => rating(b) - rating(a));
    const parent = initialOrder[0]?.parentElement;
    ordered.forEach(item => parent?.append(item));
    const label = $('.Cyu0A', trigger);
    if (label) [...label.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).forEach(n => { n.textContent = options[index][1]; });
    $$('.qakch', popup).forEach((row, i) => {
      row.classList.toggle('H7kTN', index === i);
      $('.fOUkL', row).innerHTML = index === i ? check : '';
    });
    closeSort(); trigger.focus();
  }));
  document.addEventListener('click', event => { if (!popup.contains(event.target) && !trigger?.contains(event.target)) closeSort(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !popup.hidden) { closeSort(); trigger?.focus(); }
    if (!popup.hidden && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      const buttons = $$('button', popup);
      const current = buttons.indexOf(document.activeElement);
      buttons[(current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus();
    }
  });
  window.addEventListener('scroll', closeSort, true);
  window.addEventListener('resize', closeSort);
})();
