/* Mobile discount sheets: ReDesign 20006:248003 / 20006:247778.
   Reuse the existing HTML sheet, Close and HomeBar; no fare is applied here. */
(() => {
  const trigger = document.querySelector('.m-discounts button');
  if (!trigger) return;
  const sapsan = !!window.SeatSelectionSapsan;
  const offers = [
    ...(sapsan ? [
      ['Для пассажиров старше 60', 'Скидка до 30%'],
      ['Для юниоров с 10 до 21 года', 'Скидка до 30%'],
    ] : []),
    ['Для именинников', 'Скидка до 30% действует в день рождения, а также за 7 дней до и 7 дней после праздника'],
    ['Для сопровождающих именинника', 'Скидка до 30% действует не только для именинника, но и для его сопровождающих. В заказе может быть до четырёх билетов (до двух для вагонов класса «Люкс»), при этом у одного пассажира должен быть выбран тариф «День рождения». Чтобы применить скидку, выберите места с номерами подряд, либо идущие подряд верхние или нижние места. Если именинник откажется от поездки, сопровождающие не смогут воспользоваться скидкой, им придётся сдать билеты и приобрести новые по полному тарифу'],
  ];
  const sheet = document.createElement('dialog');
  sheet.id = 'm-discounts-info';
  sheet.className = 'm-price-details m-amenities-sheet m-discounts-info';
  sheet.dataset.nodeId = sapsan ? '20006:247778' : '20006:248003';
  sheet.dataset.train = sapsan ? 'sapsan' : 'regular';
  sheet.setAttribute('aria-labelledby', 'm-discounts-info-title');
  sheet.innerHTML = `<header class="m-amenities-sheet__header">
    <div class="m-amenities-sheet__titles"><h2 id="m-discounts-info-title">Какие скидки есть в этом поезде</h2></div>
    <button class="m-amenities-sheet__close" type="button" aria-label="Закрыть информацию о скидках" autofocus><img src="./mobile/assets/gender-close.svg" width="24" height="24" alt=""></button>
  </header>
  <div class="m-discounts-info__content">${offers.map(([title, text]) => `<section class="m-discounts-info__offer"><h3>${title}</h3><p>${text}</p></section>`).join('')}</div>
  <div class="m-amenities-sheet__homebar" aria-hidden="true"><img src="./mobile/assets/price-details-homebar.svg" width="375" height="34" alt=""></div>`;
  document.body.append(sheet);
  trigger.removeAttribute('aria-disabled');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', sheet.id);
  trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', () => {
    if (sheet.open) return;
    window.SeatSelectionSheetMotion.open(sheet);
    sheet.querySelector('.m-discounts-info__content').scrollTop = 0;
    trigger.setAttribute('aria-expanded', 'true');
  });
  sheet.querySelector('.m-amenities-sheet__close').addEventListener('click', () => window.SeatSelectionSheetMotion.close(sheet));
  const outside = event => {
    const r = sheet.getBoundingClientRect();
    return event.target === sheet && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom);
  };
  let backdropPress = false;
  sheet.addEventListener('pointerdown', event => { backdropPress = outside(event); });
  sheet.addEventListener('click', event => {
    if (backdropPress && outside(event)) window.SeatSelectionSheetMotion.close(sheet);
    backdropPress = false;
  });
  sheet.addEventListener('close', () => {
    if (sheet.open) return;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus({preventScroll:true});
  });
})();
