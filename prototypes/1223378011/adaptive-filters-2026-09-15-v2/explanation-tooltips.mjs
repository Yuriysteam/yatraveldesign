/** Delegated tooltips survive rebuilding the current scenario panel. */
export function createFlowTooltips(view) {
  let activeNode = null;
  let activeTip = null;
  let closeTimer = 0;
  let focusFrame = 0;
  const nodeFor = target => target instanceof Element ? target.closest('.explanation-flow-node') : null;
  const insideActive = target => target instanceof Node && (activeNode?.contains(target) || activeTip?.contains(target));

  function closePopup() {
    clearTimeout(closeTimer);
    const wasOpen = !!activeNode;
    activeNode?.setAttribute('aria-expanded', 'false');
    activeTip?.setAttribute('aria-hidden', 'true');
    activeTip?.removeAttribute('data-open');
    activeNode = null;
    activeTip = null;
    return wasOpen;
  }

  function hide() {
    cancelAnimationFrame(focusFrame);
    focusFrame = 0;
    return closePopup();
  }

  function show(node) {
    clearTimeout(closeTimer);
    if (node === activeNode || !node.getClientRects().length || view.inert) return;
    hide();
    const tip = document.getElementById(node.getAttribute('aria-describedby'));
    if (!tip) return;
    activeNode = node;
    activeTip = tip;
    node.setAttribute('aria-expanded', 'true');
    tip.setAttribute('aria-hidden', 'false');
    tip.dataset.open = 'true';
    // The animated explanation view is the fixed-position containing block.
    const viewRect = view.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const contentTop = view.querySelector('.explanation-scroll').getBoundingClientRect().top - viewRect.top + 8;
    const center = nodeRect.left - viewRect.left + nodeRect.width / 2;
    const left = Math.min(Math.max(16, center - tipRect.width / 2), viewRect.width - tipRect.width - 16);
    const above = nodeRect.top - viewRect.top - tipRect.height - 12;
    const below = nodeRect.bottom - viewRect.top + 12;
    const top = above >= contentTop ? above : Math.min(below, viewRect.height - tipRect.height - 16);
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(contentTop, top)}px`;
    tip.dataset.placement = above >= contentTop ? 'top' : 'bottom';
    tip.style.setProperty('--tip-arrow-x', `${Math.min(Math.max(16, center - left), tipRect.width - 16)}px`);
  }

  function deferHide() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (document.activeElement !== activeNode) hide();
    }, 140);
  }

  view.addEventListener('pointerover', event => {
    // Revealing a focused card can move other cards under a stationary pointer.
    if (event.pointerType === 'touch' || focusFrame) return;
    const node = nodeFor(event.target);
    if (node) {
      if (!node.contains(event.relatedTarget)) show(node);
      else clearTimeout(closeTimer);
    } else if (activeTip?.contains(event.target)) clearTimeout(closeTimer);
  });
  view.addEventListener('pointerout', event => {
    if (event.pointerType !== 'touch' && insideActive(event.target) && !insideActive(event.relatedTarget)) deferHide();
  });
  view.addEventListener('focusin', event => {
    const node = nodeFor(event.target);
    if (!node) return;
    hide();
    node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    // Focus may reveal an offscreen card. Position its tooltip after that scroll.
    focusFrame = requestAnimationFrame(() => {
      focusFrame = requestAnimationFrame(() => {
        focusFrame = 0;
        if (document.activeElement === node) show(node);
      });
    });
  });
  view.addEventListener('focusout', event => {
    if (nodeFor(event.target) && !insideActive(event.relatedTarget)) deferHide();
  });
  view.addEventListener('click', event => {
    const node = nodeFor(event.target);
    if (node) show(node);
  });
  document.addEventListener('pointerdown', event => {
    if (!insideActive(event.target)) hide();
  });
  view.addEventListener('scroll', closePopup, true);
  window.addEventListener('resize', hide);
  return { hide };
}
