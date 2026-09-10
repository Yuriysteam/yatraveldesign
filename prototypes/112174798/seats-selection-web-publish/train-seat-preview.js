(function () {
  "use strict";

  const PREVIEW_TYPES = new Set(["coupe", "platskart", "sv", "sapsan", "lastochka"]);

  function normalizeType(value) {
    const type = String(value || "coupe").toLowerCase();
    return PREVIEW_TYPES.has(type) ? type : "coupe";
  }

  function normalizeSize(value) {
    return String(value || "big").toLowerCase() === "small" ? "small" : "big";
  }

  function createPreviewSeat({ availability = "occupied", size = "big" } = {}) {
    const seat = document.createElement("i");
    seat.className = "mini-seat";
    seat.dataset.previewSeat = "";
    setPreviewSeatState(seat, { availability, size });
    return seat;
  }

  function setPreviewSeatState(seat, { availability = "occupied", size = "big" } = {}) {
    if (!seat) return seat;
    const isAvailable = availability !== "occupied";
    const normalizedSize = normalizeSize(size);
    seat.classList.toggle("mini-seat--available", isAvailable);
    seat.classList.toggle("mini-seat--small", normalizedSize === "small");
    seat.dataset.previewSeat = "";
    seat.dataset.state = isAvailable ? "available" : "occupied";
    seat.dataset.size = normalizedSize;
    return seat;
  }

  function indexSeatsByNumber(seats) {
    return new Map(Array.from(seats || [], (seat) => [Number(seat.number), seat]));
  }

  function createCoupePreview(seats) {
    const root = document.createElement("div");
    root.className = "mini-scheme mini-scheme--coupe";
    root.setAttribute("aria-hidden", "true");

    for (let cabinIndex = 0; cabinIndex < 9; cabinIndex += 1) {
      const cabin = document.createElement("div");
      cabin.className = "mini-cabin";

      for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
        const side = document.createElement("div");
        side.className = "mini-cabin__side";

        for (let seatIndex = 0; seatIndex < 2; seatIndex += 1) {
          const index = cabinIndex * 4 + sideIndex * 2 + seatIndex;
          side.appendChild(createPreviewSeat({ availability: seats[index]?.availability }));
        }

        cabin.appendChild(side);
      }

      root.appendChild(cabin);
    }

    return root;
  }

  const SAPSAN_COLUMNS = Object.freeze([
    Object.freeze([
      [3, 4], [7, 8], [11, 12], [15, 16], [19, 20], "table",
      [23, 24], [27, 28], [31, 32], [35, 36], [39, 40], [43, 44], [45, 46], [47, 48],
      [51, 52], [55, 56], [61, 62], "table", [63, 64]
    ]),
    Object.freeze([
      [2, 1], [6, 5], [10, 9], [14, 13], [18, 17], "table",
      [22, 21], [26, 25], [30, 29], [34, 33], [38, 37], [42, 41], "wardrobe",
      [50, 49], [54, 53], [58, 57], "table", [60, 59], [66, 65]
    ])
  ]);

  // Exact physical numbering from Figma 16126:538979. The compact preview is
  // mirrored horizontally relative to the full scheme, hence right/left pairs
  // below. The train has 86 places numbered across 1…100 with intentional gaps.
  const LASTOCHKA_ROWS = Object.freeze([
    Object.freeze([Object.freeze([1, 2]), Object.freeze([4, 3])]),
    Object.freeze([Object.freeze([5, 6, 8]), Object.freeze([10, 9])]),
    Object.freeze([Object.freeze([11, 12, 14]), Object.freeze([16, 15])]),
    Object.freeze([Object.freeze([17, 18, 20]), Object.freeze([22, 21])]),
    Object.freeze([Object.freeze([23, 24]), Object.freeze([26, 25])]),
    "exit",
    Object.freeze([Object.freeze([27, 28]), Object.freeze([32, 30, 29])]),
    Object.freeze([Object.freeze([33, 34]), Object.freeze([38, 36, 35])]),
    Object.freeze([Object.freeze([39, 40]), Object.freeze([44, 42, 41])]),
    Object.freeze([Object.freeze([45, 46]), Object.freeze([50, 48, 47])]),
    Object.freeze([Object.freeze([51, 52]), Object.freeze([56, 54, 53])]),
    Object.freeze([Object.freeze([57, 58]), Object.freeze([62, 60, 59])]),
    Object.freeze([Object.freeze([63, 64]), Object.freeze([68, 66, 65])]),
    Object.freeze([Object.freeze([69, 70]), Object.freeze([74, 72, 71])]),
    "exit",
    Object.freeze([Object.freeze([75, 76]), Object.freeze([78, 77])]),
    Object.freeze([Object.freeze([79, 80, 82]), Object.freeze([84, 83])]),
    Object.freeze([Object.freeze([85, 86, 88]), Object.freeze([90, 89])]),
    Object.freeze([Object.freeze([91, 92, 94]), Object.freeze([96, 95])]),
    Object.freeze([Object.freeze([97, 98]), Object.freeze([100, 99])])
  ]);

  function getLastochkaColumns() {
    const columns = [[], []];

    LASTOCHKA_ROWS.forEach((row) => {
      if (row === "exit") {
        columns[0].push("exit");
        columns[1].push("exit");
        return;
      }

      row.forEach((numbers, columnIndex) => {
        columns[columnIndex].push(numbers);
      });
    });

    return Object.freeze(columns.map((column) => Object.freeze(column)));
  }

  const LASTOCHKA_COLUMNS = getLastochkaColumns();

  function createSapsanPreview(seats) {
    const root = document.createElement("div");
    root.className = "mini-scheme mini-scheme--sapsan";
    root.dataset.previewType = "sapsan";
    root.setAttribute("aria-hidden", "true");
    const seatsByNumber = indexSeatsByNumber(seats);

    SAPSAN_COLUMNS.forEach((tokens) => {
      const column = document.createElement("div");
      column.className = "sapsan-preview__column";

      tokens.forEach((token) => {
        if (Array.isArray(token)) {
          const line = document.createElement("div");
          line.className = "sapsan-preview__line";
          token.forEach((number) => {
            const seat = createPreviewSeat({ availability: seatsByNumber.get(number)?.availability, size: "small" });
            seat.dataset.seatNumber = String(number);
            line.appendChild(seat);
          });
          column.appendChild(line);
          return;
        }

        const spacer = document.createElement("i");
        spacer.className = token === "table" ? "sapsan-preview__table" : "sapsan-preview__wardrobe";
        column.appendChild(spacer);
      });

      root.appendChild(column);
    });

    return root;
  }

  function createLastochkaPreview(seats) {
    const root = document.createElement("div");
    root.className = "mini-scheme mini-scheme--lastochka";
    root.dataset.previewType = "lastochka";
    root.setAttribute("aria-hidden", "true");
    const seatsByNumber = indexSeatsByNumber(seats);

    LASTOCHKA_COLUMNS.forEach((tokens, columnIndex) => {
      const column = document.createElement("div");
      column.className = `lastochka-preview__column lastochka-preview__column--${columnIndex === 0 ? "left" : "right"}`;

      tokens.forEach((token) => {
        if (Array.isArray(token)) {
          const line = document.createElement("div");
          line.className = "lastochka-preview__line";
          token.forEach((number) => {
            const seat = createPreviewSeat({ availability: seatsByNumber.get(number)?.availability, size: "small" });
            seat.dataset.seatNumber = String(number);
            line.appendChild(seat);
          });
          column.appendChild(line);
          return;
        }

        const spacer = document.createElement("i");
        spacer.className = "lastochka-preview__exit";
        column.appendChild(spacer);
      });

      root.appendChild(column);
    });

    return root;
  }

  function createPreview({ type = "coupe", seats = [] } = {}) {
    const normalizedType = normalizeType(type);
    if (normalizedType === "coupe") return createCoupePreview(seats);
    if (normalizedType === "sapsan") return createSapsanPreview(seats);
    if (normalizedType === "lastochka") return createLastochkaPreview(seats);

    const root = document.createElement("div");
    root.className = `mini-scheme mini-scheme--${normalizedType}`;
    root.dataset.previewType = normalizedType;
    root.setAttribute("aria-hidden", "true");
    return root;
  }

  function updatePreview(root, { type = "coupe", seats = [] } = {}) {
    if (!root) return root;
    const normalizedType = normalizeType(type);
    root.dataset.previewType = normalizedType;
    root.classList.add(`mini-scheme--${normalizedType}`);

    const previewSeats = Array.from(root.querySelectorAll(".mini-seat"));
    const seatsByNumber = indexSeatsByNumber(seats);
    previewSeats.forEach((seat, index) => {
      const explicitSeatNumber = Number(seat.dataset.seatNumber);
      const seatNumber = Number.isInteger(explicitSeatNumber) && explicitSeatNumber > 0
        ? explicitSeatNumber
        : index + 1;
      const sourceSeat = Number.isInteger(explicitSeatNumber) && explicitSeatNumber > 0
        ? seatsByNumber.get(seatNumber)
        : seats[index];
      setPreviewSeatState(seat, {
        availability: sourceSeat?.availability,
        size: seat.dataset.size || (normalizedType === "sapsan" || normalizedType === "lastochka" ? "small" : "big")
      });
    });
    return root;
  }

  window.TrainSeatPreview = Object.freeze({
    createPreview,
    createPreviewSeat,
    setPreviewSeatState,
    updatePreview
  });
})();
