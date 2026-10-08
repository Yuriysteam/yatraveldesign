const cityInput=document.querySelector('#cityInput');
const citySuggestions=document.querySelector('#citySuggestions');
const cityLoader=document.querySelector('#cityLoader');
const clearCity=document.querySelector('#clearCity');
const dateButton=document.querySelector('#dateButton');
const datePopover=document.querySelector('#datePopover');
const guestButton=document.querySelector('#guestButton');
const guestPopover=document.querySelector('#guestPopover');
const toast=document.querySelector('#toast');
let cityTimer;
let rangeStart={index:20,year:2026,month:11,day:20};
let rangeEnd={index:21,year:2026,month:11,day:21};
const counts={adults:1,children:0,rooms:1};

function closePopovers(except){
  [[citySuggestions,cityInput],[datePopover,dateButton],[guestPopover,guestButton]].forEach(([panel,trigger])=>{if(panel!==except){panel.hidden=true;trigger.setAttribute('aria-expanded','false')}});
}
function showToast(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800)}
function showSuggestions(){cityLoader.hidden=true;citySuggestions.hidden=false;cityInput.setAttribute('aria-expanded','true')}
cityInput.addEventListener('focus',()=>{closePopovers(citySuggestions);if(cityInput.value.trim())showSuggestions()});
cityInput.addEventListener('input',()=>{clearTimeout(cityTimer);citySuggestions.hidden=true;clearCity.hidden=true;if(!cityInput.value.trim()){cityLoader.hidden=true;return}cityLoader.hidden=false;cityTimer=setTimeout(showSuggestions,320)});
clearCity.addEventListener('click',()=>{cityInput.value='';clearCity.hidden=true;citySuggestions.hidden=true;cityInput.focus()});
citySuggestions.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{cityInput.value=button.dataset.value;citySuggestions.hidden=true;cityInput.setAttribute('aria-expanded','false');clearCity.hidden=false}));

const monthOffset=1;
const monthNames=['Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь','Январь 2027','Февраль','Март','Апрель','Май','Июнь'];
function renderCalendar(year=2026,month=11){
  const activeName=year===2027?monthNames[month+6]:monthNames[month-6];
  const months=monthNames.map((name,index)=>`<button type="button" class="${name===activeName?'selected':''}" data-list-index="${index}">${name}</button>`).join('');
  const first=(new Date(year,month,1).getDay()+6)%7;
  const count=new Date(year,month+1,0).getDate();
  const dates=Array.from({length:count},(_,i)=>{const day=i+1,index=Math.round((Date.UTC(year,month,day)-Date.UTC(2026,11,0))/86400000),selected=index===rangeStart?.index||index===rangeEnd?.index,inRange=Boolean(rangeEnd&&index>rangeStart.index&&index<rangeEnd.index),weekDay=(first+i)%7,weekend=weekDay>=5,classes=[index===rangeStart?.index?'range-start':'',index===rangeEnd?.index?'range-end':'',inRange?'in-range':'',weekDay===0?'week-start':'',weekDay===6?'week-end':'',day===1?'month-start':'',day===count?'month-end':'',weekend?'weekend':''].filter(Boolean).join(' ');return `<button type="button" data-index="${index}" data-year="${year}" data-month="${month}" data-day="${day}" class="${classes}" aria-pressed="${selected||inRange}"><span>${day}</span></button>`}).join('');
  const title=`${monthNames[year===2027?month+6:month-6]}${year===2027&&month===0?'':` ${year}`}`;
  datePopover.innerHTML=`<div class="calendar-picker"><div class="calendar-months" aria-label="Месяц">${months}</div><div class="calendar-main"><div class="calendar-week"><span>пн</span><span>вт</span><span>ср</span><span>чт</span><span>пт</span><span class="weekend">сб</span><span class="weekend">вс</span></div><div class="calendar-scroll"><section><b>${title}</b><div class="calendar-days">${'<i></i>'.repeat(first)}${dates}</div></section></div></div></div>`;
  datePopover.dataset.year=year;datePopover.dataset.month=month;
  datePopover.querySelectorAll('[data-day]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();selectDay({index:Number(button.dataset.index),year:Number(button.dataset.year),month:Number(button.dataset.month),day:Number(button.dataset.day)})}));
  datePopover.querySelectorAll('[data-day]').forEach(button=>button.addEventListener('mouseenter',()=>previewRange(Number(button.dataset.index))));
  datePopover.querySelector('.calendar-days').addEventListener('mouseleave',()=>previewRange(null));
  datePopover.querySelectorAll('[data-list-index]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();const listIndex=Number(button.dataset.listIndex);renderCalendar(listIndex>=6?2027:2026,listIndex>=6?listIndex-6:listIndex+6)}));
}
function previewRange(hoveredIndex){
  const buttons=[...datePopover.querySelectorAll('.calendar-days [data-index]')];
  buttons.forEach(button=>button.classList.remove('preview-range','preview-end'));
  if(hoveredIndex===null||!rangeStart||rangeEnd||hoveredIndex===rangeStart.index)return;
  const from=Math.min(rangeStart.index,hoveredIndex),to=Math.max(rangeStart.index,hoveredIndex);
  buttons.forEach(button=>{const index=Number(button.dataset.index);if(index>from&&index<to)button.classList.add('preview-range');if(index===hoveredIndex)button.classList.add('preview-end')});
}
function selectDay(date){
  if(!rangeStart||rangeEnd){rangeStart=date;rangeEnd=null;setDateLabel(rangeStart,null)}
  else if(date.index<rangeStart.index){rangeEnd=rangeStart;rangeStart=date;setDateLabel(rangeStart,rangeEnd)}
  else if(date.index===rangeStart.index){setDateLabel(rangeStart,null)}
  else{rangeEnd=date;setDateLabel(rangeStart,rangeEnd)}
  renderCalendar(+datePopover.dataset.year,+datePopover.dataset.month);
}
function setDateLabel(start,end){
  const weekday=['вс','пн','вт','ср','чт','пт','сб'];
  const monthLabel=(date,includeYear=true)=>`${date.month===11?'дек':'янв'}${includeYear?` ${date.year}`:''}`;
  const startWeekday=weekday[new Date(start.year,start.month,start.day).getDay()];
  const label=document.querySelector('#dateLabel');
  if(!end){label.innerHTML=`<span>${start.day} ${monthLabel(start)}</span> <span class="date-secondary">${startWeekday}</span> – <span class="date-secondary">Выберите дату выезда</span>`;return}
  const endWeekday=weekday[new Date(end.year,end.month,end.day).getDay()];
  const nights=end.index-start.index;
  const nightsLabel=nights===1?'ночь':nights<5?'ночи':'ночей';
  label.innerHTML=`<span>${start.day} ${monthLabel(start,start.year!==end.year)}</span> <span class="date-secondary">${startWeekday}</span> – <span>${end.day} ${monthLabel(end)}</span> <span class="date-secondary">${endWeekday} · ${nights} ${nightsLabel}</span>`;
}
renderCalendar();
dateButton.addEventListener('click',()=>{const next=datePopover.hidden;closePopovers(datePopover);datePopover.hidden=!next;dateButton.setAttribute('aria-expanded',String(next))});

function plural(value,one,few,many){const mod10=value%10,mod100=value%100;return mod10===1&&mod100!==11?one:mod10>=2&&mod10<=4&&(mod100<12||mod100>14)?few:many}
function updateGuests(){
  const adultsLabel=`${counts.adults} ${plural(counts.adults,'взрослый','взрослых','взрослых')}`;
  const childrenLabel=counts.children?`, ${counts.children} ${plural(counts.children,'ребёнок','ребёнка','детей')}`:'';
  document.querySelector('#guestLabel').textContent=`${adultsLabel}${childrenLabel}`;
  document.querySelectorAll('.guest-row').forEach(row=>{const kind=row.dataset.kind;row.querySelector('output').textContent=counts[kind];const [minus,plus]=row.querySelectorAll('.stepper button');minus.disabled=counts[kind]<=(kind==='children'?0:1);plus.disabled=counts[kind]>=9});
}
guestButton.addEventListener('click',()=>{const next=guestPopover.hidden;closePopovers(guestPopover);guestPopover.hidden=!next;guestButton.setAttribute('aria-expanded',String(next))});
document.querySelectorAll('.guest-row').forEach(row=>row.querySelectorAll('.stepper button').forEach(button=>button.addEventListener('click',()=>{counts[row.dataset.kind]+=Number(button.dataset.step);updateGuests()})));
updateGuests();
document.addEventListener('click',event=>{if(!event.target.closest('.search-control'))closePopovers()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closePopovers()});
document.querySelector('#hotelSearchForm').addEventListener('submit',event=>{event.preventDefault();closePopovers();if(cityInput.value){const params=new URLSearchParams({adults:String(counts.adults),children:String(counts.children),rooms:String(counts.rooms)});window.location.href=`search-results.html?${params}`}else{showToast('Выберите город или объект')}});
document.querySelector('.more-events').addEventListener('click',()=>showToast('Все события уже показаны'));
const firstEventCard=document.querySelector('.event-card');
firstEventCard.setAttribute('role','link');firstEventCard.setAttribute('tabindex','0');
const openFirstEvent=()=>{window.location.href='event-interface-update.html'};
firstEventCard.addEventListener('click',openFirstEvent);firstEventCard.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openFirstEvent()}});
