/* Prototype-only destination. Keep the live carriage DOM for a lossless return. */
(() => {
  const original = document.querySelector('.exact-main, .m-page');
  if (!original) return;
  const desktop = original.classList.contains('exact-main');
  const steps = [...document.querySelectorAll('.exact-steps__item')];
  const stepState = steps.map(node => ({node, className:node.className, current:node.getAttribute('aria-current')}));
  const page = document.createElement(desktop ? 'main' : 'div');
  page.className = `passenger-placeholder ${desktop ? 'exact-main' : 'm-page'}`;
  page.hidden = true;
  original.after(page);
  let active = false, savedScroll = {x:0, y:0}, trigger = null, lastRequest = null;
  const originalTitle = document.title;
  const historyKey = 'seatSelectionPassengerPlaceholder';
  // A reload returns to the list; there is no persistent booking in this prototype.
  if (history.state?.[historyKey]) history.replaceState({...history.state, [historyKey]:null}, '');

  const back = () => { if (active) history.back(); };
  const render = ({car, passengers}) => {
    page.replaceChildren();
    if (!desktop) {
      const navbar = original.querySelector('.m-top').cloneNode(true);
      navbar.querySelector('strong').textContent = 'Данные пассажиров';
      navbar.querySelector('.m-navbar__title span').textContent = '2 из 3';
      const breadcrumbSteps = navbar.querySelectorAll('.m-touch-breadcrumbs > span');
      if (breadcrumbSteps.length >= 3) {
        breadcrumbSteps[1].classList.remove('is-current');
        breadcrumbSteps[1].removeAttribute('aria-current');
        breadcrumbSteps[2].classList.remove('is-upcoming');
        breadcrumbSteps[2].classList.add('is-current');
        breadcrumbSteps[2].setAttribute('aria-current', 'step');
      }
      const button = navbar.querySelector('.m-back');
      button.removeAttribute('aria-disabled');
      button.addEventListener('click', back);
      page.append(navbar);
    }
    const content = document.createElement(desktop ? 'div' : 'main');
    content.className = 'passenger-placeholder__content';
    const countWord = passengers % 100 >= 11 && passengers % 100 <= 14 ? 'пассажиров'
      : passengers % 10 === 1 ? 'пассажир' : passengers % 10 >= 2 && passengers % 10 <= 4 ? 'пассажира' : 'пассажиров';
    content.innerHTML = `<h1 class="${desktop ? 'exact-title' : ''}" tabindex="-1">Данные пассажиров</h1>
      <p class="passenger-placeholder__context">Вагон ${car} · ${passengers} ${countWord}</p>`;
    // Reuse the existing BaseAI Informer + Plain button, not a new product form.
    const informer = trigger.closest('.no-scheme-informer').cloneNode(true);
    informer.querySelector('strong').textContent = 'Следующий шаг';
    informer.querySelector('p').textContent = 'Здесь будет ввод данных пассажиров. Пока это заглушка следующего шага.';
    informer.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    const button = informer.querySelector('button');
    button.removeAttribute('data-auto-car');
    button.removeAttribute('aria-describedby');
    button.removeAttribute('aria-pressed');
    button.disabled = false;
    button.classList.remove('gmsji', 'button--disabled');
    button.title = '';
    button.querySelector('.button__label').textContent = 'Вернуться к вагонам';
    button.addEventListener('click', back);
    button.addEventListener('pointerenter', () => button.classList.add('gmsji'));
    button.addEventListener('pointerleave', () => button.classList.remove('gmsji'));
    content.append(informer);
    page.append(content);
  };
  const show = request => {
    if (active) return;
    active = true;
    lastRequest = request;
    trigger = request.trigger;
    savedScroll = {x:window.scrollX, y:window.scrollY};
    render(request);
    original.setAttribute('data-passenger-hidden', '');
    original.inert = true;
    page.hidden = false;
    document.body.dataset.prototypeStep = 'passengers';
    document.title = `Данные пассажиров — ${originalTitle}`;
    steps.forEach((node, index) => {
      node.classList.toggle('exact-steps__item--current', index === 2);
      if (index <= 2) node.classList.remove('exact-steps__item--pending');
      if (index === 2) node.setAttribute('aria-current', 'step');
      else node.removeAttribute('aria-current');
    });
    window.scrollTo({top:0, left:0, behavior:'instant'});
    page.querySelector('h1').focus({preventScroll:true});
  };
  const hide = () => {
    if (!active) return;
    active = false;
    page.hidden = true;
    original.removeAttribute('data-passenger-hidden');
    original.inert = false;
    delete document.body.dataset.prototypeStep;
    document.title = originalTitle;
    stepState.forEach(({node, className, current}) => {
      node.className = className;
      if (current === null) node.removeAttribute('aria-current');
      else node.setAttribute('aria-current', current);
    });
    const restore = () => {
      if (active) return;
      window.scrollTo({top:savedScroll.y, left:savedScroll.x, behavior:'instant'});
      trigger?.focus({preventScroll:true});
    };
    restore();
    requestAnimationFrame(restore);
  };
  window.addEventListener('popstate', event => {
    if (event.state?.[historyKey] && lastRequest) show(lastRequest);
    else hide();
  });
  window.SeatSelectionPassengerPlaceholder = {open(request) {
    if (active) return;
    history.pushState({...history.state, [historyKey]:true}, '');
    show(request);
  }};
})();
