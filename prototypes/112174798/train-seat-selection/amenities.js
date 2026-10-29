/* Runtime snapshot of amenities-catalog.json; names/captions are verbatim.
   Cards and their details use the same 24px masters (20px in card previews).
   Demo availability is not a rule for real train inventory. */
(() => {
  const catalogue = [
  {
    "id": "bio-toilet",
    "name": "Биотуалет",
    "caption": "",
    "icon": "./qa/assets/amenities/bio-toilet.svg"
  },
  {
    "id": "air-conditioning",
    "name": "Кондиционер",
    "caption": "",
    "icon": "./qa/assets/amenities/air-conditioning.svg"
  },
  {
    "id": "bedding",
    "name": "Постельное бельё",
    "caption": "",
    "icon": "./qa/assets/amenities/bedding.svg"
  },
  {
    "id": "socket-220v",
    "name": "Розетка 220 В",
    "caption": "",
    "icon": "./qa/assets/amenities/socket-220v.svg"
  },
  {
    "id": "socket-usb",
    "name": "Розетка USB",
    "caption": "",
    "icon": "./qa/assets/amenities/socket-usb.svg"
  },
  {
    "id": "meals",
    "name": "Питание",
    "caption": "",
    "icon": "./qa/assets/amenities/meals.svg"
  },
  {
    "id": "wifi",
    "name": "Wi-fi",
    "caption": "",
    "icon": "./qa/assets/amenities/wifi.svg"
  },
  {
    "id": "children-seats",
    "name": "Места для пассажиров с детьми",
    "caption": "",
    "icon": "./qa/assets/amenities/children-seats.svg"
  },
  {
    "id": "compartment-shower",
    "name": "Душевая в купе",
    "caption": "",
    "icon": "./qa/assets/amenities/compartment-shower.svg"
  },
  {
    "id": "hygienic-shower",
    "name": "Гигиенический душ в туалете",
    "caption": "",
    "icon": "./qa/assets/amenities/hygienic-shower.svg"
  },
  {
    "id": "restaurant",
    "name": "Вагон-ресторан, бистро или буфет",
    "caption": "",
    "icon": "./qa/assets/amenities/restaurant.svg"
  },
  {
    "id": "compartment-washbasin",
    "name": "Умывальник в купе",
    "caption": "",
    "icon": "./qa/assets/amenities/compartment-washbasin.svg"
  },
  {
    "id": "extra-meals",
    "name": "Можно заказать доп. питание",
    "caption": "",
    "icon": "./qa/assets/amenities/extra-meals.svg"
  },
  {
    "id": "pets",
    "name": "Можно с домашними животными",
    "caption": "Переноска >180см в сумме трёх измерений",
    "icon": "./qa/assets/amenities/pets.svg"
  },
  {
    "id": "shared-shower",
    "name": "Душевая в поезде (общая)",
    "caption": "",
    "icon": "./qa/assets/amenities/shared-shower.svg"
  },
  {
    "id": "hygiene-kit",
    "name": "Санитарно-гигиенический набор",
    "caption": "",
    "icon": "./qa/assets/amenities/hygiene-kit.svg"
  },
  {
    "id": "multimedia",
    "name": "Мультимедийный портал",
    "caption": "Кинотеатр, книги, музыка",
    "icon": "./qa/assets/amenities/multimedia.svg"
  },
  {
    "id": "gender-compartment",
    "name": "Мужское/женское купе",
    "caption": "",
    "icon": "./qa/assets/amenities/gender-compartment.svg"
  },
  {
    "id": "blanket",
    "name": "Плед",
    "caption": "",
    "icon": "./qa/assets/amenities/blanket.svg"
  },
  {
    "id": "luggage-compartment",
    "name": "Купе для багажа",
    "caption": "",
    "icon": "./qa/assets/amenities/luggage-compartment.svg"
  },
  {
    "id": "slippers",
    "name": "Тапочки",
    "caption": "",
    "icon": "./qa/assets/amenities/slippers.svg"
  },
  {
    "id": "destination-transfer",
    "name": "Трансфер до места назначения",
    "caption": "",
    "icon": "./qa/assets/amenities/destination-transfer.svg"
  },
  {
    "id": "business-lounge",
    "name": "Бизнес-зал",
    "caption": "",
    "icon": "./qa/assets/amenities/business-lounge.svg"
  },
  {
    "id": "press",
    "name": "Пресса",
    "caption": "",
    "icon": "./qa/assets/amenities/press.svg"
  },
  {
    "id": "safe",
    "name": "Сейф",
    "caption": "",
    "icon": "./qa/assets/amenities/safe.svg"
  }
];
  const byId = Object.fromEntries(catalogue.map(item => [item.id, item]));
  const forCar = car => {
    const fixture = car.fixtureNumber ?? car.number;
    let ids;
    if (car.amenityIds) {
      ids = car.amenityIds;
    } else if (window.SeatSelectionSapsan) {
      ids = ['air-conditioning', 'bio-toilet', 'socket-220v',
        ...(car.group !== 'basic' ? ['wifi', 'socket-usb', 'multimedia'] : []),
        ...(car.pets ? ['pets'] : []),
        ...(car.group === 'economy-plus' ? ['hygiene-kit'] : [])];
    } else if (car.type === 'sv') {
      ids = ['air-conditioning', 'bio-toilet', 'bedding', 'socket-220v', 'socket-usb', 'wifi', 'hygiene-kit'];
    } else if (car.type === 'platskart') {
      ids = ['air-conditioning', 'bio-toilet', 'socket-220v', ...(car.number === 12 ? [] : ['pets'])];
    } else {
      ids = ['air-conditioning', 'bio-toilet', 'bedding', 'socket-220v',
        ...(car.genderCabins ? ['gender-compartment'] : []),
        ...(fixture === 5 ? ['pets'] : []),
        ...([1, 2, 3].includes(fixture) ? ['wifi'] : []),
        ...([1, 2].includes(fixture) ? ['socket-usb', 'hygiene-kit', 'multimedia'] : [])];
    }
    // Restaurant is available train-wide in both demo trains. Catalogue order
    // controls cards and expanded lists alike; unavailable entries are skipped.
    const available = new Set([...ids, 'restaurant']);
    return catalogue.filter(item => available.has(item.id));
  };
  // Shared DOM text builder: never replace approved catalogue copy with aliases.
  const copy = item => {
    const wrapper = document.createElement('span');
    wrapper.className = 'amenity-copy';
    const name = document.createElement('span');
    name.textContent = item.name;
    wrapper.append(name);
    if (item.caption) {
      const caption = document.createElement('span');
      caption.className = 'amenity-copy__caption';
      caption.textContent = item.caption;
      wrapper.append(caption);
    }
    return wrapper;
  };
  window.SeatSelectionAmenities = { catalogue, byId, forCar, copy };
})();

