(function (scope) {
  "use strict";

  // Exact seat grid from Figma 16126:538978 (Car type=Sapsan).
  // The source layer 16158:579037 contains a duplicate visible “50”; the
  // sequential seat model confirms that position is seat 15.
  const rows = Object.freeze([
    { y: 88,  position: "bottom", left: [3, 4],   right: [2, 1] },
    { y: 122, position: "bottom", left: [7, 8],   right: [6, 5] },
    { y: 156, position: "bottom", left: [11, 12], right: [10, 9] },
    { y: 190, position: "bottom", left: [15, 16], right: [14, 13] },
    { y: 224, position: "bottom", left: [19, 20], right: [18, 17] },
    { y: 292, position: "top",    left: [23, 24], right: [22, 21] },
    { y: 326, position: "top",    left: [27, 28], right: [26, 25] },
    { y: 360, position: "top",    left: [31, 32], right: [30, 29] },
    { y: 394, position: "top",    left: [35, 36], right: [34, 33] },
    { y: 428, position: "top",    left: [39, 40], right: [38, 37] },
    { y: 462, position: "top",    left: [43, 44], right: [42, 41] },
    { y: 496, position: "top",    left: [45, 46] },
    { y: 530, position: "top",    left: [47, 48] },
    { y: 564, rightY: 563, position: "bottom", left: [51, 52], right: [50, 49] },
    { y: 598, rightY: 597, position: "bottom", left: [55, 56], right: [54, 53] },
    { y: 632, rightY: 631, position: "bottom", left: [61, 62], right: [58, 57] },
    { y: 700, rightY: 699, position: "top",    left: [63, 64], right: [60, 59] },
    { y: 733, position: "top",                    right: [66, 65] }
  ].map(Object.freeze));

  const seats = [];
  rows.forEach((row) => {
    [["left", 10], ["right", 107]].forEach(([side, x]) => {
      (row[side] || []).forEach((number, index) => {
        seats.push(Object.freeze({
          number,
          x: x + index * 31,
          y: side === "right" && row.rightY !== undefined ? row.rightY : row.y,
          position: row.position
        }));
      });
    });
  });
  seats.sort((a, b) => a.number - b.number);

  const layout = Object.freeze({
    figmaNode: "16126:538978",
    width: 176,
    height: 845,
    geometry: Object.freeze({ bodyTop: 0, bodyHeight: 845, zoneTop: 88, zoneHeight: 673 }),
    seats: Object.freeze(seats),
    tables: Object.freeze([
      Object.freeze({ x: 10, y: 258, width: 59, height: 28 }),
      Object.freeze({ x: 107, y: 258, width: 59, height: 28 }),
      Object.freeze({ x: 10, y: 666, width: 59, height: 28 }),
      Object.freeze({ x: 107, y: 665, width: 59, height: 28 })
    ]),
    wardrobe: Object.freeze({ x: 107, y: 496, width: 59, height: 61 }),
    greenZones: Object.freeze([
      Object.freeze({ x: 3, y: 85, width: 170, height: 68, radius: 0 }),
      Object.freeze({ x: 73, y: 730, width: 100, height: 34, radius: 8 })
    ]),
    windowStrips: Object.freeze({
      left: Object.freeze([[82, 40], [140, 44], [205, 60], [287, 43], [352, 43], [417, 46], [484, 46], [552, 59], [632, 97]]),
      right: Object.freeze([[82, 40], [140, 44], [205, 60], [287, 43], [352, 43], [417, 46], [484, 46], [552, 59], [632, 97]])
    }),
    features: Object.freeze([
      Object.freeze({ kind: "socket", x: 43, y: 52 }),
      Object.freeze({ kind: "luggage", x: 142, y: 52 }),
      Object.freeze({ kind: "animal", x: 76, y: 107 }),
      Object.freeze({ kind: "luggage", x: 10, y: 735 }),
      Object.freeze({ kind: "animal", x: 78, y: 735 }),
      Object.freeze({ kind: "socket", x: 109, y: 769 }),
      Object.freeze({ kind: "toilet", x: 142, y: 769 })
    ]),
    doors: Object.freeze([
      Object.freeze({ kind: "side-left", x: 0, y: 20 }),
      Object.freeze({ kind: "side-left", x: 0, y: 801 }),
      Object.freeze({ kind: "top", x: 76, y: 0 }),
      Object.freeze({ kind: "bottom", x: 78, y: 831 }),
      Object.freeze({ kind: "side-right", x: 162, y: 20 }),
      Object.freeze({ kind: "side-right", x: 162, y: 801 })
    ])
  });

  if (typeof module !== "undefined" && module.exports) module.exports = layout;
  if (scope) scope.TrainSeatSapsanLayout = layout;
})(typeof window !== "undefined" ? window : null);
