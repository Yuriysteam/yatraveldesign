/* Informational desktop modal, ReDesign 20006:247048.
   Discounts are explained here, never applied to the current selection. */
(() => {
  const trigger = document.querySelector('.exact-discounts .exact-more');
  if (!trigger) return;
  const offers = [
    ...(window.SeatSelectionSapsan ? [
      ['Для пассажиров старше 60', 'Скидка до 30%'],
      ['Для юниоров с 10 до 21 года', 'Скидка до 30%'],
    ] : []),
    ['Для именинников', 'Скидка до 30% действует в день рождения, а также за 7 дней до и 7 дней после праздника'],
    ['Для сопровождающих именинника', 'Скидка до 30% действует не только для именинника, но и для его сопровождающих. В заказе может быть до четырёх билетов (до двух для вагонов класса «Люкс»), при этом у одного пассажира должен быть выбран тариф «День рождения». Чтобы применить скидку, выберите места с номерами подряд, либо идущие подряд верхние или нижние места. Если именинник откажется от поездки, сопровождающие не смогут воспользоваться скидкой, им придётся сдать билеты и приобрести новые по полному тарифу.'],
  ];
  const modal = document.createElement('dialog');
  modal.id = 'exact-discounts-info';
  modal.className = 'exact-discounts-info';
  modal.dataset.nodeId = '20006:247048';
  modal.setAttribute('aria-labelledby', 'exact-discounts-info-title');
  modal.innerHTML = `<header class="exact-discounts-info__header">
    <h2 id="exact-discounts-info-title">Какие скидки есть в этом поезде</h2>
    <button class="exact-discounts-info__close" type="button" aria-label="Закрыть информацию о скидках" autofocus><img src="./mobile/assets/gender-close.svg" width="24" height="24" alt=""></button>
  </header>
  <div class="exact-discounts-info__content">${offers.map(([title, text]) => `<section class="exact-discounts-info__offer"><h3>${title}</h3><p>${text}</p></section>`).join('')}</div>`;
  document.body.append(modal);
  trigger.removeAttribute('aria-disabled');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', modal.id);
  trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', () => {
    if (modal.open) return;
    modal.showModal();
    modal.querySelector('.exact-discounts-info__content').scrollTop = 0;
    trigger.setAttribute('aria-expanded', 'true');
  });
  modal.querySelector('.exact-discounts-info__close').addEventListener('click', () => modal.close());
  // Only dismiss a backdrop click, not a drag that started in the content.
  let backdropPress = false;
  const outside = event => {
    const r = modal.getBoundingClientRect();
    return event.target === modal && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom);
  };
  modal.addEventListener('pointerdown', event => { backdropPress = outside(event); });
  modal.addEventListener('click', event => {
    if (backdropPress && outside(event)) modal.close();
    backdropPress = false;
  });
  modal.addEventListener('close', () => {
    if (modal.open) return;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus({preventScroll:true});
  });
})();
