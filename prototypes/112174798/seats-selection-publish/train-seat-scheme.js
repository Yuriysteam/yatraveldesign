(function () {
  "use strict";

  const data = window.TrainSeatPrototype;
  const params = new URLSearchParams(window.location.search);
  const variant = data ? data.normalizeVariant(params.get("variant")) : "a";
  const train = data ? data.normalizeTrain(params.get("train")) : "long-distance";
  const sapsanLayout = window.TrainSeatSapsanLayout;
  const lastochkaLayout = window.TrainSeatLastochkaLayout;
  const qaMode = params.get("qa") === "1";
  const root = document.getElementById("train-scheme");
  const schemeViewport = document.querySelector(".scheme-viewport");
  const schemeSurface = document.querySelector(".scheme-surface");
  const checkout = document.querySelector(".checkout");
  let schemeStage = document.querySelector(".scheme-stage");
  let seatStack = document.getElementById("seat-stack");
  let genderStack = document.getElementById("gender-stack");
  const paginator = document.querySelector(".car-paginator-live");
  const announcer = document.querySelector(".scheme-announcer");
  const onboarding = document.querySelector(".onboarding");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const embeddedSheet = window.parent !== window && window.frameElement?.classList.contains("scheme-sheet__frame");
  let sheetOpened = !embeddedSheet;
  let sheetClosing = false;

  const WORK_OFFSET = -21;
  const START_OFFSET = 52;
  const NEIGHBOR_REVEAL = 48;
  const CHAIN_EDGE_INSET = 44;
  const SNAP_DURATION = 520;
  const SEAT_REVEAL_MARGIN = 16;
  const SEAT_REVEAL_DURATION = 280;
  const CHECKOUT_HEIGHT = 101;
  const REFERENCE_FULL_HEIGHT = 812;

  const stateAliases = {
    before: "before",
    start: "before",
    default: "default",
    selected: "selected",
    expanded: "expanded",
    gender: "gender",
    onboarding: "onboarding-1",
    onboarding1: "onboarding-1",
    "onboarding-1": "onboarding-1",
    onboarding2: "onboarding-2",
    "onboarding-2": "onboarding-2"
  };

  const figmaNodes = {
    "a:before": "15997:378372",
    "a:default": "15997:378767",
    "a:selected": "16015:525024",
    "a:expanded": "15997:379277",
    "a:gender": "16002:478268",
    "a:onboarding-1": "16015:518181",
    "a:onboarding-2": "16015:518404",
    "b:before": "16015:520023",
    "b:default": "16015:520194",
    "b:selected": "16015:525266",
    "b:expanded": "16015:520365",
    "b:gender": "16015:520543"
  };

  const qaAvailableSeats = new Map([
    [8, "tier-1"], [9, "tier-2"], [12, "tier-1"], [16, "tier-1"],
    [22, "tier-1"], [23, "tier-2"], [25, "tier-2"], [26, "tier-1"],
    [30, "tier-1"], [31, "tier-2"], [35, "tier-2"], [36, "tier-1"]
  ]);

  const sapsanQaReferenceSeats = new Map([
    ...[1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
      49, 50, 53, 54, 55, 56, 57, 58, 61, 62].map((number) => [number, "tier-1"]),
    ...[23, 24, 25, 26, 27, 30, 31, 32, 34, 35, 36, 37, 38, 41, 42, 43, 44,
      45, 46, 47, 48, 60, 63, 64, 65, 66].map((number) => [number, "tier-2"])
  ]);

  root.classList.add(`variant-${variant}`, `train-${train}`);
  root.dataset.train = train;

  function makeSeat(number, position, availableSeats, selectedSeat, interactive, occupiedCrossSource) {
    const seat = document.createElement("div");
    const availability = availableSeats.get(number);
    const isSelected = Array.isArray(selectedSeat) ? selectedSeat.includes(number) : number === selectedSeat;
    seat.className = `seat seat--${position}`;
    seat.dataset.seat = String(number);

    if (availability) {
      seat.classList.add(`seat--${availability}`);
      if (isSelected) seat.classList.add("seat--selected");

      const value = document.createElement("span");
      value.className = "seat__value";
      value.textContent = String(number);
      seat.appendChild(value);

      if (interactive) {
        seat.setAttribute("role", "button");
        seat.setAttribute("tabindex", "0");
        seat.setAttribute("aria-pressed", String(isSelected));
        seat.setAttribute("aria-label", isSelected ? `Снять выбор места ${number}` : `Выбрать место ${number}`);
      }
    } else {
      const cross = document.createElement("img");
      cross.className = "seat__cross";
      cross.src = occupiedCrossSource || "./assets/scheme/seat-occupied-cross.svg";
      cross.alt = "";
      seat.appendChild(cross);
      seat.setAttribute("aria-hidden", "true");
    }

    return seat;
  }

  function renderSeats(availableSeats, selectedSeat, interactive, target = seatStack) {
    target.replaceChildren();

    if (target.closest(".scheme-stage--lastochka")) {
      lastochkaLayout.seats.forEach((position) => {
        const seat = makeSeat(position.number, position.position, availableSeats, selectedSeat, interactive,
          lastochkaLayout.assets?.occupiedCross || "./assets/scheme/lastochka/seat-occupied-cross.svg");
        seat.classList.add("lastochka-seat");
        seat.style.left = `${position.x}px`;
        seat.style.top = `${position.y}px`;
        target.appendChild(seat);
      });
      return;
    }

    if (target.closest(".scheme-stage--sapsan")) {
      sapsanLayout.seats.forEach((position) => {
        const seat = makeSeat(position.number, position.position, availableSeats, selectedSeat, interactive);
        seat.classList.add("sapsan-seat");
        seat.style.left = `${position.x}px`;
        seat.style.top = `${position.y}px`;
        target.appendChild(seat);
      });
      return;
    }

    for (let coupeIndex = 0; coupeIndex < 9; coupeIndex += 1) {
      const divider = document.createElement("div");
      divider.className = "seat-divider";
      target.appendChild(divider);

      const coupe = document.createElement("div");
      coupe.className = "coupe";

      for (let rowIndex = 0; rowIndex < 2; rowIndex += 1) {
        const firstSeat = coupeIndex * 4 + rowIndex * 2 + 1;
        const row = document.createElement("div");
        row.className = "seat-row";
        row.appendChild(makeSeat(firstSeat, "bottom", availableSeats, selectedSeat, interactive));
        row.appendChild(makeSeat(firstSeat + 1, "top", availableSeats, selectedSeat, interactive));
        coupe.appendChild(row);
      }

      target.appendChild(coupe);
    }

    const lastDivider = document.createElement("div");
    lastDivider.className = "seat-divider";
    target.appendChild(lastDivider);
  }

  function renderGenderMarkers(target = genderStack) {
    const genderTypes = [null, "male", "female", "mixed", null, "female", "female", "mixed", "mixed"];
    target.replaceChildren();

    genderTypes.forEach((type) => {
      const marker = document.createElement("div");
      marker.className = `gender-marker${type ? ` gender-marker--${type}` : ""}`;

      if (type === "male" || type === "mixed") {
        const male = document.createElement("img");
        male.className = "gender-marker__male";
        male.src = "./assets/scheme/gender-marker-a.svg";
        male.alt = "";
        marker.appendChild(male);
      }

      if (type === "female" || type === "mixed") {
        const female = document.createElement("img");
        female.className = "gender-marker__female";
        female.src = "./assets/scheme/gender-marker-b.svg";
        female.alt = "";
        marker.appendChild(female);
      }

      target.appendChild(marker);
    });
  }

  function appendSapsanStatic(stage) {
    const body = document.createElement("img");
    body.className = "scheme-stage__body sapsan-scheme__body";
    body.src = "./assets/scheme/sapsan/body.svg";
    body.alt = "";
    stage.appendChild(body);

    sapsanLayout.greenZones.forEach((zone) => {
      const element = document.createElement("span");
      element.className = "sapsan-scheme__green-zone";
      Object.assign(element.style, {
        left: `${zone.x}px`, top: `${zone.y}px`, width: `${zone.width}px`, height: `${zone.height}px`,
        borderRadius: `${zone.radius}px`
      });
      stage.appendChild(element);
    });

    Object.entries(sapsanLayout.windowStrips).forEach(([side, strips]) => {
      strips.forEach(([top, height]) => {
        const strip = document.createElement("span");
        strip.className = `sapsan-scheme__window sapsan-scheme__window--${side}`;
        strip.style.top = `${top}px`;
        strip.style.height = `${height}px`;
        stage.appendChild(strip);
      });
    });

    sapsanLayout.tables.forEach((table) => {
      const element = document.createElement("span");
      element.className = "sapsan-scheme__table";
      element.textContent = "стол";
      Object.assign(element.style, {
        left: `${table.x}px`, top: `${table.y}px`, width: `${table.width}px`, height: `${table.height}px`
      });
      stage.appendChild(element);
    });

    const wardrobe = document.createElement("span");
    wardrobe.className = "sapsan-scheme__wardrobe";
    Object.assign(wardrobe.style, {
      left: `${sapsanLayout.wardrobe.x}px`, top: `${sapsanLayout.wardrobe.y}px`,
      width: `${sapsanLayout.wardrobe.width}px`, height: `${sapsanLayout.wardrobe.height}px`
    });
    const hanger = document.createElement("img");
    hanger.src = "./assets/scheme/sapsan/hanger.svg";
    hanger.alt = "";
    wardrobe.appendChild(hanger);
    stage.appendChild(wardrobe);

    sapsanLayout.features.forEach((feature) => {
      const icon = document.createElement("img");
      icon.className = `sapsan-scheme__feature sapsan-scheme__feature--${feature.kind}`;
      icon.src = `./assets/scheme/sapsan/${feature.kind}.svg`;
      icon.alt = "";
      icon.style.left = `${feature.x}px`;
      icon.style.top = `${feature.y}px`;
      stage.appendChild(icon);
    });

    sapsanLayout.doors.forEach((door) => {
      const icon = document.createElement("img");
      icon.className = `sapsan-scheme__door sapsan-scheme__door--${door.kind}`;
      icon.src = door.kind === "side-left" ? "./assets/scheme/sapsan/door-left.svg"
        : door.kind === "side-right" ? "./assets/scheme/sapsan/door-right.svg"
          : "./assets/scheme/sapsan/door-bottom.svg";
      icon.alt = "";
      icon.style.left = `${door.x}px`;
      icon.style.top = `${door.y}px`;
      stage.appendChild(icon);
    });
  }

  function createSapsanStage() {
    const stage = document.createElement("div");
    stage.className = "scheme-stage scheme-stage--sapsan";
    appendSapsanStatic(stage);

    const seats = document.createElement("div");
    seats.className = "seat-stack sapsan-seat-stack";
    seats.setAttribute("aria-label", "Места");
    stage.appendChild(seats);

    const genders = document.createElement("div");
    genders.className = "gender-stack";
    genders.setAttribute("aria-hidden", "true");
    stage.appendChild(genders);

    const placeholder = document.createElement("div");
    placeholder.className = "scheme-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    const description = document.createElement("p");
    description.className = "scheme-placeholder__description";
    description.append("Схема появится", document.createElement("br"), "позже");
    placeholder.appendChild(description);
    stage.appendChild(placeholder);
    return stage;
  }

  function appendLastochkaStatic(stage) {
    const body = document.createElement("img");
    body.className = "scheme-stage__body lastochka-scheme__body";
    body.src = lastochkaLayout.assets.body;
    body.alt = "";
    stage.appendChild(body);

    Object.entries(lastochkaLayout.windowStrips).forEach(([side, strips]) => {
      strips.forEach(([top, height]) => {
        const slot = document.createElement("span");
        slot.className = `lastochka-scheme__window-slot lastochka-scheme__window-slot--${side}`;
        slot.style.top = `${top}px`;
        slot.style.height = `${height}px`;
        const strip = document.createElement("span");
        strip.className = "lastochka-scheme__window";
        slot.appendChild(strip);
        stage.appendChild(slot);
      });
    });

    lastochkaLayout.features.forEach((feature) => {
      const slot = document.createElement("span");
      slot.className = `lastochka-scheme__feature lastochka-scheme__feature--${feature.kind}`;
      slot.style.left = `${feature.x}px`;
      slot.style.top = `${feature.y}px`;
      const icon = document.createElement("img");
      icon.src = lastochkaLayout.assets[feature.kind];
      icon.alt = "";
      slot.appendChild(icon);
      stage.appendChild(slot);
    });

    lastochkaLayout.doors.forEach((door) => {
      const slot = document.createElement("span");
      slot.className = `lastochka-scheme__door lastochka-scheme__door--${door.kind}`;
      slot.style.left = `${door.x}px`;
      slot.style.top = `${door.y}px`;
      const icon = document.createElement("img");
      icon.src = door.kind.startsWith("side-")
        ? lastochkaLayout.assets.doorSide
        : lastochkaLayout.assets.doorEnd;
      icon.alt = "";
      slot.appendChild(icon);
      stage.appendChild(slot);
    });
  }

  function createLastochkaStage() {
    const stage = document.createElement("div");
    stage.className = "scheme-stage scheme-stage--lastochka";
    appendLastochkaStatic(stage);

    const seats = document.createElement("div");
    seats.className = "seat-stack lastochka-seat-stack";
    seats.setAttribute("aria-label", "Места");
    stage.appendChild(seats);

    const genders = document.createElement("div");
    genders.className = "gender-stack";
    genders.setAttribute("aria-hidden", "true");
    stage.appendChild(genders);

    const placeholder = document.createElement("div");
    placeholder.className = "scheme-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    const description = document.createElement("p");
    description.className = "scheme-placeholder__description";
    description.append("Схема появится", document.createElement("br"), "позже");
    placeholder.appendChild(description);
    stage.appendChild(placeholder);
    return stage;
  }

  function isSapsanCar(car) {
    return car?.train === "sapsan";
  }

  function isLastochkaCar(car) {
    return car?.train === "lastochka";
  }

  function isPlaceholderCar(car) {
    return !data.isSelectableCar(car);
  }

  function geometryForCar(car) {
    if (isSapsanCar(car)) return sapsanLayout.geometry;
    if (isLastochkaCar(car)) return lastochkaLayout.geometry;
    if (car.schemeGeometry === "coupe") return { bodyTop: 0, bodyHeight: 846, zoneTop: 112, zoneHeight: 686 };
    return { bodyTop: 65, bodyHeight: 744, zoneTop: 65, zoneHeight: 744 };
  }

  function createStageForCar(car, template) {
    if (isSapsanCar(car)) return createSapsanStage();
    if (isLastochkaCar(car)) return createLastochkaStage();
    return template.cloneNode(true);
  }

  function applyQaState() {
    const requestedState = (params.get("state") || "default").toLowerCase();
    const state = stateAliases[requestedState] || "default";
    const sapsanCar = train === "sapsan" && data
      ? data.getCar(params.get("car") || "1", "sapsan") || data.getCars("sapsan")[0]
      : null;
    const lastochkaCar = train === "lastochka" && data
      ? data.getCar(params.get("car") || "1", "lastochka") || data.getCars("lastochka")[0]
      : null;
    const carNumber = sapsanCar ? String(sapsanCar.number)
      : lastochkaCar ? String(lastochkaCar.number)
        : state === "gender" ? "4" : "3";

    root.classList.toggle("is-before", state === "before");
    root.classList.toggle("is-selected", state === "selected");
    root.classList.toggle("is-expanded", state === "expanded");
    root.classList.toggle("is-gender", state === "gender");
    root.classList.toggle("is-onboarding", state === "onboarding-1" || state === "onboarding-2");
    root.classList.toggle("is-onboarding-2", state === "onboarding-2");
    root.classList.toggle("is-first-car", variant === "b" && params.get("position") === "first");
    root.classList.toggle("is-last-car", variant === "b" && params.get("position") === "last");
    root.dataset.variant = variant.toUpperCase();
    root.dataset.state = state;
    root.dataset.train = train;
    root.dataset.figmaNode = sapsanCar ? sapsanLayout.figmaNode
      : lastochkaCar ? lastochkaLayout.figmaNode
        : figmaNodes[`${variant}:${state}`] || figmaNodes[`${variant}:default`];

    document.querySelectorAll(".car-panel__header .car-number__value").forEach((node) => {
      node.textContent = carNumber;
    });

    if (sapsanCar) {
      const stage = createSapsanStage();
      const placeholder = isPlaceholderCar(sapsanCar);
      stage.classList.toggle("is-placeholder", placeholder);
      schemeStage.replaceWith(stage);
      schemeStage = stage;
      seatStack = stage.querySelector(".seat-stack");
      genderStack = stage.querySelector(".gender-stack");
      root.classList.toggle("is-placeholder", placeholder);
      const selectedNumber = state === "selected" && !placeholder
        ? Number(params.get("seat")) || data.getAvailableSeats(sapsanCar)[0]?.number : null;
      if (!placeholder) {
        const availableSeats = params.get("reference") === "figma"
          ? sapsanQaReferenceSeats
          : availableSeatMap(sapsanCar);
        renderSeats(availableSeats, selectedNumber, false, seatStack);
      }
      stage.querySelector(".scheme-placeholder").setAttribute("aria-hidden", String(!placeholder));

      document.querySelectorAll(".car-details").forEach((details) => {
        const rows = details.querySelectorAll("span");
        if (rows[0]) rows[0].textContent = sapsanCar.typeLabel;
        if (rows[1]) rows[1].textContent = `Класс ${sapsanCar.className}`;
        if (rows[2]) rows[2].textContent = `Перевозчик ${sapsanCar.carrier}`;
      });
      document.querySelectorAll(".car-facility[data-amenity]").forEach((facility) => {
        facility.classList.toggle("is-unavailable", !sapsanCar.amenities.includes(facility.dataset.amenity));
      });
      document.querySelector(".car-description").textContent = placeholder
        ? `Схема вагона типа «${sapsanCar.typeLabel}» пока недоступна в этом прототипе`
        : "Сидячий вагон эконом-класса. Кондиционер и биотуалет в вагоне";
      const legend = document.querySelector(".price-legend");
      legend.replaceChildren(...Object.entries(sapsanCar.price).map(([tier, price]) => {
        const pill = document.createElement("span");
        pill.className = `price-legend__pill price-legend__pill--${tier.replace("tier", "tier-")}`;
        pill.textContent = data.formatRubles(price);
        return pill;
      }));
      if (selectedNumber) {
        const selectedSeat = data.getSeat(sapsanCar, selectedNumber);
        document.querySelector(".checkout__price").textContent = data.formatRubles(selectedSeat.price);
        document.querySelector(".checkout__caption").textContent = "1 место";
      }
      document.title = `Сапсан, вагон ${sapsanCar.number} — ${state}`;
      return;
    }

    if (lastochkaCar) {
      const stage = createLastochkaStage();
      const placeholder = isPlaceholderCar(lastochkaCar);
      stage.classList.toggle("is-placeholder", placeholder);
      schemeStage.replaceWith(stage);
      schemeStage = stage;
      seatStack = stage.querySelector(".seat-stack");
      genderStack = stage.querySelector(".gender-stack");
      root.classList.toggle("is-placeholder", placeholder);
      const selectedNumber = state === "selected" && !placeholder
        ? Number(params.get("seat")) || data.getAvailableSeats(lastochkaCar)[0]?.number : null;
      if (!placeholder) renderSeats(availableSeatMap(lastochkaCar), selectedNumber, false, seatStack);
      stage.querySelector(".scheme-placeholder").setAttribute("aria-hidden", String(!placeholder));

      document.querySelectorAll(".car-details").forEach((details) => {
        const rows = details.querySelectorAll("span");
        if (rows[0]) rows[0].textContent = lastochkaCar.typeLabel;
        if (rows[1]) rows[1].textContent = `Класс ${lastochkaCar.className}`;
        if (rows[2]) rows[2].textContent = `Перевозчик ${lastochkaCar.carrier}`;
      });
      document.querySelectorAll(".car-facility[data-amenity]").forEach((facility) => {
        facility.classList.toggle("is-unavailable", !lastochkaCar.amenities.includes(facility.dataset.amenity));
      });
      document.querySelector(".car-description").textContent = placeholder
        ? `Схема вагона типа «${lastochkaCar.typeLabel}» пока недоступна в этом прототипе`
        : lastochkaCar.amenities.includes("animal")
          ? "Сидячий вагон базового класса. Кондиционер и биотуалет в вагоне. Можно перевозить животных"
          : "Сидячий вагон базового класса. Кондиционер и биотуалет в вагоне";
      const legend = document.querySelector(".price-legend");
      legend.replaceChildren(...Object.entries(lastochkaCar.price).map(([tier, price]) => {
        const pill = document.createElement("span");
        pill.className = `price-legend__pill price-legend__pill--${tier.replace("tier", "tier-")}`;
        pill.textContent = data.formatRubles(price);
        return pill;
      }));
      if (selectedNumber) {
        const selectedSeat = data.getSeat(lastochkaCar, selectedNumber);
        document.querySelector(".checkout__price").textContent = data.formatRubles(selectedSeat.price);
        document.querySelector(".checkout__caption").textContent = "1 место";
      }
      document.title = `Ласточка, вагон ${lastochkaCar.number} — ${state}`;
      return;
    }

    renderSeats(qaAvailableSeats, state === "selected" ? 12 : null, false);
    renderGenderMarkers();
    document.title = `Выбор места — версия ${variant.toUpperCase()}, ${state}`;
  }

  if (qaMode || !data) {
    applyQaState();
    return;
  }

  root.classList.add("is-interactive");
  renderGenderMarkers();

  const filter = data.normalizeFilter(params.get("filter"), train);
  const visibleCars = data.getVisibleCars(filter, train);
  let currentCar = visibleCars.find((car) => car.id === params.get("car")) || visibleCars[0] || data.getCars(train)[0];
  const adults = data.normalizeAdults(params.get("adults"));
  // Reload keeps an open draft; returning through history starts a new attempt.
  const historyReturn = !embeddedSheet && performance.getEntriesByType("navigation")[0]?.type === "back_forward";
  let selection = data.parseSelection(historyReturn ? "" : params.get("selections"), {
    adults, preferredCarId: currentCar.id, train
  });
  const checkoutButton = document.createElement("button");
  checkoutButton.className = "checkout__button";
  checkoutButton.type = "button";
  checkoutButton.textContent = "Дальше";
  checkout.querySelector(".checkout__button").replaceWith(checkoutButton);
  checkout.setAttribute("role", "group");
  checkout.setAttribute("aria-label", "Выбранные места");
  const selectionToast = document.createElement("div");
  selectionToast.className = "selection-toast";
  selectionToast.hidden = true;
  selectionToast.setAttribute("aria-hidden", "true");
  root.appendChild(selectionToast);
  let selectionToastTimer = 0;
  let panelExpanded = params.get("panel") === "expanded";
  let onboarded = params.get("onboarded") === "1";
  let onboardingVisible = false;
  let entryFromCard = params.get("entry") === "card";
  const onboardingRequested = variant === "a" && params.get("onboarding") === "1" && !onboarded;
  let stageOffset = entryFromCard && !reducedMotion ? START_OFFSET : WORK_OFFSET;
  let introPauseTimer = 0;
  let justDragged = false;
  let drag = null;
  let motion = null;
  let motionFrame = 0;
  let worldOffset = 0;
  let deferredPanel = null;
  const geometry = window.TrainSeatCarouselGeometry;
  const panelContentMotion = window.TrainSeatPanelMotion.create(document.querySelector(".car-panel"), {
    outDuration: 90, inDuration: 140
  });
  const amenitiesMotion = window.TrainSeatAmenitiesMotion.create(document.querySelector(".car-panel"));
  const numberMotion = variant === "a" ? window.TrainSeatNumberMotion.create(
    document.querySelector(".car-panel__header--a .car-number__value"),
    { numbers: data.getCars(train).map(car => car.number), duration: 400 }
  ) : null;
  const chainGap = [32, 80].includes(Number(params.get("chainGap"))) ? Number(params.get("chainGap")) : 24;
  const chain = document.createElement("div");
  chain.className = "car-chain";
  chain.dataset.gap = String(chainGap);
  const stageTemplate = schemeStage.cloneNode(true);
  const carStages = new Map();
  const carGeometry = visibleCars.map(geometryForCar);
  const carLayout = geometry.layout(carGeometry, chainGap);
  visibleCars.forEach((car, index) => {
    const stage = createStageForCar(car, stageTemplate);
    stage.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    stage.classList.toggle("is-placeholder", isPlaceholderCar(car));
    stage.classList.toggle("is-gender", car.genderMode === "gendered");
    stage.dataset.carId = car.id;
    stage.style.top = `${carLayout[index].stageStart}px`;
    stage.querySelectorAll("img").forEach((image) => { image.draggable = false; });
    if (!isPlaceholderCar(car)) {
      renderSeats(availableSeatMap(car), selectedSeatsForCar(car.id), true, stage.querySelector(".seat-stack"));
    }
    renderGenderMarkers(stage.querySelector(".gender-stack"));
    carStages.set(car.id, stage);
    chain.appendChild(stage);
  });
  schemeStage.replaceWith(chain);
  root.classList.add("has-car-chain");
  chain.style.height = `${carLayout.at(-1).bodyStart + carGeometry.at(-1).bodyHeight}px`;
  activateStage();
  const paginatorMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  paginatorMotionPreference.addEventListener("change", () => {
    if (!paginatorMotionPreference.matches) return;
    if (motion) {
      const { target, finished } = motion;
      stopStageMotion();
      writeWorld(target);
      if (finished) finished();
    }
  });

  function availableSeatMap(car) {
    return new Map(car.seats
      .filter((seat) => seat.availability !== "occupied")
      .map((seat) => [seat.number, seat.availability]));
  }

  function selectedSeatsForCar(carId = currentCar.id) {
    return selection.carId === carId ? selection.seatNumbers : [];
  }

  function hasSelection() {
    return selection.seatNumbers.length > 0;
  }

  function hideSelectionToast() {
    window.clearTimeout(selectionToastTimer);
    selectionToast.hidden = true;
  }

  function showSelectionLimit() {
    hideSelectionToast();
    selectionToast.textContent = "Сначала снимите выбор с одного из мест";
    selectionToast.hidden = false;
    announcer.textContent = selectionToast.textContent;
    selectionToastTimer = window.setTimeout(hideSelectionToast, 3000);
  }

  function clearPreviousCarSeats(previousCarId) {
    if (!previousCarId || previousCarId === selection.carId) return;
    const stage = carStages.get(previousCarId);
    if (stage) renderSeats(availableSeatMap(data.getCar(previousCarId, train)), [], true, stage.querySelector(".seat-stack"));
  }

  function currentIndex() {
    return visibleCars.findIndex((car) => car.id === currentCar.id);
  }

  function fullSurfaceHeight() {
    return root.clientHeight || REFERENCE_FULL_HEIGHT;
  }

  function selectedSurfaceHeight() {
    return Math.max(0, fullSurfaceHeight() - CHECKOUT_HEIGHT);
  }

  function activateStage() {
    carStages.forEach((stage, id) => {
      const active = id === currentCar.id;
      stage.inert = !active;
      stage.setAttribute("aria-hidden", String(!active));
      stage.querySelector(".seat-stack").removeAttribute("id");
      stage.querySelector(".gender-stack").removeAttribute("id");
    });
    schemeStage = carStages.get(currentCar.id);
    seatStack = schemeStage.querySelector(".seat-stack");
    genderStack = schemeStage.querySelector(".gender-stack");
    seatStack.id = "seat-stack";
    genderStack.id = "gender-stack";
    stageOffset = readRenderedOffset();
  }

  function boundsFor(index, targetState = false) {
    const selectedHeight = selectedSurfaceHeight();
    const height = targetState
      ? (hasSelection() ? selectedHeight : fullSurfaceHeight())
      : schemeViewport.clientHeight;
    const bottomInset = geometry.clamp((height - selectedHeight) * 21 / CHECKOUT_HEIGHT, 0, 21);
    const result = geometry.bounds(carGeometry[index], height, 44, bottomInset);
    if (result.min !== result.max) {
      // Equal physical breathing room at both scroll edges. Keep the working
      // seat-zone center based on the real safe areas, not this preview inset.
      result.min = Math.min(result.min, height - CHAIN_EDGE_INSET - carGeometry[index].bodyTop - carGeometry[index].bodyHeight);
    }
    return result;
  }

  function getBounds(targetState = false) {
    return boundsFor(currentIndex(), targetState);
  }

  function clampToBounds(value, targetState = false) {
    const bounds = getBounds(targetState);
    return Math.min(bounds.max, Math.max(bounds.min, value));
  }

  function centeredWorld(index) {
    return boundsFor(index, true).center - carLayout[index].stageStart;
  }

  function writeWorld(value) {
    worldOffset = value;
    stageOffset = readRenderedOffset();
    chain.style.transform = `translate3d(0, ${value}px, 0)`;
    renderPaginatorProgress();
  }

  function readRenderedOffset() {
    return worldOffset + carLayout[currentIndex()].stageStart;
  }

  function stopStageMotion() {
    window.cancelAnimationFrame(motionFrame);
    motionFrame = 0;
    motion = null;
    root.classList.remove("is-auto-scrolling");
    root.dataset.motion = "idle";
    stageOffset = readRenderedOffset();
  }

  // Cubic-bezier(.25, 0, .2, 1), shared with the surrounding surface motion.
  function motionEase(progress) {
    let low = 0;
    let high = 1;
    let t = progress;
    for (let i = 0; i < 16; i += 1) {
      t = (low + high) / 2;
      const x = 3 * (1 - t) ** 2 * t * 0.25 + 3 * (1 - t) * t ** 2 * 0.2 + t ** 3;
      if (x < progress) low = t;
      else high = t;
    }
    return 3 * (1 - t) * t ** 2 + t ** 3;
  }

  function moveWorld(target, duration, kind = "return", finished = null, route = null) {
    stopStageMotion();
    if (paginatorMotionPreference.matches || duration <= 0 || Math.abs(target - worldOffset) < 0.01) {
      writeWorld(target);
      if (finished) finished();
      return;
    }
    const activeMotion = { from: worldOffset, target, kind, route, finished, start: performance.now() };
    motion = activeMotion;
    root.dataset.motion = kind;
    root.classList.add("is-auto-scrolling");
    const step = (now) => {
      if (motion !== activeMotion) return;
      const progress = Math.min(1, (now - activeMotion.start) / duration);
      writeWorld(activeMotion.from + (target - activeMotion.from) * motionEase(progress));
      if (progress < 1) motionFrame = window.requestAnimationFrame(step);
      else {
        stopStageMotion();
        writeWorld(target);
        if (finished) finished();
      }
    };
    motionFrame = window.requestAnimationFrame(step);
  }

  function setStageOffset(value, duration, kind = "return", finished = null) {
    moveWorld(value - carLayout[currentIndex()].stageStart, duration, kind, finished);
  }

  function updateAddress() {
    const url = data.buildUrl("./train-seat-scheme.html", {
      variant,
      screen: "scheme",
      train,
      carId: currentCar.id,
      filter,
      adults, selection,
      entry: entryFromCard ? "card" : null,
      onboarding: onboardingVisible || (entryFromCard && onboardingRequested) ? "1" : null,
      onboarded: onboarded ? "1" : null,
      panel: panelExpanded ? "expanded" : null,
      chainGap
    });
    if (embeddedSheet) {
      window.parent.postMessage({ type: "train-seat-sheet:state", url, returnUrl: listUrl(), title: document.title }, window.location.origin);
    } else window.history.replaceState(window.history.state, "", url);
  }

  function listUrl() {
    return data.buildUrl("./train-seat-list.html", {
      variant, screen: "list", train, filter, adults,
      chainGap,
      onboarded: onboarded || onboardingVisible ? "1" : null
    });
  }

  function closeScheme() {
    if (sheetClosing) return;
    hideSelectionToast();
    if (embeddedSheet) {
      window.parent.postMessage({ type: "train-seat-sheet:close", returnUrl: listUrl() }, window.location.origin);
    } else {
      sheetClosing = true;
      // Replace the canceled standalone draft rather than leaving it in Back.
      window.location.replace(listUrl());
    }
  }

  function renderPaginator() {
    const items = Array.from(paginator.children);
    const sameCars = items.length === visibleCars.length
      && items.every((item, index) => item.dataset.carId === visibleCars[index].id);

    // Initial URLs and a changed filter get their final geometry immediately.
    if (!sameCars) {
      paginator.replaceChildren(...visibleCars.map((car) => {
        const item = document.createElement("span");
        item.className = "car-paginator-live__item";
        item.classList.toggle("car-paginator-live__item--active", car.id === currentCar.id);
        item.dataset.carId = car.id;
        return item;
      }));
    }
    Array.from(paginator.children).forEach((item) => {
      item.classList.toggle("car-paginator-live__item--active", item.dataset.carId === currentCar.id);
      item.classList.toggle("car-paginator-live__item--selected", hasSelection() && item.dataset.carId === selection.carId);
    });
    paginator.dataset.activeCarId = currentCar.id;
    renderPaginatorProgress();
  }

  function renderPaginatorProgress() {
    if (!paginator.children.length) return;
    // Each car owns its normal scroll interval. Between intervals, the marks
    // share one unit of activity according to the chain's actual position.
    // No clock or easing lives here: dragging, settling and returning all seek
    // the same visual state, including a grabbed/reversed in-flight snap.
    const ranges = visibleCars.map((_, index) => {
      const bounds = boundsFor(index, true);
      return { min: bounds.min - carLayout[index].stageStart, max: bounds.max - carLayout[index].stageStart };
    });
    const actualBounds = getBounds();
    const localOffset = readRenderedOffset();
    const internalScroll = motion?.kind !== "switch" && !drag?.interruptedRoute
      && localOffset >= actualBounds.min - 0.01 && localOffset <= actualBounds.max + 0.01;
      // A checkout resize may still be between the selected and full surface
      // heights after wheel input
    // interrupts its correction. Its current internal range still belongs to
    // this car, even though the paginator's stable destination ranges differ.
    const position = motion?.kind === "selection" || internalScroll
      ? currentIndex() : geometry.pagination(worldOffset, ranges);
    paginator.dataset.position = String(position);
    Array.from(paginator.children).forEach((item, index) => {
      const activity = Math.max(0, 1 - Math.abs(index - position));
      item.style.setProperty("--car-activity", String(activity));
    });
  }

  function updateCarPanel(numberTransition) {
    document.querySelectorAll(".car-panel > .car-panel__header .car-number__value").forEach((node) => {
      if (numberMotion && node.closest(".car-panel__header--a")) numberMotion.update(currentCar.number, numberTransition);
      else node.textContent = String(currentCar.number);
    });

    document.querySelectorAll(".car-details").forEach((details) => {
      const rows = details.querySelectorAll("span");
      if (rows[0]) rows[0].textContent = currentCar.typeLabel;
      if (rows[1]) rows[1].textContent = `Класс ${currentCar.className}`;
      if (rows[2]) rows[2].textContent = `Перевозчик ${currentCar.carrier}`;
    });

    document.querySelectorAll(".car-panel > .car-facilities > .car-facilities__items > .car-facility[data-amenity]").forEach((facility) => {
      facility.classList.toggle("is-unavailable", !currentCar.amenities.includes(facility.dataset.amenity));
    });

    const description = document.querySelector(".car-description");
    if (currentCar.schemeGeometry === "coupe") {
      description.textContent = "Купейный вагон. Кондиционер и биотуалет в вагоне. В стоимость включено постельное бельё";
    } else if (currentCar.schemeGeometry === "sapsan") {
      description.textContent = currentCar.amenities.includes("animal")
        ? "Сидячий вагон эконом-класса. Кондиционер и биотуалет в вагоне. Можно перевозить животных"
        : "Сидячий вагон эконом-класса. Кондиционер и биотуалет в вагоне";
    } else if (currentCar.schemeGeometry === "lastochka") {
      description.textContent = currentCar.amenities.includes("animal")
        ? "Сидячий вагон базового класса. Кондиционер и биотуалет в вагоне. Можно перевозить животных"
        : "Сидячий вагон базового класса. Кондиционер и биотуалет в вагоне";
    } else {
      description.textContent = `Схема вагона типа «${currentCar.typeLabel}» пока недоступна в этом прототипе`;
    }
    renderPriceLegend();
  }

  function renderPriceLegend() {
    const legend = document.querySelector(".price-legend");
    const prices = new Map();
    data.getAvailableSeats(currentCar).forEach((seat) => {
      if (!prices.has(seat.price)) prices.set(seat.price, seat.availability);
    });
    const entries = Array.from(prices).sort(([priceA], [priceB]) => priceA - priceB);
    const key = JSON.stringify(entries);
    if (legend.dataset.prices === key) return;
    legend.dataset.prices = key;
    const existing = Array.from(legend.children);
    legend.replaceChildren(...entries.map(([price, tier], index) => {
      const pill = existing[index]?.dataset.tier === tier ? existing[index] : document.createElement("span");
      pill.className = `price-legend__pill price-legend__pill--${tier}`;
      pill.dataset.tier = tier;
      pill.dataset.price = data.formatRubles(price);
      let value = pill.querySelector(":scope > .price-legend__value");
      if (!value) {
        value = document.createElement("span");
        value.className = "price-legend__value";
        pill.replaceChildren(value);
      }
      value.textContent = pill.dataset.price;
      return pill;
    }));
  }

  function updateCheckout() {
    if (!hasSelection()) return;
    const selectedCar = data.getCar(selection.carId, train);
    const count = selection.seatNumbers.length;
    const total = selection.seatNumbers.reduce((sum, number) => sum + data.getSeat(selectedCar, number).price, 0);
    const remaining = adults - count;
    document.querySelector(".checkout__price").textContent = data.formatRubles(total);
    document.querySelector(".checkout__caption").textContent = adults === 1 ? "1 место" : `${count} из ${adults} мест`;
    checkout.setAttribute("aria-label", adults === 1
      ? `Выбрано 1 место, вагон ${selectedCar.number}`
      : `Выбрано ${count} из ${adults} мест, вагон ${selectedCar.number}`);
    checkoutButton.disabled = remaining > 0;
    checkoutButton.textContent = "Дальше";
    checkout.dataset.carId = selectedCar.id;
    checkout.dataset.selectedCount = String(count);
  }

  function updateSwitcherState() {
    const currentIndex = visibleCars.findIndex((car) => car.id === currentCar.id);
    const first = currentIndex <= 0;
    const last = currentIndex >= visibleCars.length - 1;
    root.classList.toggle("is-first-car", first);
    root.classList.toggle("is-last-car", last);
    document.querySelector(".car-switcher__control--previous").disabled = panelExpanded || first;
    document.querySelector(".car-switcher__control--next").disabled = panelExpanded || last;
  }

  function updatePanelToggle() {
    const toggle = document.querySelector(".panel-toggle");
    toggle.setAttribute("aria-expanded", String(panelExpanded));
    document.querySelectorAll(".car-details").forEach((details) => {
      details.setAttribute("aria-hidden", String(!panelExpanded));
    });
    toggle.setAttribute(
      "aria-label",
      panelExpanded ? "Свернуть информацию о вагоне" : "Развернуть информацию о вагоне"
    );
  }

  function applyDeferredPanel() {
    if (deferredPanel === null || sheetClosing) return;
    const requested = deferredPanel;
    deferredPanel = null;
    setPanelExpanded(requested);
  }

  function setPanelExpanded(expanded) {
    if (motion?.kind === "switch") {
      deferredPanel = expanded;
      return;
    }
    if (amenitiesMotion.isRunning()) {
      deferredPanel = expanded;
      amenitiesMotion.whenIdle(applyDeferredPanel);
      return;
    }
    panelContentMotion.finishPresence();
    amenitiesMotion.finish();
    // Never carry a partially completed switching gesture across a panel change.
    if (expanded) cancelIntro();
    if (expanded || drag) {
      stopStageMotion();
      setStageOffset(clampToBounds(stageOffset), 0);
    }
    if (drag) {
      const pointerId = drag.pointerId;
      drag = null;
      root.classList.remove("is-dragging");
      if (schemeViewport.hasPointerCapture(pointerId)) schemeViewport.releasePointerCapture(pointerId);
      justDragged = true;
      window.setTimeout(() => { justDragged = false; }, 0);
    }
    // Opt into transitions on interaction, never on a direct URL or QA render.
    root.classList.add("has-panel-motion");
    panelExpanded = expanded;
    renderCurrentCar({ preserveOffset: true });
  }

  function renderCurrentCar(options) {
    const settings = options || {};
    const selectedSeats = selectedSeatsForCar();
    const selected = hasSelection();
    const placeholder = isPlaceholderCar(currentCar);
    activateStage();

    root.classList.toggle("is-selected", selected);
    checkout.inert = !selected;
    checkout.setAttribute("aria-hidden", String(!selected));
    root.classList.toggle("is-expanded", panelExpanded);
    root.classList.toggle("is-gender", currentCar.genderMode === "gendered");
    root.classList.toggle("is-placeholder", placeholder);
    const placeholderElement = schemeStage.querySelector(".scheme-placeholder");
    placeholderElement.setAttribute("aria-hidden", String(!placeholder));
    root.classList.remove("is-before", "is-onboarding-2");
    root.dataset.variant = variant.toUpperCase();
    root.dataset.state = selected ? "selected" : panelExpanded ? "expanded" : "default";
    root.dataset.carId = currentCar.id;
    root.dataset.adults = String(adults);

    updateCarPanel(settings.numberTransition);
    updateCheckout();
    updateSwitcherState();
    updatePanelToggle();
    renderPaginator();

    if (placeholder) seatStack.replaceChildren();
    else renderSeats(availableSeatMap(currentCar), selectedSeats, true);

    if (settings.preserveWorld) {
      // The chain remains at its exact on-screen position while chrome changes.
    } else if (!settings.preserveOffset) {
      setStageOffset(settings.stageOffset === undefined ? getBounds(true).center : settings.stageOffset, 0);
    } else if (settings.animateSelection || settings.revealSeat) {
      const currentOffset = readRenderedOffset();
      let targetOffset = clampToBounds(currentOffset, true);
      // Keep every newly selected bottom seat above the checkout, including
      // later choices made after the white surface has already shrunk. Move
      // only by the seat's overflow, never recenter the car or its coupe.
      const selectedSeat = variant === "a" && !panelExpanded && settings.revealSeat
        ? seatStack.querySelector(`[data-seat="${settings.revealSeat}"]`) : null;
      if (selectedSeat) {
        const seatBottom = selectedSeat.getBoundingClientRect().bottom - schemeViewport.getBoundingClientRect().top;
        const overflow = Math.max(0, seatBottom - (selectedSurfaceHeight() - SEAT_REVEAL_MARGIN));
        targetOffset = clampToBounds(currentOffset - overflow, true);
      }
      setStageOffset(currentOffset, 0);
      if (Math.abs(targetOffset - currentOffset) > 0.01) {
        // The first reveal follows the checkout surface. Later choices need a
        // shorter local correction because the surface is already settled.
        const duration = reducedMotion ? 0 : settings.animateSelection
          ? Number.parseFloat(getComputedStyle(root).getPropertyValue("--selection-time")) || 0
          : SEAT_REVEAL_DURATION;
        void schemeStage.offsetHeight;
        setStageOffset(targetOffset, duration, "selection");
      }
    } else if (!root.classList.contains("is-auto-scrolling")) {
      setStageOffset(clampToBounds(stageOffset), 0);
    }

    document.title = `Вагон ${currentCar.number} — версия ${variant.toUpperCase()}`;
    updateAddress();
    if (settings.announce) announcer.textContent = `Вагон ${currentCar.number}, ${currentCar.typeLabel}`;
  }

  function chooseSeat(number) {
    const seat = data.getSeat(currentCar, number);
    if (!seat || !data.isSelectableCar(currentCar) || seat.availability === "occupied" || justDragged
      || motion?.kind === "switch" || sheetClosing || !sheetOpened || onboardingVisible) return;
    const selectedSeats = selectedSeatsForCar();
    const deselecting = selectedSeats.includes(seat.number);
    // Starting in a different car always replaces the old group, even if full.
    if (!deselecting && selection.carId === currentCar.id && adults > 1 && selectedSeats.length >= adults) {
      showSelectionLimit();
      return;
    }
    hideSelectionToast();
    const nextNumbers = deselecting ? selectedSeats.filter(value => value !== seat.number)
      : adults === 1 ? [seat.number] : [...selectedSeats, seat.number];
    const animateSelection = hasSelection() !== Boolean(nextNumbers.length);
    const previousCarId = selection.carId;
    const restoreSeatFocus = seatStack.contains(document.activeElement);
    root.style.removeProperty("--selection-time");
    if (animateSelection) {
      root.classList.add("has-selection-motion");
      // Establish the current height before the class changes, also on reversal.
      void schemeSurface.offsetHeight;
    }
    selection = { carId: nextNumbers.length ? currentCar.id : null, seatNumbers: nextNumbers };
    clearPreviousCarSeats(previousCarId);
    renderCurrentCar({ preserveOffset: true, animateSelection, revealSeat: deselecting ? null : seat.number });
    if (restoreSeatFocus) seatStack.querySelector(`[data-seat="${seat.number}"]`)?.focus({ preventScroll: true });
    announcer.textContent = deselecting
      ? `Выбор места ${seat.number} снят`
      : `Выбрано место ${seat.number}, вагон ${currentCar.number}, ${data.formatRubles(seat.price)}`;
  }

  function settleOnCar(nextIndex, continuedRoute = null) {
    if (nextIndex < 0 || nextIndex >= visibleCars.length) return false;
    hideSelectionToast();
    const previousIndex = currentIndex();
    const previousPanel = nextIndex !== previousIndex ? panelContentMotion.capture() : null;
    const previousAmenities = nextIndex !== previousIndex ? amenitiesMotion.capture() : null;
    const route = continuedRoute || [previousIndex, nextIndex];
    stopStageMotion();
    root.style.setProperty("--selection-time", `${SNAP_DURATION}ms`);
    root.classList.add("has-selection-motion");
    void schemeSurface.offsetHeight;
    currentCar = visibleCars[nextIndex];
    renderCurrentCar({ preserveWorld: true, announce: true,
      numberTransition: { animate: nextIndex !== previousIndex, direction: Math.sign(nextIndex - previousIndex) }
    });
    panelContentMotion.play(previousPanel);
    amenitiesMotion.play(previousAmenities);
    moveWorld(centeredWorld(nextIndex), SNAP_DURATION, "switch", () => {
      root.style.removeProperty("--selection-time");
      applyDeferredPanel();
    }, route);
    return true;
  }

  function switchCar(direction) {
    if (panelExpanded || onboardingVisible || sheetClosing) return false;
    cancelIntro();
    return settleOnCar(currentIndex() + direction);
  }

  function showOnboarding() {
    if (!sheetOpened || sheetClosing || !onboardingRequested || onboarded || visibleCars.length < 2) return;
    onboardingVisible = true;
    root.classList.add("is-onboarding");
    updateAddress();
  }

  function dismissOnboarding() {
    if (!onboardingVisible) return;
    onboardingVisible = false;
    onboarded = true;
    root.classList.remove("is-onboarding", "is-onboarding-2");
    updateAddress();
    announcer.textContent = "Подсказка закрыта";
  }

  function finishIntro() {
    entryFromCard = false;
    root.classList.remove("is-before");
    updateAddress();
    showOnboarding();
  }

  function startIntro() {
    if (!sheetOpened || sheetClosing || !entryFromCard) return;
    if (panelExpanded || reducedMotion || !data.isSelectableCar(currentCar)) {
      setStageOffset(getBounds(true).center, 0);
      finishIntro();
      return;
    }
    root.classList.add("is-before");
    setStageOffset(getBounds(true).max, 0);
    introPauseTimer = window.setTimeout(() => {
      root.classList.remove("is-before");
      setStageOffset(getBounds(true).center, 500, "intro", finishIntro);
    }, 250);
  }

  function cancelIntro() {
    if (!entryFromCard) return;
    window.clearTimeout(introPauseTimer);
    stopStageMotion();
    entryFromCard = false;
    root.classList.remove("is-before");
    updateAddress();
    // An intentional touch takes over the current frame. Never intercept it
    // with the onboarding that was waiting for the automatic motion to finish.
  }

  function beginDrag(event) {
    if (drag) {
      if (drag.pointerId !== event.pointerId) drag.multitouch = true;
      return;
    }
    if (onboardingVisible || sheetClosing || event.button > 0 || !event.isPrimary) return;
    const interruptedRoute = motion?.kind === "switch" ? motion.route : null;
    cancelIntro();
    stopStageMotion();
    const bounds = getBounds();
    const index = currentIndex();
    let originRaw = stageOffset;
    // Invert the elastic mapping when grabbing a return midway; no first-frame jump.
    if (!interruptedRoute && (stageOffset > bounds.max || stageOffset < bounds.min)) {
      const direction = stageOffset < bounds.min ? 1 : -1;
      const edge = direction === 1 ? bounds.min : bounds.max;
      const limit = visibleCars[index + direction] ? 220 : 36;
      const stretch = Math.min(limit - 0.01, Math.abs(stageOffset - edge));
      originRaw = edge + Math.sign(stageOffset - edge) * (-limit / 0.65 * Math.log(1 - stretch / limit));
    }
    const tappedSeat = event.target.closest(".scheme-stage") === schemeStage
      ? event.target.closest(".seat--tier-1, .seat--tier-2") : null;
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWorld: worldOffset,
      originRaw,
      bounds,
      rawOffset: stageOffset,
      interruptedRoute,
      multitouch: false,
      moved: false,
      seatNumber: tappedSeat ? Number(tappedSeat.dataset.seat) : null
    };
    schemeViewport.setPointerCapture(event.pointerId);
    root.classList.toggle("is-dragging", !panelExpanded);
  }

  function moveDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = event.clientY - drag.startY;
    drag.moved = drag.moved || Math.hypot(event.clientX - drag.startX, delta) > 8;
    if (event.cancelable) event.preventDefault();
    // Track movement to distinguish a tap from a swipe, but keep the scheme still.
    if (panelExpanded) return;
    if (drag.interruptedRoute) {
      const targets = drag.interruptedRoute.map(centeredWorld);
      writeWorld(geometry.clamp(drag.startWorld + delta, Math.min(...targets) - 36, Math.max(...targets) + 36));
      return;
    }
    const bounds = drag.bounds;
    const rawOffset = drag.originRaw + delta;
    drag.rawOffset = rawOffset;
    let renderedOffset = rawOffset;
    if (rawOffset > bounds.max) renderedOffset = bounds.max + geometry.resistance(rawOffset - bounds.max, currentIndex() > 0 ? 220 : 36);
    if (rawOffset < bounds.min) renderedOffset = bounds.min + geometry.resistance(rawOffset - bounds.min, currentIndex() < visibleCars.length - 1 ? 220 : 36);
    writeWorld(renderedOffset - carLayout[currentIndex()].stageStart);
  }

  function endDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.type !== "pointercancel") moveDrag(event);
    const released = drag;
    const canceled = event.type === "pointercancel" || drag.multitouch;
    const moved = drag.moved || canceled;
    const tappedSeatNumber = canceled ? null : drag.seatNumber;
    drag = null;
    root.classList.remove("is-dragging");
    if (schemeViewport.hasPointerCapture(event.pointerId)) schemeViewport.releasePointerCapture(event.pointerId);
    justDragged = moved;
    window.setTimeout(() => { justDragged = false; }, 0);
    if (released.interruptedRoute) {
      // A grabbing tap belongs to navigation, never to the passing seat beneath it.
      const candidates = released.interruptedRoute;
      const nearest = candidates.reduce((best, index) => Math.abs(worldOffset - centeredWorld(index)) < Math.abs(worldOffset - centeredWorld(best)) ? index : best);
      settleOnCar(canceled ? currentIndex() : nearest, candidates);
      return;
    }
    if (!moved && tappedSeatNumber) {
      setStageOffset(clampToBounds(readRenderedOffset()), 0);
      chooseSeat(tappedSeatNumber);
      return;
    }
    if (panelExpanded) return;
    const index = currentIndex();
    const direction = released.rawOffset < released.bounds.min ? 1 : released.rawOffset > released.bounds.max ? -1 : 0;
    const next = index + direction;
    if (!canceled && variant === "a" && direction && visibleCars[next]) {
      const height = schemeViewport.clientHeight;
      const revealed = direction === 1
        ? height - CHAIN_EDGE_INSET - (worldOffset + carLayout[next].bodyStart)
        : worldOffset + carLayout[next].bodyStart + carGeometry[next].bodyHeight - CHAIN_EDGE_INSET;
      if (revealed >= NEIGHBOR_REVEAL && switchCar(direction)) return;
    }
    setStageOffset(clampToBounds(readRenderedOffset()), 280);
  }

  function handleWheel(event) {
    if (event.cancelable) event.preventDefault();
    if (panelExpanded || onboardingVisible || sheetClosing || drag || motion?.kind === "switch") return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    cancelIntro();
    stopStageMotion();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? schemeViewport.clientHeight : 1;
    setStageOffset(clampToBounds(readRenderedOffset() - event.deltaY * unit), 0);
  }

  schemeViewport.addEventListener("pointerdown", beginDrag);
  schemeViewport.addEventListener("pointermove", moveDrag);
  schemeViewport.addEventListener("pointerup", endDrag);
  schemeViewport.addEventListener("pointercancel", endDrag);
  schemeViewport.addEventListener("wheel", handleWheel, { passive: false });
  schemeViewport.addEventListener("dragstart", (event) => event.preventDefault());
  schemeSurface.addEventListener("transitionend", (event) => {
    if (event.target !== schemeSurface || event.propertyName !== "height" || drag || motion?.kind === "switch" || panelExpanded) return;
    // A gesture may interrupt the synchronized bottom correction while the
    // surface keeps growing. Reconcile only after the visible height settles.
    const renderedOffset = readRenderedOffset();
    const targetOffset = clampToBounds(renderedOffset);
    if (Math.abs(targetOffset - renderedOffset) > 0.5) {
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160;
      setStageOffset(targetOffset, duration, "selection");
    }
  });
  schemeViewport.addEventListener("click", (event) => {
    if (justDragged) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    // Pointer taps are handled on pointerup; a following click must not toggle again.
    // Zero-detail clicks keep assistive/programmatic activation available.
    if (event.detail > 0) return;
    const seat = event.target.closest(".seat--tier-1, .seat--tier-2");
    if (seat) chooseSeat(Number(seat.dataset.seat));
  });
  schemeViewport.addEventListener("keydown", (event) => {
    const seat = event.target.closest(".seat--tier-1, .seat--tier-2");
    if (seat && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      if (!event.repeat) chooseSeat(Number(seat.dataset.seat));
    }
  });

  document.querySelector(".car-switcher__control--previous").addEventListener("click", () => switchCar(-1));
  document.querySelector(".car-switcher__control--next").addEventListener("click", () => switchCar(1));
  const carPanel = document.querySelector(".car-panel");
  const panelToggle = document.querySelector(".panel-toggle");
  let panelPointer = null;

  carPanel.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button > 0) {
      if (panelPointer) panelPointer.moved = true;
      return;
    }
    panelPointer = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      moved: false, finished: false, expanded: panelExpanded
    };
  });
  const trackPanelPointer = (event) => {
    if (!panelPointer || panelPointer.finished || panelPointer.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - panelPointer.x, event.clientY - panelPointer.y) > 8) panelPointer.moved = true;
    if (event.type === "pointercancel") panelPointer.moved = true;
    if (event.type !== "pointermove") panelPointer.finished = true;
  };
  // Track excursions outside the panel too; a drag returning to its start is not a tap.
  window.addEventListener("pointermove", trackPanelPointer, { passive: true, capture: true });
  window.addEventListener("pointerup", trackPanelPointer, { passive: true, capture: true });
  window.addEventListener("pointercancel", trackPanelPointer, { passive: true, capture: true });
  carPanel.addEventListener("dragstart", (event) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });
  carPanel.addEventListener("click", (event) => {
    if (onboardingVisible || sheetClosing || event.target.closest(".car-switcher__control")) return;
    if (event.detail > 0 && (!panelPointer || !panelPointer.finished || panelPointer.moved || panelPointer.expanded !== panelExpanded)) {
      event.preventDefault();
      return;
    }
    panelPointer = null;
    // One action for the native arrow+label button; elsewhere the panel only opens.
    if (panelToggle.contains(event.target)) setPanelExpanded(!panelExpanded);
    else if (!panelExpanded) setPanelExpanded(true);
  });
  panelToggle.addEventListener("keydown", (event) => {
    if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
  });
  document.querySelector(".close-button").addEventListener("click", closeScheme);
  onboarding.addEventListener("click", dismissOnboarding);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    if (onboardingVisible) dismissOnboarding();
    else if (panelExpanded) {
      setPanelExpanded(false);
    } else closeScheme();
  });

  renderCurrentCar({ stageOffset: entryFromCard && !reducedMotion ? getBounds(true).max : getBounds(true).center });
  if (embeddedSheet) {
    window.addEventListener("train-seat-sheet:prepare", () => numberMotion?.refresh());
    window.addEventListener("message", (event) => {
      if (event.source !== window.parent || event.origin !== window.location.origin) return;
      if (event.data?.type === "train-seat-sheet:opened" && !sheetOpened && !sheetClosing) {
        sheetOpened = true;
        if (entryFromCard) startIntro();
        else showOnboarding();
      } else if (event.data?.type === "train-seat-sheet:closing") {
        sheetClosing = true;
        hideSelectionToast();
        panelContentMotion.finish();
        amenitiesMotion.finish();
        numberMotion?.finish();
        window.clearTimeout(introPauseTimer);
        stopStageMotion();
      }
    });
    window.parent.postMessage({ type: "train-seat-sheet:ready", url: data.buildUrl("./train-seat-scheme.html", {
      variant, screen: "scheme", train, carId: currentCar.id, filter, adults, selection,
      entry: entryFromCard ? "card" : null, onboarding: onboardingRequested ? "1" : null,
      onboarded: onboarded ? "1" : null, panel: panelExpanded ? "expanded" : null, chainGap
    }), returnUrl: listUrl(), title: document.title }, window.location.origin);
  } else if (entryFromCard) startIntro();
  else showOnboarding();

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted || embeddedSheet) return;
    const previousCarId = selection.carId;
    selection = { carId: null, seatNumbers: [] };
    sheetClosing = false;
    hideSelectionToast();
    clearPreviousCarSeats(previousCarId);
    root.classList.remove("has-selection-motion");
    renderCurrentCar({ preserveOffset: true });
  });
})();
