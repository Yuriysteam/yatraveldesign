(() => {
  const item = '<div class="skeletons__auto-058 skeleton-item" data-qa="skeleton"></div>';
  document.getElementById('skeleton-steppers').innerHTML = Array.from({ length:3 }, () =>
    `<div class="skeleton-stepper"><div class="skeleton-stepper-copy">${item}${item}</div><div class="skeleton-stepper-controls">${item}${item}</div></div>`).join('');
  document.getElementById('skeleton-cards').innerHTML = Array.from({ length:3 }, () =>
    window.SeatSelectionCarriageCard.renderSkeleton('Mobile')).join('');
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'seat-selection-theme') return;
    document.documentElement.dataset.theme = event.data.theme === 'dark' ? 'dark' : 'light';
  });
})();
