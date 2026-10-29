(() => {
  const artboard = document.querySelector('.artboard');
  let frame = document.querySelector('iframe');
  const panel = document.getElementById('preview-settings');
  const trigger = document.querySelector('.preview-settings-trigger');
  const params = new URLSearchParams(location.search);
  const journeys = window.SeatSelectionJourneys || {};
  const isJourneyScenario = name => typeof name === 'string' && Object.hasOwn(journeys, name);
  const requestedView = params.get('view');
  let view = ['desktop', 'touch', 'app'].includes(requestedView)
    ? requestedView
    : requestedView === 'mobile' ? 'app' : 'desktop';
  const isMobile = () => view !== 'desktop';
  const surface = () => view === 'touch' ? 'touch' : 'app';
  let theme = params.get('theme') === 'dark' ? 'dark' : 'light';
  let train = params.get('train') === 'sapsan' ? 'sapsan' : 'long-distance';
  let screen = ['arrival-times', 'double-deck', 'load-error', 'no-places', 'expired', 'skeleton'].includes(params.get('screen')) ? params.get('screen') : '';
  if (['arrival-times', 'double-deck'].includes(screen)) train = 'long-distance';
  let noScheme = params.get('scheme') === 'auto';
  const schemeControl = document.getElementById('preview-no-scheme');
  const defaultPassengers = () => ({ adults: 1, children: 0, infants: 0 });
  function readJson(value) {
    try { return typeof value === 'string' ? JSON.parse(value) : value; }
    catch { return null; }
  }
  function readPassengers(value) {
    const parsed = readJson(value);
    const defaults = defaultPassengers();
    if (!parsed || typeof parsed !== 'object') return defaults;
    return Object.fromEntries(Object.keys(defaults).map(key => {
      const count = Number(parsed[key]);
      return [key, Number.isInteger(count) && count >= 0 && count <= 10 ? count : defaults[key]];
    }));
  }
  function readSnapshot(value) {
    const parsed = readJson(value);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      places: Array.isArray(parsed.places) ? parsed.places.filter(place => place && typeof place === 'object').slice(0, 10) : [],
      passengers: readPassengers(parsed.passengers),
      rows: Array.isArray(parsed.rows) ? parsed.rows.filter(row => row && typeof row === 'object').slice(0, 20) : [],
      ...(parsed.options && typeof parsed.options === 'object' && !Array.isArray(parsed.options)
        ? { options: parsed.options } : {}),
    };
  }
  let scenario = isJourneyScenario(params.get('scenario')) ? params.get('scenario') : '';
  let leg = scenario && params.get('leg') === 'return' ? 'return' : 'outbound';
  const trainForLeg = () => journeys[scenario].trains[leg === 'return' ? 1 : 0].type;
  let passengers = readPassengers(params.get('pax'));
  let outboundSnapshot = readSnapshot(params.get('rt-outbound'));
  let returnSnapshot = readSnapshot(params.get('rt-return'));
  if (scenario) {
    screen = '';
    noScheme = false;
    train = trainForLeg();
  }
  let selectionObserver;
  let expiredTimer;
  let expiredFrame;
  let restoreExpiredBackground;
  let errorTransition;
  let errorTransitionTimer;
  let stepTransition;
  let transitionFrame;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function resetRoundtrip() {
    scenario = '';
    leg = 'outbound';
    train = 'long-distance';
    passengers = defaultPassengers();
    outboundSnapshot = null;
    returnSnapshot = null;
  }

  function saveRoundtripState(data) {
    if (!data || typeof data !== 'object') return;
    passengers = readPassengers(data.passengers ?? passengers);
    const snapshot = readSnapshot({ places: data.places, passengers, rows: data.rows, options: data.options });
    if (leg === 'outbound') {
      outboundSnapshot = snapshot;
      if (returnSnapshot && JSON.stringify(returnSnapshot.passengers) !== JSON.stringify(passengers)) returnSnapshot = null;
    }
    else returnSnapshot = snapshot;
    syncSettings();
  }

  function setRoundtripQuery(url) {
    if (scenario) {
      url.searchParams.set('scenario', scenario);
      url.searchParams.set('leg', leg);
      url.searchParams.set('pax', JSON.stringify(passengers));
      if (outboundSnapshot) url.searchParams.set('rt-outbound', JSON.stringify(outboundSnapshot));
      else url.searchParams.delete('rt-outbound');
      if (returnSnapshot) url.searchParams.set('rt-return', JSON.stringify(returnSnapshot));
      else url.searchParams.delete('rt-return');
    } else {
      ['scenario', 'leg', 'pax', 'rt-outbound', 'rt-return'].forEach(key => url.searchParams.delete(key));
    }
  }

  function syncSettings() {
    document.documentElement.dataset.view = isMobile() ? 'mobile' : 'desktop';
    document.documentElement.dataset.surface = isMobile() ? surface() : '';
    document.documentElement.dataset.theme = theme;
    schemeControl.checked = noScheme;
    schemeControl.disabled = !!scenario;
    schemeControl.closest('fieldset').classList.toggle('is-disabled', !!scenario);
    document.getElementById('preview-skeleton').setAttribute('aria-pressed', String(screen === 'skeleton'));
    document.getElementById('preview-arrival-times').setAttribute('aria-pressed', String(screen === 'arrival-times'));
    document.getElementById('preview-double-deck').setAttribute('aria-pressed', String(screen === 'double-deck'));
    document.getElementById('preview-load-error').setAttribute('aria-pressed', String(screen === 'load-error'));
    document.getElementById('preview-no-places').setAttribute('aria-pressed', String(screen === 'no-places'));
    document.getElementById('preview-expired').setAttribute('aria-pressed', String(screen === 'expired'));
    panel.querySelectorAll('[data-view]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.view === view));
    });
    panel.querySelectorAll('[data-theme]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.theme === theme));
    });
    panel.querySelectorAll('[data-train]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.train === train));
      button.disabled = !!scenario;
    });
    panel.querySelectorAll('[data-scenario]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.scenario === scenario));
    });
    const next = new URL(location.href);
    next.searchParams.set('view', view);
    if (theme === 'dark') next.searchParams.set('theme', theme);
    else next.searchParams.delete('theme');
    if (train === 'sapsan') next.searchParams.set('train', train);
    else next.searchParams.delete('train');
    if (noScheme) next.searchParams.set('scheme', 'auto');
    else next.searchParams.delete('scheme');
    if (screen) next.searchParams.set('screen', screen);
    else next.searchParams.delete('screen');
    setRoundtripQuery(next);
    history.replaceState(null, '', next);
  }

  function syncTheme(target = frame) {
    target.contentWindow?.postMessage({ type: 'seat-selection-theme', theme }, location.origin);
    expiredFrame?.contentWindow?.postMessage({ type: 'seat-selection-theme', theme }, location.origin);
  }

  function clearExpired() {
    clearTimeout(expiredTimer);
    restoreExpiredBackground?.();
    restoreExpiredBackground = undefined;
    expiredFrame?.remove();
    expiredFrame = undefined;
  }

  function prepareExpired() {
    const doc = frame.contentDocument;
    const overlay = doc.createElement('iframe');
    expiredFrame = overlay;
    overlay.title = 'Результаты устарели';
    overlay.setAttribute('aria-label', 'Результаты устарели');
    overlay.hidden = true;
    overlay.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:100000;background:transparent';
    overlay.src = `./expired-results.html?view=${isMobile() ? 'mobile' : 'desktop'}&surface=${surface()}&theme=${theme}&v=20261027-desktop-homebar-fix`;
    let loaded = false;
    let elapsed = false;
    function show() {
      if (!loaded || !elapsed || screen !== 'expired' || expiredFrame !== overlay) return;
      const active = doc.activeElement;
      const siblings = [...doc.body.children].filter(node => node !== overlay && !node.inert);
      const overflow = doc.body.style.overflow;
      siblings.forEach(node => { node.inert = true; });
      doc.body.style.overflow = 'hidden';
      restoreExpiredBackground = () => {
        siblings.forEach(node => { node.inert = false; });
        doc.body.style.overflow = overflow;
        if (active?.isConnected) active.focus({ preventScroll: true });
      };
      closeSettings();
      overlay.hidden = false;
      overlay.contentWindow.postMessage({ type: 'expired-results-open' }, location.origin);
    }
    overlay.addEventListener('load', () => { loaded = true; syncTheme(); show(); }, { once: true });
    doc.body.append(overlay);
    // Demo only: production UpdateNotification defaults to 15 minutes from mount.
    expiredTimer = setTimeout(() => { elapsed = true; show(); }, 1000);
  }

  function closeSettings() {
    if (panel.matches(':popover-open')) panel.hidePopover();
  }

  // Scale the preview, never the layout viewport: mobile remains exactly 375 × 812.
  function fitView() {
    const availableWidth = document.documentElement.clientWidth;
    const availableHeight = document.documentElement.clientHeight;
    const width = isMobile() ? 375 : Math.max(1440, availableWidth);
    const scale = isMobile()
      ? Math.min(1, availableWidth / 375, availableHeight / 812)
      : Math.min(1, availableWidth / 1440);
    const height = isMobile() ? 812 : availableHeight / scale;
    artboard.style.width = `${width * scale}px`;
    artboard.style.height = `${height * scale}px`;
    for (const target of [frame, transitionFrame]) {
      if (!target) continue;
      target.style.width = `${width}px`;
      target.style.height = `${height}px`;
      target.style.transform = `scale(${scale})`;
    }
    positionControls();
  }

  // Keep prototype controls clear of the real booking CTA, on either screen.
  function positionControls() {
    const selection = frame.contentDocument?.querySelector('.m-selection-panel');
    const selectionRect = selection?.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const scale = frameRect.width / frame.clientWidth;
    const overlapsHorizontally = selectionRect && triggerRect.right > frameRect.left + selectionRect.left * scale
      && triggerRect.left < frameRect.left + selectionRect.right * scale;
    const height = overlapsHorizontally && !selection.hidden
      ? Math.ceil(document.documentElement.clientHeight - (frameRect.top + selectionRect.top * scale))
      : 0;
    document.documentElement.style.setProperty('--preview-selection-height', `${height}px`);
  }

  function buildFrameSource() {
    const errorPage = ['load-error', 'no-places'].includes(screen);
    const documentName = isMobile() ? 'mobile' : 'desktop';
    const source = new URL(screen === 'skeleton' ? `./${documentName}-skeleton.html` : errorPage ? './load-error.html' : `./${documentName}.html`, location.href);
    if (errorPage) source.searchParams.set('view', documentName);
    if (isMobile()) source.searchParams.set('surface', surface());
    source.searchParams.set('v', '20261029-filter-motion-soft-all');
    if (['soft', 'original'].includes(params.get('motion'))) source.searchParams.set('motion', params.get('motion'));
    if (noScheme) source.searchParams.set('scheme', 'auto');
    if (theme === 'dark') source.searchParams.set('theme', theme);
    if (train === 'sapsan') source.searchParams.set('train', train);
    if (screen) source.searchParams.set('screen', screen);
    setRoundtripQuery(source);
    return { source, errorPage, documentName };
  }

  function cancelStepTransition() {
    const current = stepTransition;
    if (!current) return;
    current.cancelled = true;
    clearTimeout(current.timeout);
    current.animations.forEach(animation => animation.cancel());
    current.restores.forEach(restore => restore());
    transitionFrame?.remove();
    transitionFrame = undefined;
    stepTransition = undefined;
    delete artboard.dataset.stepTransition;
    trigger.disabled = false;
  }

  function rememberStyle(transition, node) {
    if (!node) return;
    const original = node.getAttribute('style');
    transition.restores.push(() => {
      if (original === null) node.removeAttribute('style');
      else node.setAttribute('style', original);
    });
  }

  function animateStep(transition, node, keyframes, options) {
    if (!node) return null;
    const animation = node.animate(keyframes, { fill: 'both', ...options });
    transition.animations.push(animation);
    return animation;
  }

  // The old page supplies the static chrome while the next page is preloaded.
  function updateStepChrome(oldDoc, newDoc, transition) {
    if (view === 'desktop') {
      const oldItems = [...oldDoc.querySelectorAll('.exact-steps__item')];
      const newItems = [...newDoc.querySelectorAll('.exact-steps__item')];
      oldItems.forEach((item, index) => {
        const next = newItems[index];
        if (!next) return;
        rememberStyle(transition, item);
        const oldClass = item.className;
        const oldCurrent = item.getAttribute('aria-current');
        transition.restores.push(() => {
          item.className = oldClass;
          if (oldCurrent === null) item.removeAttribute('aria-current');
          else item.setAttribute('aria-current', oldCurrent);
        });
        item.style.transition = 'color 200ms ease';
        item.offsetWidth;
        item.className = next.className;
        if (next.hasAttribute('aria-current')) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });
      return;
    }
    if (view === 'touch') {
      const oldNav = oldDoc.querySelector('.m-touch-breadcrumbs');
      const oldItems = [...oldNav.querySelectorAll(':scope > span')];
      const activeIndex = journeys[scenario].firstSeatStep + (leg === 'return' ? 1 : 0);
      oldItems.forEach((item, index) => {
        rememberStyle(transition, item);
        const oldClass = item.className;
        const oldCurrent = item.getAttribute('aria-current');
        transition.restores.push(() => {
          item.className = oldClass;
          if (oldCurrent === null) item.removeAttribute('aria-current');
          else item.setAttribute('aria-current', oldCurrent);
        });
        item.style.transition = 'color 250ms ease';
        item.offsetWidth;
        item.classList.toggle('is-current', index === activeIndex);
        item.classList.toggle('is-upcoming', index > activeIndex);
        if (index === activeIndex) item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');
      });
      const active = oldNav.querySelector('.is-current');
      const start = oldNav.scrollLeft;
      transition.restores.push(() => { oldNav.scrollLeft = start; });
      const target = active.offsetLeft - (oldNav.clientWidth - active.offsetWidth) / 2;
      transition.startTouchBreadcrumbScroll = () => {
        const began = performance.now();
        const scroll = now => {
          if (stepTransition !== transition) return;
          const t = Math.min(1, (now - began) / 350);
          // Match the reference rail, starting alongside the island push.
          const eased = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          oldNav.scrollLeft = start + (target - start) * eased;
          if (t < 1) requestAnimationFrame(scroll);
        };
        requestAnimationFrame(scroll);
      };
      return;
    }
    const oldTitle = oldDoc.querySelector('.m-navbar__title');
    const newTitle = newDoc.querySelector('.m-navbar__title');
    const oldHeading = oldTitle.querySelector('strong').textContent;
    const oldStep = oldTitle.querySelector('span').textContent;
    transition.restores.push(() => {
      oldTitle.querySelector('strong').textContent = oldHeading;
      oldTitle.querySelector('span').textContent = oldStep;
    });
    oldTitle.querySelector('strong').textContent = newTitle.querySelector('strong').textContent;
    oldTitle.querySelector('span').textContent = newTitle.querySelector('span').textContent;
    const progress = oldDoc.querySelector('.m-progress > span');
    if (progress) {
      rememberStyle(transition, progress);
      progress.style.width = oldDoc.defaultView.getComputedStyle(progress).width;
      progress.style.transition = 'width 500ms cubic-bezier(.2, 0, 0, 1)';
      requestAnimationFrame(() => {
        if (stepTransition === transition) progress.style.width = leg === 'return' ? '50%' : '25%';
      });
    }
  }

  function finishStepTransition(transition, incoming) {
    if (stepTransition !== transition || transition.cancelled) return;
    clearTimeout(transition.timeout);
    const oldFrame = frame;
    selectionObserver?.disconnect();
    // Remove the old frame before exposing the new one's page background.
    oldFrame.remove();
    frame = incoming;
    transitionFrame = undefined;
    incoming.classList.remove('step-transition-frame');
    incoming.style.clipPath = '';
    incoming.removeAttribute('aria-hidden');
    incoming.removeAttribute('tabindex');
    incoming.contentDocument?.querySelector('[data-step-cover]')?.remove();
    transition.restores.forEach(restore => restore());
    transition.animations.forEach(animation => animation.cancel());
    stepTransition = undefined;
    delete artboard.dataset.stepTransition;
    trigger.disabled = false;
    frame.addEventListener('load', onPrimaryFrameLoad);
    initializePrimaryFrame(frame);
  }

  function startStepTransition() {
    if (reducedMotion.matches) { loadView(); return; }
    closeSettings();
    const transition = { animations: [], restores: [], cancelled: false, timeout: undefined };
    stepTransition = transition;
    artboard.dataset.stepTransition = leg;
    trigger.disabled = true;
    const incoming = document.createElement('iframe');
    transitionFrame = incoming;
    if (view === 'touch') {
      // The web reference resets the old page before the push. Both islands
      // must start below the same stationary header, even after a long scroll.
      frame.contentWindow.scrollTo({top: 0, left: 0, behavior: 'instant'});
      updateStepChrome(frame.contentDocument, null, transition);
    }
    incoming.className = 'step-transition-frame';
    incoming.title = `Выбор мест — ${view === 'desktop' ? 'десктопная' : view === 'touch' ? 'Touch' : 'App'} версия`;
    incoming.setAttribute('aria-hidden', 'true');
    incoming.tabIndex = -1;
    incoming.style.visibility = 'hidden';
    fitView();
    incoming.src = buildFrameSource().source.href;
    artboard.append(incoming);
    // A failed preload must never strand the user on the previous step.
    transition.timeout = setTimeout(() => {
      if (stepTransition === transition) loadView();
    }, 10000);
    incoming.addEventListener('load', () => {
      if (stepTransition !== transition || transition.cancelled) return;
      const oldDoc = frame.contentDocument;
      const newDoc = incoming.contentDocument;
      if (!oldDoc || !newDoc) { loadView(); return; }
      syncTheme(incoming);
      const selector = view === 'desktop' ? '.exact-main' : '.m-content';
      const outgoing = oldDoc.querySelector(selector);
      const entering = newDoc.querySelector(selector);
      if (!outgoing || !entering) { loadView(); return; }
      const oldMobileHeader = oldDoc.querySelector('.m-top');
      const oldMobileHeaderRect = oldMobileHeader?.getBoundingClientRect();
      const touchHeaderScrolledOut = view === 'touch' && oldMobileHeaderRect?.bottom <= 0;
      const clipTop = view === 'desktop'
        ? Math.max(0, oldDoc.querySelector('.exact-steps')?.getBoundingClientRect().bottom ?? 0)
        : touchHeaderScrolledOut ? 0 : Math.max(0, oldMobileHeaderRect?.bottom ?? 0);
      incoming.style.clipPath = `inset(${clipTop}px 0 0 0)`;
      for (const node of [newDoc.documentElement, newDoc.body, newDoc.querySelector(view === 'desktop' ? '.exact-page' : '.m-page')]) {
        if (!node) continue;
        rememberStyle(transition, node);
        node.style.setProperty('background', 'transparent', 'important');
      }
      const incomingChrome = view === 'desktop'
        ? [newDoc.querySelector('.exact-header'), newDoc.querySelector('.exact-steps'), newDoc.querySelector('.m-selection-panel')]
        : [touchHeaderScrolledOut ? null : newDoc.querySelector('.m-top'), newDoc.querySelector('.m-app-home-indicator')];
      incomingChrome.forEach(node => {
        if (!node) return;
        rememberStyle(transition, node);
        node.style.visibility = 'hidden';
      });
      if (view !== 'touch') updateStepChrome(oldDoc, newDoc, transition);
      else transition.startTouchBreadcrumbScroll();
      const forward = leg === 'return';
      if (view === 'desktop') {
        animateStep(transition, outgoing,
          [{ transform: 'translateX(0)' }, { transform: `translateX(${forward ? -200 : 200}px)` }],
          { duration: 500, easing: 'cubic-bezier(.2, 0, 0, 1)' });
        animateStep(transition, outgoing,
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: 75, easing: 'linear' });
        animateStep(transition, entering,
          [{ transform: `translateX(${forward ? 200 : -200}px)` }, { transform: 'translateX(0)' }],
          { duration: 500, easing: 'cubic-bezier(.2, 0, 0, 1)' });
        animateStep(transition, entering,
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: 350, delay: 50, easing: 'linear' });
      } else if (view === 'touch') {
        // Phase 1: slide the islands themselves, keeping their surfaces visible.
        // Phase 2: reveal only their contents, as in the Touch reference.
        const pageColor = oldDoc.defaultView.getComputedStyle(oldDoc.querySelector('.m-page')).backgroundColor;
        rememberStyle(transition, entering);
        entering.style.background = pageColor;
        const contentItems = entering.querySelectorAll('.m-setup > *, .m-car > *, .m-booking-informer > *, .m-filters, .m-car-category');
        const push = {duration: 350, easing: 'ease-in-out'};
        animateStep(transition, outgoing,
          [{transform: 'translateX(0)'}, {transform: `translateX(${forward ? -100 : 100}%)`}], push);
        animateStep(transition, entering,
          [{transform: `translateX(${forward ? 100 : -100}%)`}, {transform: 'translateX(0)'}], push);
        contentItems.forEach(item => animateStep(transition, item,
          [{transform: 'translateY(16px)', opacity: 0}, {transform: 'translateY(0)', opacity: 1}],
          {duration: 400, delay: 400, easing: 'cubic-bezier(.34, 1.2, .64, 1)'}));
        const oldPanel = oldDoc.querySelector('.m-selection-panel:not([hidden])');
        const newPanel = newDoc.querySelector('.m-selection-panel:not([hidden])');
        // The reference swaps the old step's fixed controls before the push.
        if (oldPanel) {
          rememberStyle(transition, oldPanel);
          oldPanel.style.visibility = 'hidden';
        }
        if (newPanel) animateStep(transition, newPanel,
          [{transform: 'translateY(100%)'}, {transform: 'translateY(0)'}],
          {duration: 400, delay: 770, easing: 'cubic-bezier(.25, 1, .5, 1)'});
      } else {
        const pageColor = oldDoc.defaultView.getComputedStyle(oldDoc.querySelector('.m-page')).backgroundColor;
        const cover = newDoc.createElement('div');
        cover.dataset.stepCover = '';
        const coverTop = touchHeaderScrolledOut
          ? Math.max(0, newDoc.querySelector('.m-top')?.getBoundingClientRect().bottom ?? 0)
          : clipTop;
        cover.style.cssText = `position:fixed;inset:${coverTop}px 0 0;z-index:1;background:${pageColor};pointer-events:none`;
        newDoc.body.append(cover);
        rememberStyle(transition, entering);
        entering.style.position = 'relative';
        entering.style.zIndex = '2';
        entering.style.opacity = '0';
        animateStep(transition, outgoing,
          [{ transform: 'translateX(0)' }, { transform: `translateX(${forward ? -100 : 100}%)` }],
          { duration: 350, easing: 'ease-in-out' });
        animateStep(transition, cover,
          [{ transform: `translateX(${forward ? 100 : -100}%)` }, { transform: 'translateX(0)' }],
          { duration: 350, easing: 'ease-in-out' });
        animateStep(transition, entering,
          [{ translate: `${forward ? 100 : -100}% 0` }, { translate: '0 0' }],
          { duration: 350, easing: 'ease-in-out' });
        animateStep(transition, entering,
          [{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
          { duration: 400, delay: 400, easing: 'cubic-bezier(.34, 1.2, .64, 1)' });
        const oldPanel = oldDoc.querySelector('.m-selection-panel:not([hidden])');
        const newPanel = newDoc.querySelector('.m-selection-panel:not([hidden])');
        if (oldPanel) animateStep(transition, oldPanel,
          [{ transform: 'translateX(0)' }, { transform: `translateX(${forward ? -100 : 100}%)` }],
          { duration: 350, easing: 'ease-in-out' });
        if (newPanel) animateStep(transition, newPanel,
          [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
          { duration: 400, delay: 770, easing: 'cubic-bezier(.25, 1, .5, 1)' });
      }
      incoming.style.visibility = 'visible';
      Promise.allSettled(transition.animations.map(animation => animation.finished))
        .then(() => finishStepTransition(transition, incoming));
    }, { once: true });
  }

  function loadView() {
    cancelStepTransition();
    clearTimeout(errorTransitionTimer);
    errorTransition = undefined;
    clearExpired();
    selectionObserver?.disconnect();
    document.documentElement.style.setProperty('--preview-selection-height', '0px');
    fitView();
    frame.title = `Выбор мест — ${view === 'desktop' ? 'десктопная' : view === 'touch' ? 'Touch' : 'App'} версия`;
    const { source, errorPage, documentName } = buildFrameSource();
    if (errorPage) {
      const skeleton = new URL(`./${documentName}-skeleton.html`, location.href);
      skeleton.searchParams.set('v', '20261028-roundtrip');
      skeleton.searchParams.set('theme', theme);
      if (isMobile()) skeleton.searchParams.set('surface', surface());
      errorTransition = { skeleton: skeleton.href, destination: source.href };
      frame.src = skeleton.href;
    } else {
      frame.src = source.href;
    }
  }

  panel.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (isJourneyScenario(button.dataset.scenario)) {
      if (scenario === button.dataset.scenario) resetRoundtrip();
      else {
        scenario = button.dataset.scenario;
        leg = 'outbound';
        train = trainForLeg();
        screen = '';
        noScheme = false;
        passengers = defaultPassengers();
        outboundSnapshot = null;
        returnSnapshot = null;
      }
      syncSettings();
      loadView();
      closeSettings();
    } else if (['preview-arrival-times', 'preview-double-deck', 'preview-load-error', 'preview-no-places', 'preview-expired', 'preview-skeleton'].includes(button.id)) {
      if (scenario) resetRoundtrip();
      const target = button.id.replace('preview-', '');
      screen = screen === target ? '' : target;
      if (['arrival-times', 'double-deck'].includes(screen)) train = 'long-distance';
      syncSettings();
      loadView();
      if (['expired', 'load-error', 'no-places'].includes(screen)) closeSettings();
    } else if (button.dataset.view && button.dataset.view !== view) {
      view = button.dataset.view;
      syncSettings();
      loadView();
    } else if (button.dataset.theme) {
      theme = button.dataset.theme;
      syncSettings();
      syncTheme();
    } else if (button.dataset.train) {
      if (train === button.dataset.train && !screen) return;
      screen = '';
      train = button.dataset.train;
      syncSettings();
      loadView();
    }
  });

  panel.addEventListener('toggle', event => {
    const open = event.newState === 'open';
    trigger.setAttribute('aria-expanded', String(open));
    if (open) panel.querySelector('[data-view][aria-pressed="true"]').focus({ preventScroll: true });
  });
  schemeControl.addEventListener('change', () => {
    if (scenario) return;
    noScheme = schemeControl.checked;
    syncSettings();
    loadView();
  });

  function initializePrimaryFrame(target) {
    syncTheme(target);
    const doc = target.contentDocument;
    if (!doc) return;
    // Count visible loading time from the skeleton's load, not from navigation.
    // A new scenario/platform cancels this transition in loadView().
    if (errorTransition && doc.location.href === errorTransition.skeleton) {
      const transition = errorTransition;
      clearTimeout(errorTransitionTimer);
      errorTransitionTimer = setTimeout(() => {
        if (errorTransition !== transition) return;
        errorTransition = undefined;
        const destination = new URL(transition.destination);
        destination.searchParams.set('theme', theme);
        target.src = destination.href;
      }, 1500);
    }
    doc.addEventListener('pointerdown', closeSettings);
    doc.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeSettings();
    });
    const selection = doc.querySelector('.m-selection-panel');
    if (selection) {
      selectionObserver = new ResizeObserver(positionControls);
      selectionObserver.observe(selection);
    }
    positionControls();
    if (screen === 'expired') prepareExpired();
  }
  function onPrimaryFrameLoad(event) {
    if (event.currentTarget === frame) initializePrimaryFrame(frame);
  }
  frame.addEventListener('load', onPrimaryFrameLoad);
  window.addEventListener('resize', fitView);
  window.addEventListener('message', event => {
    if (event.origin === location.origin && expiredFrame && event.source === expiredFrame.contentWindow) {
      if (event.data?.type === 'expired-results-dismiss') clearExpired();
      if (event.data?.type === 'expired-results-refresh') {
        screen = '';
        syncSettings();
        loadView();
      }
      return;
    }
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (stepTransition) return;
    if (scenario && event.data?.type === 'seat-selection-roundtrip-state') {
      saveRoundtripState(event.data);
      return;
    }
    if (scenario && event.data?.type === 'seat-selection-roundtrip-next' && leg === 'outbound') {
      saveRoundtripState(event.data);
      leg = 'return';
      train = trainForLeg();
      syncSettings();
      startStepTransition();
      return;
    }
    if (scenario && event.data?.type === 'seat-selection-roundtrip-back' && leg === 'return') {
      if (event.data.passengers || event.data.places) saveRoundtripState(event.data);
      leg = 'outbound';
      train = trainForLeg();
      passengers = outboundSnapshot?.passengers || passengers;
      syncSettings();
      startStepTransition();
      return;
    }
    if (scenario && event.data?.type === 'seat-selection-roundtrip-finish' && leg === 'return') {
      if (event.data.passengers || event.data.places) saveRoundtripState(event.data);
      return;
    }
    if (event.data?.type === 'seat-selection-retry' && screen === 'load-error') {
      screen = '';
      syncSettings();
      loadView();
    }
  });
  syncSettings();
  loadView();
})();
