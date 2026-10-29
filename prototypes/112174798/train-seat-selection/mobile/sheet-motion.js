/* One lifecycle for mobile sheets. Keep the modal and scroll lock alive until
   its exit finishes; reopening reverses the current motion without a flash. */
(() => {
  const states = new WeakMap();
  const active = new Set();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function stateFor(surface, backdrop) {
    let state = states.get(surface);
    if (state) return state;
    state = {surface, backdrop, visible:false, finish:null, timer:null};
    states.set(surface, state);
    surface.classList.add('sheet-motion');
    backdrop?.classList.add('sheet-motion-backdrop');
    surface.addEventListener('transitionend', event => {
      if (event.target === surface && event.propertyName === 'transform') state.finish?.();
    });
    if (surface instanceof HTMLDialogElement) {
      surface.addEventListener('cancel', event => {
        event.preventDefault();
        close(surface);
      });
    }
    return state;
  }
  function enter(surface, backdrop) {
    const state = stateFor(surface, backdrop);
    clearTimeout(state.timer);
    state.finish = null;
    state.visible = true;
    active.add(state);
    if (surface instanceof HTMLDialogElement && !surface.open) {
      surface.classList.remove('is-sheet-visible');
      surface.showModal();
    }
    // Resolve the offscreen start before setting the visible state.
    void surface.offsetHeight;
    surface.classList.add('is-sheet-visible');
    state.backdrop?.classList.add('is-sheet-visible');
  }
  function leave(surface, onClosed, backdrop) {
    const state = stateFor(surface, backdrop);
    if (state.finish) return;
    if (surface instanceof HTMLDialogElement && !surface.open) return;
    state.visible = false;
    surface.classList.remove('is-sheet-visible');
    state.backdrop?.classList.remove('is-sheet-visible');
    state.finish = () => {
      if (state.visible || !state.finish) return;
      state.finish = null;
      clearTimeout(state.timer);
      active.delete(state);
      onClosed();
    };
    if (reduced.matches) state.finish();
    else {
      const duration = parseFloat(getComputedStyle(surface).getPropertyValue('--sheet-motion-duration')) || 360;
      state.timer = setTimeout(() => state.finish?.(), duration + 60);
    }
  }
  function close(sheet) { leave(sheet, () => sheet.close()); }
  reduced.addEventListener('change', () => {
    if (reduced.matches) for (const state of active) state.finish?.();
  });
  window.SeatSelectionSheetMotion = {open:enter, close, enter, leave};
})();
