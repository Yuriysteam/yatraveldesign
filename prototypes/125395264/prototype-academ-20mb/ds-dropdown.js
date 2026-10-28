(() => {
  let serial=0,opened=null;
  function create({name,label,options,value='',placeholder='',solid=false,iconSrc='assets/users-arrow-24.svg',onChange=()=>{}}){
    const root=document.createElement('div');root.className=`ds-dropdown${solid?' ds-dropdown--solid':''}`;
    const input=document.createElement('input');input.type='hidden';input.name=name;input.value=value;
    const button=document.createElement('button');button.type='button';button.className='ds-dropdown-trigger';button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',label);
    const caption=document.createElement('span'),icon=document.createElement('img');icon.src=iconSrc;icon.alt='';button.append(caption,icon);
    const menu=document.createElement('div');menu.className='ds-dropdown-menu';menu.id=`ds-dropdown-${++serial}`;menu.role='listbox';menu.setAttribute('aria-label',label);menu.hidden=true;button.setAttribute('aria-controls',menu.id);
    const normalized=options.map(x=>typeof x==='string'?{value:x,label:x}:x);
    const update=()=>{caption.textContent=normalized.find(x=>x.value===input.value)?.label||placeholder;button.classList.toggle('is-placeholder',!input.value);menu.querySelectorAll('[role=option]').forEach(x=>x.setAttribute('aria-selected',String(x.dataset.value===input.value)))};
    const close=(focus=false)=>{menu.hidden=true;button.setAttribute('aria-expanded','false');if(opened===root)opened=null;if(focus)button.focus()};root.close=close;
    const open=()=>{opened?.close();opened=root;menu.hidden=false;button.setAttribute('aria-expanded','true');const r=button.getBoundingClientRect(),height=Math.min(normalized.length*44+16,280);Object.assign(menu.style,{width:`${r.width}px`,left:`${r.left}px`,top:`${r.bottom+8+height>innerHeight?Math.max(8,r.top-height-8):r.bottom+8}px`});(menu.querySelector('[aria-selected=true]')||menu.firstElementChild)?.focus()};
    for(const item of normalized){const option=document.createElement('button');option.type='button';option.role='option';option.dataset.value=item.value;option.textContent=item.label;option.addEventListener('click',()=>{input.value=item.value;update();close(true);onChange(item.value);input.dispatchEvent(new Event('change',{bubbles:true}))});menu.append(option)}
    button.addEventListener('click',()=>menu.hidden?open():close());button.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();open()}});
    menu.addEventListener('keydown',e=>{const items=[...menu.children],index=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true)}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();items[e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus()}else if(e.key==='Tab')close()});
    root.append(input,button,menu);root.setValue=v=>{input.value=v;update()};root.setDisabled=disabled=>{button.disabled=disabled;root.classList.toggle('is-disabled',disabled);if(disabled)close()};update();return root;
  }
  document.addEventListener('pointerdown',e=>{if(opened&&!opened.contains(e.target))opened.close()});document.addEventListener('scroll',e=>{if(opened&&!opened.querySelector('.ds-dropdown-menu').contains(e.target))opened.close()},true);
  window.DSDropdown={create,close:()=>opened?.close()};
})();
