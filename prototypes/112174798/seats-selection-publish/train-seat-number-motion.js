(function () {
  "use strict";

  function create(valueNode, { numbers = [], duration = 400 } = {}) {
    const parent = valueNode.parentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const windowNode = document.createElement("span");
    windowNode.className = "car-number__drum";
    windowNode.setAttribute("aria-hidden", "true");
    parent.appendChild(windowNode);
    const columns = new Map();
    let widths = [];
    let height = 42;
    let value = null;
    let animations = [];
    let generation = 0;
    let calibrationPending = false;

    function measure() {
      // A closed sheet has no layout. Keep the ordinary number until a real
      // measurement is possible; never cache zero-width digit columns.
      if (parent.clientWidth <= 0) return false;
      const style = getComputedStyle(valueNode);
      const nextHeight = parseFloat(style.lineHeight);
      if (!Number.isFinite(nextHeight) || nextHeight <= 0) return false;
      for (const property of ["font-family", "font-size", "font-weight", "line-height", "letter-spacing"]) {
        windowNode.style.setProperty(property, style.getPropertyValue(property));
      }
      height = nextHeight;
      windowNode.style.height = `${height}px`;
      const probe = document.createElement("span");
      Object.assign(probe.style, { position: "absolute", visibility: "hidden", whiteSpace: "pre" });
      valueNode.appendChild(probe);
      const measureDigit = digit => { probe.textContent = digit; return probe.getBoundingClientRect().width; };
      // Stable widths per decimal place keep the tens of 10→11 stationary.
      // Do not enable tabular-nums: this font has proportional digit glyphs.
      const measuredWidths = [];
      [...numbers, value || valueNode.textContent.trim()].forEach(number => {
        Array.from(String(number)).reverse().forEach((digit, place) => {
          measuredWidths[place] = Math.max(measuredWidths[place] || 0, measureDigit(digit));
        });
      });
      probe.remove();
      if (!measuredWidths.length || measuredWidths.some(width => !Number.isFinite(width) || width <= 0)) return false;
      widths = measuredWidths;
      return true;
    }

    function positions(next) {
      const digits = Array.from(next).reverse();
      const total = digits.reduce((sum, digit, place) => sum + widths[place], 0);
      let right = (parent.clientWidth + total) / 2;
      return digits.map((digit, place) => {
        right -= widths[place];
        return { digit, place, x: right, width: widths[place] };
      });
    }

    function glyph(target, y) {
      const node = document.createElement("span");
      node.className = "car-number__digit";
      node.dataset.place = String(target.place);
      node.textContent = target.digit;
      Object.assign(node.style, { left: `${target.x}px`, width: `${target.width}px`, transform: `translateY(${y}px)` });
      windowNode.appendChild(node);
      return { ...target, node, y };
    }

    function cancelAnimations() {
      generation += 1;
      animations.forEach(animation => animation.cancel());
      animations = [];
    }

    function finish() {
      cancelAnimations();
      columns.forEach((column, place) => {
        column.glyphs.forEach(entry => { if (entry !== column.target) entry.node.remove(); });
        if (!column.target) { columns.delete(place); return; }
        column.target.y = 0;
        column.target.node.style.transform = "translateY(0px)";
        column.glyphs = [column.target];
      });
      windowNode.dataset.motion = "idle";
      if (calibrationPending) recalibrate();
    }

    function update(nextValue, { animate = false, direction = 1 } = {}) {
      const next = String(nextValue);
      // A selection/panel rerender must not restart a committed number roll.
      if (next === value) return;
      const previous = value;
      value = next;
      valueNode.textContent = next;
      windowNode.dataset.value = next;
      if (parent.clientWidth <= 0 || ((!widths.length || next.length > widths.length) && !measure())) {
        calibrationPending = true;
        return;
      }
      const targets = positions(next);
      parent.classList.add("has-number-drum");

      if (!animate || previous === null || reduced.matches) {
        cancelAnimations();
        windowNode.replaceChildren();
        columns.clear();
        targets.forEach(target => {
          const entry = glyph(target, 0);
          columns.set(target.place, { target: entry, glyphs: [entry] });
        });
        windowNode.dataset.motion = "idle";
        return;
      }

      // Sample the actual current positions before cancelling a previous roll.
      // A rapid reversal reuses its visible digits instead of flashing a target.
      columns.forEach(column => column.glyphs.forEach(entry => {
        entry.y = new DOMMatrixReadOnly(getComputedStyle(entry.node).transform).m42;
        entry.node.style.transform = `translateY(${entry.y}px)`;
      }));
      cancelAnimations();
      const token = generation;
      const sign = direction < 0 ? -1 : 1;
      const startTime = document.timeline.currentTime;
      windowNode.dataset.motion = "running";
      windowNode.dataset.direction = sign > 0 ? "up" : "down";
      const move = (entry, end) => {
        if (Math.abs(entry.y - end) < 0.01) return;
        const animation = entry.node.animate([
          { transform: `translateY(${entry.y}px)` }, { transform: `translateY(${end}px)` }
        ], { duration, easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", fill: "both" });
        animation.startTime = startTime;
        animations.push(animation);
      };

      const desired = new Map(targets.map(target => [target.place, target]));
      new Set([...columns.keys(), ...desired.keys()]).forEach(place => {
        const column = columns.get(place) || { glyphs: [], target: null };
        column.glyphs = column.glyphs.filter(entry => {
          if (Math.abs(entry.y) <= height + 0.01) return true;
          entry.node.remove();
          return false;
        });
        const target = desired.get(place);
        if (target) {
          // Unchanged digits at the same place retain their node and position.
          let incoming = column.glyphs.find(entry => entry.digit === target.digit && Math.abs(entry.x - target.x) < 0.01);
          if (!incoming) {
            const edge = sign > 0
              ? Math.max(0, ...column.glyphs.map(entry => entry.y)) + height
              : Math.min(0, ...column.glyphs.map(entry => entry.y)) - height;
            incoming = glyph(target, edge);
            column.glyphs.push(incoming);
          }
          const shift = -incoming.y;
          column.target = incoming;
          column.glyphs.forEach(entry => move(entry, entry.y + shift));
        } else {
          column.target = null;
          const shift = sign > 0
            ? -(Math.max(0, ...column.glyphs.map(entry => entry.y)) + height)
            : height - Math.min(0, ...column.glyphs.map(entry => entry.y));
          column.glyphs.forEach(entry => move(entry, entry.y + shift));
        }
        columns.set(place, column);
      });
      if (!animations.length) { finish(); return; }
      Promise.all(animations.map(animation => animation.finished.catch(() => {}))).then(() => {
        if (token === generation) finish();
      });
    }

    function recalibrate() {
      calibrationPending = false;
      // Recalibrate after the real font arrives, never keep fallback metrics.
      if (!measure()) { calibrationPending = true; return; }
      const current = value;
      value = null;
      if (current !== null) update(current);
    }

    function refresh() {
      // Font arrival must not abruptly finish a roll already under way.
      if (animations.length) calibrationPending = true;
      else recalibrate();
    }

    measure();
    document.fonts.ready.then(refresh);
    document.fonts.addEventListener("loadingdone", refresh);
    reduced.addEventListener("change", () => { if (reduced.matches) finish(); });
    return Object.freeze({ update, finish, refresh });
  }

  window.TrainSeatNumberMotion = Object.freeze({ create });
})();
