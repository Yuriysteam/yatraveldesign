/* Shared Sapsan demo, 2026-10-15.
   Visual source: ReDesign 19008:229004 / 19345:225916 (66-seat layout).
   Class order and fare examples: Yandex Travel 754А, 18 Nov 2026, checked 22 Oct.
   Availability and carriage numbers are demo fixtures, not live inventory.
   Only Basic/Economy use the supplied map. Other classes deliberately have no map.
   Meeting compartment uses mock car 11 to keep demo carriage identities distinct. */
(() => {
  if (window.SeatSelectionArrival || window.SeatSelectionDoubleDeck || new URLSearchParams(location.search).get('train') !== 'sapsan') return;
  const groups = [
    { key: 'basic', label: 'Базовый', fares: [3407, 3633] },
    { key: 'economy', label: 'Эконом', fares: [3541, 3767] },
    { key: 'economy-plus', label: 'Эконом+', fares: [4393, 4619] },
    { key: 'bistro', label: 'Вагон-бистро', fares: [6891, 7117] },
    { key: 'business', label: 'Бизнес', fares: [10346, 10840] },
    { key: 'first', label: 'Первый класс', fares: [30731, 32637, 33114] },
    { key: 'meeting', label: 'Купе-переговорная', fares: [98847] },
  ];
  // Explicit coordinates and numbering preserve the supplied Figma scheme.
  const topNumbers = [[63,64],[61,62],[55,56],[51,52],[47,48],[45,46],[43,44],[39,40],[35,36],[32,31],[27,28],[23,24],[21,22],[15,16],[11,12],[7,8],[3,4]];
  const topX = [110,180,215,250,285,320,355,390,425,460,495,530,600,635,670,705,740];
  const bottomNumbers = [[66,65],[60,59],[58,57],[54,53],[50,49],[42,41],[38,37],[34,33],[30,29],[26,25],[20,19],[18,17],[14,13],[10,9],[6,5],[2,1]];
  const bottomX = [76,111,181,216,251,355,390,425,460,495,530,600,635,670,705,740];
  const layout = [
    ...topNumbers.flatMap((pair, i) => pair.map((number, row) => ({ number, x: topX[i], y: 11 + row * 32, position: i === 0 || (i >= 4 && i <= 11) ? 'Right' : 'Left' }))),
    ...bottomNumbers.flatMap((pair, i) => pair.map((number, row) => ({ number, x: bottomX[i], y: 103 + row * 32, position: i <= 1 || (i >= 5 && i <= 10) ? 'Right' : 'Left' }))),
  ];
  // Desktop source 18397:58198: native 40 × 40 seats, not a scaled mobile map.
  const desktopTopX = [151,245,292,339,386,433,480,527,574,621,668,715,809,856,903,950,997];
  const desktopBottomX = [104,151,245,292,339,480,527,574,621,668,715,809,856,903,950,997];
  const desktopLayout = layout.map((seat, index) => {
    const top = index < topNumbers.length * 2;
    const offset = top ? index : index - topNumbers.length * 2;
    return { ...seat, x: (top ? desktopTopX : desktopBottomX)[Math.floor(offset / 2)], y: (top ? 14 : 138) + (offset % 2) * 44 };
  });
  // Travel direction is right. Right-facing seats (backrest on the left)
  // use the higher purple fare; left-facing seats use the lower green fare.
  const fareIndex = seat => seat.position === 'Right' ? 1 : 0;
  const fixtures = [
    { number: 3, group: 'economy', serviceClass: '2С', pets: true, available: [1,2,3,4,7,8,9,10,13,14,17,18,19,20,21,22,25,26,29,30,33,34,37,38,41,42,45,48,49,50,53,56,57,58,61,63,65,66] },
    { number: 8, group: 'economy', serviceClass: '2С', pets: true, available: [3,4,5,6,9,10,11,12,15,16,19,20,21,22,23,24,27,28,31,32,35,36,39,40,43,44,47,48,51,52,55,56,59,60,63,64,65] },
    { number: 10, group: 'economy-plus', serviceClass: '2В', hasScheme: false, availableCount: 39 },
    { number: 5, group: 'bistro', serviceClass: '2Е', hasScheme: false, availableCount: 16 },
    { number: 2, group: 'business', serviceClass: '1С', hasScheme: false, availableCount: 38 },
    { number: 1, group: 'first', serviceClass: '1В', hasScheme: false, availableCount: 15 },
    { number: 11, group: 'meeting', serviceClass: '1Р', hasScheme: false, availableCount: 4, bookingPrice: 98847 },
    { number: 4, group: 'basic', serviceClass: '2Р', pets: false, available: [1,2,3,4,7,8,11,12,15,16,19,20,21,22,27,28,31,32,39,40,43,44,55,56,61,62] },
  ];
  const carriages = fixtures.map(car => {
    const group = groups.find(group => group.key === car.group);
    if (car.hasScheme === false) return { ...car, label: group.label, seats: [],
      prices: group.fares, price: group.fares[0], legend: [] };
    return { ...car, node: '19345:225901', schemeNode: '19345:225916', label: group.label,
      amenityKeys: ['ac', 'bio', 'socket', ...(car.pets ? ['pets'] : []), ...(car.food ? ['food'] : [])],
      seats: layout.map(seat => ({ ...seat, available: car.available.includes(seat.number),
        color: fareIndex(seat) ? 'Purple' : 'Green',
        price: group.fares[fareIndex(seat)],
      })),
      legend: group.fares.map((price, i) => ({ price, color: i ? 'purple' : 'green' })),
    };
  });
  const availableCount = car => car.availableCount ?? car.available?.length ?? 0;
  const availableCarriages = carriages.filter(car => availableCount(car) > 0);
  const availableGroups = groups.filter(group => availableCarriages.some(car => car.group === group.key));
  window.SeatSelectionSapsan = {
    groups: availableGroups, carriages: availableCarriages, layout, desktopLayout, availableCount,
    trip: { date: '18 ноября, ср', shortDate: '18 ноября', departure: '05:45', arrival: '09:37', duration: '3 ч 52 м' },
    filterTypes: availableGroups.map(group => group.key),
    filterAmenities: ['ac', 'bio', 'socket', 'pets', 'food'],
  };
})();
