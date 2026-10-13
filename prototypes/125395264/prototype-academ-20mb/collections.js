const initialCollections=[
  ['Город Москва, Россия, Большой театр, 20 — 21 дек 2026','1 ночь','1 взрослый','16 июня в 12:40',false],
  ['Город Москва, Россия, Маяковская, 20 — 21 дек 2026','1 ночь','2 взрослых','16 июня в 10:00',false],
  ['Город Азов, Ростовская область, Россия, 12 — 14 ноя 2026','1 ночь','2 взрослых','12 июня в 17:03',false],
  ['Город Сочи, Россия, Какое-то длинное название, которое занимает много места и не помещается в одну строку, 10 — 14 сент 2026','1 ночь','2 взрослых','11 июня в 15:00',false],
  ['Город Москва, Россия, Шереметьево, 14 — 19 сент 2026','1 ночь','1 взрослый','10 июня в 13:44',false],
  ['Город Иваново, Ивановская область, Россия, Ленина, 42, 5 — 14 авг 2026','1 ночь','1 взрослый','9 июня в 13:44',false],
  ['Город Казань, Россия, Казань-Пассажирская, 2 — 10 июн 2026','1 ночь','3 взрослых','9 июня в 13:44',false],
  ['Город Казань, Россия, Казань-Пассажирская, 2 — 10 июн 2026','1 ночь','3 взрослых','9 июня в 13:44',false],
  ['Город Иваново, Россия, 1 — 10 март 2025','1 ночь','3 взрослых','9 июня в 13:44',true],
  ['Город Казань, Россия, Казань-Пассажирская, 2 — 10 июн 2024','1 ночь','2 взрослых','9 июня в 13:44',true]
];
const startsEmpty=new URLSearchParams(location.search).get('state')==='empty';
let collections=startsEmpty?[]:initialCollections.map((item,index)=>({id:index+1,title:item[0],nights:item[1],guests:item[2],date:item[3],disabled:item[4]}));
let pendingDelete=null;
const list=document.querySelector('#collectionsList');
const backdrop=document.querySelector('#deleteBackdrop');
const render=()=>{
  const favorites=window.Favorites?Favorites.read():[];
  const groups=Object.values(favorites.reduce((result,item)=>{const key=item.collectionId||'москва|20 дек — 21 дек 2026';if(!result[key])result[key]={id:`favorites:${key}`,collectionId:key,title:item.collectionTitle||'Город Москва, Россия, 20 дек — 21 дек 2026',items:[]};result[key].items.push(item);return result},{}));
  const favoriteCollections=groups.map(group=>({...group,nights:`${group.items.length} ${group.items.length===1?'предложение':group.items.length<5?'предложения':'предложений'}`,guests:'Сохранено из поиска',date:'Сегодня',disabled:false}));
  const visibleCollections=[...favoriteCollections,...collections];
  const isEmpty=visibleCollections.length===0;
  document.querySelector('#deleteAll').hidden=isEmpty;
  list.classList.toggle('is-empty',isEmpty);
  if(isEmpty){
    list.innerHTML=`<div class="collections-empty"><img class="collections-empty__image" src="assets/empty-search.png" alt=""><div class="collections-empty__body"><h2 class="collections-empty__title">Пока здесь ничего нет</h2><p class="collections-empty__text">Перейдите к поиску, чтобы добавить<br>предложения в подборку</p><a class="collections-empty__button" href="index.html">Вернуться к поиску</a></div></div>`;
    return;
  }
  list.innerHTML=visibleCollections.map(item=>`<article class="collection-row${item.disabled?' is-disabled':''}" data-id="${item.id}"><div class="collection-row__text"><div class="collection-row__title">${item.title}</div><div class="collection-row__subtitle"><span>${item.nights}</span><span>·</span><span>${item.guests}</span></div></div><time class="collection-row__date">${item.date}</time><button class="collection-row__delete" type="button" aria-label="Удалить подборку"><img src="assets/collections/trash.svg" alt=""></button></article>`).join('')
};
const openDelete=id=>{pendingDelete=id;document.querySelectorAll('.collection-row').forEach(row=>row.classList.toggle('is-active',row.dataset.id===String(id)));backdrop.hidden=false;document.querySelector('#cancelDelete').focus()};
const closeDelete=()=>{pendingDelete=null;backdrop.hidden=true;document.querySelectorAll('.collection-row').forEach(row=>row.classList.remove('is-active'))};
list.addEventListener('click',event=>{
  const button=event.target.closest('.collection-row__delete');
  if(button){openDelete(button.closest('.collection-row').dataset.id);return}
  const row=event.target.closest('.collection-row');
  if(row&&!row.classList.contains('is-disabled')){const id=row.dataset.id;if(id.startsWith('favorites:'))location.href=`collection-detail.html?collection=${encodeURIComponent(id.slice(10))}`;else location.href=`collection-detail.html?id=${encodeURIComponent(id)}`}
});
document.querySelector('#deleteAll').addEventListener('click',()=>{collections=[];if(window.Favorites)Favorites.write([]);render()});
document.querySelector('#confirmDelete').addEventListener('click',()=>{if(pendingDelete?.startsWith('favorites:')&&window.Favorites){const key=pendingDelete.slice(10);Favorites.write(Favorites.read().filter(item=>(item.collectionId||'москва|20 дек — 21 дек 2026')!==key))}else collections=pendingDelete==='all'?[]:collections.filter(item=>String(item.id)!==String(pendingDelete));closeDelete();render()});
document.querySelector('#cancelDelete').addEventListener('click',closeDelete);
document.querySelector('#closeDelete').addEventListener('click',closeDelete);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!backdrop.hidden)closeDelete()});
render();
window.addEventListener('favorites:change',render);
