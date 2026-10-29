/* Train carriage scheme — Seats-selection / 22019:337306.
   Six Figma variants; layout is separate from live prototype carriage data.
   Do not copy the component's demo occupancy, numbers, fares or gender labels. */
(() => {
  const fileKey = 'dEEebZZNQurp5jLJmXvWl9';
  const variants = Object.freeze({
    Desktop: Object.freeze({
      Platskart: Object.freeze({ node: '22019:337300', width: 1142, height: 188, root: 'p-scheme' }),
      Coupe: Object.freeze({ node: '22019:337302', width: 1142, height: 160, root: 'exact-scheme' }),
      Sapsan: Object.freeze({ node: '22019:337303', width: 1144, height: 236, root: 'd-sapsan-scheme' }),
    }),
    Mobile: Object.freeze({
      Platskart: Object.freeze({ node: '22019:337304', width: 842, height: 134, root: 'p-scheme' }),
      Coupe: Object.freeze({ node: '22019:337305', width: 842, height: 116, root: 'm-scheme' }),
      Sapsan: Object.freeze({ node: '22019:337301', width: 844, height: 174, root: 'sapsan-scheme' }),
    }),
  });
  function coupeDesktop(car) {
  const asset = (name, className = '') => `<img${className ? ` class="${className}"` : ''} src="./desktop/assets/${name}" alt="">`;
  const fixtureNumber = car => car.fixtureNumber ?? car.number;
  const mobileAsset = (car, name) => `<img src="./mobile/assets/car${fixtureNumber(car)}-${name}" alt="">`;
  const nonRefundable = window.SeatSelectionNonRefundable;
  const seat = (car, number, index) => {
    const lower = index % 2 === 1;
    return window.SeatSelectionScheme.seat({ platform: 'Desktop', position: lower ? 'Bottom' : 'Top', state: number === null ? 'Occupied' : lower ? 'Purple' : 'Green', number, car: car.number, price: lower ? 6826 : 5560, interactive: true, nonRefundable: nonRefundable?.isEligible(car, number) });
  };
  const coupe = (car, numbers) => `<div class="exact-coupe">${numbers.map((number, index) => seat(car, number, index)).join('')}</div>`;
  const wall = '<div class="exact-scheme__wall" aria-hidden="true"></div>';
  const genderNames = {male:'мужское купе', female:'женское купе', mixed:'смешанное купе'};
  const cabinLabels = car => Object.entries(car.genderCabins || {})
    .map(([number, type]) => `<p class="exact-scheme__cabin-label${type === 'mixed' ? ' exact-scheme__cabin-label--mixed' : ''}" data-cabin-label="${number}"${type ? '' : ' hidden'} style="left:${196 + (number - 1) * 102 + (type === 'mixed' ? .5 : 0)}px">${genderNames[type] || ''}</p>`).join('');
    return `<div class="exact-scheme" role="group" aria-label="Схема ${car.number} вагона">
      <div class="exact-scheme__outline" aria-hidden="true"></div>
      <div class="exact-scheme__feature exact-scheme__wc--left">${car.separateLeftToilet ? mobileAsset(car, 'place-feature-toilet1.svg') : asset('car-place-feature-toilet.svg')}</div>
      <div class="exact-scheme__feature exact-scheme__wc--right">${asset('car-place-feature-toilet.svg')}</div>
      <div class="exact-scheme__feature exact-scheme__mug">${asset('car-lucide-lab-mug.svg')}</div>
      <div class="exact-scheme__feature exact-scheme__bin">${asset('car-fluent-bin-recycle-full20-regular.svg')}</div>
      <div class="exact-scheme__feature exact-scheme__officer">${asset('car-group.svg')}</div>
      <div class="exact-scheme__seats">${wall}${car.coupes.map(numbers => coupe(car, numbers)+wall).join('')}</div>
      <div class="exact-scheme__door" aria-hidden="true"></div><div class="exact-scheme__door exact-scheme__door--bottom" aria-hidden="true"></div>
      <span class="exact-scheme__arrow exact-scheme__arrow--top" aria-hidden="true"></span><span class="exact-scheme__arrow exact-scheme__arrow--bottom" aria-hidden="true"></span>
      ${cabinLabels(car)}
    </div>`;
  }
  function coupeMobile(car) {
  const fixtureNumber = car => car.fixtureNumber ?? car.number;
  const nonRefundable = window.SeatSelectionNonRefundable;
  // These original mobile exports have identical geometry, size and color in all five cards.
  const sharedMobileImages = new Set([
    'icons16-close-new-new.svg', 'top.svg', 'top1.svg',
    'icons24-air-conditioner-new.svg', 'icons24-bio-toilet-new.svg', 'icons24-wifi-new.svg',
    'arrow.svg', 'arrow1.svg', 'group.svg', 'ellipse4827.svg', 'ellipse4826.svg',
  ]);
  const image = (car, file, className = '') => `<img${className ? ` class="${className}"` : ''} src="./mobile/assets/car${sharedMobileImages.has(file) ? 1 : fixtureNumber(car)}-${file}" alt="" draggable="false">`;
  const wall = '<div class="m-scheme__wall" aria-hidden="true"></div>';

  const seat = (car, number, index) => {
    const lower = index % 2 === 1;
    return window.SeatSelectionScheme.seat({ platform: 'Mobile', position: lower ? 'Bottom' : 'Top', state: number === null ? 'Occupied' : lower ? 'Purple' : 'Green', number, car: car.number, price: lower ? 6826 : 5560, interactive: true, nonRefundable: nonRefundable?.isEligible(car, number) });
  };

  const feature = (car, file, position) => `<div class="m-scheme__feature m-scheme__${position}" aria-hidden="true">${image(car, file)}</div>`;
  const genderNames = {male:'мужское купе', female:'женское купе', mixed:'смешанное купе'};
  const cabinLabels = car => Object.entries(car.genderCabins || {}).map(([coupe, type]) => {
    const positionClass = coupe === '2' ? 'men' : coupe === '4' ? 'women' : `mixed-${coupe}`;
    return `<p class="m-scheme__cabin-label m-scheme__cabin-label--${positionClass}" data-cabin-label="${coupe}"${type ? '' : ' hidden'}>${genderNames[type] || ''}</p>`;
  }).join('');

    return `<div class="m-scheme__viewport" tabindex="0" role="region" aria-label="Схема ${car.number} вагона, прокручивается по горизонтали">
      <div class="m-scheme" data-node-id="${car.schemeNode}">
        ${window.SeatSelectionMobileSchemeOutline.render('Coupe')}
        ${feature(car, 'place-feature-toilet.svg', 'wc--right')}
        ${feature(car, 'fluent-bin-recycle-full20-regular.svg', 'bin')}
        ${feature(car, 'lucide-lab-mug.svg', 'mug')}
        ${feature(car, car.separateLeftToilet ? 'place-feature-toilet1.svg' : 'place-feature-toilet.svg', 'wc--left')}
        ${feature(car, 'group.svg', 'officer')}
        <div class="m-scheme__seats">${wall}${car.coupes.map(coupe => `<div class="m-scheme__coupe">${coupe.map((number, index) => seat(car, number, index)).join('')}</div>${wall}`).join('')}</div>
        <span class="m-scheme__arrow m-scheme__arrow--top" aria-hidden="true"></span>
        <span class="m-scheme__arrow m-scheme__arrow--bottom" aria-hidden="true"></span>
        ${cabinLabels(car)}
      </div>
    </div>`;
  }
  const platskart = (car, platform) => {
    const mobile = platform === 'Mobile';
    const prefix = mobile ? 'mobile' : 'desktop';
    const image = name => `<img src="./scheme-assets/platskart/${prefix}-${name}.svg" alt="" draggable="false">`;
    const feature = (name, file) => `<span class="p-scheme__feature p-scheme__${name}" aria-hidden="true">${image(file)}</span>`;
    const wall = '<span class="p-scheme__wall" aria-hidden="true"></span>';
    const seat = number => window.SeatSelectionScheme.seat({
      platform, position: number % 2 ? 'Bottom' : 'Top', state: number === null ? 'Occupied' : car.color,
      number, car: car.number, price: car.price, interactive: true,
    });
    const scheme = `<div class="p-scheme" data-platform="${prefix}" data-node-id="${mobile ? '19549:362964' : '19549:363625'}" role="group" aria-label="Схема ${car.number} вагона">
      ${mobile ? window.SeatSelectionMobileSchemeOutline.render('Platskart') : '<div class="p-scheme__outline" aria-hidden="true"></div>'}
      ${feature('wc-right', 'imgPlaceFeatureToilet')}${feature('wc-left', mobile ? 'imgPlaceFeatureToilet1' : 'imgPlaceFeatureToilet')}
      ${feature('bin', 'imgFluentBinRecycleFull20Regular')}${feature('mug', 'imgLucideLabMug')}${feature('officer', 'imgGroup')}
      <div class="p-scheme__row p-scheme__row--main">${wall}${car.coupes.map(numbers => `<div class="p-scheme__bay">${numbers.map(seat).join('')}</div>${wall}`).join('')}</div>
      <div class="p-scheme__row p-scheme__row--side">${wall}${car.sides.map(numbers => `<div class="p-scheme__bay">${numbers.map(seat).join('')}</div>${wall}`).join('')}</div>
      ${mobile ? '' : '<span class="p-scheme__door" aria-hidden="true"></span><span class="p-scheme__door p-scheme__door--bottom" aria-hidden="true"></span>'}
      <span class="p-scheme__entry p-scheme__entry--top" aria-hidden="true">${image('imgArrow')}</span>
      <span class="p-scheme__entry p-scheme__entry--bottom" aria-hidden="true">${image('imgArrow1')}</span>
    </div>`;
    return mobile ? `<div class="m-scheme__viewport" tabindex="0" role="region" aria-label="Схема ${car.number} вагона, прокручивается по горизонтали">${scheme}</div>` : scheme;
  };
  function sapsanDesktop(car) {
  const data = window.SeatSelectionSapsan;
  const feature = (name, x, y) => `<span class="d-sapsan-scheme__feature d-sapsan-scheme__feature--${name}" style="left:${x}px;top:${y}px" aria-hidden="true"></span>`;
  const windows = [[174,92],[307,70],[406,67],[515,81],[623,74],[730,101],[864,72],[958,72]];
  const positions = new Map(data.desktopLayout.map(seat => [seat.number, seat]));
  const renderScheme = car => `<div class="d-sapsan-scheme" data-node-id="18397:58198" role="group" aria-label="Схема ${car.number} вагона">
    <div class="d-sapsan-scheme__outline" aria-hidden="true"></div>
    ${car.pets ? `<span class="d-sapsan-scheme__pet-zone d-sapsan-scheme__pet-zone--start" aria-hidden="true"></span><span class="d-sapsan-scheme__pet-zone d-sapsan-scheme__pet-zone--end" aria-hidden="true"></span>${feature('animal',112,108)}${feature('animal',982,106)}` : ''}
    ${feature('wc',64,198)}${feature('socket',64,164)}${feature('socket',1053,66)}${feature('luggage',111,14)}${feature('luggage',1053,198)}
    <span class="d-sapsan-scheme__wardrobe" aria-label="Гардероб">${feature('hanger',32,30)}</span>
    ${[24,1093].map(x => [2,218].map(y => `<span class="d-sapsan-scheme__door${y > 2 ? ' d-sapsan-scheme__door--bottom' : ''}" style="left:${x}px;top:${y}px" aria-hidden="true"></span>`).join('')).join('')}
    ${[32,1101].map(x => [0,223].map(y => `<span class="d-sapsan-scheme__entry${y ? ' d-sapsan-scheme__entry--bottom' : ''}" style="left:${x}px;top:${y}px" aria-hidden="true"></span>`).join('')).join('')}
    ${windows.map(([x,width]) => [2,231].map(y => `<span class="d-sapsan-scheme__window" style="left:${x}px;top:${y}px;width:${width}px" aria-hidden="true"></span>`).join('')).join('')}
    ${[[198,14],[762,14],[198,138],[762,138]].map(([x,y]) => `<span class="d-sapsan-scheme__table" style="left:${x}px;top:${y}px">стол</span>`).join('')}
    ${car.seats.map(seat => {
      const { x, y, position } = positions.get(seat.number);
      return `<span class="d-sapsan-scheme__slot" data-scheme-number="${seat.number}" style="left:${x}px;top:${y}px">${window.SeatSelectionScheme.seat({platform:'Desktop',carType:'Seated',position,state:seat.available ? seat.color : 'Occupied',number:seat.number,car:car.number,price:seat.price,interactive:true})}</span>`;
    }).join('')}
  </div>`;
    return renderScheme(car);
  }
  function sapsanMobile(car) {
  const feature = (name, x, y) => `<span class="sapsan-scheme__feature sapsan-scheme__feature--${name}" style="left:${x}px;top:${y}px" aria-hidden="true"></span>`;
  const windows = [[122,74],[222,56],[301,51],[379,60],[458,58],[540,73],[635,54],[709,54]];
  const renderScheme = car => `<div class="m-sapsan-viewport" tabindex="0" role="region" aria-label="Схема ${car.number} вагона, прокручивается по горизонтали">
      <div class="sapsan-scheme" data-node-id="19345:225916">
        ${window.SeatSelectionMobileSchemeOutline.render('Sapsan')}
        ${car.pets ? '<span class="sapsan-scheme__pet-zone sapsan-scheme__pet-zone--start" aria-hidden="true"></span><span class="sapsan-scheme__pet-zone sapsan-scheme__pet-zone--end" aria-hidden="true"></span>' + feature('animal',78,76) + feature('animal',725,75) : ''}
        ${feature('luggage',78,13)}${feature('luggage',776,137)}${feature('wc',44,139)}${feature('socket',44,105)}${feature('socket',776,45)}
        ${[16,808].map(x => [1,160].map(y => `<span class="sapsan-scheme__door${y > 1 ? ' sapsan-scheme__door--bottom' : ''}" style="left:${x}px;top:${y}px" aria-hidden="true"></span>`).join('')).join('')}
        ${windows.map(([x,width]) => [1,170].map(y => `<span class="sapsan-scheme__window" style="left:${x}px;top:${y}px;width:${width}px" aria-hidden="true"></span>`).join('')).join('')}
        ${[[145,11],[565,11],[146,103],[565,103]].map(([x,y]) => `<span class="sapsan-scheme__table" style="left:${x}px;top:${y}px">стол</span>`).join('')}
        <span class="sapsan-scheme__wardrobe" aria-label="Гардероб">${feature('hanger',19,18)}</span>
        ${car.seats.map(seat => `<span class="sapsan-scheme__slot" style="left:${seat.x}px;top:${seat.y}px">${window.SeatSelectionScheme.seat({platform:'Mobile', carType:'Seated', position:seat.position, state:seat.available ? seat.color : 'Occupied', number:seat.number, car:car.number, price:seat.price, interactive:true})}</span>`).join('')}
      </div>
    </div>`;
    return renderScheme(car);
  }
  function render({ platform, type, car }) {
    const variant = variants[platform]?.[type];
    if (!variant) throw new Error(`Unknown Train carriage scheme: ${platform}/${type}`);
    if (car.hasScheme === false) return '';
    const html = type === 'Platskart' ? platskart(car, platform)
      : type === 'Coupe' ? (platform === 'Desktop' ? coupeDesktop(car) : coupeMobile(car))
      : (platform === 'Desktop' ? sapsanDesktop(car) : sapsanMobile(car));
    // Keep the existing DOM hooks and interaction targets; only the source
    // identity belongs to the component rather than an old demo frame.
    const root = new RegExp(`<div class="${variant.root}"[^>]*>`);
    return html.replace(root, tag => tag.replace(/ data-node-id="[^"]*"/, '').replace(/>$/, 
      ` data-node-id="${variant.node}" data-figma-file="${fileKey}" data-scheme-component="22019:337306" data-scheme-type="${type}" data-scheme-platform="${platform}">`));
  }
  window.SeatSelectionCarriageScheme = Object.freeze({ render, variants, fileKey, componentId: '22019:337306' });
})();
