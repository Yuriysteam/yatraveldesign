/* Local Carriage card · Seats-selection / 22038:354847.
   Presentation only: inventory, prices, selection and option controllers own data.
   Render once, before controllers bind. Keep mobile option rows as direct children
   and desktop bedding inside .exact-legend: these are existing motion contracts. */
(() => {
  const variants = Object.freeze({
    Desktop: Object.freeze({ Default: '22038:354845', 'No scheme': '22038:359177', Skeleton: '22038:355641' }),
    Mobile: Object.freeze({ Default: '22038:354846', 'No scheme': '22038:359110', Skeleton: '22038:355642' }),
  });
  const attributes = (platform, state) => `data-card-component="22038:354847" data-card-variant="${variants[platform][state]}" data-card-platform="${platform}" data-card-state="${state}"`;

  const render = ({ platform, car, availability, amenities, scheme = '', legend, bedding = '', sapsan = false }) => {
    const state = car.hasScheme === false ? 'No scheme' : 'Default';
    if (platform === 'Desktop') {
      const modifier = sapsan ? ' exact-car--sapsan' : `${car.doubleDeck ? ' exact-car--double-deck' : ''}${car.type === 'platskart' ? ' exact-car--platskart' : (car.type || 'coupe') === 'coupe' ? ' exact-car--coupe' : ''}`;
      return `<article class="exact-car carriage-card${modifier}" data-car-number="${car.number}" data-mobile-node-id="${car.node || ''}" ${attributes(platform, state)}>
        <header class="exact-car__header"><div class="exact-car__title-group"><h3>${car.number} вагон</h3><p class="exact-car__subtitle">${availability}</p></div><button class="exact-car__amenities" type="button" data-amenities-car="${car.number}" aria-label="Удобства ${car.number} вагона" aria-haspopup="dialog" aria-controls="exact-car-amenities" aria-expanded="false">${amenities}<span class="exact-more" aria-hidden="true"><img src="./desktop/assets/more.svg" alt=""></span></button></header>
        ${scheme ? sapsan ? `<div class="d-sapsan-map"><p class="d-sapsan-direction">направление движения<span aria-hidden="true"></span></p><div class="carriage-card__scheme">${scheme}</div></div>` : `<div class="carriage-card__scheme">${scheme}</div>` : ''}
        <div class="exact-legend">${legend}${bedding}</div>
      </article>`;
    }
    const modifier = `${car.doubleDeck ? ' m-car--double-deck' : ''}${sapsan ? ' m-car--sapsan' : car.type === 'platskart' ? ' m-car--platskart' : ''}`;
    return `<article class="m-car carriage-card${modifier}" data-car-number="${car.number}" data-node-id="${car.node || ''}" aria-labelledby="m-car-title-${car.number}" ${attributes(platform, state)}>
      <header class="m-car__header"><div class="m-car__title-row">
        <h3 class="m-car__title" id="m-car-title-${car.number}">${car.number} вагон</h3>
        <button class="m-car__amenities" type="button" data-amenities-car="${car.number}" aria-label="Удобства ${car.number} вагона" aria-haspopup="dialog" aria-controls="m-car-amenities" aria-expanded="false">${amenities}<span class="m-car__more" aria-hidden="true"><img src="./mobile/assets/more.svg" alt=""></span></button>
      </div><p class="m-car__availability">${availability}</p></header>
      ${scheme}
      <div class="m-car__legend">${legend}</div>
    </article>`;
  };

  const renderSkeleton = platform => {
    const item = '<div class="skeletons__auto-058 skeleton-item" data-qa="skeleton"></div>';
    const line = (width, height) => `<div class="skeleton-line" style="width:${width}px;height:${height}px">${item}</div>`;
    return platform === 'Desktop'
      ? `<div class="exact-car skeleton-card carriage-card" ${attributes(platform, 'Skeleton')}><div class="skeleton-card-header">${line(220,28)}${line(160,28)}</div><div class="skeletons__auto-058 skeleton-item skeleton-scheme" data-qa="skeleton"></div><div class="skeleton-legend">${line(200,20)}</div></div>`
      : `<div class="skeleton-card carriage-card" ${attributes(platform, 'Skeleton')}><div class="skeleton-card-header"><div class="skeleton-card-row">${line(100,24)}${line(140,24)}</div>${line(132,18)}</div><div class="skeletons__auto-058 skeleton-item skeleton-scheme" data-qa="skeleton"></div>${line(132,18)}</div>`;
  };
  window.SeatSelectionCarriageCard = Object.freeze({ render, renderSkeleton, variants });
})();
