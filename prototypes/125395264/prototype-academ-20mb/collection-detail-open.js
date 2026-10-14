(function(){
  const hosts=document.querySelectorAll('.collection-offers-open');
  if(!hosts.length||!window.HotelOfferWidget)return;

  const firstHotelOffers=[
    {id:'collection-free',cancellation:'free-compact',meal:'none-no-upsell',price:'33 000 ₽',rackPrice:'43 000 ₽',special:false,rack:true,vat:true,commission:true},
    {id:'collection-breakfast',cancellation:'details',meal:'included',price:'45 000 ₽',rackPrice:'55 000 ₽',special:false,rack:true,vat:true,commission:true},
    {id:'collection-flex',cancellation:'free',meal:'none',price:'47 000 ₽',rackPrice:'57 000 ₽',special:false,rack:true,vat:true,commission:true},
    {id:'collection-standard',cancellation:'details',meal:'none-no-upsell',price:'49 000 ₽',rackPrice:'59 000 ₽',special:false,rack:true,vat:true,commission:true},
    {id:'collection-last',cancellation:'free-compact',meal:'none-no-upsell',price:'52 000 ₽',rackPrice:'62 000 ₽',special:false,rack:true,vat:true,commission:true}
  ];

  const secondHotelOffers=[
    {id:'second-flex',cancellation:'free',cancellationLabel:'Бесплатная отмена',cancellationDetails:['до 18 дек 2026 23:59','далее — 6 800 ₽'],meal:'included',price:'34 200 ₽',rackPrice:'41 500 ₽',special:false,rack:true,vat:true,commission:true},
    {id:'second-day',cancellation:'full',cancellationLabel:'Отмена за 4 500 ₽',cancellationDetails:['до 19 дек 2026 12:00','далее — полная стоимость'],meal:'none',price:'38 600 ₽',rackPrice:'46 000 ₽',special:false,rack:true,vat:true,commission:true},
    {id:'second-evening',cancellation:'free',cancellationLabel:'Бесплатная отмена',cancellationDetails:['до 20 дек 2026 18:00','далее — 9 900 ₽'],meal:'none-no-upsell',price:'42 900 ₽',rackPrice:'51 000 ₽',special:false,rack:true,vat:true,commission:true},
    {id:'second-nonref',cancellation:'details',cancellationLabel:'Невозвратный тариф',cancellationDetails:['штраф — 100% стоимости'],meal:'included',price:'46 500 ₽',rackPrice:'54 800 ₽',special:false,rack:true,vat:true,commission:true},
    {id:'second-late',cancellation:'free',cancellationLabel:'Отмена бесплатно',cancellationDetails:['до 21 дек 2026 12:00','далее — 12 000 ₽'],meal:'none',price:'53 700 ₽',rackPrice:'64 000 ₽',special:false,rack:true,vat:true,commission:true}
  ];

  const offersByHotel=[firstHotelOffers,secondHotelOffers];

  hosts.forEach((host,hostIndex)=>(offersByHotel[hostIndex]||firstHotelOffers).forEach(offer=>{
    const row=document.createElement('div');
    row.className='collection-offer-host';
    HotelOfferWidget.render(row,offer);
    if(offer.cancellationLabel){
      const cancellation=row.querySelector('.offer-penalty div');
      cancellation.innerHTML=`<b>${offer.cancellationLabel}</b>${offer.cancellationDetails.map(line=>`<small>${line}</small>`).join('')}`;
    }
    row.querySelector('.offer-toolbar')?.remove();
    const action=row.querySelector('.offer-booking');
    action.innerHTML='<button class="collection-offer-delete" type="button" aria-label="Удалить предложение из подборки"><img src="assets/collections/trash.svg" alt=""></button>';
    action.querySelector('button').addEventListener('click',()=>row.remove());
    host.append(row);
  }));
})();
