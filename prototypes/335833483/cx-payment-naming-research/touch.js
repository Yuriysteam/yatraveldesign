/* Local touch research copy: shared naming, native sheets and fixed availability. */
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const labels = [
    'Постоплата на месте',
    'Частичная предоплата',
    'Частичная постоплата',
    'Оплата при заселении',
    'Оплата на месте'
  ];
  const storageKey = 'travel-research-payment-variant';
  let selected = 0;
  try {
    const saved = sessionStorage.getItem(storageKey);
    if (/^[1-5]$/.test(saved || '')) selected = Number(saved) - 1;
  } catch (_) { /* Storage is optional for a local file. */ }
  const updateLabels = () => {
    $$('[data-payment-label]').forEach(label => { label.textContent = labels[selected]; });
  };
  updateLabels();

  document.addEventListener('click', event => {
    if (event.target.closest('a[href="#"]')) event.preventDefault();
  });
  document.addEventListener('submit', event => {
    if (event.target.getAttribute('method') !== 'dialog') event.preventDefault();
  });

  const sheets = ['touch-filters', 'touch-details', 'touch-map', 'touch-sort']
    .map(id => document.getElementById(id)).filter(Boolean);
  const filtersSheet = $('#touch-filters');
  const detailsSheet = $('#touch-details');
  const mapSheet = $('#touch-map');
  const sortSheet = $('#touch-sort');
  let closeMenu = () => {};
  let scrollLock = null;

  const lockPage = () => {
    if (scrollLock) return;
    const body = document.body.style;
    const rect = document.body.getBoundingClientRect();
    scrollLock = {
      x: window.scrollX, y: window.scrollY,
      position: body.position, top: body.top, left: body.left, right: body.right,
      width: body.width, overflow: body.overflow,
      rootOverflow: document.documentElement.style.overflow
    };
    body.position = 'fixed';
    body.top = -scrollLock.y + 'px';
    body.left = rect.left + 'px';
    body.right = 'auto';
    body.width = rect.width + 'px';
    body.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  };
  const unlockPage = () => {
    if (!scrollLock || sheets.some(sheet => sheet.open)) return;
    const saved = scrollLock;
    scrollLock = null;
    const body = document.body.style;
    ['position', 'top', 'left', 'right', 'width', 'overflow'].forEach(property => { body[property] = saved[property]; });
    document.documentElement.style.overflow = saved.rootOverflow;
    window.scrollTo(saved.x, saved.y);
  };
  const syncSheetControls = sheet => {
    $$('[aria-controls]').filter(button => button.getAttribute('aria-controls') === sheet.id)
      .forEach(button => button.setAttribute('aria-expanded', String(sheet.open)));
  };
  const closeSheet = sheet => {
    if (!sheet?.open) return;
    sheet.close();
    syncSheetControls(sheet);
    unlockPage();
  };
  const openSheet = sheet => {
    if (!sheet || sheet.open) return;
    closeMenu();
    sheets.filter(other => other !== sheet).forEach(closeSheet);
    lockPage();
    try {
      sheet.showModal();
      syncSheetControls(sheet);
    } catch (error) {
      unlockPage();
      throw error;
    }
  };
  sheets.forEach(sheet => {
    sheet.addEventListener('close', () => {
      syncSheetControls(sheet);
      unlockPage();
    });
    sheet.addEventListener('cancel', event => {
      event.preventDefault();
      closeSheet(sheet);
    });
    sheet.addEventListener('click', event => {
      if (event.target !== sheet) return;
      const rect = sheet.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSheet(sheet);
    });
    $$('[data-sheet-close]', sheet).forEach(button => button.addEventListener('click', event => {
      event.preventDefault();
      closeSheet(sheet);
    }));
  });
  const bindSheet = (selector, sheet, beforeOpen = () => {}, afterOpen = () => {}) => {
    if (!sheet) return;
    $$(selector).forEach(button => {
      button.setAttribute('aria-controls', sheet.id);
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', event => {
        event.preventDefault();
        beforeOpen(button);
        openSheet(sheet);
        afterOpen(button);
      });
    });
  };

  const cards = $$('[data-seo="hotel_snippet"]').map((card, index) => ({
    card, index, item: card.closest('li') || card,
    available: card.getAttribute('data-payment-available') === 'true'
  }));
  const results = $('[data-touch-results]') || cards[0]?.item.parentElement;
  const filter = $('input[data-payment-filter]');
  const applyButton = $('[data-filter-apply]');
  let appliedPaymentFilter = false;
  const variantWord = count => count % 10 === 1 && count % 100 !== 11 ? 'вариант' :
    count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'варианта' : 'вариантов';
  const updateDraftCount = () => {
    const count = cards.filter(({ available }) => !filter?.checked || available).length;
    if (applyButton) {
      const label = $('[data-filter-apply-label]', applyButton) || applyButton;
      label.textContent = 'Показать ' + count + ' ' + variantWord(count);
    }
  };
  const applyVisibility = () => {
    cards.forEach(({ item, available }) => { item.hidden = appliedPaymentFilter && !available; });
    $$('[data-touch-filter-count]').forEach(badge => {
      const label = $('span', badge) || badge;
      label.textContent = String(1 + Number(appliedPaymentFilter));
    });
    $$('[data-open-filters="payment"]').forEach(button => {
      button.classList.toggle('_4KlSC', appliedPaymentFilter);
      button.classList.toggle('jNuum', !appliedPaymentFilter);
      if (appliedPaymentFilter) button.setAttribute('data-filteractive', 'true');
      else button.removeAttribute('data-filteractive');
      button.setAttribute('aria-pressed', String(appliedPaymentFilter));
    });
  };
  const scrollToResults = () => requestAnimationFrame(() => results?.scrollIntoView({ block: 'start', behavior: 'auto' }));
  filter?.addEventListener('change', updateDraftCount);
  bindSheet('[data-open-filters]', filtersSheet, () => {
    if (filter) filter.checked = appliedPaymentFilter;
    updateDraftCount();
  }, button => {
    requestAnimationFrame(() => {
      if (!filtersSheet?.open) return;
      const scroller = $('.Z24dD', filtersSheet);
      const section = button.getAttribute('data-open-filters');
      const target = section === 'payment' ? $('#touch-payment-group', filtersSheet) :
        section === 'price' ? $('#touch-price-group', filtersSheet) : null;
      if (scroller) scroller.scrollTop = target ? Math.max(0, target.offsetTop - 20) : 0;
    });
  });
  if (filtersSheet) {
    $$('[data-filter-reset]', filtersSheet).forEach(button => button.addEventListener('click', event => {
      event.preventDefault();
      $$('input[type="checkbox"], input[type="radio"]', filtersSheet).forEach(input => { input.checked = input.defaultChecked; });
      if (filter) filter.checked = false;
      updateDraftCount();
    }));
  }
  applyButton?.addEventListener('click', event => {
    event.preventDefault();
    appliedPaymentFilter = Boolean(filter?.checked);
    applyVisibility();
    closeSheet(filtersSheet);
    scrollToResults();
  });
  applyVisibility();
  updateDraftCount();

  // The same collapsible filter groups as the desktop capture.
  $$('button[data-qa="toggler"][aria-controls]', filtersSheet).forEach(button => {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
      panel.setAttribute('aria-hidden', String(expanded));
      const chevron = $('.XX7K7', button);
      if (chevron) chevron.style.transform = expanded ? 'rotate(180deg)' : '';
    });
  });

  // More deliberately opens only on tap/click; the sheet text is never rewritten.
  bindSheet('[data-payment-details]', detailsSheet);
  bindSheet('[data-open-map]', mapSheet);
  bindSheet('[data-open-sort]', sortSheet);
  const numeric = value => Number(String(value).replace(/[^0-9]/g, ''));
  const price = ({ card }) => numeric(card.getAttribute('data-price') || $('[data-qa="price"]', card)?.textContent || '0');
  const rating = ({ card }) => Number((card.getAttribute('data-rating') || $('[aria-label^="Оценка"]', card)?.getAttribute('aria-label') || '0')
    .replace(/[^0-9,.]/g, '').replace(',', '.'));
  let sortMode = 'relevant';
  const sortButtons = sortSheet ? $$('[data-sort]', sortSheet) : [];
  const sortLabels = { relevant: 'Популярные', cheap: 'Сначала дешевле', rating: 'Высокий рейтинг' };
  const updateSortSelection = () => {
    sortButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-sort') === sortMode));
    });
    $$('[data-open-sort]').forEach(button => {
      const label = $('[data-sort-label]', button) || $('.eh5Br', button) || button;
      label.textContent = sortLabels[sortMode];
    });
  };
  sortButtons.forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    const next = button.getAttribute('data-sort');
    if (!['relevant', 'cheap', 'rating'].includes(next)) return;
    sortMode = next;
    const ordered = [...cards];
    ordered.sort((a, b) => (sortMode === 'cheap' ? price(a) - price(b) : sortMode === 'rating' ? rating(b) - rating(a) : 0) || a.index - b.index);
    const parent = cards[0]?.item.parentElement;
    ordered.forEach(({ item }) => parent?.append(item));
    updateSortSelection();
    closeSheet(sortSheet);
    scrollToResults();
  }));
  updateSortSelection();

  $$('[data-seo="hotel_snippet"] button[title]').filter(button => /избранное/.test(button.title)).forEach(button => {
    button.classList.add('research-favorite');
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', event => {
      event.preventDefault();
      const active = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(active));
      button.title = active ? 'Удалить из избранного' : 'Добавить в избранное';
      button.setAttribute('aria-label', button.title);
    });
  });

  const trigger = $('.GQ6Wl');
  if (!trigger) return;
  // Published sorting-popup classes and check artwork, with numeric labels only.
  const check = '<svg width="16" height="16" fill="none" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" focusable="false"><path d="M13.7503 3.84004C14.1172 3.42725 14.7475 3.38312 15.1603 3.75004C15.5731 4.11695 15.6172 4.74725 15.2503 5.16004L8.11448 12.0018C8.06434 12.0564 8.06434 12.0564 8.01071 12.1076C7.40195 12.6694 6.45296 12.6314 5.89109 12.0226L2.75985 8.68004C2.38527 8.27419 2.41367 7.63461 2.81952 7.26004C3.22536 6.88546 3.85542 6.91419 4.23 7.32004L6.9864 10.2605L13.7503 3.84004Z" fill="currentColor"></path></svg>';
  const popup = document.createElement('div');
  popup.id = 'payment-variant-popup';
  popup.className = '_8tU4s f49UU _9MOQ8 wDrws NPrA8 Eqn7e i9Gsh';
  popup.hidden = true;
  popup.innerHTML = '<div><div class="QBZ4D RC98J" role="menu" aria-label="Вариант">' + labels.map((_, index) => '<div class="qakch" role="none"><div class="fOUkL" aria-hidden="true"></div><button class="wvj-M B-tNC" type="button" role="menuitemradio" aria-checked="false" tabindex="-1" data-payment-variant="' + (index + 1) + '">' + (index + 1) + '</button></div>').join('') + '</div></div>';
  document.body.append(popup);
  const buttons = $$('button', popup);
  const rows = $$('.qakch', popup);
  const focusOption = index => {
    buttons.forEach((button, i) => { button.tabIndex = i === index ? 0 : -1; });
    buttons[index].focus({ preventScroll: true });
  };
  const updateSelection = () => rows.forEach((row, index) => {
    row.classList.toggle('H7kTN', index === selected);
    $('.fOUkL', row).innerHTML = index === selected ? check : '';
    buttons[index].setAttribute('aria-checked', String(index === selected));
    buttons[index].tabIndex = index === selected ? 0 : -1;
  });
  updateSelection();
  trigger.setAttribute('role', 'button');
  trigger.setAttribute('tabindex', '0');
  trigger.setAttribute('aria-label', 'Вариант');
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', popup.id);
  $$('a', trigger).forEach(link => {
    link.tabIndex = -1;
    link.setAttribute('aria-hidden', 'true');
  });
  closeMenu = (restoreFocus = false) => {
    if (popup.hidden) return;
    popup.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) trigger.focus({ preventScroll: true });
  };
  const openMenu = () => {
    sheets.forEach(closeSheet);
    const rect = trigger.getBoundingClientRect();
    popup.hidden = false;
    const pop = popup.getBoundingClientRect();
    popup.style.left = Math.max(8, Math.min(rect.left, innerWidth - pop.width - 8)) + 'px';
    const below = rect.bottom + 4;
    popup.style.top = Math.max(8, Math.min(below + pop.height + 8 <= innerHeight ? below : rect.top - pop.height - 4, innerHeight - pop.height - 8)) + 'px';
    trigger.setAttribute('aria-expanded', 'true');
    focusOption(selected);
  };
  const toggleMenu = () => popup.hidden ? openMenu() : closeMenu(true);
  trigger.addEventListener('click', event => {
    event.preventDefault();
    toggleMenu();
  });
  trigger.addEventListener('auxclick', event => event.preventDefault());
  trigger.addEventListener('keydown', event => {
    if (!['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return;
    if (event.key === 'Enter' || event.key === ' ') toggleMenu();
    else openMenu();
  });
  buttons.forEach((button, index) => button.addEventListener('click', () => {
    sheets.forEach(closeSheet);
    selected = index;
    updateLabels();
    updateSelection();
    try { sessionStorage.setItem(storageKey, String(selected + 1)); } catch (_) { /* Optional storage. */ }
    closeMenu(true);
  }));
  document.addEventListener('click', event => {
    if (!popup.contains(event.target) && !trigger.contains(event.target)) closeMenu();
  });
  document.addEventListener('focusin', event => {
    if (!popup.contains(event.target) && !trigger.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (popup.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMenu(true);
    } else if (popup.contains(document.activeElement) && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const current = buttons.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      focusOption(next);
    }
  }, true);
  window.addEventListener('scroll', () => closeMenu(), true);
  window.addEventListener('resize', () => closeMenu());
})();
