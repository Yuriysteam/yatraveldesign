(() => {
  const mobile = document.documentElement.dataset.view === 'mobile';
  const heading = document.getElementById('error-heading');
  if (mobile) {
    heading.classList.replace('ui__auto-374', 'H_Xab');
    heading.textContent = 'Билеты недоступны для\u00a0покупки';
  }
  // Reuse the same sourced error-page building blocks; only content and CTA differ.
  if (errorParams.get('screen') === 'no-places') {
    document.title = 'Свободных мест не осталось · Выбор мест';
    heading.textContent = mobile ? 'Свободных мест не\u00a0осталось' : 'Свободных мест не осталось';
    document.querySelector('.error-copy p').textContent = mobile
      ? 'Посмотрите другие поезда на\u00a0выбранную\u00a0дату'
      : 'Посмотрите другие поезда на выбранную дату';
    document.querySelector('.error-art__desktop').src = './assets/no-places-desktop.png';
    document.querySelector('.error-art__mobile').src = './assets/no-places-mobile.png';
    document.getElementById('error-retry').hidden = true;
    document.getElementById('error-back').classList.replace('button--secondary', 'button--primary');
  }
  const errorScreen = document.querySelector('.error-screen');
  const placeholder = document.querySelector('.search-placeholder');
  document.getElementById('error-back').addEventListener('click', () => {
    errorScreen.hidden = true;
    placeholder.hidden = false;
    const title = document.getElementById('search-heading');
    title.tabIndex = -1;
    title.focus();
  });
  document.getElementById('error-return').addEventListener('click', () => {
    placeholder.hidden = true;
    errorScreen.hidden = false;
    document.getElementById('error-back').focus();
  });
  document.getElementById('error-retry').addEventListener('click', () => {
    // Demonstrate a successful retry without calling booking APIs.
    if (parent !== window) parent.postMessage({ type: 'seat-selection-retry' }, location.origin);
    else {
      const target = new URL(mobile ? './mobile.html' : './desktop.html', location.href);
      for (const key of ['theme', 'train', 'scheme']) if (errorParams.has(key)) target.searchParams.set(key, errorParams.get(key));
      if (mobile) target.searchParams.set('surface', document.documentElement.dataset.surface);
      location.assign(target);
    }
  });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent) return;
    if (event.data?.type === 'seat-selection-theme') document.documentElement.dataset.theme = event.data.theme === 'dark' ? 'dark' : 'light';
  });
})();
