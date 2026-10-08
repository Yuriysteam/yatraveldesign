(() => {
  const button = document.querySelector('#downloadDetails');
  const toast = document.querySelector('#toast');
  if (!button || !toast) return;

  button.addEventListener('click', () => {
    toast.textContent = 'Реквизиты готовы к скачиванию';
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 2200);
  });
})();
