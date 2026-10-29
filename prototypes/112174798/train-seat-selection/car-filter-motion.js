/* Motion for type and service-class filtering. The original cards stay mounted,
   keeping seat selection, open options, and their event handlers intact. */
(() => {
  const active = new WeakMap();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 260;
  const easing = 'cubic-bezier(.2, 0, 0, 1)';
  const groupSelector = ':scope > [data-car-group], :scope > [data-group]';

  function visible(node) {
    return !node.hidden && getComputedStyle(node).display !== 'none';
  }

  function finish(root) {
    const session = active.get(root);
    if (!session) return;
    active.delete(root);
    session.animations.forEach(animation => animation.cancel());
    Object.assign(root.style, session.styles);
  }

  function change(root, mutate) {
    if (!root) { mutate(); return; }
    finish(root);
    const groups = [...root.querySelectorAll(groupSelector)];
    const desktop = root.classList.contains('exact-carriages');
    const softMotion = new URLSearchParams(location.search).get('motion') !== 'original';
    const moveDuration = softMotion ? 300 : duration;
    const enterDuration = softMotion ? 280 : 220;
    const moveEasing = softMotion ? 'cubic-bezier(.3, 0, .2, 1)' : easing;
    const footer = desktop ? document.querySelector('.exact-footer') : null;
    const footerBefore = footer?.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const before = new Map(groups.filter(visible).map(group => [group, group.getBoundingClientRect()]));
    mutate();
    // The informer must follow the first visible carriage in this very frame.
    window.SeatSelectionBookingInformer?.place();
    if (reduced.matches || !Element.prototype.animate) return;

    const after = new Map(groups.filter(visible).map(group => [group, group.getBoundingClientRect()]));
    if (groups.every(group => before.has(group) === after.has(group))) return;
    const nextHeight = root.getBoundingClientRect().height;
    const footerAfter = footer?.getBoundingClientRect();
    const session = {
      animations: [],
      styles: {
        height: root.style.height, overflow: root.style.overflow,
        overflowAnchor: root.style.overflowAnchor,
      },
    };
    active.set(root, session);
    // Desktop uses the final layout immediately, so the footer can move with the cards.
    if (!desktop) root.style.height = `${rootRect.height}px`;
    root.style.overflow = desktop ? 'visible' : 'hidden';
    root.style.overflowAnchor = 'none';
    const play = (node, frames, length = moveDuration) => {
      const animation = node.animate(frames, { duration: length, easing: moveEasing, fill: 'both' });
      session.animations.push(animation);
    };
    if (!desktop && Math.abs(rootRect.height - nextHeight) > 1) {
      play(root, [{ height: `${rootRect.height}px` }, { height: `${nextHeight}px` }]);
    }

    const move = (node, old, current) => {
      if (old && current) {
        const travel = old.top - current.top;
        if (Math.abs(travel) < 1) return;
        if (Math.abs(travel) <= 240) {
          play(node, [{ transform: `translateY(${travel}px)` }, { transform: 'translateY(0)' }]);
        } else {
          play(node, [
            { opacity: 0, transform: 'translateY(12px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ], enterDuration);
        }
      } else if (current) {
        play(node, [
          { opacity: 0, transform: 'translateY(12px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ], enterDuration);
      }
    };
    for (const group of groups) move(group, before.get(group), after.get(group));
    if (footer && footerBefore && footerAfter) move(footer, footerBefore, footerAfter);
    if (!session.animations.length) { finish(root); return; }
    Promise.allSettled(session.animations.map(animation => animation.finished)).then(() => {
      if (active.get(root) === session) finish(root);
    });
  }

  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    document.querySelectorAll('.exact-carriages, #mobile-carriages').forEach(finish);
  });
  window.SeatSelectionCarFilterMotion = Object.freeze({ change });
})();
