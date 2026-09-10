(function (scope) {
  "use strict";

  // Exact physical grid from Figma 16126:538979 (Car type=Lastochka).
  // The Figma source labels x=132,y=328 as another “34”; the regular
  // six-number row pattern confirms that this physical place is seat 40.
  const rows = Object.freeze([
    { y: 24,  position: "bottom", left: [3, 4],       right: [2, 1] },
    { y: 58,  position: "bottom", left: [9, 10],      right: [8, 6, 5] },
    { y: 92,  position: "bottom", left: [15, 16],     right: [14, 12, 11] },
    { y: 126, position: "bottom", left: [21, 22],     right: [20, 18, 17] },
    { y: 160, position: "bottom", left: [25, 26],     right: [24, 23] },

    { y: 260, position: "top",    left: [29, 30, 32], right: [28, 27] },
    { y: 294, position: "top",    left: [35, 36, 38], right: [34, 33] },
    { y: 328, position: "top",    left: [41, 42, 44], right: [40, 39] },
    { y: 362, position: "top",    left: [47, 48, 50], right: [46, 45] },
    { y: 396, position: "bottom", left: [53, 54, 56], right: [52, 51] },
    { y: 430, position: "bottom", left: [59, 60, 62], right: [58, 57] },
    { y: 464, position: "bottom", left: [65, 66, 68], right: [64, 63] },
    { y: 498, position: "bottom", left: [71, 72, 74], right: [70, 69] },

    { y: 598, position: "top",    left: [77, 78],     right: [76, 75] },
    { y: 631, position: "top",    left: [83, 84],     right: [82, 80, 79] },
    { y: 664, position: "top",    left: [89, 90],     right: [88, 86, 85] },
    { y: 697, position: "top",    left: [95, 96],     right: [94, 92, 91] },
    { y: 730, position: "top",    left: [99, 100],    right: [98, 97] }
  ].map(Object.freeze));

  const seats = [];
  rows.forEach((row) => {
    const placements = [
      [row.left, 10],
      [row.right, row.right.length === 3 ? 101 : 132]
    ];

    placements.forEach(([numbers, startX]) => {
      numbers.forEach((number, index) => {
        seats.push(Object.freeze({
          number,
          x: startX + index * 31,
          y: row.y,
          position: row.position
        }));
      });
    });
  });
  seats.sort((a, b) => a.number - b.number);

  const windows = Object.freeze([
    Object.freeze([24, 68]),
    Object.freeze([120, 70]),
    Object.freeze([229, 65]),
    Object.freeze([315, 75]),
    Object.freeze([396, 68]),
    Object.freeze([598, 66]),
    Object.freeze([683, 75])
  ]);

  const layout = Object.freeze({
    figmaNode: "16126:538979",
    width: 201,
    height: 782,
    seatSize: 28,
    seatGap: 3,
    geometry: Object.freeze({
      bodyTop: 0,
      bodyHeight: 782,
      zoneTop: 24,
      zoneHeight: 734
    }),
    seats: Object.freeze(seats),
    seatBlocks: Object.freeze([
      Object.freeze({ y: 24, height: 164, rows: 5, rowGap: 6 }),
      Object.freeze({ y: 260, height: 266, rows: 8, rowGap: 6 }),
      Object.freeze({ y: 598, height: 160, rows: 5, rowGap: 5 })
    ]),
    serviceBands: Object.freeze([
      Object.freeze({ y: 188, height: 72 }),
      Object.freeze({ y: 526, height: 72 })
    ]),
    tables: Object.freeze([]),
    greenZones: Object.freeze([]),
    windowStrips: Object.freeze({
      left: windows,
      right: windows
    }),
    features: Object.freeze([
      Object.freeze({ kind: "luggage", x: 10, y: 228 }),
      Object.freeze({ kind: "luggage", x: 167, y: 228 }),
      Object.freeze({ kind: "luggage", x: 10, y: 534 }),
      Object.freeze({ kind: "mug", x: 167, y: 534 })
    ]),
    doors: Object.freeze([
      Object.freeze({ kind: "side-left", x: 0, y: 196 }),
      Object.freeze({ kind: "side-left", x: 0, y: 566 }),
      Object.freeze({ kind: "top", x: 88, y: 0 }),
      Object.freeze({ kind: "bottom", x: 88, y: 768 }),
      Object.freeze({ kind: "side-right", x: 187, y: 196 }),
      Object.freeze({ kind: "side-right", x: 187, y: 566 })
    ]),
    assets: Object.freeze({
      body: "./assets/scheme/lastochka/body.svg",
      doorSide: "./assets/scheme/lastochka/door-side.svg",
      doorEnd: "./assets/scheme/lastochka/door-end.svg",
      luggage: "./assets/scheme/lastochka/luggage.svg",
      mug: "./assets/scheme/lastochka/mug.svg",
      occupiedCross: "./assets/scheme/lastochka/seat-occupied-cross.svg"
    })
  });

  if (typeof module !== "undefined" && module.exports) module.exports = layout;
  if (scope) scope.TrainSeatLastochkaLayout = layout;
})(typeof window !== "undefined" ? window : null);
