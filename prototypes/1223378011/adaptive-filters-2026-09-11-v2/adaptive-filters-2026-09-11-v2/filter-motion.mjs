// Local layout transitions around existing BaseAI subtrees. State commits immediately.
export function createFilterMotion({ sheet, content, capture }) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Set();
  const ghosts = new Set();
  const duration = 340;
  const easing = 'cubic-bezier(.2, 0, .2, 1)';
  const canAnimatePseudo = typeof KeyframeEffect === 'function' && 'pseudoElement' in KeyframeEffect.prototype;
  const enabled = () => !capture && !preference.matches && !sheet.hidden && typeof Element.prototype.animate === 'function';
  const zoom = () => content.getBoundingClientRect().width / content.offsetWidth || 1;
  const roots = () => [
    ...content.querySelectorAll('.filter-chip, .active-filter, .filter-section h2, .price-fields, .price-range'),
    document.querySelector('#reset'), document.querySelector('#apply'),
  ];
  const rootParts = node => [...node.querySelectorAll(node.classList.contains('filter-chip')
    ? '.chip-name, .chip-count, .amenity-icon' : '.button__text-stack')];

  function finish() {
    for (const animation of running) animation.cancel();
    running.clear();
    for (const ghost of ghosts) ghost.remove();
    ghosts.clear();
  }
  function play(node, frames, options = {}, cleanup) {
    const animation = node.animate(frames, { duration, easing, fill: 'both', ...options });
    animation.id = 'filter-motion';
    running.add(animation);
    const release = () => {
      running.delete(animation);
      cleanup?.();
      // No persistent transforms, frozen widths or fill effects after completion.
      animation.cancel();
    };
    animation.finished.then(release, () => { running.delete(animation); cleanup?.(); });
    return animation;
  }
  function isNear(rect, viewport) {
    return rect.width > 0 && rect.height > 0 && rect.bottom > viewport.top - 80 && rect.top < viewport.bottom + 80;
  }
  function snapshot() {
    const viewport = sheet.getBoundingClientRect();
    const scale = zoom();
    const result = new Map();
    for (const node of roots()) {
      const rect = node.getBoundingClientRect();
      if (!isNear(rect, viewport)) continue;
      const before = node.classList.contains('button') ? getComputedStyle(node, '::before') : null;
      result.set(node, {
        rect, opacity: Number(getComputedStyle(node).opacity),
        rowTop: node.closest('.chip-rows')?.getBoundingClientRect().top,
        parts: new Map(rootParts(node).map(part => [part, part.getBoundingClientRect()])),
        // Read the current animated surface width, not just its final flow box.
        surfaceWidth: rect.width / scale - (parseFloat(before?.left) || 0) - (parseFloat(before?.right) || 0),
        clone: node.classList.contains('active-filter') || node.id === 'reset' ? node.cloneNode(true) : null,
      });
    }
    return result;
  }
  function leaving(previous, node, scale) {
    const ghost = previous.clone;
    if (!ghost || previous.opacity < .01) return;
    const inContent = node.classList.contains('active-filter');
    const parent = inContent ? content : document.querySelector('.footer-actions');
    const parentRect = parent.getBoundingClientRect();
    if (!isNear(previous.rect, inContent ? content.getBoundingClientRect() : parentRect)) return;
    ghost.removeAttribute('id');
    ghost.removeAttribute('data-remove-filter');
    ghost.removeAttribute('data-filter');
    ghost.classList.replace('active-filter', 'motion-active-ghost');
    ghost.dataset.motionGhost = '';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.setAttribute('tabindex', '-1');
    ghost.inert = true;
    Object.assign(ghost.style, {
      position: 'absolute', margin: '0', pointerEvents: 'none', zIndex: inContent ? '2' : '0',
      left: (previous.rect.left - parentRect.left) / scale + 'px',
      top: ((previous.rect.top - parentRect.top) / scale + (inContent ? content.scrollTop : 0)) + 'px',
      width: previous.rect.width / scale + 'px', height: previous.rect.height / scale + 'px',
    });
    parent.append(ghost);
    ghosts.add(ghost);
    play(ghost, [
      { opacity: previous.opacity, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-4px)' },
    ], { duration: inContent ? 220 : 180 }, () => { ghost.remove(); ghosts.delete(ghost); });
  }
  function run(update, { anchor, animate = true } = {}) {
    const shouldAnimate = enabled() && animate;
    // Continue from the visible intermediate frame when clicks interrupt motion.
    const previous = shouldAnimate ? snapshot() : null;
    finish();
    const scale = zoom();
    const scrolled = content.scrollTop > 0;
    const anchorTop = anchor?.getBoundingClientRect().top;
    update();
    if (anchor && scrolled) content.scrollTop += (anchor.getBoundingClientRect().top - anchorTop) / scale;
    if (!shouldAnimate) return;

    const viewport = sheet.getBoundingClientRect();
    // Batch final layout reads before starting any new animations.
    const next = new Map(roots().map(node => [node, {
      rect: node.getBoundingClientRect(),
      rowTop: node.closest('.chip-rows')?.getBoundingClientRect().top,
      parts: new Map(rootParts(node).map(part => [part, part.getBoundingClientRect()])),
    }]));
    for (const [node, prior] of previous) {
      if (!next.get(node)?.rect.width) leaving(prior, node, scale);
    }
    for (const [node, current] of next) {
      if (!isNear(current.rect, viewport)) continue;
      const prior = previous.get(node);
      if (!prior) {
        if (node.classList.contains('active-filter') || node.id === 'reset') {
          play(node, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }],
            node.id === 'reset' ? { duration: 260, delay: 60 } : {});
        }
        continue;
      }
      const dx = (prior.rect.left - current.rect.left) / scale;
      const dy = (prior.rect.top - current.rect.top) / scale;
      if (Math.abs(dy) > content.clientHeight) continue;
      const rowChange = prior.rowTop !== undefined && current.rowTop !== undefined &&
        Math.abs((prior.rect.top - prior.rowTop) - (current.rect.top - current.rowTop)) / scale > 12;
      if (rowChange) {
        // Do not send a chip diagonally through its neighbours when the row wraps.
        // Keep the section's common vertical movement and reveal it in its new row.
        const sectionDy = (prior.rowTop - current.rowTop) / scale;
        play(node, [
          { opacity: 0, transform: `translateY(${sectionDy}px)` },
          { opacity: 1, transform: 'translateY(0)' },
        ]);
        continue;
      }
      if (Math.abs(dx) > .25 || Math.abs(dy) > .25 || prior.opacity < .999) {
        play(node, [
          { transform: `translate(${dx}px, ${dy}px)`, opacity: prior.opacity },
          { transform: 'translate(0, 0)', opacity: 1 },
        ]);
      }
      if (node.classList.contains('button')) {
        const widthDelta = current.rect.width / scale - prior.surfaceWidth;
        // Animate the surface edge without stretching text or icons.
        if (canAnimatePseudo && Math.abs(widthDelta) > .25) {
          play(node, [{ right: widthDelta + 'px' }, { right: '0px' }], { pseudoElement: '::before' });
        }
        for (const [part, rect] of current.parts) {
          if (!rect.width) continue;
          const old = prior.parts.get(part);
          if (!old?.width) {
            if (part.classList.contains('chip-count')) play(part, [{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
            continue;
          }
          const x = (old.left - rect.left) / scale - dx;
          const y = (old.top - rect.top) / scale - dy;
          if (Math.abs(x) > .25 || Math.abs(y) > .25) {
            play(part, [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }]);
          }
        }
      }
    }
  }
  preference.addEventListener('change', finish);
  window.addEventListener('resize', finish);
  content.addEventListener('wheel', finish, { passive: true });
  content.addEventListener('touchmove', finish, { passive: true });
  return { run, finish };
}
