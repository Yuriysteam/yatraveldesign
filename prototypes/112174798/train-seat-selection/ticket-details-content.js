/* Shared ticket rows for the mobile sheet and desktop popover.
   Passenger assignment remains provisional: adults first, then children.
   Use existing fares and extras; do not invent child discounts. */
(() => {
  const money = value => `${new Intl.NumberFormat('ru-RU', {maximumFractionDigits:2}).format(value)} ₽`;
  const buildRows = ({places, adults, infants, seatTotal, discount, beddingPrice = () => 0}) => {
    let beddingTotal = 0;
    const rows = places.map((seat, index) => {
      const bedding = beddingPrice(seat);
      beddingTotal += bedding;
      const child = index >= adults;
      const reduction = discount(seat);
      const position = ['left','right'].includes(seat.position) ? 'Сидячее' : seat.position === 'lower' ? 'Нижнее' : 'Верхнее';
      const tariff = reduction > 0 ? 'Невозвратный' : child ? 'Детский' : 'Полный';
      return {
        name:seat.automatic ? (child ? 'Ребенок до 10 лет' : 'Взрослый') : `${child ? 'Ребенок до 10 лет' : 'Взрослый'}, ${seat.number} место`,
        caption:seat.automatic ? `Тариф ${tariff}` : `${position}, Тариф ${tariff}`,
        estimated:Boolean(seat.estimated),
        // The basket total already includes paid bedding; itemize it only once.
        amount:seatTotal(seat) - bedding,
        reduction,
        percent:reduction > 0 && seat.price > 0 ? Math.round(reduction / seat.price * 100) : 0,
      };
    });
    for (let index = 0; index < infants; index++) {
      rows.push({name:'Детский без места', caption:'Тариф Детский', amount:0, percent:0});
    }
    if (beddingTotal > 0) {
      rows.push({name:'Постельное белье', caption:'', amount:beddingTotal, percent:0});
    }
    return rows;
  };
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const render = (container, data) => {
    const currentRows = buildRows(data);
    const outboundRows = Array.isArray(data.outboundRows) && data.outboundRows.length ? data.outboundRows : null;
    const rows = outboundRows ? [...outboundRows, ...currentRows] : currentRows;
    const renderRow = row => {
      const item = document.createElement('li');
      const copy = element('div', 'm-ticket-details__copy');
      const heading = element('div', 'm-ticket-details__heading');
      heading.append(element('span', 'm-ticket-details__name', row.name));
      if (row.percent) {
        const badge = element('span', 'train-discount-badge m-ticket-details__discount', `-${row.percent} %`);
        badge.setAttribute('aria-label', `Скидка ${row.percent}%`);
        heading.append(badge);
      }
      copy.append(heading);
      if (row.caption) copy.append(element('span', 'm-ticket-details__caption', row.caption));
      item.append(copy, element('span', 'm-price-details__amount', `${row.estimated ? 'от ' : ''}${money(row.amount)}`));
      return item;
    };
    const direction = label => element('li', 'm-ticket-details__direction', label);
    const directions = data.directions || ['Москва — Санкт-Петербург', 'Санкт-Петербург — Москва'];
    const currentDirection = data.directions?.[data.legIndex || 0];
    const items = outboundRows
      ? [direction(directions[0]), ...outboundRows.map(renderRow),
        direction(directions[1]), ...currentRows.map(renderRow)]
      : [...(currentDirection ? [direction(currentDirection)] : []), ...currentRows.map(renderRow)];
    const list = container.querySelector('.m-price-details__list');
    list.classList.toggle('m-price-details__list--directions', Boolean(outboundRows || currentDirection));
    list.replaceChildren(...items);
    const estimated = rows.some(row => row.estimated) ? 'от ' : '';
    const total = rows.reduce((sum,row) => sum + Number(row.amount || 0), 0);
    const reduction = rows.reduce((sum,row) => sum + Number(row.reduction || 0), 0);
    const original = container.querySelector('.m-price-details__old-price');
    original.hidden = reduction <= 0;
    original.textContent = reduction > 0 ? `${estimated}${money(total + reduction)}` : '';
    container.querySelector('.m-price-details__total-price').textContent = `${estimated}${money(total)}`;
  };
  window.SeatSelectionTicketDetails = {buildRows, render};
})();
