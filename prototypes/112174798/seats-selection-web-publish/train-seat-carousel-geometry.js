(function (scope) {
  "use strict";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // Coordinates describe the visible bodies, not their differently inset stages.
  function layout(geometries, gap) {
    let bodyStart = 0;
    return geometries.map((geometry) => {
      const position = {
        bodyStart,
        stageStart: bodyStart - geometry.bodyTop
      };
      bodyStart += geometry.bodyHeight + gap;
      return position;
    });
  }

  function bounds(geometry, viewportHeight, safeTop = 44, safeBottom = 21) {
    const availableHeight = viewportHeight - safeTop - safeBottom;
    const zoneCenter = geometry.zoneTop + geometry.zoneHeight / 2;
    const centeredOffset = (safeTop + viewportHeight - safeBottom) / 2 - zoneCenter;

    if (geometry.bodyHeight <= availableHeight) {
      return { min: centeredOffset, max: centeredOffset, center: centeredOffset };
    }

    const min = viewportHeight - safeBottom - (geometry.bodyTop + geometry.bodyHeight);
    const max = safeTop - geometry.bodyTop;
    return { min, max, center: clamp(centeredOffset, min, max) };
  }

  function resistance(distance, limit = 220) {
    if (distance === 0) return 0;
    return Math.sign(distance) * limit * (1 - Math.exp(-Math.abs(distance) * 0.65 / limit));
  }

  // Ranges are world-offset intervals, ordered from the first car downwards.
  // Scrolling inside a car keeps its index; crossing the physical space between
  // cars continuously shares activity between their two neighboring marks.
  function pagination(offset, ranges) {
    for (let index = 0; index < ranges.length; index += 1) {
      const current = ranges[index];
      if (offset >= current.min) return index;
      const next = ranges[index + 1];
      if (next && offset > next.max) {
        return index + clamp((current.min - offset) / (current.min - next.max), 0, 1);
      }
    }
    return Math.max(0, ranges.length - 1);
  }

  const api = Object.freeze({ clamp, layout, bounds, resistance, pagination });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (scope) scope.TrainSeatCarouselGeometry = api;
})(typeof window !== "undefined" ? window : null);
