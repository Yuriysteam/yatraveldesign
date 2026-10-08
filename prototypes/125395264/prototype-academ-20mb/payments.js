let payments = [
  ['31 авг 2026','1 932 788,18','0','91 422 764,7','91 160 635,9','1','262 128,8','22','98 946 186,9'],
  ['30 авг 2026','2 675 442,37','0','89 489 976','0','0','262 128,8','21','96 212 376,79'],
  ['29 авг 2026','2 591 513,31','0','86 814 534,15','0','0','262 128,8','20','94 475 652,42'],
  ['28 авг 2026','3 195 954,23','0','84 223 020','0','0','262 128,8','19','92 254 689,4'],
  ['27 авг 2026','2 522 959,6','0','81 027 066,61','0','0','262 128,8','18','90 341 576,1'],
  ['26 авг 2026','3 463 831,31','0','78 504 107,01','0','0','262 128,8','17','88 269 555,08'],
  ['25 авг 2026','2 027 764,78','0','75 040 275,7','0','0','262 128,8','16','85 692 564,65'],
  ['24 авг 2026','2 128 525,35','0','73 012 510,92','0','0','262 128,8','15','83 122 947,84'],
  ['23 авг 2026','3 335 517,57','0','70 883 985,5','0','0','262 128,8','14','79 226 818,63'],
  ['22 авг 2026','2 846 219,4','0','67 548 468','0','0','262 128,8','13','76 104 832,16'],
  ['21 авг 2026','2 214 705,63','0','64 702 248,6','0','0','262 128,8','12','73 588 104,92'],
  ['20 авг 2026','3 052 481,96','0','62 487 542,97','0','0','262 128,8','11','70 942 317,54'],
  ['19 авг 2026','2 438 976,24','0','59 435 061,01','0','0','262 128,8','10','68 115 904,38'],
  ['18 авг 2026','2 771 340,52','0','56 996 084,77','0','0','262 128,8','9','65 437 812,16']
];
let descending = false;
let sortColumn = 6;
const columns = [
  {index:0,label:'Дата',width:74,visible:true},
  {index:1,label:'Начислено, ₽',width:107,visible:true},
  {index:2,label:'Оплачено, ₽',width:100,visible:true},
  {index:3,label:'Баланс, ₽',width:98,visible:true,help:'Состояние взаиморасчётов после начислений и оплат'},
  {index:4,label:'К оплате, ₽',width:100,visible:true,help:'Сумма, которую нужно оплатить и которая ещё не перешла в просрочку'},
  {index:5,label:'Дней после начисления',width:174,visible:true,help:'Количество дней с даты начисления суммы к оплате'},
  {index:6,label:'Просрочено, ₽',width:123,visible:true,help:'Сумма, которую не оплатили в установленный срок'},
  {index:7,label:'Дней просрочки',width:130,visible:true,help:'Количество дней с даты, когда сумма к оплате стала просроченной'},
  {index:8,label:'Будущие оплаты, ₽',width:145,visible:true,help:'Расчётная сумма предстоящих платежей при выполнении заданных условий'}
];
let columnOrder = [...columns];
const rows = document.querySelector('#paymentsRows');
const numericValue = value => Number(String(value).replace(/[\s ]/g, '').replace(',', '.')) || 0;
const dateValue = value => {
  const [day, month, year] = value.split(' ');
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  return new Date(Number(year), months.indexOf(month), Number(day)).getTime();
};
const render = () => {
  const data = [...payments].sort((a, b) => {
    const first = sortColumn === 0 ? dateValue(a[0]) : numericValue(a[sortColumn]);
    const second = sortColumn === 0 ? dateValue(b[0]) : numericValue(b[sortColumn]);
    return descending ? second - first : first - second;
  });
  const visibleColumns = columnOrder.filter(column => column.visible);
  const grid = visibleColumns.map(column => `${column.width}px`).join(' ');
  document.querySelector('.payments-row--head').style.gridTemplateColumns = grid;
  document.querySelector('.payments-row--head').innerHTML = visibleColumns.map(column => `<span role="columnheader">${column.help ? `<button class="table-head-button" type="button" data-column-help="${column.index}" aria-haspopup="dialog" aria-expanded="false"><span>${column.label}</span><img class="table-head-info" src="assets/information-16.svg" alt=""></button>` : column.label}</span>`).join('');
  rows.innerHTML = data.map(row => `<div class="payments-row" role="row" style="grid-template-columns:${grid}">${visibleColumns.map(column => `<span role="cell">${row[column.index]}</span>`).join('')}</div>`).join('');
};
render();

const tableHelpPopover = document.querySelector('#tableHelpPopover');
const tableHelpTitle = document.querySelector('#tableHelpTitle');
const tableHelpText = document.querySelector('#tableHelpText');
let activeHelpButton = null;
const closeTableHelp = () => {
  if (activeHelpButton) activeHelpButton.setAttribute('aria-expanded', 'false');
  activeHelpButton = null;
  tableHelpPopover.hidden = true;
};
const openTableHelp = button => {
  const column = columns.find(item => item.index === Number(button.dataset.columnHelp));
  if (!column) return;
  if (activeHelpButton && activeHelpButton !== button) activeHelpButton.setAttribute('aria-expanded', 'false');
  activeHelpButton = button;
  button.setAttribute('aria-expanded', 'true');
  tableHelpPopover.classList.add('table-help-popover--m');
  document.querySelector('#closeTableHelp img').src = 'assets/tooltip-close-24.svg';
  tableHelpTitle.textContent = column.label.replace(', ₽', '');
  tableHelpText.textContent = column.help;
  tableHelpPopover.hidden = false;
  const rect = button.getBoundingClientRect();
  const width = tableHelpPopover.offsetWidth;
  const height = tableHelpPopover.offsetHeight;
  const left = Math.min(window.innerWidth - width - 16, Math.max(16, rect.left + rect.width / 2 - width / 2));
  const below = rect.bottom + 10;
  const top = below + height <= window.innerHeight - 16 ? below : Math.max(16, rect.top - height - 10);
  tableHelpPopover.style.left = `${left}px`;
  tableHelpPopover.style.top = `${top}px`;
};
document.querySelector('.payments-row--head').addEventListener('click', event => {
  const button = event.target.closest('[data-column-help]');
  if (!button) return;
  event.stopPropagation();
  if (activeHelpButton === button && !tableHelpPopover.hidden) closeTableHelp();
  else openTableHelp(button);
});
document.querySelector('#closeTableHelp').addEventListener('click', closeTableHelp);

const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const monthShort = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const paymentDateLabel = date => `${date.getDate()} ${monthShort[date.getMonth()]} ${date.getFullYear()}`;
const money = value => new Intl.NumberFormat('ru-RU', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value);
const datesBackFrom = (end, count, startLimit) => {
  const result = [];
  for (let offset = 0; result.length < count; offset += 1) {
    const date = new Date(end);
    date.setDate(date.getDate() - offset);
    if (startLimit && date < startLimit) break;
    result.push(date);
  }
  return result;
};
const generatePaymentRows = () => {
  const selectedValue = periodValueButton.querySelector('span').textContent.trim();
  const company = document.querySelector('.payment-select--company>button span').textContent;
  const factor = company.includes('АОН.РУ') ? 0.74 : 1;
  let dates = [];
  if (periodMode === 'month') {
    const [monthName, yearText] = selectedValue.split(' ');
    const month = Math.max(0, monthNames.indexOf(monthName));
    const year = Number(yearText) || 2026;
    dates = datesBackFrom(new Date(year, month + 1, 0), 14);
  } else if (periodMode === 'quarter') {
    const match = selectedValue.match(/(\d) квартал (\d{4})/);
    const quarter = Number(match?.[1] || 3);
    const year = Number(match?.[2] || 2026);
    dates = datesBackFrom(new Date(year, quarter * 3, 0), 18);
  } else if (periodMode === 'year') {
    const year = Number(selectedValue) || 2026;
    dates = Array.from({length: 12}, (_, index) => new Date(year, 12 - index, 0));
  } else {
    const start = rangeStart ? new Date(`${rangeStart}T12:00:00`) : new Date(2026, 0, 1);
    const end = rangeEnd ? new Date(`${rangeEnd}T12:00:00`) : (rangeStart ? new Date(`${rangeStart}T12:00:00`) : new Date(2026, 11, 31));
    dates = datesBackFrom(end, 20, start);
  }
  let balance = 42000000 * factor;
  const chronological = [...dates].reverse().map((date, index) => {
    const accrued = (1850000 + ((date.getDate() * 7919 + date.getMonth() * 173000) % 1650000)) * factor;
    const paid = index > 0 && index % 5 === 0 ? accrued * 0.62 : 0;
    balance += accrued - paid;
    const payable = index === dates.length - 1 ? Math.max(0, balance - 262128.8 * factor) : 0;
    const overdue = 262128.8 * factor;
    const debtDays = index + 1;
    const future = balance + (7200000 + date.getDate() * 83000) * factor;
    return [paymentDateLabel(date), money(accrued), paid ? money(paid) : '0', money(balance), payable ? money(payable) : '0', String(payable ? 1 : 0), money(overdue), String(debtDays), money(future)];
  });
  return chronological.reverse();
};

const periodValueSelect = document.querySelector('#periodValueSelect');
const periodValueButton = periodValueSelect.querySelector(':scope>button');
const periodValueMenu = periodValueSelect.querySelector('.payment-menu');
const paymentCalendar = document.querySelector('#paymentCalendar');
const periodOptions = {
  month: ['Январь 2026','Февраль 2026','Март 2026','Апрель 2026','Май 2026','Июнь 2026','Июль 2026','Август 2026','Сентябрь 2026','Октябрь 2026','Ноябрь 2026','Декабрь 2026'],
  quarter: ['1 квартал 2025','2 квартал 2025','3 квартал 2025','4 квартал 2025','1 квартал 2026','2 квартал 2026','3 квартал 2026','4 квартал 2026'],
  year: ['2025','2026']
};
let periodMode = 'custom';
let rangeStart = '2025-08-31';
let rangeEnd = '2026-08-13';
const shortMonths = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const formatDate = (iso, includeYear = true) => {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${shortMonths[month - 1]}${includeYear ? ` ${year}` : ''}`;
};
const formatRange = (start, end) => end
  ? `${formatDate(start, start.slice(0, 4) !== end.slice(0, 4))} – ${formatDate(end)}`
  : formatDate(start);
const isoDate = (year, month, day) => `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
const drawCalendarMonth = (year, month) => {
  const names = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const first = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const days = Array.from({length: count}, (_, index) => {
    const iso = isoDate(year, month, index + 1);
    const classes = [iso === rangeStart ? 'range-start' : '', iso === rangeEnd ? 'range-end' : '', rangeStart && rangeEnd && iso > rangeStart && iso < rangeEnd ? 'in-range' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${classes}" data-calendar-day="${iso}">${index + 1}</button>`;
  }).join('');
  return `<section><div class="payment-calendar__title">${names[month]} ${year}</div><div class="payment-calendar__week"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div><div class="payment-calendar__days">${'<i></i>'.repeat(first)}${days}</div></section>`;
};
const drawPaymentCalendar = () => {
  paymentCalendar.innerHTML = `<div class="payment-calendar__months">${drawCalendarMonth(2026,0)}${drawCalendarMonth(2026,1)}</div><div class="payment-calendar__hint">Выберите начало и конец периода</div>`;
};
drawPaymentCalendar();
const updatePeriodValue = mode => {
  periodMode = mode;
  paymentCalendar.hidden = true;
  periodValueMenu.hidden = mode === 'custom';
  if (mode === 'custom') {
    periodValueButton.querySelector('span').textContent = rangeStart ? formatRange(rangeStart, rangeEnd || rangeStart) : '1 янв – 31 дек 2026';
    drawPaymentCalendar();
    return;
  }
  periodValueMenu.className = 'payment-menu' + (mode === 'month' ? ' payment-menu--months' : '');
  periodValueMenu.innerHTML = periodOptions[mode].map(value => `<button role="option">${value}</button>`).join('');
  periodValueButton.querySelector('span').textContent = mode === 'month' ? 'Август 2026' : mode === 'quarter' ? '3 квартал 2026' : '2026';
};
document.querySelectorAll('.payment-select>button').forEach(button => button.addEventListener('click', event => {
  event.stopPropagation();
  const select = button.closest('.payment-select');
  document.querySelectorAll('.payment-select.is-open').forEach(item => { if (item !== select) { item.classList.remove('is-open'); item.querySelector(':scope>button').setAttribute('aria-expanded','false'); } });
  const open = select.classList.toggle('is-open');
  button.setAttribute('aria-expanded', String(open));
  if (select === periodValueSelect && periodMode === 'custom') paymentCalendar.hidden = !open;
}));
document.addEventListener('click', event => {
  const option = event.target.closest('.payment-menu button');
  if (!option) return;
  const select = option.closest('.payment-select');
  select.querySelector(':scope>button span').textContent = option.textContent;
  select.classList.remove('is-open');
  select.querySelector(':scope>button').setAttribute('aria-expanded','false');
  if (select.id === 'periodSelect') updatePeriodValue(option.dataset.period);
  if (option.dataset.sort) {
    const columns = {date: 0, accrued: 1, paid: 2, balance: 3, payable: 4, debtDays: 5, overdueDebt: 6, overdueDays: 7, futurePayments: 8};
    sortColumn = columns[option.dataset.sort] ?? 0;
    render();
  }
});
paymentCalendar.addEventListener('click', event => {
  event.stopPropagation();
  const day = event.target.closest('[data-calendar-day]');
  if (!day) return;
  const selected = day.dataset.calendarDay;
  if (!rangeStart || rangeEnd) { rangeStart = selected; rangeEnd = null; }
  else if (selected < rangeStart) { rangeEnd = rangeStart; rangeStart = selected; }
  else { rangeEnd = selected; }
  periodValueButton.querySelector('span').textContent = formatRange(rangeStart, rangeEnd);
  drawPaymentCalendar();
});
document.addEventListener('click', event => {
  if (!event.target.closest('#tableHelpPopover') && !event.target.closest('[data-column-help]')) closeTableHelp();
  if (event.target.closest('.payment-select')) return;
  document.querySelectorAll('.payment-select.is-open').forEach(item => {
  item.classList.remove('is-open');
  item.querySelector(':scope>button').setAttribute('aria-expanded','false');
  });
  paymentCalendar.hidden = true;
});
document.querySelector('#sortDirection').addEventListener('click', event => {
  descending = !descending;
  event.currentTarget.querySelector('span:last-child').textContent = descending ? 'По убыванию' : 'По возрастанию';
  render();
});
const toast = text => {
  const el = document.querySelector('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(window.paymentToast);
  window.paymentToast = setTimeout(() => el.classList.remove('show'), 1800);
};
document.querySelector('#showPayments').addEventListener('click', () => {
  payments = generatePaymentRows();
  render();
  toast(`График обновлён: ${periodValueButton.querySelector('span').textContent}`);
});
document.querySelector('#exportPayments').addEventListener('click', () => toast('Демо: подготовка Excel-файла'));
const columnsOverlay = document.querySelector('#columnsOverlay');
const columnsList = document.querySelector('#columnsList');
let draftColumns = [];
const drawColumnsPanel = () => {
  columnsList.innerHTML = draftColumns.map(column => `<div class="columns-panel__row" draggable="true" data-column="${column.index}"><label><input type="checkbox" ${column.visible ? 'checked' : ''}><span>${column.label}</span></label><img class="columns-panel__drag" src="assets/sorting-default-20.svg" alt="Перетащить"></div>`).join('');
};
const closeColumnsPanel = () => { columnsOverlay.hidden = true; };
document.querySelector('#configurePayments').addEventListener('click', () => {
  draftColumns = columnOrder.map(column => ({...column}));
  drawColumnsPanel();
  columnsOverlay.hidden = false;
});
document.querySelector('#closeColumns').addEventListener('click', closeColumnsPanel);
columnsOverlay.addEventListener('click', event => { if (event.target === columnsOverlay) closeColumnsPanel(); });
columnsList.addEventListener('change', event => {
  const row = event.target.closest('[data-column]');
  const column = draftColumns.find(item => item.index === Number(row.dataset.column));
  if (column) column.visible = event.target.checked;
});
let draggedColumn = null;
columnsList.addEventListener('dragstart', event => {
  const row = event.target.closest('[data-column]');
  if (!row) return;
  draggedColumn = Number(row.dataset.column);
  row.classList.add('is-dragging');
  event.dataTransfer.effectAllowed = 'move';
});
columnsList.addEventListener('dragover', event => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
});
columnsList.addEventListener('drop', event => {
  event.preventDefault();
  const target = event.target.closest('[data-column]');
  if (!target || Number(target.dataset.column) === draggedColumn) return;
  const from = draftColumns.findIndex(item => item.index === draggedColumn);
  const to = draftColumns.findIndex(item => item.index === Number(target.dataset.column));
  const [moved] = draftColumns.splice(from, 1);
  draftColumns.splice(to, 0, moved);
  drawColumnsPanel();
});
columnsList.addEventListener('dragend', () => { draggedColumn = null; drawColumnsPanel(); });
document.querySelector('#saveColumns').addEventListener('click', () => {
  if (!draftColumns.some(column => column.visible)) { toast('Оставьте хотя бы одну колонку'); return; }
  columnOrder = draftColumns.map(column => ({...column}));
  render();
  closeColumnsPanel();
  toast('Настройки списка сохранены');
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  closeTableHelp();
  if (!columnsOverlay.hidden) closeColumnsPanel();
});
