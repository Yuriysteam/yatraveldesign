const status = document.querySelector('#status');
const button = document.querySelector('#toggle');
status.textContent = 'HTML, CSS и JavaScript доступны.';
button.addEventListener('click', () => {
  button.textContent = 'Интерактивность проверена';
  status.textContent = 'Проверка завершена без внешних зависимостей.';
});
