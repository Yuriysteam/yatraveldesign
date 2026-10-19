(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const state = { screen: 'home', query: '', inputMode: 'keyboard', submissions: [] };
  const themeButtons = [...document.querySelectorAll('button[data-preview-theme]')];
  function setPreviewTheme(theme) {
    const selected = theme === 'dark' ? 'dark' : 'light';
    $('#phone').dataset.previewTheme = selected;
    for (const icon of document.querySelectorAll('#ai-fab img, .serp-informer > img')) {
      icon.src = selected === 'dark' ? './assets/home-sparkles-fill-dark.svg' : './assets/home-sparkles-fill.svg';
    }
    themeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.previewTheme === selected)));
    $('.voice-spinner').data = selected === 'dark' ? './assets/modal-recognition-spinner-dark.svg' : './assets/modal-recognition-spinner.svg';
    $('.query-error-home-bar').src = selected === 'dark' ? './assets/query-error-home-bar-dark.svg' : './assets/modal-home-bar.svg';
    $('.query-error-illustration').src = selected === 'dark' ? './assets/app-empty-arrows-dark.png' : './assets/app-empty-arrows.png';
  }
  themeButtons.forEach(button => button.addEventListener('click', () => setPreviewTheme(button.dataset.previewTheme)));
  setPreviewTheme(new URLSearchParams(window.location.search).get('theme'));
  // Isolated simulation of iOS authorization; never changes browser/OS settings.
  let microphonePermissionDemo = null;
  let voiceRecognitionFailureDemo = false;
  // Each entry is an explicit demo fixture, not a natural-language search rule.
  // Scenarios prefill the input and wait for manual submission. The current
  // results can be refined or replaced; other scenarios start on home.
  const scenarios = [
    {
      id: 'exact-one-way',
      label: '1. В одну сторону · без фильтров',
      query: 'Из Москвы в Сочи 10 ноября',
    },
    {
      id: 'exact-round-trip',
      label: '2. Туда-обратно · без фильтров',
      query: 'Из Москвы в Сочи с 10 по 17 ноября',
      // Exact demo phrases for the same dated trip, not a general parser.
      aliases: [
        'Из Москвы в Сочи 10 ноября на неделю',
        'Из Москвы в Сочи туда-обратно, с 10 по 17 ноября',
        'Из Москвы в Сочи 10 ноября, обратно 17 ноября, один взрослый, эконом',
      ],
    },
    {
      id: 'exact-two-passengers',
      label: '3. Два пассажира · без фильтров',
      query: 'Из Москвы в Сочи 10 ноября, двое взрослых',
    },
    {
      id: 'exact-supported-filters',
      label: '4. Конкретный запрос · с фильтрами',
      query: 'Из Москвы в Сочи 10 ноября, без пересадок, с багажом, вылет из Шереметьево с 10 до 11 утра',
    },
    {
      id: 'sea-week-november',
      label: '5. Неконкретный запрос · без фильтров',
      query: 'Из Москвы к морю в ноябре на неделю',
    },
    {
      id: 'london-no-direct',
      label: '6. Конкретный запрос · часть условий не применена',
      query: 'Из Москвы в Лондон 10 ноября, без пересадок',
    },
    {
      id: 'uk-week-no-direct',
      label: '7. Неконкретный запрос · часть условий не применена',
      query: 'Из Москвы в Великобританию в ноябре на неделю, без пересадок',
    },
    {
      id: 'refine-with-baggage',
      label: '8. Уточнение или изменение текущего запроса на выдаче',
      query: 'А теперь давай поищем варианты с багажом',
      startScenarioId: 'exact-one-way',
      refinement: { baggage: true },
      aliases: ['Добавь багаж', 'А теперь с багажом'],
    },
    {
      id: 'new-search-from-results',
      label: '9. Новый запрос с выдачи',
      query: 'Из Санкт-Петербурга в Казань 20 ноября, двое взрослых',
      startScenarioId: 'exact-supported-filters',
    },
  ];
  scenarios.push({ id: 'first-voice-input', label: '10. Первая попытка голосового ввода', query: '', firstVoiceInput: true });
  scenarios.push({ id: 'voice-access-denied', label: '11. Голосовой ввод · доступ ранее запрещён', query: '', microphoneDenied: true });
  scenarios.push({ id: 'voice-recognition-retry', label: '12. Ошибка распознавания · повторная попытка', query: '', recognitionFailure: true });
  scenarios.push({ id: 'query-without-parameters', label: '13. Запрос без параметров', query: 'Привет, как дела?' });
  const homeIntents = [...document.querySelectorAll('.intent-list .intent')].map(button => ({
    title: button.querySelector('span').textContent,
    detail: button.querySelector('small').textContent,
    query: button.dataset.query,
    scenarioId: button.dataset.scenarioId,
  }));
  // Explicit demo refinements, separate from the scenarios in the side panel.
  const refinementIntents = [
    { title: 'Покажи варианты', detail: 'с багажом', query: 'Покажи варианты с багажом', refinement: { baggage: true } },
    { title: 'Хочу лететь', detail: 'без пересадок', query: 'Хочу лететь без пересадок', refinement: { direct: true } },
    { title: 'Покажи сначала', detail: 'самые дешёвые', query: 'Покажи сначала самые дешёвые', refinement: { sort: 'price' } },
    { title: 'Хочу долететь', detail: 'побыстрее', query: 'Хочу долететь побыстрее', refinement: { sort: 'duration' } },
    { title: 'Хочу вылететь', detail: 'пораньше', query: 'Хочу вылететь пораньше', refinement: { sort: 'departure' } },
    { title: 'Покажи варианты', detail: 'без ночных пересадок', query: 'Покажи варианты без ночных пересадок', refinement: { noNightTransfers: true } },
  ];

  function renderIntents() {
    const onResults = underlyingScreen === 'results';
    const intents = onResults
      ? refinementIntents.filter(intent => window.aviaSerp.canRefine(intent.refinement))
      : homeIntents;
    const list = $('.intent-list');
    list.setAttribute('aria-label', onResults ? 'Уточнить текущий поиск' : 'Примеры запросов');
    list.replaceChildren(...intents.map(({ title, detail, query }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'intent';
      button.dataset.query = query;
      const heading = document.createElement('span');
      heading.textContent = title;
      const caption = document.createElement('small');
      caption.textContent = detail;
      button.append(heading, caption);
      return button;
    }));
    list.scrollLeft = 0;
  }

  const normalizeQuery = query => query.trim().toLocaleLowerCase('ru-RU').replace(/\s+/g, ' ').replace(/[.!?]+$/, '');
  scenarios.forEach(({ id, label, query }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lab-button lab-scenario';
    button.textContent = label;
    button.dataset.scenarioQuery = query;
    button.dataset.scenarioId = id;
    $('#scenario-list').append(button);
  });
  $('#scenario-section').hidden = scenarios.length === 0;
  const destinations = [
    { name: 'Санкт-Петербург', price: 'от 3 905 ₽', image: 'home-mobile-snippet-img.png', node: '618:33306', crop: { height: '177.72%', top: '-23.68%', left: '.02%' } },
    { name: 'Cочи', price: 'от 5 321 ₽', image: 'home-mobile-snippet-img1.png', node: '618:33307', crop: { height: '177.72%', top: '-34.87%', left: '0' } },
    { name: 'Калининград', price: 'от 5 998₽', image: 'home-mobile-snippet-img2.png', node: '618:33309' },
    { name: 'Казань', price: 'от 3 975 ₽', image: 'home-mobile-snippet-img3.png', node: '618:33310', crop: { width: '126.62%', height: '173.85%', left: '-.76%', top: '-52.42%' } },
    { name: 'Ереван', price: 'от 10 239 ₽', image: 'home-mobile-snippet-img4.png', node: '618:33312', crop: { width: '110.49%', height: '144.92%', left: '0', top: '-22.28%' } },
    { name: 'Баку', price: 'от 14 321 ₽', image: 'home-mobile-snippet-img5.png', node: '618:33313', crop: { width: '127.59%', height: '170.06%', left: '-13.79%', top: '-18%' } },
    { name: 'Cочи', price: 'от 2 905 ₽', image: 'home-mobile-snippet-img6.png', node: '618:33315' },
    { name: 'Cочи', price: 'от 2 905 ₽', image: 'home-mobile-snippet-img6.png', node: '618:33316' },
  ];

  destinations.forEach(({ name, price, image, crop, node }) => {
    const card = document.createElement('article');
    card.className = 'destination-card';
    card.dataset.nodeId = node;
    const media = document.createElement('div');
    media.className = 'destination-photo';
    const img = document.createElement('img');
    img.src = `./assets/${image}`;
    img.alt = name;
    img.draggable = false;
    if (crop) Object.assign(img.style, crop);
    media.append(img);
    const copy = document.createElement('div');
    copy.className = 'destination-copy';
    const title = document.createElement('h3');
    title.className = 'destination-name';
    title.textContent = name;
    const cost = document.createElement('p');
    cost.className = 'destination-price';
    cost.textContent = price;
    copy.append(title, cost);
    card.append(media, copy);
    $('#destinations').append(card);
  });

  const keyboard = $('#keyboard-rows');
  const keyboardLetters = ['йцукенгшщзх', 'фывапролджэ', 'ячсмитьбю'];
  const keyboardKey = (label, className = '', icon = '') => {
    const key = document.createElement(label === '123' || label === 'shift' || label === 'smile' ? 'span' : 'button');
    key.className = `keyboard-key ${className}`.trim();
    if (key.tagName === 'BUTTON') key.type = 'button';
    if (icon) {
      const image = document.createElement('img');
      image.src = `./assets/${icon}`;
      image.alt = '';
      key.append(image);
    } else key.textContent = label;
    if (label === 'backspace') key.setAttribute('aria-label', 'Удалить символ');
    else if (key.tagName === 'BUTTON') key.setAttribute('aria-label', label === 'space' ? 'Пробел' : label);
    if (key.tagName === 'BUTTON') key.dataset.key = label;
    return key;
  };
  keyboardLetters.forEach((letters, index) => {
    const row = document.createElement('div');
    row.className = 'keyboard-row';
    if (index === 2) row.append(keyboardKey('shift', 'keyboard-key--control', 'keyboard-shift.svg'));
    [...letters].forEach(letter => row.append(keyboardKey(letter)));
    if (index === 2) row.append(keyboardKey('backspace', 'keyboard-key--control', 'keyboard-backspace.svg'));
    keyboard.append(row);
  });
  const controls = document.createElement('div');
  controls.className = 'keyboard-row';
  controls.append(
    keyboardKey('123', 'keyboard-key--utility'),
    keyboardKey('smile', 'keyboard-key--utility', 'keyboard-smile.svg'),
    keyboardKey('Пробел', 'keyboard-key--space'),
    keyboardKey('Найти', 'keyboard-key--find'),
  );
  keyboard.append(controls);

  const status = (message) => { $('#lab-status').textContent = message; };
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let voiceSession = null;
  const fabScroll = {
    home: { away: false, lastTop: 0, delta: 0 },
    results: { away: false, lastTop: 0, delta: 0 },
  };

  function renderFab() {
    const fab = $('#ai-fab');
    const screen = state.screen === 'search' ? underlyingScreen : state.screen;
    const parent = screen === 'results' ? $('#serp-page') : $('#home-screen');
    if (fab.parentElement !== parent) parent.append(fab);
    const { away } = fabScroll[screen];
    fab.classList.toggle('is-scrolled-away', away);
    fab.inert = away;
    fab.setAttribute('aria-hidden', String(away));
    fab.setAttribute('aria-expanded', String(state.screen === 'search'));
  }

  function onContentScroll(screen, element) {
    const current = Math.max(0, element.scrollTop);
    const scroll = fabScroll[screen];
    const step = current - scroll.lastTop;
    if (step && Math.sign(step) !== Math.sign(scroll.delta)) scroll.delta = 0;
    scroll.delta += step;
    scroll.lastTop = current;
    if (current === 0) scroll.away = false;
    else if (scroll.delta >= 12) scroll.away = true;
    else if (scroll.delta <= -12) scroll.away = false;
    renderFab();
  }

  let returnFocus = null;
  let underlyingScreen = 'home';
  // Travel UI Kit BottomSheet uses rebound with Origami tension 230 and friction 24.
  // Keep the same progress for the curtain's Y offset and the overlay's opacity.
  const springTension = (230 - 30) * 3.62 + 194;
  const springFriction = (24 - 8) * 3 + 25;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let modalProgress = 0;
  let modalVelocity = 0;
  let modalTarget = 0;
  let modalFrame = 0;
  let lastFrameTime = null;

  function paintModal() {
    $('#modal-stack').style.transform = `translate3d(0, ${(1 - modalProgress) * 100}%, 0)`;
    $('#modal-backdrop').style.opacity = String(Math.max(0, Math.min(1, modalProgress)));
  }

  function stopModalAnimation() {
    if (modalFrame) cancelAnimationFrame(modalFrame);
    modalFrame = 0;
    lastFrameTime = null;
  }

  function stepModal(now) {
    if (lastFrameTime !== null) {
      let remaining = Math.min((now - lastFrameTime) / 1000, .064);
      while (remaining > 0) {
        const dt = Math.min(remaining, .001);
        const acceleration = (position, velocity) => springTension * (modalTarget - position) - springFriction * velocity;
        const p1 = modalVelocity;
        const v1 = acceleration(modalProgress, modalVelocity);
        const p2 = modalVelocity + v1 * dt / 2;
        const v2 = acceleration(modalProgress + p1 * dt / 2, modalVelocity + v1 * dt / 2);
        const p3 = modalVelocity + v2 * dt / 2;
        const v3 = acceleration(modalProgress + p2 * dt / 2, modalVelocity + v2 * dt / 2);
        const p4 = modalVelocity + v3 * dt;
        const v4 = acceleration(modalProgress + p3 * dt, modalVelocity + v3 * dt);
        modalProgress += dt * (p1 + 2 * p2 + 2 * p3 + p4) / 6;
        modalVelocity += dt * (v1 + 2 * v2 + 2 * v3 + v4) / 6;
        remaining -= dt;
      }
      paintModal();
    }
    lastFrameTime = now;
    if (Math.abs(modalProgress - modalTarget) < .001 && Math.abs(modalVelocity) < .001) {
      modalProgress = modalTarget;
      modalVelocity = 0;
      paintModal();
      stopModalAnimation();
      if (modalTarget === 0) $('#modal-layer').hidden = true;
      return;
    }
    modalFrame = requestAnimationFrame(stepModal);
  }

  function animateModal(opening) {
    modalTarget = opening ? 1 : 0;
    if (opening) $('#modal-layer').hidden = false;
    $('#modal-layer').style.pointerEvents = opening ? '' : 'none';
    if (reducedMotion.matches) {
      stopModalAnimation();
      modalProgress = modalTarget;
      modalVelocity = 0;
      paintModal();
      if (!opening) $('#modal-layer').hidden = true;
      return;
    }
    if (!modalFrame) modalFrame = requestAnimationFrame(stepModal);
  }

  const queryCanvas = document.createElement('canvas').getContext('2d');
  const queryProbe = document.createElement('textarea');
  queryProbe.setAttribute('aria-hidden', 'true');
  queryProbe.tabIndex = -1;
  queryProbe.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden;box-sizing:border-box;padding:0;border:0;resize:none;overflow:hidden;white-space:pre-wrap;overflow-wrap:break-word';
  document.body.append(queryProbe);

  function measureQuery(text, fontSize, fullWidth = false) {
    const lineHeight = fontSize + 4;
    queryCanvas.font = `400 ${fontSize}px "YS Text"`;
    const widestLine = Math.max(...text.split('\n').map(line => queryCanvas.measureText(line).width));
    const width = fullWidth ? 335 : Math.min(335, Math.ceil(widestLine) + 4);
    queryProbe.style.font = `400 ${fontSize}px/${lineHeight}px "YS Text", sans-serif`;
    queryProbe.style.width = `${width}px`;
    queryProbe.style.height = '1px';
    queryProbe.value = text;
    const contentHeight = queryProbe.scrollHeight;
    return { fontSize, lineHeight, width, contentHeight, lines: Math.max(1, Math.round(contentHeight / lineHeight)) };
  }

  const queryFontSizes = [28, 25, 22, 18];
  const queryVerticalInset = 4;
  const queryScrollInset = 10;
  let querySizeAnimation = null;

  function updateQueryFade() {
    const input = $('#ai-query');
    $('.query-area').classList.toggle('is-scrolled', input.scrollTop > 1);
  }

  function updateQueryLayout(cursor = null) {
    const input = $('#ai-query');
    // Preserve the font-size steps, but let long text use the full input area.
    const expanded = state.query.trim() || voiceSession;
    const fontFitHeight = expanded ? 160 : 124;
    const queryMaxHeight = expanded ? 218 : 124;
    const previousFontSize = input.style.fontSize;
    const previousHeight = input.offsetHeight;
    const previousTop = input.getBoundingClientRect().top;
    const text = state.query || input.placeholder;
    const reference = measureQuery(text, 28);
    const fullWidth = Boolean(state.query) && reference.lines > 1;
    let layout = measureQuery(text, queryFontSizes[0], fullWidth);
    for (const fontSize of queryFontSizes.slice(1)) {
      if (layout.contentHeight + queryVerticalInset <= fontFitHeight) break;
      layout = measureQuery(text, fontSize, fullWidth);
    }
    if (input.value !== state.query) input.value = state.query;
    if (cursor !== null) input.setSelectionRange(cursor, cursor);
    input.style.fontSize = `${layout.fontSize}px`;
    input.style.lineHeight = `${layout.lineHeight}px`;
    input.style.width = `${layout.width}px`;
    const contentHeight = Math.max(layout.lineHeight, layout.contentHeight) + queryVerticalInset;
    // Keep the area and its center unchanged. Only long text gets a smaller
    // scroll viewport with equal top/bottom insets, so its center stays put.
    const viewportHeight = expanded ? queryMaxHeight - queryScrollInset * 2 : queryMaxHeight;
    const overflows = contentHeight > viewportHeight;
    input.style.height = `${Math.min(viewportHeight, contentHeight)}px`;
    input.classList.toggle('is-overflowing', overflows);
    input.style.overflowY = overflows ? 'auto' : 'hidden';
    if (!overflows) input.scrollTop = 0;
    updateQueryFade();
    // Native caret scrolling can happen after the input event/layout update.
    requestAnimationFrame(updateQueryFade);
    const heightChanged = previousHeight !== input.offsetHeight;
    const fontChanged = previousFontSize !== `${layout.fontSize}px`;
    if (overflows) querySizeAnimation?.cancel();
    if (!overflows && state.screen === 'search' && state.query && (heightChanged || fontChanged) && !reducedMotion.matches) {
      // Resize immediately so a newly wrapped line is never clipped.
      // Animate only the change of position within the centered input area.
      querySizeAnimation?.cancel();
      const area = $('.query-area');
      const previewScale = area.getBoundingClientRect().height / area.offsetHeight || 1;
      const offset = (previousTop - input.getBoundingClientRect().top) / previewScale;
      querySizeAnimation = input.animate(
        [{ transform: `translateY(${offset}px)` }, { transform: 'translateY(0)' }],
        { duration: 180, easing: 'cubic-bezier(.22, 1, .36, 1)' },
      );
    }
  }

  function setQuery(query, cursor = null) {
    state.query = String(query);
    updateQueryLayout(cursor === null ? state.query.length : cursor);
    const list = $('.intent-list');
    const dismissed = state.query.trim().length > 0 || Boolean(voiceSession);
    if (dismissed && list.contains(document.activeElement)) $('#ai-query').focus({ preventScroll: true });
    list.inert = dismissed;
    list.setAttribute('aria-hidden', String(dismissed));
    list.classList.toggle('is-dismissed', dismissed);
    $('#ai-form').classList.toggle('has-query', dismissed);
  }

  function onQueryInput(event) {
    // Voice owns the input until this cycle finishes or is explicitly cancelled.
    // Keep focus/keyboard in place; ignore edits rather than cancelling audio.
    if (voiceSession) {
      event.target.value = state.query;
      return;
    }
    const value = event.target.value;
    const cursor = event.target.selectionStart;
    setQuery(value, cursor);
  }

  function setInputMode(mode, focus = false) {
    if (mode !== 'voice') stopVoiceInput();
    state.inputMode = mode;
    if (focus) $('#ai-query').focus({ preventScroll: true });
  }

  function renderVoiceState() {
    const recording = Boolean(voiceSession);
    const processing = Boolean(voiceSession?.finishing);
    const failed = Boolean(voiceSession?.error);
    $('#ai-form').classList.toggle('is-recognition-error', failed);
    $('#ai-form').classList.toggle('is-processing', processing);
    $('#voice-state-status').textContent = failed ? 'Не получилось распознать' : processing ? 'Переводим речь в текст' : '';
    $('#voice-mode').setAttribute('aria-busy', String(processing));
    $('#ai-form').classList.toggle('is-recording', recording);
    $('#voice-mode').setAttribute('aria-pressed', String(recording));
    $('#voice-mode').setAttribute('aria-label', failed ? 'Попробовать ещё раз' : processing ? 'Переводим речь в текст' : recording ? 'Остановить запись' : 'Голосовой ввод');
    $('#voice-mode').title = failed ? 'Попробовать ещё раз' : '';
    $('#voice-mode').disabled = Boolean(voiceSession?.finishing);
    $('.send-button').type = recording ? 'button' : 'submit';
    $('.send-button').setAttribute('aria-label', failed || processing ? 'Отменить распознавание' : recording ? 'Отменить запись' : 'Отправить запрос');
    setQuery(state.query);
  }

  function releaseVoiceMeter(session) {
    cancelAnimationFrame(session.frame);
    session.stream?.getTracks().forEach(track => track.stop());
    if (session.audio && session.audio.state !== 'closed') session.audio.close().catch(() => {});
  }

  function stopVoiceInput() {
    const session = voiceSession;
    voiceSession = null;
    state.inputMode = 'keyboard';
    if (session) {
      clearTimeout(session.finishTimer);
      clearTimeout(session.commitTimer);
      clearTimeout(session.restartTimer);
      releaseVoiceMeter(session);
      if (session.recognition) {
        session.recognition.onresult = session.recognition.onerror = session.recognition.onend = null;
        try { session.recognition.abort(); } catch { /* Already ended. */ }
      }
    }
    renderVoiceState();
  }

  function finishVoiceInput() {
    const session = voiceSession;
    if (!session || session.finishing) return;
    session.error = false;
    session.commitScheduled = false;
    session.finishing = true;
    session.processingStarted = performance.now();
    releaseVoiceMeter(session);
    renderVoiceState();
    status('Переводим речь в текст');
    const commit = () => {
      if (voiceSession !== session || session.commitScheduled) return;
      session.commitScheduled = true;
      clearTimeout(session.finishTimer);
      // Keep this prototype state readable even when the browser returns immediately.
      const remaining = Math.max(0, 1500 - (performance.now() - session.processingStarted));
      session.commitTimer = setTimeout(() => {
        if (voiceSession !== session) return;
        if (session.demoFailurePending) {
          session.demoFailurePending = false;
          session.error = true;
          session.finishing = false;
          clearTimeout(session.restartTimer);
          if (session.recognition) {
            session.recognition.onresult = session.recognition.onerror = session.recognition.onend = null;
            try { session.recognition.abort(); } catch { /* Already stopped. */ }
            session.recognition = null;
          }
          renderVoiceState();
          status('Не получилось распознать. Можно повторить обработку записи или отменить её');
          $('#voice-mode').focus({ preventScroll: true });
          return;
        }
        const recognizedText = session.transcript.trim();
        // Explicit demo fallback, only when sustained audio was detected.
        const usesDemoText = !recognizedText && (session.hasVoiceActivity || session.demoRetryFlow);
        const addedText = recognizedText || (usesDemoText ? 'Здесь будет распознанный текст' : '');
        const query = addedText ? [session.originalQuery.trimEnd(), addedText].filter(Boolean).join(' ') : session.originalQuery;
        stopVoiceInput();
        setQuery(query);
        $('#ai-query').focus({ preventScroll: true });
        status(usesDemoText
          ? 'Браузер не вернул расшифровку — добавлен демонстрационный текст'
          : recognizedText ? 'Текст добавлен. Его можно изменить или дополнить голосом' : 'Запись завершена. Нового текста нет');
      }, remaining);
    };
    if (session.recognition) {
      session.recognition.onend = commit;
      session.recognition.onerror = commit;
      // Preserve the final recognition event after the stop tap.
      session.finishTimer = setTimeout(commit, 1500);
      try { session.recognition.stop(); } catch { commit(); }
    } else commit();
  }

  function animateVoiceMeter(session) {
    const track = $('.voice-wave-track');
    const bars = [...track.children];
    const samples = new Float32Array(session.analyser.fftSize);
    const history = Array(bars.length).fill(3);
    // Colour belongs to each sample: light prehistory, dark recorded samples.
    const recorded = Array(bars.length).fill(false);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // A 6px pitch at 150ms keeps the accepted 40px/s scroll speed.
    const stepMs = 150;
    let lastStep = performance.now();
    let lastFrame = lastStep;
    let smoothedRms = 0;
    function draw(now) {
      if (voiceSession !== session || session.finishing) return;
      session.analyser.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
      // Smooth short spikes; let the waveform settle more slowly after speech.
      const elapsed = Math.min(100, now - lastFrame);
      // Ignore silence and isolated clicks when deciding whether to show demo text.
      session.voicedMs = rms > .015 ? session.voicedMs + elapsed : Math.max(0, session.voicedMs - elapsed * .5);
      if (session.voicedMs >= 200) session.hasVoiceActivity = true;
      const smoothingMs = rms > smoothedRms ? 90 : 180;
      smoothedRms += (rms - smoothedRms) * (1 - Math.exp(-elapsed / smoothingMs));
      lastFrame = now;
      const level = Math.max(0, Math.min(1, (smoothedRms - .012) * 6));
      const liveHeight = 3 + 23 * Math.pow(level, .8);
      if (now - lastStep >= stepMs) {
        history.shift();
        history.push(liveHeight);
        recorded.shift();
        recorded.push(true);
        bars.forEach((bar, i) => {
          bar.style.height = `${history[i]}px`;
          bar.setAttribute('data-recorded', String(recorded[i]));
        });
        lastStep = now;
      }
      // The newest visible bar reacts every frame, independently of scroll steps.
      history[history.length - 1] = liveHeight;
      recorded[recorded.length - 1] = true;
      bars[bars.length - 1].style.height = `${liveHeight}px`;
      bars[bars.length - 1].setAttribute('data-recorded', 'true');
      const progress = Math.min(1, (now - lastStep) / stepMs);
      track.style.transform = reduceMotion ? 'none' : `translateX(${-6 * progress}px)`;
      session.frame = requestAnimationFrame(draw);
    }
    session.frame = requestAnimationFrame(draw);
  }

  function beginVoiceRecognition(session) {
    if (voiceSession !== session || session.finishing) return;
    const active = new SpeechRecognition();
    const previousTranscript = session.transcript;
    let failed = false;
    session.recognition = active;
    active.lang = 'ru-RU';
    active.continuous = true;
    active.interimResults = true;
    active.onresult = event => {
      if (voiceSession !== session) return;
      const words = Array.from(event.results, result => result[0]?.transcript || '').join(' ').trim();
      session.transcript = [previousTranscript, words].filter(Boolean).join(' ');
    };
    active.onerror = event => {
      if (voiceSession !== session) return;
      failed = event.error !== 'no-speech';
      if (failed) status('Браузер не распознаёт речь. После записи со звуком появится демонстрационный текст');
    };
    active.onend = () => {
      if (voiceSession !== session || session.finishing) return;
      session.recognition = null;
      // Some browsers end recognition on silence; the recording UI stays active.
      if (!failed) session.restartTimer = setTimeout(() => beginVoiceRecognition(session), 250);
    };
    try { active.start(); } catch {
      session.recognition = null;
      status('Браузер не распознаёт речь. После записи со звуком появится демонстрационный текст');
    }
  }

  function closeMicrophonePermission() {
    $('#microphone-permission').hidden = true;
    $('#modal-layer').inert = false;
  }

  function showMicrophonePermission() {
    const denied = microphonePermissionDemo === 'denied';
    $('#microphone-permission-dialog').classList.toggle('is-access-denied', denied);
    $('.ios-permission-app').hidden = denied;
    $('#microphone-permission-title').textContent = denied
      ? 'Нужен доступ к микрофону'
      : 'Приложение «Авиабилеты» запрашивает доступ к микрофону.';
    $('#microphone-permission-description').textContent = denied
      ? 'Разрешите доступ в настройках телефона, чтобы вводить запросы голосом'
      : 'Доступ к микрофону нужен, чтобы вводить запросы голосом';
    $('#microphone-permission-deny').textContent = denied ? 'Позже' : 'Не разрешать';
    $('#microphone-permission-allow').textContent = denied ? 'К настройкам' : 'Разрешить';
    $('#microphone-permission').hidden = false;
    $('#modal-layer').inert = true;
    $('#microphone-permission-dialog').focus({ preventScroll: true });
  }

  async function startVoiceInput() {
    if (voiceSession) return;
    if (microphonePermissionDemo === 'notDetermined') { showMicrophonePermission(); return; }
    if (microphonePermissionDemo === 'denied') { showMicrophonePermission(); return; }
    if (!navigator.mediaDevices?.getUserMedia || !(window.AudioContext || window.webkitAudioContext)) {
      status('В этом браузере запись недоступна. Запрос можно ввести с клавиатуры');
      return;
    }
    const session = { originalQuery: state.query, transcript: '', frame: 0, finishing: false, voicedMs: 0, hasVoiceActivity: false };
    session.demoFailurePending = voiceRecognitionFailureDemo;
    session.demoRetryFlow = voiceRecognitionFailureDemo;
    voiceRecognitionFailureDemo = false;
    voiceSession = session;
    state.inputMode = 'voice';
    $('.voice-wave-track').style.transform = 'none';
    // 36 bars put the live sample at x=256, before the fade starts at x=260.
    $('.voice-wave-track').replaceChildren(...Array.from({ length: 36 }, () => document.createElement('span')));
    renderVoiceState();
    $('#ai-query').focus({ preventScroll: true });
    status('Подключаем микрофон');
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      session.audio = new AudioContext();
      await session.audio.resume();
      if (voiceSession !== session || session.finishing) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      // A permission prompt may resolve after cancel, close, or another recording.
      if (voiceSession !== session || session.finishing) { stream.getTracks().forEach(track => track.stop()); return; }
      session.stream = stream;
      session.analyser = session.audio.createAnalyser();
      session.analyser.fftSize = 1024;
      session.audio.createMediaStreamSource(stream).connect(session.analyser);
      animateVoiceMeter(session);
      status('Слушаю. Нажмите стоп, чтобы добавить текст, или крестик, чтобы отменить запись');
      if (!SpeechRecognition) { status('Запись работает. После записи со звуком появится демонстрационный текст'); return; }
      beginVoiceRecognition(session);
    } catch (error) {
      if (voiceSession !== session) return;
      stopVoiceInput();
      status(error.name === 'NotAllowedError' ? 'Нет доступа к микрофону. Запрос можно ввести с клавиатуры' : 'Не получилось подключить микрофон. Попробуйте ещё раз');
    }
  }

  function setScreen(screen, { refreshResults = false, search } = {}) {
    editingQueryError = false;
    $('#query-error-layer').hidden = true;
    $('#query-error-layer').inert = false;
    $('#modal-layer').classList.remove('over-query-error');
    $('#modal-layer').inert = false;
    closeMicrophonePermission();
    const opening = screen === 'search';
    const wasResultsVisible = state.screen === 'results' || (state.screen === 'search' && underlyingScreen === 'results');
    if (!opening) stopVoiceInput();
    if (opening && state.screen !== 'search') {
      returnFocus = document.activeElement;
      underlyingScreen = state.screen;
      window.aviaSerp.closeFilters({ immediate: true });
      renderIntents();
      setInputMode('keyboard');
      querySizeAnimation?.cancel();
      setQuery('', 0);
      $('.intent-list').scrollLeft = 0;
    }
    state.screen = opening ? 'search' : screen === 'results' ? 'results' : 'home';
    const resultsVisible = state.screen === 'results' || (opening && underlyingScreen === 'results');
    $('#home-screen').hidden = resultsVisible;
    $('#serp-screen').hidden = !resultsVisible;
    $('#serp-screen').inert = opening;
    if (resultsVisible && (!wasResultsVisible || refreshResults)) {
      fabScroll.results = { away: false, lastTop: 0, delta: 0 };
      window.aviaSerp.show(search);
    } else if (!resultsVisible) {
      window.aviaSerp.cancelLoading();
      window.aviaSerp.closeFilters();
    }
    animateModal(opening);
    if (opening) updateQueryLayout();
    $('#home-screen').inert = opening || resultsVisible;
    renderFab();
    document.querySelectorAll('[data-screen]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.screen === (resultsVisible ? 'results' : 'home'))));
    $('#screen-caption').textContent = opening ? 'ИИ-поиск' : resultsVisible ? 'Выдача' : 'Главная';
    if (opening) $('#ai-query').focus({ preventScroll: true });
    else if (returnFocus?.isConnected && !returnFocus.closest('[inert]')) returnFocus.focus({ preventScroll: true });
    status(opening ? 'Открыта модалка ИИ-поиска' : resultsVisible ? 'Открыта демо-выдача авиабилетов' : 'Открыта главная');
  }

  function closeSearch() {
    if (state.screen !== 'search') return;
    if (editingQueryError) {
      stopVoiceInput();
      closeMicrophonePermission();
      editingQueryError = false;
      state.screen = 'results';
      $('#query-error-layer').inert = false;
      animateModal(false);
      $('#query-error-edit').focus({ preventScroll: true });
      $('#screen-caption').textContent = 'Ошибка поиска';
      status('Не получилось понять запрос. Можно изменить запрос или вернуться назад');
      return;
    }
    setScreen(underlyingScreen);
  }

  function openWithQuery(query) {
    stopVoiceInput();
    setScreen('search');
    setQuery(query);
    setInputMode('keyboard', true);
    $('.intent-list').scrollLeft = 0;
  }

  let queryErrorReturnScreen = 'home';
  let editingQueryError = false;

  function openSearchOnQueryError() {
    stopVoiceInput();
    editingQueryError = true;
    underlyingScreen = queryErrorReturnScreen;
    returnFocus = $('#query-error-edit');
    state.screen = 'search';
    renderIntents();
    setInputMode('keyboard');
    querySizeAnimation?.cancel();
    setQuery('', 0);
    $('.intent-list').scrollLeft = 0;
    $('#query-error-layer').inert = true;
    $('#modal-layer').inert = false;
    $('#modal-layer').classList.add('over-query-error');
    animateModal(true);
    updateQueryLayout();
    $('#ai-query').focus({ preventScroll: true });
    $('#screen-caption').textContent = 'ИИ-поиск';
    status('Открыт пустой ИИ-поиск поверх страницы ошибки');
  }

  function startQueryFailure() {
    setScreen('results', { refreshResults: true, search: { queryFailure: true } });
    status('Ищем авиабилеты');
  }

  function showQueryError() {
    if (state.screen !== 'results') return;
    $('#modal-layer').inert = true;
    $('#home-screen').inert = true;
    $('#serp-screen').inert = true;
    $('#query-error-layer').inert = false;
    $('#query-error-layer').hidden = false;
    $('#query-error-page').focus({ preventScroll: true });
    $('#screen-caption').textContent = 'Ошибка поиска';
    status('Не получилось понять запрос. Попробуйте описать поездку');
  }

  function dismissQueryError() {
    window.aviaSerp.cancelLoading();
    setScreen(queryErrorReturnScreen);
    $('#ai-fab').focus({ preventScroll: true });
  }

  function submitQuery() {
    if (voiceSession) { finishVoiceInput(); return; }
    stopVoiceInput();
    const query = state.query.trim();
    if (!query) {
      status('Введите запрос в поле поиска');
      setInputMode('keyboard', true);
      return;
    }
    if (normalizeQuery(query) === normalizeQuery('Привет, как дела?')) {
      queryErrorReturnScreen = underlyingScreen;
      startQueryFailure();
      return;
    }
    const submission = { query, inputMode: state.inputMode, timestamp: new Date().toISOString() };
    state.submissions.push(submission);
    window.dispatchEvent(new CustomEvent('avia:query-submitted', { detail: { ...submission } }));
    // These are explicit demo phrases, not a general intent classifier.
    // A relative request only applies when the modal was opened over results.
    const scenario = scenarios.find(item => (!item.refinement || underlyingScreen === 'results')
      && [item.query, ...(item.aliases ?? [])].some(phrase => normalizeQuery(phrase) === normalizeQuery(query)));
    const intent = underlyingScreen === 'results'
      ? refinementIntents.find(item => normalizeQuery(item.query) === normalizeQuery(query))
      : null;
    const homeIntent = homeIntents.find(item => normalizeQuery(item.query) === normalizeQuery(query));
    const refinement = scenario?.refinement ?? intent?.refinement;
    const search = refinement
      ? { refinement }
      : { scenarioId: scenario?.id ?? homeIntent?.scenarioId ?? null, query };
    setScreen('results', { refreshResults: true, search });
    status(refinement ? 'Обновляется текущий поиск' : scenario ? `Загружается сценарий «${scenario.label}»` : homeIntent ? 'Загружается поиск по выбранному примеру' : 'Этот запрос ещё не настроен: показана общая демо-выдача');
  }

  function updateScale() {
    const mobile = window.matchMedia('(max-width: 740px)').matches;
    const availableWidth = $('.stage').clientWidth - (mobile ? 24 : 64);
    const fit = Math.min(1, availableWidth / 375, mobile ? 1 : (window.innerHeight - 88) / 812);
    const scale = Math.max(.3, fit);
    document.documentElement.style.setProperty('--preview-scale', scale);
  }

  function reset() {
    microphonePermissionDemo = null;
    voiceRecognitionFailureDemo = false;
    setScreen('home');
    window.aviaSerp.reset();
    setQuery('');
    setInputMode('keyboard');
    state.submissions.length = 0;
    fabScroll.home = { away: false, lastTop: 0, delta: 0 };
    fabScroll.results = { away: false, lastTop: 0, delta: 0 };
    renderFab();
    $('#origin').value = 'Москва';
    $('#destination').value = '';
    $('#home-scroll').scrollTop = 0;
    $('.intent-list').scrollLeft = 0;
    status('Прототип сброшен');
  }

  $('#ai-fab').addEventListener('click', () => setScreen('search'));
  $('#home-scroll').addEventListener('scroll', event => onContentScroll('home', event.currentTarget), { passive: true });
  $('#serp-feed').addEventListener('scroll', event => onContentScroll('results', event.currentTarget), { passive: true });
  $('#query-error-edit').addEventListener('click', openSearchOnQueryError);
  window.addEventListener('avia:query-failed', showQueryError);
  $('#query-error-back').addEventListener('click', dismissQueryError);
  $('#query-error-layer').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismissQueryError(); }
  });
  $('#close-dialog').addEventListener('click', closeSearch);
  $('#modal-backdrop').addEventListener('click', closeSearch);
  window.addEventListener('avia:back-home', () => setScreen('home'));
  document.querySelectorAll('[data-screen]').forEach(button => button.addEventListener('click', () => setScreen(button.dataset.screen)));
  $('#ai-query').addEventListener('input', onQueryInput);
  $('#ai-query').addEventListener('scroll', updateQueryFade, { passive: true });
  $('#ai-query').addEventListener('pointerdown', () => setInputMode('keyboard'));
  keyboard.addEventListener('pointerdown', event => event.preventDefault());
  keyboard.addEventListener('click', event => {
    const key = event.target.closest('[data-key]');
    if (!key) return;
    if (voiceSession) return;
    if (key.dataset.key === 'Найти') { submitQuery(); return; }
    const input = $('#ai-query');
    input.focus({ preventScroll: true });
    let start = input.selectionStart;
    const end = input.selectionEnd;
    if (key.dataset.key === 'backspace') {
      if (start === end && start > 0) start -= 1;
      input.setRangeText('', start, end, 'end');
    } else input.setRangeText(key.dataset.key === 'Пробел' ? ' ' : key.dataset.key, start, end, 'end');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  $('#ai-query').addEventListener('keydown', event => {
    if (voiceSession) {
      if (event.key !== 'Tab' && event.key !== 'Escape') event.preventDefault();
      return;
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submitQuery();
    }
  });
  $('#ai-query').addEventListener('beforeinput', event => {
    if (voiceSession) event.preventDefault();
  });
  $('#scenario-list').addEventListener('click', event => {
    const button = event.target.closest('[data-scenario-id]');
    if (!button) return;
    const scenario = scenarios.find(item => item.id === button.dataset.scenarioId);
    reset();
    if (scenario.firstVoiceInput) microphonePermissionDemo = 'notDetermined';
    if (scenario.microphoneDenied) microphonePermissionDemo = 'denied';
    if (scenario.recognitionFailure) voiceRecognitionFailureDemo = true;
    if (scenario.startScenarioId) {
      // Seed an already completed search, so the demo opens over real results.
      // Sending the query below still uses the normal loading state.
      setScreen('results', { search: { scenarioId: scenario.startScenarioId, loadResults: false } });
    }
    openWithQuery(scenario.query);
  });
  $('#reset-prototype').addEventListener('click', reset);
  $('#microphone-permission-allow').addEventListener('click', () => {
    if (microphonePermissionDemo === 'denied') {
      // User-approved shortcut: simulate permission granted after visiting Settings.
      // Real browser/OS permissions are unchanged; recording starts on the next tap.
      microphonePermissionDemo = 'granted';
      closeMicrophonePermission();
      renderVoiceState();
      $('#ai-query').focus({ preventScroll: true });
      status('Доступ условно разрешён в настройках. Можно начать голосовой ввод');
      return;
    }
    microphonePermissionDemo = 'granted';
    closeMicrophonePermission();
    startVoiceInput();
  });
  $('#microphone-permission-deny').addEventListener('click', () => {
    microphonePermissionDemo = 'denied';
    closeMicrophonePermission();
    renderVoiceState();
    $('#ai-query').focus({ preventScroll: true });
    status('Доступ к микрофону не разрешён. Запрос можно ввести с клавиатуры');
  });
  $('#microphone-permission').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); return; }
    if (event.key !== 'Tab') return;
    const deny = $('#microphone-permission-deny');
    const allow = $('#microphone-permission-allow');
    event.preventDefault();
    (document.activeElement === deny ? allow : document.activeElement === allow ? deny : event.shiftKey ? allow : deny).focus();
  });
  $('#voice-mode').addEventListener('pointerdown', event => event.preventDefault());
  $('#voice-mode').addEventListener('click', () => {
    if (voiceSession) finishVoiceInput();
    else startVoiceInput();
  });
  $('.send-button').addEventListener('pointerdown', event => event.preventDefault());
  $('.send-button').addEventListener('click', event => {
    if (!voiceSession) return;
    event.preventDefault();
    stopVoiceInput();
    $('#ai-query').focus({ preventScroll: true });
    status('Запись отменена');
  });
  window.addEventListener('pagehide', stopVoiceInput);
  $('#ai-form').addEventListener('submit', event => { event.preventDefault(); submitQuery(); });
  $('.intent-list').addEventListener('click', event => {
    const button = event.target.closest('[data-query]');
    if (!button) return;
    setQuery(button.dataset.query);
    setInputMode('keyboard', true);
  });
  window.addEventListener('resize', updateScale);
  $('#swap-route').addEventListener('click', () => {
    const origin = $('#origin').value;
    $('#origin').value = $('#destination').value;
    $('#destination').value = origin;
  });
  $('#flight-form').addEventListener('submit', event => { event.preventDefault(); status('Обычный поиск билетов ещё не подключён'); });
  document.querySelectorAll('[data-pending]').forEach(button => button.addEventListener('click', () => status(button.dataset.pending)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.screen === 'search') { event.preventDefault(); closeSearch(); }
    if (event.key !== 'Tab' || state.screen !== 'search' || !$('#ai-dialog').contains(document.activeElement)) return;
    const focusable = [...$('#ai-dialog').querySelectorAll('button:not(:disabled),textarea')]
      .filter(element => !element.closest('[inert]'));
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  if (window.matchMedia('(max-width: 740px)').matches) $('#lab-details').open = false;
  document.fonts.ready.then(updateQueryLayout);
  updateQueryLayout();
  renderFab();
  updateScale();
  window.aviaPrototype = Object.freeze({
    getState: () => JSON.parse(JSON.stringify(state)),
    open: () => setScreen('search'),
    openWithQuery,
    close: closeSearch,
    setQuery,
    reset,
  });
})();
