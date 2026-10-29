(() => {
  const dialog = document.querySelector('[role="dialog"]');
  const mobile = document.documentElement.dataset.view === 'mobile';
  if (mobile) {
    document.getElementById('expired-title').classList.replace('ui__auto-532', 'H_Xab');
    document.querySelector('.expired-actions').prepend(document.getElementById('expired-refresh'));
  }
  const surface = dialog.parentElement;
  const backdrop = document.getElementById('expired-overlay');
  if (mobile) {
    surface.classList.add('sheet-motion');
    backdrop.classList.add('sheet-motion-backdrop');
  }
  const send = type => {
    const notify = () => window.top.postMessage({ type }, location.origin);
    if (mobile) window.SeatSelectionSheetMotion.leave(surface, notify, backdrop);
    else notify();
  };
  const dismiss = () => send('expired-results-dismiss');
  document.querySelector('.expired-close').addEventListener('click', dismiss);
  document.getElementById('expired-continue').addEventListener('click', dismiss);
  document.getElementById('expired-refresh').addEventListener('click', () => send('expired-results-refresh'));
  document.getElementById('expired-overlay').addEventListener('click', event => {
    if (!dialog.contains(event.target)) dismiss();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') dismiss();
    if (event.key !== 'Tab') return;
    const buttons = [...dialog.querySelectorAll('button')];
    const index = buttons.indexOf(document.activeElement);
    event.preventDefault();
    const next = index < 0 ? (event.shiftKey ? buttons.length - 1 : 0)
      : (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
    buttons[next].focus();
  });
  // Same downward dismiss gesture as other mobile sheets, without intercepting CTA taps.
  let touchStart;
  dialog.addEventListener('touchstart', event => {
    if (!mobile || event.target.closest('button')) return;
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  dialog.addEventListener('touchend', event => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    if (touch.clientY - touchStart.y > 70 && Math.abs(touch.clientX - touchStart.x) < 60) dismiss();
    touchStart = null;
  }, { passive: true });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || (event.source !== window.top && event.source !== window.parent)) return;
    if (event.data?.type === 'seat-selection-theme') document.documentElement.dataset.theme = event.data.theme === 'dark' ? 'dark' : 'light';
    if (event.data?.type === 'expired-results-open') {
      if (mobile) window.SeatSelectionSheetMotion.enter(surface, backdrop);
      dialog.focus({ preventScroll: true });
    }
  });
})();
