(function () {
  "use strict";

  const TYPE_LABELS = Object.freeze({
    platskart: "Плацкарт",
    coupe: "Купе",
    sv: "СВ"
  });
  const SAPSAN_TYPE_LABELS = Object.freeze({
    economy: "Эконом",
    comfort: "Комфорт",
    business: "Бизнес"
  });
  const LASTOCHKA_TYPE_LABELS = Object.freeze({
    basic: "Базовый",
    economy: "Эконом",
    business: "Бизнес"
  });
  const TRAIN_LABELS = Object.freeze({
    "long-distance": "Дальний поезд",
    sapsan: "Сапсан",
    lastochka: "Ласточка"
  });
  const TYPE_LABELS_BY_TRAIN = Object.freeze({
    "long-distance": TYPE_LABELS,
    sapsan: SAPSAN_TYPE_LABELS,
    lastochka: LASTOCHKA_TYPE_LABELS
  });

  const LONG_DISTANCE_CAR_CONFIGS = [
    { id: "1", number: 1, type: "platskart", genderMode: "none", price: [3567, 4290], amenities: ["toilet", "air-conditioner", "animal"], totalSeats: 54, className: "3Э", carrier: "ФПК", schemeGeometry: "placeholder-platskart" },
    { id: "2", number: 2, type: "platskart", genderMode: "none", price: [2378, 3850], amenities: ["toilet", "air-conditioner"], totalSeats: 54, className: "3Б", carrier: "ФПК", schemeGeometry: "placeholder-platskart" },
    { id: "3", number: 3, type: "coupe", genderMode: "none", price: [5560, 6826], amenities: ["restaurant", "air-conditioner", "toilet", "blanket-pillow"], totalSeats: 36, className: "2К", carrier: "Тверской экспресс", schemeGeometry: "coupe" },
    { id: "4", number: 4, type: "coupe", genderMode: "gendered", price: [5680, 6946], amenities: ["restaurant", "air-conditioner", "toilet", "blanket-pillow", "gender-cabin"], totalSeats: 36, className: "2К", carrier: "Тверской экспресс", schemeGeometry: "coupe" },
    { id: "6", number: 6, type: "coupe", genderMode: "none", price: [5740, 7006], amenities: ["restaurant", "air-conditioner", "toilet", "blanket-pillow", "shower"], totalSeats: 36, className: "2Э", carrier: "ФПК", schemeGeometry: "coupe" },
    { id: "7", number: 7, type: "coupe", genderMode: "none", price: [5890, 7156], amenities: ["restaurant", "air-conditioner", "toilet", "blanket-pillow", "shower"], totalSeats: 36, className: "2Э", carrier: "ФПК", schemeGeometry: "coupe" },
    { id: "8", number: 8, type: "coupe", genderMode: "none", price: [5410, 6676], amenities: ["restaurant", "air-conditioner", "toilet", "blanket-pillow", "shower"], totalSeats: 36, className: "2К", carrier: "ФПК", schemeGeometry: "coupe" },
    { id: "10", number: 10, type: "sv", genderMode: "none", price: [18567, 20990], amenities: ["restaurant", "air-conditioner", "toilet", "blanket-pillow", "gender-cabin"], totalSeats: 18, className: "1Э", carrier: "ФПК", schemeGeometry: "placeholder-sv" },
    { id: "11", number: 11, type: "sv", genderMode: "none", price: [19120, 21540], amenities: ["restaurant", "air-conditioner", "toilet", "blanket-pillow"], totalSeats: 18, className: "1Т", carrier: "ФПК", schemeGeometry: "placeholder-sv" }
  ];

  const SAPSAN_CAR_CONFIGS = [
    { id: "1", number: 1, type: "economy", genderMode: "none", price: [3890, 4450], amenities: ["air-conditioner", "toilet", "animal"], totalSeats: 66, freeSeatCount: 18, className: "2С", carrier: "ДОСС", schemeGeometry: "sapsan", layoutKind: "seated", schemeReady: true },
    { id: "2", number: 2, type: "economy", genderMode: "none", price: [4120, 4680], amenities: ["air-conditioner", "toilet"], totalSeats: 66, freeSeatCount: 25, className: "2С", carrier: "ДОСС", schemeGeometry: "sapsan", layoutKind: "seated", schemeReady: true },
    { id: "3", number: 3, type: "economy", genderMode: "none", price: [4350, 4910], amenities: ["air-conditioner", "toilet", "animal"], totalSeats: 66, freeSeatCount: 11, className: "2С", carrier: "ДОСС", schemeGeometry: "sapsan", layoutKind: "seated", schemeReady: true },
    { id: "4", number: 4, type: "comfort", genderMode: "none", price: [6890, 7490], amenities: ["air-conditioner", "toilet"], totalSeats: 40, freeSeatCount: 9, className: "2В", carrier: "ДОСС", schemeGeometry: "placeholder-sapsan-comfort", layoutKind: "seated", schemeReady: false },
    { id: "5", number: 5, type: "business", genderMode: "none", price: [12490, 13990], amenities: ["air-conditioner", "toilet"], totalSeats: 20, freeSeatCount: 5, className: "1С", carrier: "ДОСС", schemeGeometry: "placeholder-sapsan-business", layoutKind: "seated", schemeReady: false }
  ];

  const LASTOCHKA_OMITTED_SEAT_NUMBERS = new Set([7, 13, 19, 31, 37, 43, 49, 55, 61, 67, 73, 81, 87, 93]);
  const LASTOCHKA_SEAT_NUMBERS = Object.freeze(
    Array.from({ length: 100 }, (_, index) => index + 1)
      .filter((number) => !LASTOCHKA_OMITTED_SEAT_NUMBERS.has(number))
  );

  const LASTOCHKA_CAR_CONFIGS = [
    { id: "1", number: 1, type: "basic", genderMode: "none", price: [2680, 3120], amenities: ["air-conditioner", "toilet", "animal"], totalSeats: 86, seatNumbers: LASTOCHKA_SEAT_NUMBERS, freeSeatCount: 24, className: "2Ж", carrier: "ФПК", schemeGeometry: "lastochka", layoutKind: "seated", schemeReady: true },
    { id: "2", number: 2, type: "basic", genderMode: "none", price: [2940, 3380], amenities: ["air-conditioner", "toilet"], totalSeats: 86, seatNumbers: LASTOCHKA_SEAT_NUMBERS, freeSeatCount: 37, className: "2Ж", carrier: "ФПК", schemeGeometry: "lastochka", layoutKind: "seated", schemeReady: true },
    { id: "3", number: 3, type: "basic", genderMode: "none", price: [3190, 3630], amenities: ["air-conditioner", "toilet", "animal"], totalSeats: 86, seatNumbers: LASTOCHKA_SEAT_NUMBERS, freeSeatCount: 15, className: "2Ж", carrier: "ФПК", schemeGeometry: "lastochka", layoutKind: "seated", schemeReady: true },
    { id: "4", number: 4, type: "economy", genderMode: "none", price: [4490, 4980], amenities: ["air-conditioner", "toilet"], totalSeats: 67, freeSeatCount: 12, className: "2С", carrier: "ФПК", schemeGeometry: "placeholder-lastochka-economy", layoutKind: "seated", schemeReady: false },
    { id: "5", number: 5, type: "business", genderMode: "none", price: [7490, 8290], amenities: ["air-conditioner", "toilet"], totalSeats: 30, freeSeatCount: 6, className: "1С", carrier: "ФПК", schemeGeometry: "placeholder-lastochka-business", layoutKind: "seated", schemeReady: false }
  ];

  const CAR_CONFIGS_BY_TRAIN = Object.freeze({
    "long-distance": LONG_DISTANCE_CAR_CONFIGS,
    sapsan: SAPSAN_CAR_CONFIGS,
    lastochka: LASTOCHKA_CAR_CONFIGS
  });

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createRandom(seed) {
    let value = seed >>> 0;
    return function random() {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createSeats(config, train) {
    const seed = train === "long-distance"
      ? `train-seat:${config.id}:${config.type}`
      : `train-seat:${train}:${config.id}:${config.type}`;
    const random = createRandom(hashString(seed));
    const seatNumbers = Array.isArray(config.seatNumbers)
      ? config.seatNumbers.slice()
      : Array.from({ length: config.totalSeats }, (_, index) => index + 1);
    const numbers = seatNumbers.slice();

    for (let index = numbers.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [numbers[index], numbers[target]] = [numbers[target], numbers[index]];
    }

    const seatCount = seatNumbers.length;
    const minimumFree = Math.max(4, Math.round(seatCount * 0.2));
    const variableFree = Math.max(2, Math.round(seatCount * 0.2));
    const generatedFreeCount = minimumFree + Math.floor(random() * variableFree);
    const requestedFreeCount = Number.isInteger(config.freeSeatCount) ? config.freeSeatCount : generatedFreeCount;
    const freeCount = Math.min(seatCount - 2, Math.max(1, requestedFreeCount));
    const availableNumbers = new Set(numbers.slice(0, freeCount));
    let availableIndex = 0;

    return seatNumbers.map((number) => {
      const isAvailable = availableNumbers.has(number);
      let tier = null;

      if (isAvailable) {
        if (availableIndex === 0) tier = "tier-1";
        else if (availableIndex === 1) tier = "tier-2";
        else tier = random() < 0.62 ? "tier-1" : "tier-2";
        availableIndex += 1;
      }

      return Object.freeze({
        number,
        position: config.layoutKind === "seated"
          ? (number % 2 === 1 ? "bottom" : "top")
          : (number % 2 === 1 ? "lower" : "upper"),
        availability: isAvailable ? tier : "occupied",
        price: tier === "tier-2" ? config.price[1] : config.price[0]
      });
    });
  }

  const carsByTrain = Object.freeze(Object.fromEntries(
    Object.entries(CAR_CONFIGS_BY_TRAIN).map(([train, configs]) => [
      train,
      Object.freeze(configs.map((config) => Object.freeze({
        id: config.id,
        train,
        number: config.number,
        type: config.type,
        typeLabel: TYPE_LABELS_BY_TRAIN[train][config.type],
        genderMode: config.genderMode,
        price: Object.freeze({ tier1: config.price[0], tier2: config.price[1] }),
        amenities: Object.freeze(config.amenities.slice()),
        seats: Object.freeze(createSeats(config, train)),
        selectedSeat: null,
        className: config.className,
        carrier: config.carrier,
        layoutKind: config.layoutKind || "berth",
        schemeGeometry: config.schemeGeometry,
        schemeReady: config.schemeReady === undefined
          ? config.schemeGeometry === "coupe" || config.schemeGeometry === "sapsan" || config.schemeGeometry === "lastochka"
          : config.schemeReady !== false
      })))
    ])
  ));
  const cars = carsByTrain["long-distance"];

  function normalizeVariant(value) {
    return String(value || "a").toLowerCase() === "b" ? "b" : "a";
  }

  function normalizeTrain(value) {
    const train = String(value || "long-distance").toLowerCase();
    return Object.prototype.hasOwnProperty.call(TRAIN_LABELS, train) ? train : "long-distance";
  }

  function getTypeLabels(train = "long-distance") {
    return TYPE_LABELS_BY_TRAIN[normalizeTrain(train)];
  }

  function getCars(train = "long-distance") {
    return carsByTrain[normalizeTrain(train)].slice();
  }

  function normalizeFilter(value, train = "long-distance") {
    const typeLabels = getTypeLabels(train);
    const typeKeys = Object.keys(typeLabels);
    const rawFilter = Array.isArray(value) ? value.join(",") : String(value || "all");
    const selectedTypes = new Set(
      rawFilter
        .toLowerCase()
        .split(",")
        .map((type) => type.trim())
        .filter((type) => Object.prototype.hasOwnProperty.call(typeLabels, type))
    );
    const normalizedTypes = typeKeys.filter((type) => selectedTypes.has(type));
    return normalizedTypes.length ? normalizedTypes.join(",") : "all";
  }

  function getFilterTypes(filter, train = "long-distance") {
    const normalizedFilter = normalizeFilter(filter, train);
    return normalizedFilter === "all" ? [] : normalizedFilter.split(",");
  }

  function normalizeAdults(value) {
    if (typeof value !== "number" && typeof value !== "string") return 1;
    const adults = Number(value);
    return Number.isInteger(adults) ? Math.min(9, Math.max(1, adults)) : 1;
  }

  function getCar(id, train = "long-distance") {
    return carsByTrain[normalizeTrain(train)].find((car) => car.id === String(id)) || null;
  }

  function getVisibleCars(filter, train = "long-distance") {
    const normalizedTrain = normalizeTrain(train);
    const trainCars = carsByTrain[normalizedTrain];
    const selectedTypes = getFilterTypes(filter, normalizedTrain);
    return selectedTypes.length ? trainCars.filter((car) => selectedTypes.includes(car.type)) : trainCars.slice();
  }

  function getAvailableSeats(car) {
    return car ? car.seats.filter((seat) => seat.availability !== "occupied") : [];
  }

  function summarizeSeats(car) {
    const available = getAvailableSeats(car);
    return Object.freeze({
      total: available.length,
      lower: available.filter((seat) => seat.position === "lower").length,
      upper: available.filter((seat) => seat.position === "upper").length
    });
  }

  function getMinimumPrice(car) {
    const available = getAvailableSeats(car);
    return available.length ? Math.min(...available.map((seat) => seat.price)) : car.price.tier1;
  }

  function getSeat(car, number) {
    return car ? car.seats.find((seat) => seat.number === Number(number)) || null : null;
  }

  function formatRubles(value) {
    return `${new Intl.NumberFormat("ru-RU").format(value).replace(/[\u00a0\u202f]/g, " ")} ₽`;
  }

  function parseSelections(value, train = "long-distance") {
    const normalizedTrain = normalizeTrain(train);
    const selections = new Map();
    String(value || "").split(",").forEach((entry) => {
      const [carId, rawSeat] = entry.split(":");
      const car = getCar(carId, normalizedTrain);
      const seat = getSeat(car, rawSeat);
      if (isSelectableCar(car) && seat && seat.availability !== "occupied") {
        selections.set(car.id, seat.number);
      }
    });
    return selections;
  }

  function serializeSelections(selections, train = "long-distance") {
    if (!(selections instanceof Map)) return "";
    return getCars(train)
      .filter((car) => selections.has(car.id))
      .map((car) => `${car.id}:${selections.get(car.id)}`)
      .join(",");
  }

  function isSelectableCar(car) {
    return Boolean(car?.schemeReady && ["coupe", "sapsan", "lastochka"].includes(car.schemeGeometry));
  }

  function parseSelection(value, { adults = 1, preferredCarId = null, train = "long-distance" } = {}) {
    const normalizedTrain = normalizeTrain(train);
    const groups = new Map();
    String(value || "").split(",").forEach((entry) => {
      const parts = entry.split(":");
      if (parts.length !== 2) return;
      const car = getCar(parts[0], normalizedTrain);
      const seat = getSeat(car, parts[1]);
      if (!isSelectableCar(car) || !seat || seat.availability === "occupied") return;

      if (!groups.has(car.id)) groups.set(car.id, []);
      const numbers = groups.get(car.id);
      if (!numbers.includes(seat.number)) numbers.push(seat.number);
    });

    const preferredId = String(preferredCarId);
    const carId = groups.has(preferredId) ? preferredId : groups.keys().next().value;
    return carId
      ? { carId, seatNumbers: groups.get(carId).slice(0, normalizeAdults(adults)) }
      : { carId: null, seatNumbers: [] };
  }

  function serializeSelection(selection, train = "long-distance") {
    if (!selection || !Array.isArray(selection.seatNumbers)) return "";
    const normalized = parseSelection(
      selection.seatNumbers.map((seat) => `${selection.carId}:${seat}`).join(","),
      { adults: 9, preferredCarId: selection.carId, train }
    );
    return normalized.seatNumbers.map((seat) => `${normalized.carId}:${seat}`).join(",");
  }

  function setParam(params, key, value) {
    if (value === undefined || value === null || value === "" || value === false) params.delete(key);
    else params.set(key, String(value));
  }

  function buildUrl(path, options = {}) {
    const params = new URLSearchParams();
    const train = normalizeTrain(options.train);
    setParam(params, "variant", normalizeVariant(options.variant));
    setParam(params, "screen", options.screen);
    setParam(params, "train", train);
    setParam(params, "car", options.carId);
    setParam(params, "filter", normalizeFilter(options.filter, train));
    setParam(params, "adults", normalizeAdults(options.adults));
    setParam(params, "selections", options.selection !== undefined
      ? serializeSelection(options.selection, train)
      : serializeSelections(options.selections, train));
    setParam(params, "entry", options.entry);
    setParam(params, "onboarding", options.onboarding);
    setParam(params, "onboarded", options.onboarded);
    setParam(params, "panel", options.panel);
    if ([32, 80].includes(Number(options.chainGap))) setParam(params, "chainGap", String(options.chainGap));
    return `${path}?${params.toString()}`;
  }

  window.TrainSeatPrototype = Object.freeze({
    cars,
    carsByTrain,
    typeLabels: TYPE_LABELS,
    typeLabelsByTrain: TYPE_LABELS_BY_TRAIN,
    trainLabels: TRAIN_LABELS,
    normalizeVariant,
    normalizeTrain,
    getTypeLabels,
    getCars,
    normalizeFilter,
    getFilterTypes,
    normalizeAdults,
    getCar,
    getVisibleCars,
    getAvailableSeats,
    summarizeSeats,
    getMinimumPrice,
    getSeat,
    isSelectableCar,
    formatRubles,
    parseSelections,
    serializeSelections,
    parseSelection,
    serializeSelection,
    buildUrl
  });
})();
