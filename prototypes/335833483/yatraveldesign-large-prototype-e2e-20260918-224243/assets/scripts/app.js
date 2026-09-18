const button = document.querySelector('#check');
const status = document.querySelector('#status');
button.addEventListener('click', () => {
  status.textContent = 'HTML, CSS, JavaScript и большой ресурс в архиве проверены.';
  button.textContent = 'Готово';
});
