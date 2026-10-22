'use strict';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const ICONS = {
  download: '<path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/>',
  upload: '<path d="M12 16V4m-4 4 4-4 4 4M5 16v4h14v-4"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
  cursor: '<path d="m5 3 14 10-7 1-3 7Z"/>',
  paint: '<path d="m14 3 7 7-9 9-7-7ZM11 6l7 7M3 21h9M5 12l-2 7 7-2"/>',
  eraser: '<path d="m4 12 9-9 8 8-9 10H8l-5-5a3 3 0 0 1 1-4ZM8 8l8 8M12 21h9"/>',
  undo: '<path d="M8 5 3 10l5 5M3 10h10a7 7 0 0 1 7 7v2"/>',
  redo: '<path d="m16 5 5 5-5 5m5-5H11a7 7 0 0 0-7 7v2"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',
  fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 12h8m-6-2-2 2 2 2m4-4 2 2-2 2"/>',
  sliders: '<path d="M5 3v18M12 3v18M19 3v18"/><rect x="3" y="7" width="4" height="4" rx="1" fill="white"/><rect x="10" y="14" width="4" height="4" rx="1" fill="white"/><rect x="17" y="5" width="4" height="4" rx="1" fill="white"/>',
  door: '<path d="M6 21V4h12v17M3 21h18M14 12h1"/>',
  wings: '<path d="m12 2 2 8 8 5v3l-8-2v4l2 2-4-1-4 1 2-2v-4l-8 2v-3l8-5Z"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2l-1.5 1.5v1M12 17h.01"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  wc: '<circle cx="8" cy="5" r="1.5"/><circle cx="17" cy="5" r="1.5"/><path d="M5 10h6l-1 6v5M6 10l1 11M14 16l2-6h2l2 6Zm2 0v5m2-5v5"/>',
  galley: '<path d="M5 3v7a3 3 0 0 0 6 0V3M8 3v18M18 3v18m0-18c-4 3-4 10 0 10"/>',
  exit: '<path d="M4 12h16m-4-4 4 4-4 4M5 5H2v14h3"/>',
  seat: '<path d="M5 16V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v10M4 20v-5h16v5M7 20v2m10-2v2"/>'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.seat}</svg>`;
const MODELS = [
  { id: 'a320', name: 'Airbus A320-200', family: 'Узкий фюзеляж', groups: [3,3], rows: 30, exits: [12,13], source: 'https://www.qantas.com/en-de/onboard/fleet/a320' },
  { id: 'e190', name: 'Embraer E190', family: 'Региональный', groups: [2,2], rows: 25, exits: [12], source: 'https://www.qantas.com/en-in/onboard/fleet/e190' },
  { id: 'b787', name: 'Boeing 787-9', family: 'Широкий фюзеляж', groups: [3,3,3], rows: 33, exits: [16,17], source: 'https://www.boeing.com/commercial/787' },
  { id: 'b777', name: 'Boeing 777-300ER', family: 'Широкий фюзеляж', groups: [3,4,3], rows: 38, exits: [18,19], source: 'https://www.boeing.com/commercial/777/design-highlights' }
];
const TYPES = {
  economy: { label: 'Эконом', color: '#d9d1e5', short: '' },
  extra: { label: 'Комфорт+', color: '#cdb8ee', short: '' },
  business: { label: 'Бизнес', color: '#b9cfea', short: '' },
  blocked: { label: 'Заблокировано', color: '#e6e5eb', short: '' },
  wc: { label: 'Туалет', color: '#d9d2e1', short: 'WC' },
  galley: { label: 'Кухня', color: '#d9d2e1', short: '' },
  empty: { label: 'Пустая ячейка', color: '#f2edf6', short: '' }
};
const SEAT_TYPES = ['economy', 'extra', 'business', 'blocked'];
const STORE_KEY = 'salon-aircraft-projects-v1';
const ALLOWED_LAYOUTS = ['2-2', '3-3', '2-4-2', '3-3-3', '3-4-3'];
const countCols = groups => groups.reduce((a,b) => a+b,0);
const key = (row,col) => `${row}:${col}`;
const clone = value => JSON.parse(JSON.stringify(value));
const plural = (n, forms) => forms[n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 1 : 2];
let projects = {}, activeId = 'a320', selected = new Set(), passenger = new Set();
let tool = 'select', brushType = 'extra', zoom = 0.85, preview = false;
let past = [], future = [], drawing = false, drawn = new Set(), strokeChanged = false;
let toastTimer, savingTimer, storageAvailable = true;

function makeProject(model) {
  const cells = {};
  for (let r=1; r<=model.rows; r++) for (let c=0; c<countCols(model.groups); c++) {
    cells[key(r,c)] = r===1 || model.exits.includes(r) ? 'extra' : 'economy';
  }
  return { modelId:model.id, groups:[...model.groups], rows:model.rows, pitch:1.3, exits:true, wings:true, grid:false, labels:true, cells };
}
function validateProject(data) {
  if (!data || typeof data !== 'object' || !MODELS.some(m=>m.id===data.modelId)) throw new Error('Неизвестная модель самолёта');
  if (!Array.isArray(data.groups) || !ALLOWED_LAYOUTS.includes(data.groups.join('-'))) throw new Error('Неизвестная компоновка');
  if (!Number.isInteger(data.rows) || data.rows<4 || data.rows>65 || !Number.isFinite(data.pitch) || data.pitch<1.2 || data.pitch>2) throw new Error('Некорректные размеры салона');
  const clean = { modelId:data.modelId, groups:[...data.groups], rows:data.rows, pitch:Math.round(data.pitch*10)/10, exits:!!data.exits, wings:!!data.wings, grid:!!data.grid, labels:data.labels!==false, cells:{} };
  for(let r=1;r<=clean.rows;r++) for(let c=0;c<countCols(clean.groups);c++) {
    const type=data.cells?.[key(r,c)] || 'economy';
    if(!Object.hasOwn(TYPES,type)) throw new Error('Неизвестный тип модуля');
    clean.cells[key(r,c)]=type;
  }
  return clean;
}
try {
  const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  if (saved && saved.version===1) {
    for(const model of MODELS) if(saved.projects?.[model.id]) projects[model.id]=validateProject(saved.projects[model.id]);
    if(MODELS.some(m=>m.id===saved.activeId)) activeId=saved.activeId;
  }
} catch { /* Start with presets if storage is unavailable or an old file is damaged. */ }
for(const model of MODELS) projects[model.id] ||= makeProject(model);
const current = () => projects[activeId];
const model = () => MODELS.find(m=>m.id===activeId);

function notify(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2700);
}
function save() {
  clearTimeout(savingTimer);
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ version:1, activeId, projects })); storageAvailable=true; }
  catch { storageAvailable=false; }
  $('#save-status').innerHTML = `<span></span>${storageAvailable ? 'Сохранено на устройстве' : 'Не сохранено · скачайте JSON'}`;
}
function checkpoint() {
  past.push(clone(current())); if(past.length>60) past.shift(); future=[];
}
function updateHistory() { $('#undo').disabled=!past.length; $('#redo').disabled=!future.length; }
function mutate(fn) { checkpoint(); fn(current()); selected.clear(); render(); save(); }
function history(direction) {
  const source=direction==='undo'?past:future, destination=direction==='undo'?future:past;
  if(!source.length)return;
  destination.push(clone(current())); projects[activeId]=source.pop(); selected.clear(); render(); save();
}
function letters(groups=current().groups) {
  const layouts={ '2-2':['A','C','D','F'], '3-3':['A','B','C','D','E','F'], '2-4-2':['A','C','D','E','F','G','H','K'], '3-3-3':['A','B','C','D','E','F','H','J','K'], '3-4-3':['A','B','C','D','E','F','G','H','J','K'] };
  return layouts[groups.join('-')];
}
function seatLabel(id) { const [r,c]=id.split(':').map(Number); return `${r}${letters()[c]}`; }
function counts() {
  const out=Object.fromEntries(Object.keys(TYPES).map(t=>[t,0]));
  for(const type of Object.values(current().cells)) out[type]++;
  out.total=SEAT_TYPES.reduce((sum,type)=>sum+out[type],0); return out;
}
function miniCabin(groups) {return `<span class="mini-cabin">${groups.map(n=>`<span class="mini-cabin-group">${'<i></i>'.repeat(n*3)}</span>`).join('')}</span>`;}
function renderModels() {
  $('#model-list').innerHTML=MODELS.map(m=>`<button class="model-card ${activeId===m.id?'active':''}" data-model="${m.id}" aria-pressed="${activeId===m.id}">${miniCabin(m.groups)}<span><span class="model-name">${m.name}</span><span class="model-info"><span>${m.groups.join(' + ')}</span><span>·</span><span class="model-seats">${m.rows*countCols(m.groups)} мест</span><span class="model-mobile-family">${m.groups.length===2?'1 проход':'2 прохода'}</span></span></span></button>`).join('');
}
function renderModules() {
  $('#module-list').innerHTML=Object.entries(TYPES).filter(([id])=>id!=='empty').map(([id,type])=>`<button class="module-item ${tool==='paint'&&brushType===id?'active':''}" data-module="${id}" title="Рисовать: ${type.label}" aria-pressed="${tool==='paint'&&brushType===id}"><span class="module-symbol ${id}">${id==='extra'?'↕':id==='wc'?'WC':id==='galley'?icon('galley'):''}</span><span>${type.label}</span></button>`).join('');
}

function geometry() {
  const p=current(), cols=[], aisles=[]; let x=0;
  p.groups.forEach((n,gi)=>{ for(let c=0;c<n;c++){cols.push(x);x+=40;if(c<n-1)x+=8;} if(gi<p.groups.length-1){aisles.push(x);x+=48;} });
  const bodyWidth=x+60, wing=132, width=bodyWidth+wing*2;
  const exitRows=model().exits.filter(r=>r<=p.rows);
  const rowY = r => 44+(r-1)*40*p.pitch + exitRows.reduce((gap,exit)=>gap+(r>=exit?22:0),0);
  const contentTop=201, last=rowY(p.rows)+40, height=contentTop+last+155;
  return { cols,aisles,bodyWidth,wing,width,height,contentWidth:x,contentTop,last,rowY,exitRows };
}
function planeDrawing(g) {
  const p=current(), w=g.bodyWidth,h=g.height,x=g.wing,c=w/2,wingY=Math.max(510,h*.39),end=h-12;
  const shape=`M ${x+c} 12 C ${x+c-58} 12 ${x+12} 70 ${x+2} 155 L ${x+2} ${h-128} C ${x+2} ${h-63} ${x+c-44} ${end} ${x+c} ${end} C ${x+c+44} ${end} ${x+w-2} ${h-63} ${x+w-2} ${h-128} L ${x+w-2} 155 C ${x+w-12} 70 ${x+c+58} 12 ${x+c} 12 Z`;
  const wings=p.wings?`<path d="M${x+8} ${wingY} L14 ${wingY+220} Q5 ${wingY+233} 20 ${wingY+232} L${x+10} ${wingY+188}Z" fill="#eeedf2"/><path d="M${x+w-8} ${wingY} L${g.width-14} ${wingY+220} Q${g.width-5} ${wingY+233} ${g.width-20} ${wingY+232} L${x+w-10} ${wingY+188}Z" fill="#eeedf2"/>`:'';
  return `<svg class="aircraft-silhouette" xmlns="http://www.w3.org/2000/svg" width="${g.width}" height="${g.height}" viewBox="0 0 ${g.width} ${g.height}">${wings}<path d="${shape}" fill="#fff" stroke="#e0dee7" stroke-width="1.6"/></svg>`;
}
function renderPlane() {
  const p=current(),g=geometry(), alphabet=letters();
  const rows=[];
  for(let r=1;r<=p.rows;r++) {
    let content=g.cols.map((x,c)=>{
      const id=key(r,c), type=p.cells[id], label=seatLabel(id);
      return `<button class="seat ${type} ${selected.has(id)&&!preview?'selected':''} ${passenger.has(id)&&preview?'passenger-selected':''}" data-seat="${id}" style="left:${x}px" aria-label="${label}, ${TYPES[type].label}" aria-pressed="${preview?passenger.has(id):selected.has(id)}" title="${label} · ${TYPES[type].label}">${type==='wc'||type==='galley'?icon(type):`<span class="seat-label">${type==='empty'?'+':label}</span>`}</button>`;
    }).join('');
    content+=g.aisles.map(x=>`<button class="row-number" data-row="${r}" style="left:${x}px" title="Выбрать ряд ${r}" aria-label="Выбрать ряд ${r}">${r}</button>`).join('');
    rows.push(`<div class="cabin-row" style="top:${g.rowY(r)}px">${content}</div>`);
  }
  const exits=p.exits?g.exitRows.map(r=>`<div class="exit-label" style="top:${g.rowY(r)-20}px"><span>${icon('exit')}</span><span>${icon('exit')}</span></div>`).join(''):'';
  $('#aircraft-sheet').style.width=`${g.width}px`;$('#aircraft-sheet').style.height=`${g.height}px`;
  $('#aircraft-sheet').classList.toggle('grid-visible',p.grid);
  $('#aircraft-sheet').classList.toggle('hide-labels',!p.labels);
  $('#aircraft-sheet').innerHTML=`${planeDrawing(g)}<div class="service-area front" style="left:${g.wing+30}px;right:${g.wing+30}px"><span class="service-block">${icon('wc')} WC</span><span class="service-block">${icon('galley')} КУХНЯ</span></div><div class="aircraft-contents" style="left:${g.wing+30}px;top:${g.contentTop}px;width:${g.contentWidth}px;height:${g.last}px"><div class="column-labels">${g.cols.map((x,c)=>`<span class="column-label" style="left:${x}px">${alphabet[c]}</span>`).join('')}</div>${rows.join('')}${exits}</div><div class="service-area back" style="left:${g.wing+30}px;right:${g.wing+30}px;top:${g.contentTop+g.last+35}px"><span class="service-block">${icon('wc')} WC</span><span class="service-block">${icon('galley')} КУХНЯ</span><span class="service-block">${icon('wc')} WC</span></div>`;
  applyZoom();
}
function applyZoom() {
  const g=geometry();
  $('#aircraft-stage').style.width=`${g.width*zoom}px`;$('#aircraft-stage').style.height=`${g.height*zoom}px`;
  $('#aircraft-sheet').style.transform=`scale(${zoom})`;$('#zoom-label').textContent=`${Math.round(zoom*100)}%`;
  $('#zoom-out').disabled=zoom<=.3;$('#zoom-in').disabled=zoom>=1.5;
}
function fitToWidth() {
  zoom=Math.max(.3,Math.min(1,($('#canvas').clientWidth-28)/geometry().width)); applyZoom();
}
function renderInspector() {
  const p=current(), valid=[...selected].filter(id=>p.cells[id]); selected=new Set(valid);
  $('#selection-badge').hidden=!valid.length;$('#selection-badge').textContent=valid.length;
  if(!valid.length){$('#selection-panel').innerHTML=`<div class="selection-empty">${icon('cursor')}Выберите кресло на схеме,<br>чтобы настроить его</div>`;return;}
  const first=valid[0],type=p.cells[first],same=valid.every(id=>p.cells[id]===type);
  $('#selection-panel').innerHTML=`<div class="selected-title"><span class="module-symbol ${type}">${type==='extra'?'↕':type==='wc'?'WC':''}</span><div><strong>${valid.length===1?seatLabel(first):`${valid.length} ${plural(valid.length,['ячейка','ячейки','ячеек'])}`}</strong><p>${valid.length===1?`Ряд ${first.split(':')[0]} · ${TYPES[type].label}`:same?TYPES[type].label:'Несколько типов модулей'}</p></div></div><div class="apply-types">${Object.entries(TYPES).map(([id,t])=>`<button data-apply="${id}" class="${same&&type===id?'current':''}"><i class="type-dot" style="background:${t.color}"></i>${t.label}</button>`).join('')}</div><div class="selection-actions"><button id="select-row">Выбрать ряд</button><span>·</span><button id="deselect">Снять выделение</button></div>`;
}
function renderStats() {
  const c=counts();$('#total-seats').textContent=c.total;$('#canvas-seats').textContent=`${c.total} ${plural(c.total,['кресло','кресла','кресел'])}`;
  $('#statistics').innerHTML=SEAT_TYPES.map(type=>`<div class="stat"><span><i style="background:${TYPES[type].color}"></i>${TYPES[type].label}</span><b>${c[type]}</b></div>`).join('');
  $('#distribution').innerHTML=SEAT_TYPES.map(type=>`<span style="flex:${c[type]};background:${TYPES[type].color}" title="${TYPES[type].label}: ${c[type]}"></span>`).join('');
}
function renderTool() {
  $$('[data-tool]').forEach(el=>{el.classList.toggle('active',el.dataset.tool===tool);el.setAttribute('aria-pressed',el.dataset.tool===tool);});
  document.body.classList.toggle('paint-mode',tool==='paint'&&!preview);document.body.classList.toggle('erase-mode',tool==='erase'&&!preview);
  $('#tool-hint').textContent=tool==='select'?'Нажмите на кресло, чтобы изменить его':tool==='erase'?'Нажмите или проведите, чтобы убрать кресла':`${TYPES[brushType].label} · нажмите или проведите по креслам`;
  $('#canvas-tag').textContent=tool==='select'?'Режим редактирования':tool==='paint'?`Кисть · ${TYPES[brushType].label}`:'Ластик';
  renderModules();
}
function render() {
  const p=current(),m=model();
  $('#canvas-title').textContent=m.name;$('#document-name').textContent=m.name;$('#canvas-layout').textContent=p.groups.join(' + ');
  $('#layout').value=p.groups.join('-');$('#rows').value=p.rows;$('#pitch').value=p.pitch;$('#pitch-value').textContent=`${p.pitch.toFixed(1).replace('.',',')} модуля`;
  $('#show-exits').checked=p.exits;$('#show-wings').checked=p.wings;$('#show-grid').checked=p.grid;$('#show-labels').checked=p.labels;
  $('#rows-less').disabled=p.rows<=4;$('#rows-more').disabled=p.rows>=65;
  renderModels();renderPlane();renderStats();renderInspector();renderTool();updateHistory();
}
function selectModel(id) {
  if(id===activeId)return;
  activeId=id;selected.clear();passenger.clear();past=[];future=[];render();save();
  $('#canvas').scrollTop=0;fitToWidth();
}
function selectRow(row, additive=false) {
  if(!additive)selected.clear();
  for(let col=0;col<countCols(current().groups);col++) selected.add(key(row,col));
  syncSelection();
}
function syncSelection() {
  $$('[data-seat]').forEach(el=>{el.classList.toggle('selected',selected.has(el.dataset.seat)&&!preview);el.setAttribute('aria-pressed',preview?passenger.has(el.dataset.seat):selected.has(el.dataset.seat));});
  renderInspector();
}
function changeRows(value) {
  const n=Number(value);
  if(!Number.isInteger(n)||n<4||n>65){$('#rows').value=current().rows;notify('В схеме может быть от 4 до 65 рядов');return;}
  if(n===current().rows)return;
  mutate(p=>{const cells={};for(let r=1;r<=n;r++)for(let c=0;c<countCols(p.groups);c++) cells[key(r,c)]=p.cells[key(r,c)]||'economy';p.cells=cells;p.rows=n;});
}
function applyToSelected(type) {
  if(!selected.size)return;
  checkpoint();for(const id of selected)current().cells[id]=type;renderPlane();renderStats();renderInspector();updateHistory();save();
}
function paintSeat(id) {
  const type=tool==='erase'?'empty':brushType;
  if(drawn.has(id)||current().cells[id]===type)return;
  if(!strokeChanged){checkpoint();strokeChanged=true;}
  drawn.add(id);current().cells[id]=type;
  const el=$(`[data-seat="${id}"]`);
  if(el){el.className=`seat ${type}`;el.innerHTML=type==='wc'||type==='galley'?icon(type):`<span class="seat-label">${type==='empty'?'+':seatLabel(id)}</span>`;el.title=`${seatLabel(id)} · ${TYPES[type].label}`;el.setAttribute('aria-label',`${seatLabel(id)}, ${TYPES[type].label}`);}
}
function finishStroke() {
  if(!drawing)return; drawing=false;
  if(strokeChanged){renderStats();renderInspector();updateHistory();save();}drawn.clear();strokeChanged=false;
}
function onSeatClick(id,event) {
  if(preview) {
    if(!SEAT_TYPES.includes(current().cells[id])||current().cells[id]==='blocked'){notify('Это место недоступно для выбора');return;}
    passenger.has(id)?passenger.delete(id):passenger.add(id);
    const el=$(`[data-seat="${id}"]`);el.classList.toggle('passenger-selected',passenger.has(id));el.setAttribute('aria-pressed',passenger.has(id));
    $('#preview-count').textContent=passenger.size;$('#preview-selection').hidden=!passenger.size;return;
  }
  if(tool!=='select')return;
  if(event.shiftKey){selected.has(id)?selected.delete(id):selected.add(id);}else{const wasSingle=selected.size===1&&selected.has(id);selected.clear();if(!wasSingle)selected.add(id);}
  syncSelection();
}
function togglePreview() {
  preview=!preview;passenger.clear();selected.clear();document.body.classList.remove('mobile-settings-open');$('#mobile-settings').setAttribute('aria-expanded','false');document.body.classList.toggle('preview-mode',preview);
  $('#preview-button').innerHTML=`${icon(preview?'close':'eye')}<span>${preview?'В редактор':'Предпросмотр'}</span>`;
  $('#preview-selection').hidden=true;$('#footer-hint').textContent=preview?'Нажмите на свободное кресло, чтобы выбрать его':'Shift + клик — выбрать несколько кресел';
  $('#export-menu').hidden=true;$('#export-button').setAttribute('aria-expanded','false');
  render();$('#canvas').scrollTop=0;if(window.innerWidth<760||geometry().width*zoom>$('#canvas').clientWidth)fitToWidth();
}
function download(content,mime,name) {
  const url=URL.createObjectURL(new Blob([content],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function exportJSON() { download(JSON.stringify({ app:'salon', version:1, project:current() },null,2),'application/json',`${activeId}-схема.json`);notify('Проект скачан в JSON'); }
function exportSVG() {
  const p=current(),g=geometry(),svg=[];
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${g.width}" height="${g.height+70}" viewBox="0 0 ${g.width} ${g.height+70}"><rect width="100%" height="100%" fill="#f8f8fa"/><text x="${g.width/2}" y="28" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" fill="#675873">${model().name} · ${p.groups.join(' + ')}</text><g transform="translate(0 50)">`);
  svg.push(planeDrawing(g).replace('class="aircraft-silhouette"',''));
  svg.push(`<g transform="translate(${g.wing+30} ${g.contentTop})" font-family="Arial,sans-serif" font-size="10" text-anchor="middle">`);
  g.cols.forEach((x,c)=>svg.push(`<text x="${x+20}" y="14" fill="#99909f">${letters()[c]}</text>`));
  const palette={economy:['#fff','#dedbe9','#85808f'],extra:['#ede5fb','#d8c9ef','#9b7bc7'],business:['#e2ecf9','#c4d6eb','#7a98c1'],blocked:['#f3f3f5','#e9e9ed','#c5c4cc'],wc:['#f7f6fa','#e2dfea','#aaa5b6'],galley:['#f7f6fa','#e2dfea','#aaa5b6']};
  for(let r=1;r<=p.rows;r++) {
    g.cols.forEach((x,c)=>{const type=p.cells[key(r,c)];if(type==='empty')return;const colors=palette[type],y=g.rowY(r);const label=type==='wc'?'WC':type==='galley'?'Кухня':seatLabel(key(r,c));svg.push(`<rect x="${x}" y="${y}" width="40" height="40" rx="9" fill="${colors[0]}" stroke="${colors[1]}" stroke-width="1.3"/>`);if(p.labels||type==='wc'||type==='galley')svg.push(`<text x="${x+20}" y="${y+23}" fill="${colors[2]}"${type==='blocked'?' text-decoration="line-through"':''}>${label}</text>`);});
    g.aisles.forEach(x=>svg.push(`<text x="${x+24}" y="${g.rowY(r)+23}" fill="#b2aebc">${r}</text>`));
  }
  if(p.exits)g.exitRows.forEach(r=>{for(const x of [-40,g.contentWidth+28])svg.push(`<g transform="translate(${x} ${g.rowY(r)-20}) scale(.5)" fill="none" stroke="#98b59b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS.exit}</g>`);});
  svg.push(`</g><g font-family="Arial,sans-serif" fill="#b1adbd" font-size="9" text-anchor="middle"><text x="${g.width/2}" y="156">WC · КУХНЯ</text><text x="${g.width/2}" y="${g.contentTop+g.last+56}">WC · КУХНЯ · WC</text></g></g></svg>`);
  download(svg.join(''),'image/svg+xml',`${activeId}-схема.svg`);notify('Схема скачана в SVG');
}

document.addEventListener('click',event=>{
  const el=event.target.closest('button');if(!el)return;
  if(el.dataset.model)selectModel(el.dataset.model);
  if(el.dataset.module){brushType=el.dataset.module;tool='paint';selected.clear();syncSelection();renderTool();}
  if(el.dataset.tool){tool=el.dataset.tool;renderTool();}
  if(el.dataset.apply)applyToSelected(el.dataset.apply);
  if(el.dataset.seat)onSeatClick(el.dataset.seat,event);
  if(el.dataset.row&&!preview)selectRow(Number(el.dataset.row),event.shiftKey);
  if(el.id==='select-row')selectRow(Number([...selected][0].split(':')[0]));
  if(el.id==='deselect'){selected.clear();syncSelection();}
  if(el.dataset.export){el.dataset.export==='json'?exportJSON():exportSVG();$('#export-menu').hidden=true;$('#export-button').setAttribute('aria-expanded','false');}
});
$('#aircraft-sheet').addEventListener('pointerdown',event=>{
  const seat=event.target.closest('[data-seat]');if(!seat||preview||tool==='select'||event.button!==0)return;
  event.preventDefault();drawing=true;strokeChanged=false;drawn.clear();selected.clear();syncSelection();paintSeat(seat.dataset.seat);
});
$('#aircraft-sheet').addEventListener('pointerover',event=>{const seat=event.target.closest('[data-seat]');if(drawing&&seat)paintSeat(seat.dataset.seat);});
$('#aircraft-sheet').addEventListener('pointermove',event=>{
  if(!drawing||event.pointerType==='mouse')return;
  const seat=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-seat]');if(seat)paintSeat(seat.dataset.seat);
});
document.addEventListener('pointerup',finishStroke);document.addEventListener('pointercancel',finishStroke);window.addEventListener('blur',finishStroke);
$('#layout').addEventListener('change',event=>mutate(p=>{
  const oldLetters=letters(),oldCells=p.cells; p.groups=event.target.value.split('-').map(Number);const newLetters=letters(p.groups);p.cells={};
  for(let r=1;r<=p.rows;r++)for(let c=0;c<newLetters.length;c++){const oldCol=oldLetters.indexOf(newLetters[c]);p.cells[key(r,c)]=oldCol<0?'economy':oldCells[key(r,oldCol)]||'economy';}
}));
$('#rows').addEventListener('change',e=>changeRows(e.target.value));$('#rows-less').onclick=()=>changeRows(current().rows-1);$('#rows-more').onclick=()=>changeRows(current().rows+1);
$('#pitch').addEventListener('input',e=>$('#pitch-value').textContent=`${Number(e.target.value).toFixed(1).replace('.',',')} модуля`);
$('#pitch').addEventListener('change',e=>mutate(p=>{p.pitch=Number(e.target.value);}));
for(const [id,field]of [['show-exits','exits'],['show-wings','wings'],['show-grid','grid'],['show-labels','labels']])$('#'+id).addEventListener('change',event=>mutate(p=>{p[field]=event.target.checked;}));
$('#undo').onclick=()=>history('undo');$('#redo').onclick=()=>history('redo');
$('#reset').onclick=()=>{checkpoint();projects[activeId]=makeProject(model());selected.clear();render();save();notify('Восстановлена исходная схема самолёта');};
$('#zoom-in').onclick=()=>{zoom=Math.min(1.5,Math.round((zoom+.1)*100)/100);applyZoom();};$('#zoom-out').onclick=()=>{zoom=Math.max(.3,Math.round((zoom-.1)*100)/100);applyZoom();};$('#zoom-label').onclick=()=>{zoom=1;applyZoom();};$('#fit').onclick=fitToWidth;
$('#preview-button').onclick=togglePreview;
$('#mobile-settings').onclick=()=>{const open=document.body.classList.toggle('mobile-settings-open');$('#mobile-settings').setAttribute('aria-expanded',open);};
$('.right-panel>.panel-heading').onclick=()=>{document.body.classList.remove('mobile-settings-open');$('#mobile-settings').setAttribute('aria-expanded','false');};
$('#clear-preview').onclick=()=>{passenger.clear();$('#preview-count').textContent=0;$('#preview-selection').hidden=true;$$('.passenger-selected').forEach(el=>{el.classList.remove('passenger-selected');el.setAttribute('aria-pressed','false');});};
$('#export-button').onclick=()=>{const menu=$('#export-menu');menu.hidden=!menu.hidden;$('#export-button').setAttribute('aria-expanded',!menu.hidden);};
document.addEventListener('click',event=>{if(!event.target.closest('#export-menu, #export-button')){$('#export-menu').hidden=true;$('#export-button').setAttribute('aria-expanded','false');}});
$('#import-button').onclick=()=>$('#import-file').click();
$('#import-file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try {
    if(file.size>2_000_000)throw new Error('Размер файла превышает 2 МБ');
    const data=JSON.parse(await file.text());if(data.app!=='salon'||data.version!==1)throw new Error('Выберите JSON проекта «Салон»');
    const imported=validateProject(data.project);activeId=imported.modelId;projects[activeId]=imported;past=[];future=[];selected.clear();passenger.clear();render();save();fitToWidth();$('#canvas').scrollTop=0;notify('Проект открыт');
  }catch(error){notify(error instanceof SyntaxError?'Не удалось прочитать JSON':error.message);}
  event.target.value='';$('#export-menu').hidden=true;$('#export-button').setAttribute('aria-expanded','false');
});
$('#help-button').onclick=()=>$('#help-dialog').showModal();$('#close-help').onclick=()=>$('#help-dialog').close();$('#help-dialog').addEventListener('click',event=>{if(event.target===$('#help-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
$('.brand').onclick=event=>{event.preventDefault();if(preview)togglePreview();$('#canvas').scrollTop=0;};
document.addEventListener('keydown',event=>{
  if(event.target.closest('input,select,textarea')||$('#help-dialog').open)return;
  if(event.key==='Escape') {if(preview)togglePreview();else{selected.clear();syncSelection();$('#export-menu').hidden=true;}return;}
  if(preview)return;
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='z'){event.preventDefault();history(event.shiftKey?'redo':'undo');return;}
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){event.preventDefault();save();notify(storageAvailable?'Проект сохранён в браузере':'Скачайте JSON, чтобы сохранить проект');return;}
  if(event.metaKey||event.ctrlKey||event.altKey)return;
  const hotkeys={v:'select',b:'paint',e:'erase',м:'select',и:'paint',у:'erase'};
  if(hotkeys[event.key.toLowerCase()]){tool=hotkeys[event.key.toLowerCase()];renderTool();}
  if((event.key==='Delete'||event.key==='Backspace')&&selected.size){event.preventDefault();applyToSelected('empty');}
});
window.addEventListener('resize',()=>{if(window.innerWidth<760)fitToWidth();});
$$('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
render();save();if(window.innerWidth<1100)fitToWidth();
