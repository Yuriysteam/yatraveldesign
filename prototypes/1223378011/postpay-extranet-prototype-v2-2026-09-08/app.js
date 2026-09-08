const clone = (value) => JSON.parse(JSON.stringify(value));

const initialSettings = {
  paymentMode: "online",
  online: {
    freeCancellation: false,
    period: "14 дней",
    penalty: "30% стоимости первой ночи",
  },
  onsite: {
    freeCancellation: false,
    period: "3 дня",
    penalty: "30% стоимости первой ночи",
    prepayment: "Минимальная",
  },
  hybrid: {
    freeCancellation: true,
    period: "7 дней",
    penalty: 20,
    prepayment: 35,
  },
};

const state = {
  saved: clone(initialSettings),
  draft: clone(initialSettings),
  drawer: false,
  page: "settings",
  editor: "main",
  openDropdown: null,
  confirmClose: false,
  notice: "",
  toast: "",
  selectedObjects: new Set(),
  search: "",
};

// Handy local review URLs: ?demo=online, ?demo=onsite or ?demo=hybrid.
const demoMode = new URLSearchParams(location.search).get("demo");
if (["online", "onsite", "hybrid"].includes(demoMode)) {
  state.drawer = true;
  state.draft.paymentMode = demoMode === "hybrid" ? "both" : demoMode;
}

const periodsOnline = ["6 часов", "10 часов", "1 день", "2 дня", "3 дня", "5 дней", "7 дней", "14 дней", "30 дней", "42 дня", "60 дней"];
const periodsLimited = ["6 часов", "10 часов", "1 день", "2 дня", "3 дня", "5 дней", "7 дней", "14 дней"];
const onlinePenalties = ["30% стоимости первой ночи", "50% стоимости первой ночи", "70% стоимости первой ночи", "100% стоимости первой ночи", "50% стоимости бронирования", "100% стоимости бронирования"];
const onsitePrepayments = ["Минимальная", "35%", "50%", "100%"];
const hybridPenalties = [20, 35, 50, 100];
const hybridPrepayments = [35, 50, 100];

const objects = [
  ["Квартиры на улице Маяковского", "ID 49531951599123", "mayakovskogo.png"],
  ["Жилые помещения на проспекте Ленина", "ID 9249123091855", "lenina.png"],
  ["Студии на улице Рубинштейна", "ID 8193281938581", "rubinshteyna.png"],
  ["Комнаты на проспекте Суворова", "ID 3782914729145", "suvorova.png"],
  ["Апартаменты на улице Достоевского", "ID 5829057192951", "dostoevskogo.png"],
];

function isDirty() {
  return JSON.stringify(state.saved) !== JSON.stringify(state.draft);
}

function periodLead(period) {
  return period.includes("час") ? `менее, чем за ${period}` : `менее, чем за ${period}`;
}

function onlineOutcome(rule) {
  if (!rule.freeCancellation) return `При отмене бронирования вы получите ${rule.penalty.toLowerCase()}`;
  return `Если бронь отменят ${periodLead(rule.period)} до заселения — вы получите ${rule.penalty.toLowerCase()}`;
}

function onsiteOutcome(rule) {
  const value = rule.prepayment === "Минимальная" ? "минимальную предоплату, равную комиссии" : `${rule.prepayment} стоимости бронирования`;
  if (!rule.freeCancellation) return `При отмене бронирования вы получите ${value}`;
  return `Если бронь отменят ${periodLead(rule.period)} до заселения — вы получите ${value}`;
}

function hybridOutcome(rule) {
  const lead = rule.freeCancellation
    ? `Если бронь отменят ${periodLead(rule.period)} до заселения`
    : "При отмене бронирования";
  if (rule.penalty === rule.prepayment) {
    return `${lead} — вы получите всю предоплату: ${rule.penalty}% стоимости бронирования`;
  }
  return `${lead} — из предоплаты ${rule.prepayment}% вы получите ${rule.penalty}%, остальные ${rule.prepayment - rule.penalty}% вернутся гостю`;
}

function summaryText(settings) {
  if (settings.paymentMode === "online") return `Онлайн · ${settings.online.freeCancellation ? `Бесплатная отмена до ${settings.online.period}` : "Без бесплатной отмены"}, штраф ${settings.online.penalty.toLowerCase()}`;
  if (settings.paymentMode === "onsite") return `На месте · ${settings.onsite.freeCancellation ? `Бесплатная отмена до ${settings.onsite.period}` : "Без бесплатной отмены"}, предоплата ${settings.onsite.prepayment.toLowerCase()}`;
  return `Онлайн или на месте · Единые правила отмены, штраф ${settings.hybrid.penalty}%, предоплата ${settings.hybrid.prepayment}%`;
}

function dropdown(id, value, options, { compact = false, subtitle = null, disabled = () => false } = {}) {
  const isOpen = state.openDropdown === id;
  return `<div class="dropdown ${compact ? "dropdown--compact" : ""}">
    <button class="dropdown__control ${isOpen ? "dropdown__control--open" : ""}" type="button" data-action="toggle-dropdown" data-dropdown="${id}">
      <span>${value}</span><span class="icon icon--chevron" aria-hidden="true"></span>
    </button>
    ${isOpen ? `<div class="dropdown__menu" role="listbox">
      ${options.map((option) => {
        const optionValue = typeof option === "object" ? option.value : option;
        const label = typeof option === "object" ? option.label : option;
        const note = typeof option === "object" ? option.subtitle : (subtitle && subtitle(optionValue));
        const isDisabled = disabled(optionValue);
        return `<button class="dropdown__option" type="button" role="option" ${isDisabled ? "disabled" : ""} data-action="choose-option" data-dropdown="${id}" data-value="${optionValue}">
          <span class="dropdown__option-copy"><span>${label}</span>${note ? `<small>${note}</small>` : ""}</span>
        </button>`;
      }).join("")}
    </div>` : ""}
  </div>`;
}

function binaryToggle(scope, active) {
  return `<div class="binary-segmented cancellation-card__switch" role="radiogroup">
    <button type="button" class="${active ? "binary-segmented__active" : ""}" data-action="set-free" data-scope="${scope}" data-value="true">Есть</button>
    <button type="button" class="${!active ? "binary-segmented__active" : ""}" data-action="set-free" data-scope="${scope}" data-value="false">Нет</button>
  </div>`;
}

function periodField(scope, value, options) {
  return `<div class="period-fields">
    <div class="field">
      <label class="field__label">Заканчивается, когда до заселения</label>
      ${dropdown(`${scope}-period`, value, options)}
      <p class="field__helper"><span class="helper-icon" aria-hidden="true"><img src="./assets/icon-warning-12.svg" alt="" /></span> Дата заезда начинается в 00:00 по местному времени объекта размещения</p>
    </div>
  </div>`;
}

function outcome(text, className = "") {
  return `<section class="outcome-card ${className}">
    <div class="outcome-card__icon"><img src="./assets/outcome-bubble.png" alt="" /></div>
    <div><h3>Что получается</h3><p>${text}</p></div>
  </section>`;
}

function paymentMethods() {
  const mode = state.draft.paymentMode;
  const rows = [
    ["online", "Онлайн", "Гость сможет оплатить бронирование в приложении или на сайте", ""],
    ["onsite", "На месте", "Гость оплачивает предоплату в приложении или на сайте, остальное — по приезду на месте", ""],
    ["both", "Онлайн или на месте", "Самая эффективная модель оплаты. Гость сможет оплатить бронирование в приложении, на сайте или по приезду на месте", "Больше бронирований"],
  ];
  return `<section class="settings-card settings-card--methods">
    <h2 class="settings-card__heading">Способ оплаты</h2>
    <div class="radio-list">
      ${rows.map(([value, title, description, badge]) => `<label class="radio-option">
        <input class="sr-only" type="radio" name="payment-mode" value="${value}" ${mode === value ? "checked" : ""} />
        <span class="radio-option__mark"></span>
        <span class="radio-option__content"><strong class="radio-option__title">${title}</strong>${badge ? `<span class="radio-option__badge">${badge}</span>` : ""}<span class="radio-option__description">${description}</span></span>
      </label>`).join("")}
    </div>
  </section>`;
}

function onlineSettings() {
  const rule = state.draft.online;
  return `<section class="settings-card cancellation-card">
    <h2 class="settings-card__heading">Период бесплатной отмены</h2>
    ${binaryToggle("online", rule.freeCancellation)}
    ${rule.freeCancellation ? periodField("online", rule.period, periodsOnline) : ""}
    <div class="penalty-fields"><div class="field">
      <label class="field__label">${rule.freeCancellation ? "Сколько взимается с гостя при отмене после бесплатного периода?" : "Сколько взимается с гостя при отмене?"}</label>
      ${dropdown("online-penalty", rule.penalty, onlinePenalties)}
    </div></div>
  </section>${outcome(onlineOutcome(rule))}`;
}

function onsiteSettings() {
  const rule = state.draft.onsite;
  return `<section class="settings-card cancellation-card cancellation-card--onsite">
    <h2 class="settings-card__heading">Период бесплатной отмены</h2>
    ${binaryToggle("onsite", rule.freeCancellation)}
    ${rule.freeCancellation ? periodField("onsite", rule.period, periodsLimited) : ""}
    <div class="penalty-fields"><div class="field">
      <label class="field__label">${rule.freeCancellation ? "Сколько взимается с гостя при отмене после бесплатного периода?" : "Сколько взимается с гостя при отмене?"}</label>
      ${dropdown("onsite-penalty", rule.penalty, onlinePenalties)}
    </div></div>
  </section>
  <section class="settings-card prepayment-card prepayment-card--single">
    <div><h2 class="settings-card__heading">Предоплата</h2><p>При выборе минимальной предоплаты — она всегда равна комиссии</p></div>
    <div class="prepayment-single"><label class="field__label">Размер предоплаты</label>${dropdown("onsite-prepayment", rule.prepayment, onsitePrepayments, { compact: true, subtitle: (v) => v === "Минимальная" ? "Равна комиссии" : null })}</div>
  </section>${outcome(onsiteOutcome(rule), "outcome-card--onsite")}`;
}

function hybridSettings() {
  const rule = state.draft.hybrid;
  const penaltyValue = `${rule.penalty}% общей стоимости бронирования`;
  const prepaymentValue = `${rule.prepayment}% общей стоимости бронирования`;
  return `<section class="settings-card cancellation-card hybrid-rule-card">
    <div class="hybrid-rule-card__header">
      <div><h2 class="settings-card__heading">Единые правила отмены</h2><p>Действуют и для оплаты онлайн, и для оплаты на месте</p></div>
      <span class="constraint-badge">Штраф ≤ предоплаты</span>
    </div>
    <h3 class="hybrid-rule-card__subheading">Период бесплатной отмены</h3>
    ${binaryToggle("hybrid", rule.freeCancellation)}
    ${rule.freeCancellation ? periodField("hybrid", rule.period, periodsLimited) : ""}
    <div class="field hybrid-field">
      <label class="field__label">${rule.freeCancellation ? "Сколько взимается с гостя при отмене после бесплатного периода?" : "Сколько взимается с гостя при отмене?"}</label>
      ${dropdown("hybrid-penalty", penaltyValue, hybridPenalties.map((v) => ({value:v,label:`${v}% общей стоимости бронирования`})))}
    </div>
    <div class="field hybrid-field">
      <label class="field__label">Предоплата для оплаты на месте</label>
      ${dropdown("hybrid-prepayment", prepaymentValue, hybridPrepayments.map((v) => ({value:v,label:`${v}% общей стоимости бронирования`})), { disabled: (v) => Number(v) < rule.penalty })}
      <p class="field__helper">Размер предоплаты не может быть меньше штрафа за отмену</p>
    </div>
    ${state.notice ? `<div class="informer informer--neutral"><span class="informer__icon">i</span><p>${state.notice}</p></div>` : ""}
  </section>${outcome(hybridOutcome(rule), "outcome-card--custom")}`;
}

function settingsDrawer() {
  const body = state.draft.paymentMode === "online" ? onlineSettings() : state.draft.paymentMode === "onsite" ? onsiteSettings() : hybridSettings();
  return `<div class="overlay">
    <button class="drawer-close" type="button" aria-label="Закрыть" data-action="close-drawer"><img class="drawer-close__icon" src="./icons/24/close.svg" alt="" /></button>
    <section class="drawer">
      <header class="drawer__header"><h1 class="drawer__heading">Модель оплаты</h1><button class="button button--compact button--secondary" type="button" data-action="open-objects">Применить к другим объектам</button></header>
      <div class="drawer__scroll">${paymentMethods()}${body}</div>
      <footer class="drawer__footer"><button class="button button--secondary" type="button" data-action="cancel">Отменить</button><button class="button button--primary" type="button" data-action="save">Сохранить</button></footer>
    </section>
    ${state.confirmClose ? confirmModal() : ""}
  </div>`;
}

function objectPicker() {
  const query = state.search.trim().toLowerCase();
  const filtered = objects.filter(([name, id]) => `${name} ${id}`.toLowerCase().includes(query));
  return `<div class="overlay">
    <button class="drawer-close" type="button" aria-label="Закрыть" data-action="close-drawer"><img class="drawer-close__icon" src="./icons/24/close.svg" alt="" /></button>
    <section class="drawer drawer--object-picker">
      <header class="drawer__header"><h1 class="drawer__heading">К каким объектам применить способ оплаты?</h1></header>
      <div class="drawer__scroll">
        <label class="object-picker__search"><img class="object-picker__search-icon" src="./figma-assets/search.svg" alt="" /><input type="search" placeholder="Поиск объектов" value="${state.search}" data-action="search" /></label>
        <div class="object-picker__list">
          ${filtered.map(([name,id,img], index) => `<label class="object-picker__row"><input type="checkbox" data-action="toggle-object" data-index="${objects.findIndex((o)=>o[0]===name)}" ${state.selectedObjects.has(objects.findIndex((o)=>o[0]===name)) ? "checked" : ""}/><span class="object-picker__box"></span><img class="object-picker__thumb" src="./object-photos/${img}" alt=""/><span class="object-picker__identity"><strong>${name}</strong><small>${id}</small></span></label>`).join("") || `<p class="object-picker__empty">Ничего не найдено</p>`}
        </div>
      </div>
      <footer class="drawer__footer"><button class="button button--secondary" type="button" data-action="back-settings"><span class="button__arrow-left">←</span>Назад</button><button class="button button--primary" type="button" data-action="apply-objects" ${state.selectedObjects.size ? "" : "disabled"}>Применить</button></footer>
    </section>
  </div>`;
}

function confirmModal() {
  return `<div class="modal-layer"><section class="confirm-modal"><h2>Закрыть без сохранения?</h2><p>Внесённые изменения не сохранятся.</p><div class="confirm-modal__actions"><button class="button button--secondary" data-action="keep-editing">Продолжить редактирование</button><button class="button button--primary" data-action="discard">Закрыть</button></div></section></div>`;
}

function shell() {
  return `<div class="extranet extranet--wireframe">
    <header class="topbar topbar--wireframe"><div class="wireframe-brand"><span class="wireframe-brand__mark"></span><span class="wireframe-line wireframe-line--brand"></span></div><span class="wireframe-divider"></span><span class="wireframe-line wireframe-line--product"></span><div class="wireframe-switcher"></div><div class="wireframe-topbar-actions"><i></i><i></i><span class="wireframe-topbar-actions__avatar"></span></div></header>
    <aside class="sidebar sidebar--wireframe"><nav class="wireframe-sidebar__nav">${Array.from({length:8},(_,i)=>`<div class="wireframe-sidebar__row"><span class="wireframe-sidebar__glyph"></span><span class="wireframe-sidebar__line" style="width:${92 + (i%3)*24}px"></span></div>`).join("")}</nav></aside>
    <main class="property-page">
      <section class="property-card"><h1>Цены и доступность</h1><dl class="property-list"><div><dt>Цены</dt><dd>10 000 ₽ в будние дни, 15 000 ₽ в выходные дни</dd></div><div><dt>Тарифы</dt><dd>Недоступны</dd></div><div class="property-list__editable"><span><dt>Модель оплаты и правила отмены</dt><dd class="property-list__summary">${summaryText(state.saved)}</dd></span><button class="icon-button" type="button" aria-label="Редактировать" data-action="open-drawer"><img src="./icons/24/edit.svg" alt="" /></button></div><div><dt>Синхронизация календарей</dt><dd>Не установлены</dd></div></dl></section>
      <section class="contract-card contract-card--wireframe"><span class="wireframe-contract__title"></span><span class="wireframe-contract__caption"></span><div class="wireframe-contract__group"><i></i><b></b></div><div class="wireframe-contract__group"><i></i><b></b></div></section>
    </main>
  </div>`;
}

function render() {
  const app = document.querySelector("#app");
  app.innerHTML = `${shell()}${state.drawer ? (state.page === "objects" ? objectPicker() : settingsDrawer()) : ""}${state.toast ? `<div class="toast">${state.toast}</div>` : ""}`;
}

function setNested(scope, key, value) {
  state.draft[scope][key] = value;
}

function chooseOption(id, rawValue) {
  const value = /^\d+$/.test(rawValue) ? Number(rawValue) : rawValue;
  if (id === "online-period") setNested("online", "period", value);
  if (id === "online-penalty") setNested("online", "penalty", value);
  if (id === "onsite-period") setNested("onsite", "period", value);
  if (id === "onsite-penalty") setNested("onsite", "penalty", value);
  if (id === "onsite-prepayment") setNested("onsite", "prepayment", value);
  if (id === "hybrid-period") setNested("hybrid", "period", value);
  if (id === "hybrid-prepayment") setNested("hybrid", "prepayment", value);
  if (id === "hybrid-penalty") {
    const previous = state.draft.hybrid.prepayment;
    state.draft.hybrid.penalty = value;
    if (value > previous) {
      const next = hybridPrepayments.find((item) => item >= value) || 100;
      state.draft.hybrid.prepayment = next;
      state.notice = `Предоплата увеличена до ${next}%, чтобы она покрывала штраф за отмену.`;
    } else {
      state.notice = "";
    }
  }
  state.openDropdown = null;
}

document.addEventListener("click", (event) => {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) {
    if (state.openDropdown) { state.openDropdown = null; render(); }
    return;
  }
  const action = actionTarget.dataset.action;
  if (action === "open-drawer") { state.draft = clone(state.saved); state.drawer = true; state.page = "settings"; }
  if (action === "close-drawer" || action === "cancel") {
    if (isDirty()) state.confirmClose = true;
    else state.drawer = false;
  }
  if (action === "keep-editing") state.confirmClose = false;
  if (action === "discard") { state.draft = clone(state.saved); state.confirmClose = false; state.drawer = false; }
  if (action === "toggle-dropdown") state.openDropdown = state.openDropdown === actionTarget.dataset.dropdown ? null : actionTarget.dataset.dropdown;
  if (action === "choose-option") chooseOption(actionTarget.dataset.dropdown, actionTarget.dataset.value);
  if (action === "set-free") { setNested(actionTarget.dataset.scope, "freeCancellation", actionTarget.dataset.value === "true"); state.openDropdown = null; }
  if (action === "open-objects") state.page = "objects";
  if (action === "back-settings") state.page = "settings";
  if (action === "toggle-object") {
    const index = Number(actionTarget.dataset.index);
    if (actionTarget.checked) state.selectedObjects.add(index); else state.selectedObjects.delete(index);
  }
  if (action === "apply-objects") { state.page = "settings"; state.toast = `Настройки будут применены к объектам: ${state.selectedObjects.size}`; setTimeout(() => { state.toast = ""; render(); }, 2400); }
  if (action === "save") { state.saved = clone(state.draft); state.drawer = false; state.notice = ""; state.toast = "Настройки сохранены"; setTimeout(() => { state.toast = ""; render(); }, 2400); }
  render();
});

document.addEventListener("change", (event) => {
  if (event.target.name === "payment-mode") {
    state.draft.paymentMode = event.target.value;
    state.notice = "";
    state.openDropdown = null;
    render();
  }
});

document.addEventListener("input", (event) => {
  if (event.target.dataset.action === "search") {
    state.search = event.target.value;
    render();
    const input = document.querySelector('[data-action="search"]');
    input?.focus();
    input?.setSelectionRange(state.search.length, state.search.length);
  }
});

render();
