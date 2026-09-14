/* Research-only naming switch. The captured cards, ordering and availability stay intact. */
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
  } catch (_) {
    // The local copy also works when storage is unavailable.
  }

  const paymentLabels = $$('[data-payment-label]');
  const updateLabels = () => {
    paymentLabels.forEach(label => { label.textContent = labels[selected]; });
  };
  updateLabels();

  // Hide the list item, not only its card, so the result list has no empty slots.
  // No nodes are reinserted: the captured sorting control retains full ownership of order.
  const filter = $('input[data-payment-filter]');
  const cards = $$('[data-seo="hotel_snippet"]').map(card => ({
    item: card.closest('li') || card,
    available: card.getAttribute('data-payment-available') === 'true'
  }));
  const applyFilter = () => {
    cards.forEach(({ item, available }) => { item.hidden = Boolean(filter?.checked && !available); });
  };
  filter?.addEventListener('change', applyFilter);
  const clear = $$('button').find(button => button.textContent.trim() === 'Сбросить');
  clear?.addEventListener('click', applyFilter);
  filter?.form?.addEventListener('reset', () => queueMicrotask(applyFilter));
  applyFilter();

  const trigger = $('.GQ6Wl');
  if (!trigger) return;

  // This is the published Travel sorting popup subtree, with numeric choices only.
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
    buttons.forEach((button, buttonIndex) => { button.tabIndex = buttonIndex === index ? 0 : -1; });
    buttons[index].focus({ preventScroll: true });
  };
  const updateSelection = () => {
    rows.forEach((row, index) => {
      row.classList.toggle('H7kTN', index === selected);
      $('.fOUkL', row).innerHTML = index === selected ? check : '';
      buttons[index].setAttribute('aria-checked', String(index === selected));
      buttons[index].tabIndex = index === selected ? 0 : -1;
    });
  };
  updateSelection();

  // Every More button shares one unchanged explanation across all naming variants.
  const details = $('#payment-details-tooltip');
  const detailButtons = $$('button[data-payment-details]');
  let activeDetails = null;
  let detailsPinned = false;
  let detailsTimer;
  const cancelDetailsClose = () => clearTimeout(detailsTimer);
  const hideDetails = () => {
    cancelDetailsClose();
    if (details) details.hidden = true;
    activeDetails?.removeAttribute('aria-describedby');
    activeDetails?.removeAttribute('aria-expanded');
    activeDetails = null;
    detailsPinned = false;
  };
  const showDetails = button => {
    if (!details) return;
    if (activeDetails === button && !details.hidden) {
      cancelDetailsClose();
      return;
    }
    close();
    hideDetails();
    activeDetails = button;
    button.setAttribute('aria-describedby', details.id);
    button.setAttribute('aria-expanded', 'true');
    details.hidden = false;
    const rect = button.getBoundingClientRect();
    const tip = details.getBoundingClientRect();
    const above = rect.top - tip.height - 8;
    const top = above >= 8 ? above : rect.bottom + 8;
    details.style.left = Math.max(8, Math.min(rect.left + (rect.width - tip.width) / 2, innerWidth - tip.width - 8)) + 'px';
    details.style.top = Math.max(8, Math.min(top, innerHeight - tip.height - 8)) + 'px';
  };
  const scheduleDetailsClose = () => {
    cancelDetailsClose();
    detailsTimer = setTimeout(() => {
      if (!detailsPinned && !details?.contains(document.activeElement)) hideDetails();
    }, 180);
  };
  if (details) {
    details.hidden = true;
    detailButtons.forEach(button => {
      button.setAttribute('aria-controls', details.id);
      button.removeAttribute('aria-describedby');
      button.removeAttribute('aria-expanded');
      button.addEventListener('mouseenter', () => showDetails(button));
      button.addEventListener('mouseleave', scheduleDetailsClose);
      button.addEventListener('focus', () => showDetails(button));
      button.addEventListener('blur', () => queueMicrotask(() => {
        if (activeDetails === button && document.activeElement !== button && !details.contains(document.activeElement)) hideDetails();
      }));
      button.addEventListener('click', event => {
        event.preventDefault();
        if (activeDetails === button && detailsPinned && !details.hidden) hideDetails();
        else {
          showDetails(button);
          detailsPinned = true;
        }
      });
    });
    details.addEventListener('mouseenter', cancelDetailsClose);
    details.addEventListener('mouseleave', scheduleDetailsClose);
    document.addEventListener('focusin', event => {
      if (activeDetails && !activeDetails.contains(event.target) && !details.contains(event.target)) hideDetails();
    });
    document.addEventListener('click', event => {
      if (activeDetails && !activeDetails.contains(event.target) && !details.contains(event.target)) hideDetails();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !details.hidden) {
        event.preventDefault();
        event.stopImmediatePropagation();
        hideDetails();
      }
    }, true);
    window.addEventListener('scroll', hideDetails, true);
    window.addEventListener('resize', hideDetails);
  }

  // One keyboard target covers the unchanged two-part logo artwork.
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

  const close = (restoreFocus = false) => {
    if (popup.hidden) return;
    popup.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) trigger.focus({ preventScroll: true });
  };
  const open = () => {
    hideDetails();
    const rect = trigger.getBoundingClientRect();
    popup.hidden = false;
    const pop = popup.getBoundingClientRect();
    popup.style.left = Math.max(8, Math.min(rect.left, innerWidth - pop.width - 8)) + 'px';
    popup.style.top = Math.max(8, rect.bottom + pop.height + 8 <= innerHeight ? rect.bottom + 4 : rect.top - pop.height - 4) + 'px';
    trigger.setAttribute('aria-expanded', 'true');
    focusOption(selected);
  };
  const toggle = () => popup.hidden ? open() : close(true);
  trigger.addEventListener('click', event => {
    event.preventDefault();
    toggle();
  });
  trigger.addEventListener('auxclick', event => event.preventDefault());
  trigger.addEventListener('keydown', event => {
    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (event.key === 'Enter' || event.key === ' ') toggle();
      else open();
    }
  });

  buttons.forEach((button, index) => button.addEventListener('click', () => {
    hideDetails();
    selected = index;
    updateLabels();
    updateSelection();
    try { sessionStorage.setItem(storageKey, String(selected + 1)); } catch (_) { /* Optional storage. */ }
    close(true);
  }));

  document.addEventListener('click', event => {
    if (!popup.contains(event.target) && !trigger.contains(event.target)) close();
  });
  document.addEventListener('focusin', event => {
    if (!popup.contains(event.target) && !trigger.contains(event.target)) close();
  });
  // Capture prevents the independent captured sort popup from stealing Escape focus.
  document.addEventListener('keydown', event => {
    if (popup.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      close(true);
      return;
    }
    if (!popup.contains(document.activeElement)) return;
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const current = buttons.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      focusOption(next);
    }
  }, true);
  window.addEventListener('scroll', () => close(), true);
  window.addEventListener('resize', () => close());
})();
