(() => {
  const search=document.querySelector('#proposalSearch'),send=document.querySelector('#proposalSend'),query=document.querySelector('#proposalQuery'),email=document.querySelector('#proposalEmail'),results=document.querySelector('#proposalResults'),feedback=document.querySelector('#proposalFeedback');let found=0,searchedQuery='';
  // Local prototype fixtures, not live availability or production search totals.
  const examples=[
    {terms:['москва красносельская','красносельская'],count:1,label:'Найден 1 объект «Москва Красносельская»'},
    {terms:['мовенпик','movenpick','мёвенпик'],count:1,label:'Найден 1 объект «Мовенпик Москва Таганская»'},
    {terms:['fortestate','фортэстейт'],count:1,label:'Найден 1 объект FortEstate'},
    {terms:['москва','moscow'],count:237,label:'Найдено 237 объектов в Москве'},
    {terms:['санкт-петербург','санкт петербург','петербург','спб'],count:164,label:'Найдено 164 объекта в Санкт-Петербурге'},
    {terms:['сочи','sochi'],count:92,label:'Найдено 92 объекта в Сочи'},
    {terms:['казань','kazan'],count:48,label:'Найдено 48 объектов в Казани'},
    {terms:['россия','russia'],count:1240,label:'Найдено 1 240 объектов в России'},
    {terms:['турция','turkey'],count:580,label:'Найдено 580 объектов в Турции'},
    {terms:['беларусь','белоруссия','belarus'],count:120,label:'Найдено 120 объектов в Беларуси'}
  ];
  const normalize=value=>value.toLocaleLowerCase('ru').replaceAll('ё','е').trim().replace(/\s+/g,' ');
  function notice(text,error=false){feedback.textContent=text;feedback.classList.toggle('is-error',error);feedback.hidden=false}
  function find(){const value=normalize(query.value);feedback.hidden=true;query.removeAttribute('aria-invalid');found=0;searchedQuery='';if(!value){results.hidden=true;query.setAttribute('aria-invalid','true');notice('Введите страну, город или название объекта',true);query.focus();return}const match=examples.find(x=>x.terms.some(term=>normalize(term)===value))||examples.find(x=>x.terms.some(term=>value.includes(normalize(term))))||examples.find(x=>x.terms.some(term=>normalize(term).startsWith(value)));found=match?.count||0;searchedQuery=query.value.trim();results.textContent=match?.label||'Объекты не найдены. Попробуйте изменить запрос';results.hidden=false}
  search.addEventListener('submit',event=>{event.preventDefault();find()});
  query.addEventListener('input',()=>{found=0;searchedQuery='';results.hidden=true;feedback.hidden=true;query.removeAttribute('aria-invalid')});email.addEventListener('input',()=>{email.removeAttribute('aria-invalid');feedback.hidden=true});
  send.addEventListener('submit',event=>{event.preventDefault();if(!found||searchedQuery!==query.value.trim()){notice('Сначала найдите объекты для ценового предложения',true);query.focus();return}if(!email.checkValidity()){email.setAttribute('aria-invalid','true');notice(email.validity.valueMissing?'Введите адрес электронной почты':'Проверьте адрес электронной почты',true);email.focus();return}email.removeAttribute('aria-invalid');notice('Предложение подготовлено. В прототипе письмо не отправляется.')});
  const state=new URLSearchParams(location.search).get('state');if(state==='found'){query.value='Москва';email.value='oilina@gmail.com';find()}
})();
