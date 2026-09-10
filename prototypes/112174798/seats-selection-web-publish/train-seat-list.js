(function () {
  "use strict";

  const data = window.TrainSeatPrototype;
  const preview = window.TrainSeatPreview;
  if (!data) return;

  const params = new URLSearchParams(window.location.search);
  const variant = "a";
  const train = data.normalizeTrain(params.get("train"));
  const qaMode = params.get("qa") === "1";
  if (qaMode && train === "long-distance") return;

  const isLongDistance = train === "long-distance";
  const hasImplementedList = isLongDistance || train === "sapsan" || train === "lastochka";
  const listPath = window.location.pathname;
  let adults = data.normalizeAdults(params.get("adults"));
  let filter = hasImplementedList ? data.normalizeFilter(params.get("filter"), train) : "all";
  let onboarded = params.get("onboarded") === "1";
  let chainGap = [32, 80].includes(Number(params.get("chainGap"))) ? Number(params.get("chainGap")) : 24;

  const AMENITY_ICONS = Object.freeze({
    "air-conditioner": "./assets/icons/air-conditioner.svg",
    toilet: "./assets/icons/toilet.svg",
    animal: "./assets/icons/animal.svg",
    restaurant: "./assets/icons/restaurant.svg",
    "blanket-pillow": "./assets/icons/blanket-pillow.svg",
    shower: "./assets/icons/shower.svg",
    "gender-cabin": "./assets/icons/gender-cabin.svg"
  });

  function createTypeChip(type, label) {
    const chip = document.createElement("div");
    chip.className = `filter-chip filter-chip--${type}`;
    chip.dataset.filter = type;

    const copy = document.createElement("div");
    copy.className = "filter-chip__copy";
    const chipLabel = document.createElement("div");
    chipLabel.className = "filter-chip__label";
    chipLabel.textContent = label;
    const price = document.createElement("div");
    price.className = "filter-chip__price";
    copy.append(chipLabel, price);
    chip.appendChild(copy);
    return chip;
  }

  function createAmenityChip(modifier, icon, label) {
    const chip = document.createElement("div");
    chip.className = `filter-chip filter-chip--amenity filter-chip--${modifier}`;
    const image = document.createElement("img");
    image.className = "filter-chip__icon";
    image.src = icon;
    image.alt = "";
    const text = document.createElement("span");
    text.textContent = label;
    chip.append(image, text);
    return chip;
  }

  function createSeatedCard(car, previewType) {
    const card = document.createElement("article");
    card.className = "car-card car-card--generated";
    card.dataset.carId = car.id;

    const info = document.createElement("div");
    info.className = "car-card__info";
    const top = document.createElement("div");
    top.className = "car-card__top";
    const name = document.createElement("div");
    name.className = "car-card__name";
    const type = document.createElement("span");
    type.className = "car-card__type";
    name.append(document.createTextNode(`Вагон ${car.number}`), type);
    const price = document.createElement("div");
    price.className = "car-card__price";
    top.append(name, price);

    const bottom = document.createElement("div");
    bottom.className = "car-card__bottom";
    const facilities = document.createElement("div");
    facilities.className = "facilities";
    const availability = document.createElement("div");
    availability.className = "car-card__availability";
    bottom.append(facilities, availability);
    info.append(top, bottom);

    const previewArea = document.createElement("div");
    previewArea.className = "car-card__preview-area";
    previewArea.appendChild(preview.createPreview({ type: previewType, seats: car.seats }));
    card.append(info, previewArea);
    return card;
  }

  function buildSeatedCatalog(trainName) {
    const carsSection = document.querySelector(".seat-list__cars");
    const filterChips = carsSection?.querySelector(".filter-chips");
    if (!carsSection || !filterChips || !preview) return;

    filterChips.replaceChildren();
    const filterButton = document.createElement("div");
    filterButton.className = "filter-chip filter-chip--icon";
    const filterIcon = document.createElement("img");
    filterIcon.src = "./assets/icons/filter.svg";
    filterIcon.alt = "";
    filterButton.appendChild(filterIcon);
    filterChips.appendChild(filterButton);

    Object.entries(data.getTypeLabels(trainName)).forEach(([type, label]) => {
      filterChips.appendChild(createTypeChip(type, label));
    });
    filterChips.appendChild(createAmenityChip("toilet", "./assets/icons/toilet-16.svg", "Биотуалет"));
    filterChips.appendChild(createAmenityChip("air-conditioner", "./assets/icons/air-conditioner-16.svg", "Кондиционер"));

    carsSection.querySelectorAll(".car-group").forEach((group) => group.remove());
    const cars = data.getCars(trainName);
    Object.entries(data.getTypeLabels(trainName)).forEach(([type, label]) => {
      const groupCars = cars.filter((car) => car.type === type);
      const group = document.createElement("section");
      group.className = "car-group car-group--generated";
      group.dataset.carType = type;
      const headingId = `${trainName}-${type}-heading`;
      group.setAttribute("aria-labelledby", headingId);

      const heading = document.createElement("h2");
      heading.className = "car-group__heading";
      heading.id = headingId;
      heading.textContent = label;
      const cards = document.createElement("div");
      cards.className = "car-group__cards";
      groupCars.forEach((car) => cards.appendChild(createSeatedCard(car, trainName)));
      group.append(heading, cards);
      carsSection.appendChild(group);
    });
  }

  if (train === "sapsan" || train === "lastochka") buildSeatedCatalog(train);

  const phoneFrame = document.querySelector(".phone-frame");
  const backLink = document.querySelector(".toolbar__back");
  const carsSection = document.querySelector(".seat-list__cars");
  const filters = document.querySelector(".seat-list__filters");
  const emptyState = document.querySelector(".seat-list__empty");
  const cards = Array.from(document.querySelectorAll(".car-card"));
  const groups = Array.from(document.querySelectorAll(".car-group"));
  const typeChips = Array.from(document.querySelectorAll(".filter-chip")).filter((chip) => chip.querySelector(".filter-chip__label"));
  const adultCounter = document.querySelector(".passenger-row .counter");
  const adultValue = adultCounter?.querySelector(".counter__value");
  const routeDetails = document.querySelector(".train-info__details");
  const routeDate = routeDetails?.textContent.split("·")[0].trim() || "";
  const adultButtons = [];
  function renderAdults() {
    if (adultValue) adultValue.textContent = String(adults);
    adultButtons.forEach((button) => {
      const disabled = Number(button.dataset.adultsStep) < 0 ? adults === 1 : adults === 9;
      button.disabled = disabled;
      button.setAttribute("aria-disabled", String(disabled));
      button.classList.toggle("counter__button--disabled", disabled);
    });
    const passengerWord = adults === 1 ? "пассажир" : adults < 5 ? "пассажира" : "пассажиров";
    if (routeDetails) routeDetails.textContent = `${routeDate} · ${adults} ${passengerWord}`;
  }

  if (adultCounter) {
    adultCounter.removeAttribute("aria-hidden");
    adultCounter.setAttribute("role", "group");
    adultCounter.setAttribute("aria-label", "Количество взрослых");
    adultValue?.setAttribute("aria-live", "polite");
    adultValue?.setAttribute("aria-atomic", "true");

    adultCounter.querySelectorAll(".counter__button").forEach((placeholder) => {
      const step = placeholder.classList.contains("counter__button--minus") ? -1 : 1;
      const button = document.createElement("button");
      button.type = "button";
      button.className = placeholder.className;
      button.dataset.adultsStep = String(step);
      button.setAttribute("aria-label", step < 0 ? "Уменьшить количество взрослых" : "Добавить взрослого");
      button.addEventListener("click", () => {
        adults = data.normalizeAdults(adults + step);
        renderAdults();
        updateAddress();
      });
      placeholder.replaceWith(button);
      adultButtons.push(button);
    });
  }

  document.querySelectorAll(".passenger-row .counter").forEach((counter) => {
    if (counter === adultCounter) return;
    counter.inert = true;
    counter.querySelectorAll(".counter__button").forEach((control) => {
      control.setAttribute("aria-disabled", "true");
      control.classList.add("counter__button--disabled");
    });
  });

  function readCardNumber(card) {
    if (card.dataset.carId) return card.dataset.carId;
    const match = card.querySelector(".car-card__name")?.textContent.match(/Вагон\s+(\d+)/i);
    return match ? match[1] : null;
  }

  function updateAddress() {
    const query = new URLSearchParams();
    query.set("variant", variant);
    query.set("screen", "list");
    query.set("train", train);
    query.set("filter", filter);
    query.set("adults", String(adults));
    if (onboarded) query.set("onboarded", "1");
    if (chainGap !== 24) query.set("chainGap", String(chainGap));
    window.history.replaceState(window.history.state, "", `${listPath}?${query.toString()}`);
    if (backLink) {
      const startQuery = new URLSearchParams(query);
      startQuery.set("screen", "start");
      backLink.href = `./train-seat-start.html?${startQuery.toString()}`;
    }
  }

  function renderMiniScheme(card, car) {
    const miniScheme = card.querySelector(".mini-scheme");
    if (!miniScheme || !preview) return;
    if (car.schemeGeometry === "coupe") preview.updatePreview(miniScheme, { type: "coupe", seats: car.seats });
    if (car.schemeGeometry === "sapsan") preview.updatePreview(miniScheme, { type: "sapsan", seats: car.seats });
    if (train === "lastochka") preview.updatePreview(miniScheme, { type: "lastochka", seats: car.seats });
  }

  function renderFacilities(card, car) {
    if (!card.classList.contains("car-card--generated")) return;
    const facilities = card.querySelector(".facilities");
    if (!facilities) return;
    facilities.replaceChildren();
    car.amenities.forEach((amenity) => {
      const source = AMENITY_ICONS[amenity];
      if (!source) return;
      const icon = document.createElement("img");
      icon.className = "facility-icon";
      icon.src = source;
      icon.alt = "";
      facilities.appendChild(icon);
    });
  }

  function renderCard(card, car) {
    if (!car) {
      card.hidden = true;
      return;
    }

    const summary = data.summarizeSeats(car);
    const minimumPrice = data.getMinimumPrice(car);
    const name = card.querySelector(".car-card__name");
    const type = card.querySelector(".car-card__type");
    const price = card.querySelector(".car-card__price");
    const availability = card.querySelector(".car-card__availability");

    card.dataset.carId = car.id;
    if (name && card.classList.contains("car-card--generated")) name.firstChild.textContent = `Вагон ${car.number}`;
    if (type) type.textContent = ` · ${car.typeLabel}`;

    if (price) {
      const prefix = car.type === "coupe" || train === "sapsan" || train === "lastochka" ? "от " : "";
      price.textContent = `${prefix}${data.formatRubles(minimumPrice)}`;
    }

    if (availability) {
      availability.textContent = `${summary.total} свободных`;
      if (car.layoutKind !== "seated") {
        availability.appendChild(document.createTextNode(":"));
        const details = document.createElement("span");
        details.className = "car-card__availability-details";
        details.textContent = ` ${summary.lower} ниж, ${summary.upper} верх`;
        availability.appendChild(details);
      }
    }

    renderFacilities(card, car);
    renderMiniScheme(card, car);

    const canOpen = isLongDistance || train === "sapsan" || train === "lastochka";
    card.classList.toggle("car-card--preview-only", !canOpen);
    if (!canOpen) {
      card.removeAttribute("role");
      card.removeAttribute("tabindex");
      card.setAttribute("aria-disabled", "true");
      return;
    }

    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Открыть вагон ${car.number}, ${car.typeLabel}`);

    function openCar() {
      const shouldShowOnboarding = variant === "a" && !onboarded
        && data.getVisibleCars(filter, train).length > 1;
      const url = data.buildUrl("./train-seat-scheme.html", {
        variant,
        screen: "scheme",
        train,
        carId: car.id,
        filter,
        adults,
        entry: "card",
        chainGap,
        onboarding: shouldShowOnboarding ? "1" : null,
        onboarded: onboarded ? "1" : null
      });
      if (!window.TrainSeatSheet?.open(url, card)) window.location.href = url;
    }

    card.addEventListener("click", openCar);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCar();
      }
    });
  }

  function filterFromChip(chip) {
    return Object.prototype.hasOwnProperty.call(data.getTypeLabels(train), chip.dataset.filter)
      ? chip.dataset.filter
      : null;
  }

  function renderTypeChip(chip) {
    const chipFilter = filterFromChip(chip);
    if (!chipFilter) return;
    const carsOfType = data.getVisibleCars(chipFilter, train);
    if (!carsOfType.length) return;
    const availableCount = carsOfType.reduce((total, car) => total + data.summarizeSeats(car).total, 0);
    const minimumPrice = Math.min(...carsOfType.map((car) => data.getMinimumPrice(car)));
    chip.querySelector(".filter-chip__label").textContent = `${data.getTypeLabels(train)[chipFilter]} · ${availableCount}`;
    chip.querySelector(".filter-chip__price").textContent = `от ${data.formatRubles(minimumPrice)}`;
  }

  function renderFilter() {
    const selectedTypes = new Set(data.getFilterTypes(filter, train));
    groups.forEach((group) => {
      const groupType = group.dataset.carType || (group.classList.contains("car-group--coupe")
        ? "coupe"
        : group.classList.contains("car-group--plac")
          ? "platskart"
          : "sv");
      group.hidden = selectedTypes.size > 0 && !selectedTypes.has(groupType);
    });

    typeChips.forEach((chip) => {
      const chipFilter = filterFromChip(chip);
      const active = selectedTypes.has(chipFilter);
      chip.classList.toggle("filter-chip--active", active);
      chip.setAttribute("aria-pressed", String(active));
    });

    const onlyType = isLongDistance && selectedTypes.size === 1 ? selectedTypes.values().next().value : null;
    phoneFrame?.classList.toggle("phone-frame--filtered-coupe", onlyType === "coupe");
    phoneFrame?.classList.toggle("phone-frame--filtered-short", onlyType === "platskart" || onlyType === "sv");
  }

  function renderTrain() {
    if (hasImplementedList) {
      filters.hidden = false;
      emptyState.hidden = true;
      carsSection.classList.remove("seat-list__cars--empty");
      cards.forEach((card) => renderCard(card, data.getCar(readCardNumber(card), train)));
      typeChips.forEach(renderTypeChip);
      renderFilter();
      document.title = `${data.trainLabels[train]} — выбор вагона`;
      return;
    }

    filters.hidden = true;
    groups.forEach((group) => { group.hidden = true; });
    cards.forEach((card) => {
      card.removeAttribute("role");
      card.removeAttribute("tabindex");
    });
    carsSection.classList.add("seat-list__cars--empty");
    emptyState.hidden = false;
    emptyState.querySelector(".seat-list__empty-title").textContent = data.trainLabels[train];
    document.title = `${data.trainLabels[train]} — выбор вагона`;
  }

  if (hasImplementedList) {
    typeChips.forEach((chip) => {
      const chipFilter = filterFromChip(chip);
      if (!chipFilter) return;

      chip.setAttribute("role", "button");
      chip.setAttribute("tabindex", "0");

      function toggleFilter() {
        const selectedTypes = new Set(data.getFilterTypes(filter, train));
        if (selectedTypes.has(chipFilter)) selectedTypes.delete(chipFilter);
        else selectedTypes.add(chipFilter);
        filter = data.normalizeFilter(Array.from(selectedTypes), train);
        renderFilter();
        updateAddress();
      }

      chip.addEventListener("click", toggleFilter);
      chip.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleFilter();
        }
      });
    });
  }

  renderAdults();
  renderTrain();
  updateAddress();

  if (hasImplementedList) {
    window.addEventListener("train-seat-sheet:return", (event) => {
      const returned = new URL(event.detail.url, window.location.href);
      const returnedParams = returned.searchParams;
      if (returnedParams.has("adults")) adults = data.normalizeAdults(returnedParams.get("adults"));
      onboarded = returnedParams.get("onboarded") === "1";
      filter = data.normalizeFilter(returnedParams.get("filter"), train);
      chainGap = [32, 80].includes(Number(returnedParams.get("chainGap"))) ? Number(returnedParams.get("chainGap")) : 24;
      renderAdults();
      renderFilter();
      updateAddress();
    });
  }
})();
