(function(){
const variants=[
{id:'full-penalty',title:'Полный штраф за отмену',cancellation:'full',meal:'none',price:'33 000 ₽',special:false,rack:true,vat:true,commission:true},
{id:'split-penalty',title:'Штраф с деталями',cancellation:'details',meal:'none',price:'33 000 ₽',special:false,rack:true,vat:true,commission:true},
{id:'free-cancel',title:'Есть бесплатная отмена',cancellation:'free',meal:'none',price:'33 000 ₽',special:false,rack:true,vat:true,commission:true},
{id:'no-food-long',title:'Без питания и лонг стей',cancellation:'details',meal:'none',price:'33 000 ₽',special:false,rack:true,vat:true,commission:true},
{id:'no-food-no-upsell',title:'Без питания — нельзя докупить',cancellation:'details',meal:'none-no-upsell',price:'33 000 ₽',special:false,rack:true,vat:true,commission:true},
{id:'with-food',title:'С питанием',cancellation:'details',meal:'included',price:'33 000 ₽',special:false,rack:true,vat:true,commission:true},
{id:'special',title:'Спец условия',cancellation:'full',meal:'none',price:'10 130 400 ₽',special:true,rack:true,vat:true,commission:true},
{id:'no-commission',title:'Без комиссии',cancellation:'free',meal:'none',price:'33 000 ₽',special:false,rack:true,vat:true,commission:false},
{id:'no-vat-commission',title:'Без НДС и комиссии',cancellation:'details',meal:'none',price:'33 000 ₽',special:false,rack:true,vat:false,commission:false},
{id:'price-only',title:'Только цена',cancellation:'details',meal:'none',price:'33 000 ₽',special:false,rack:false,vat:false,commission:false}
];
const cancellation={full:{penalty:'Отмена за 18 000 ₽',details:['до 1 дек 2026 15:00','далее — за 2000 ₽']},details:{penalty:'Отмена за 18 000 ₽',details:[]},free:{penalty:'Отмена бесплатно',details:['до 20 дек 2026 15:00','далее — за 2000 ₽']}};
const get=id=>variants.find(item=>item.id===id)||variants[0];
const markup=input=>{const base=typeof input==='string'?get(input):input;const data={...base,...cancellation[base.cancellation]};const food=data.meal==='included';const meal=food?'Завтрак «Европейский шведский стол»':'Без питания';const caption=data.meal==='none'?'Можно докупить<br>за 2000 ₽':'';const mealIcon=food?'assets/breakfast.svg':'assets/hotel/breakfast-no-new-24.svg';const badge=data.special?'<img class="discount-badge" src="assets/hotel/discount-badge-special.svg" alt="Спецусловия">':'';return `<div class="hotel-offer-widget"><div class="offer-toolbar"><div><button class="offer-favorite" type="button" aria-label="Добавить предложение в подборку" aria-pressed="false"><img src="assets/hotel/heart-new-16.svg" alt=""></button><button type="button" aria-label="Скопировать предложение"><img src="assets/hotel/copy-new-24.svg" alt=""></button></div></div><div class="offer-grid"><div class="offer-penalty"><img src="assets/hotel/payment-card-new-24.svg" alt=""><div><b>${data.penalty}</b>${data.details.map(line=>`<small>${line}</small>`).join('')}</div></div><div class="offer-meal"><img src="${mealIcon}" alt=""><span>${meal}${caption?`<small>${caption}</small>`:''}</span></div><div class="offer-prices"><div class="offer-price-main">${badge}<strong>${data.price}</strong></div>${data.rack?'<span><img src="assets/hotel/info-new-16.svg" alt="">Rack 4 200 ₽</span>':''}${data.vat||data.commission?`<div>${data.vat?'<span>НДС 350 ₽</span>':''}${data.commission?'<b><img src="assets/hotel/commission-16.svg" alt="">350 ₽</b>':''}</div>`:''}</div><div class="offer-booking"><button type="button">Выбрать</button><small>В наличии: 4</small></div></div></div>`};
const bind=root=>root.querySelectorAll('.offer-favorite').forEach(button=>button.addEventListener('click',()=>{const selected=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(selected));button.querySelector('img').src=selected?'assets/hotel/heart-fill-new-16.svg':'assets/hotel/heart-new-16.svg'}));
const render=(root,input)=>{root.innerHTML=markup(input);bind(root)};
window.HotelOfferWidget={variants,get,markup,render,bind};
})();
