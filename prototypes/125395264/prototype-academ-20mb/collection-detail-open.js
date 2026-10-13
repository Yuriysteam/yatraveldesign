(function(){
  const hosts=document.querySelectorAll('.collection-offers-open');
  if(!hosts.length||!window.HotelOfferWidget)return;

  const offers=[
    {id:'collection-free',cancellation:'free-compact',meal:'none-no-upsell',price:'33 000 ₽',rackPrice:'43 000 ₽',special:false,rack:true,vat:true,commission:true},
    {id:'collection-breakfast',cancellation:'details',meal:'included',price:'45 000 ₽',rackPrice:'55 000 ₽',special:false,rack:true,vat:true,commission:true},
    {id:'collection-flex',cancellation:'free',meal:'none',price:'47 000 ₽',rackPrice:'57 000 ₽',special:false,rack:true,vat:true,commission:true},
    {id:'collection-standard',cancellation:'details',meal:'none-no-upsell',price:'49 000 ₽',rackPrice:'59 000 ₽',special:false,rack:true,vat:true,commission:true},
    {id:'collection-last',cancellation:'free-compact',meal:'none-no-upsell',price:'52 000 ₽',rackPrice:'62 000 ₽',special:false,rack:true,vat:true,commission:true}
  ];

  hosts.forEach((host,hostIndex)=>offers.forEach(offer=>{
    const row=document.createElement('div');
    row.className='collection-offer-host';
    const priceOffset=hostIndex*1200;
    const localized={...offer,price:offer.price.replace(/\d[\d ]*(?= ₽)/,value=>(Number(value.replaceAll(' ',''))+priceOffset).toLocaleString('ru-RU')),rackPrice:offer.rackPrice.replace(/\d[\d ]*(?= ₽)/,value=>(Number(value.replaceAll(' ',''))+priceOffset).toLocaleString('ru-RU'))};
    HotelOfferWidget.render(row,localized);
    row.querySelector('.offer-toolbar')?.remove();
    const action=row.querySelector('.offer-booking');
    action.innerHTML='<button class="collection-offer-delete" type="button" aria-label="Удалить предложение из подборки"><img src="assets/collections/trash.svg" alt=""></button>';
    action.querySelector('button').addEventListener('click',()=>row.remove());
    host.append(row);
  }));
})();
