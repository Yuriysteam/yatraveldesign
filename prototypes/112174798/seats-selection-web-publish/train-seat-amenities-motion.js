(function () {
  "use strict";

  function create(panel) {
    const container = panel.querySelector(":scope > .car-facilities");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const EXIT = 90;
    const MOVE = 290;
    const ENTER = 260;
    const OVERLAP = 110;
    const MOVE_EASING = "cubic-bezier(0.25, 0.1, 0.25, 1)";
    const ENTER_EASING = "ease-in-out";
    let session = null;
    const idleCallbacks = new Set();

    function notifyIdle() {
      queueMicrotask(() => {
        // capture() may finish one session and replace it within the same
        // frame. A panel-open request must wait for the replacement as well.
        if (session) return;
        const callbacks = Array.from(idleCallbacks);
        idleCallbacks.clear();
        callbacks.forEach(callback => callback());
      });
    }

    function items() {
      return [
        ...Array.from(container.querySelectorAll(":scope > .car-facilities__items > .car-facility"),
          node => ({ key: node.dataset.amenity, node })),
        { key: "more", node: container.querySelector(":scope > .car-facilities__more") }
      ];
    }

    function snapshot(item) {
      const rect = item.node.getBoundingClientRect();
      const style = getComputedStyle(item.node);
      if (!rect.height || !rect.width || style.visibility === "hidden") return null;
      const origin = container.getBoundingClientRect();
      const clone = item.node.cloneNode(true);
      const sources = [item.node, ...item.node.querySelectorAll("*")];
      const copies = [clone, ...clone.querySelectorAll("*")];
      sources.forEach((source, index) => {
        const computed = getComputedStyle(source);
        for (const property of computed) copies[index].style.setProperty(property, computed.getPropertyValue(property));
        for (const attribute of ["id", "role", "tabindex"]) copies[index].removeAttribute(attribute);
      });
      return { ...item, clone, x: rect.left - origin.left, y: rect.top - origin.top,
        width: rect.width, height: rect.height, opacity: Number(style.opacity) };
    }

    function finish() {
      if (session) {
        const previous = session;
        session = null;
        previous.animations.forEach(animation => animation.cancel());
        previous.layer.remove();
      }
      container.dataset.amenitiesMotion = "idle";
      notifyIdle();
    }

    function capture() {
      if (reduced.matches) { finish(); return null; }
      // Sample rendered positions before cancelling: a reversal starts where
      // each individual icon actually is, not at its previous destination.
      const before = new Map();
      [...items(), ...(session?.ghosts || [])].map(snapshot).filter(Boolean).forEach(item => {
        if (item.opacity > 0.001 && (!before.has(item.key) || item.opacity > before.get(item.key).opacity)) {
          before.set(item.key, item);
        }
      });
      finish();
      return before;
    }

    function moveProgress(time) {
      // Match MOVE_EASING exactly when checking the space a moving icon
      // will occupy. Invert Bezier X, then evaluate Y at the same parameter.
      const progress = Math.max(0, Math.min(1, time / MOVE));
      const bezier = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
      let low = 0, high = 1;
      for (let iteration = 0; iteration < 24; iteration += 1) {
        const middle = (low + high) / 2;
        if (bezier(middle, 0.25, 0.25) < progress) low = middle;
        else high = middle;
      }
      return bezier((low + high) / 2, 0.1, 1);
    }

    function entranceDelay(added, shared, before) {
      // Start the slower fade while the shift is still finishing. Require
      // 2px clearance from the WHOLE remaining path, not only this frame;
      // an interrupted/reversed transition may start between normal slots.
      const safe = time => {
        const progress = moveProgress(time);
        return added.every(incoming => shared.every(target => {
          const source = before.get(target.key);
          const x = source.x + (target.x - source.x) * progress;
          const y = source.y + (target.y - source.y) * progress;
          const left = Math.min(x, target.x), right = Math.max(x, target.x) + target.width;
          const top = Math.min(y, target.y), bottom = Math.max(y, target.y) + target.height;
          return right <= incoming.x - 2 || left >= incoming.x + incoming.width + 2
            || bottom <= incoming.y - 2 || top >= incoming.y + incoming.height + 2;
        }));
      };
      for (let time = MOVE - OVERLAP; time < MOVE; time += 1) if (safe(time)) return time;
      return MOVE;
    }

    function play(before) {
      if (!before || reduced.matches) return;
      const after = items().map(snapshot).filter(Boolean);
      const targets = new Set(after.map(item => item.key));
      const removed = Array.from(before.values()).filter(item => !targets.has(item.key));
      const shared = after.filter(item => before.has(item.key));
      const added = after.filter(item => !before.has(item.key));
      const moving = shared.some(item => {
        const source = before.get(item.key);
        return Math.abs(source.x - item.x) > 0.01 || Math.abs(source.y - item.y) > 0.01;
      });
      const moveStart = removed.length ? EXIT : 0;
      const enterStart = moveStart + (moving ? entranceDelay(added, shared, before) : 0);
      const layer = document.createElement("div");
      layer.className = "car-facilities__motion-layer";
      layer.setAttribute("aria-hidden", "true");
      layer.inert = true;
      container.appendChild(layer);
      const active = { layer, animations: [], ghosts: [] };
      session = active;
      container.dataset.amenitiesMotion = "running";
      const startTime = document.timeline.currentTime;
      const animate = (node, frames, duration, delay = 0, easing = "ease-out") => {
        const animation = node.animate(frames, { duration, delay, easing, fill: "both" });
        animation.startTime = startTime;
        active.animations.push(animation);
      };

      removed.forEach(source => {
        const ghost = source.clone;
        Object.assign(ghost.style, { position: "absolute", margin: "0", left: `${source.x}px`,
          top: `${source.y}px`, right: "auto", bottom: "auto", width: `${source.width}px`,
          height: `${source.height}px`, transform: "none", opacity: String(source.opacity),
          transition: "none", pointerEvents: "none" });
        ghost.dataset.motionAmenity = source.key;
        layer.appendChild(ghost);
        active.ghosts.push({ key: source.key, node: ghost });
        animate(ghost, [{ opacity: source.opacity }, { opacity: 0 }], EXIT, 0, "ease-in");
      });

      after.forEach(target => {
        const source = before.get(target.key);
        if (!source) {
          // The destination appears before the shift ends, but only once
          // neighbouring icons have cleared its slot and cannot cross it.
          animate(target.node, [{ opacity: 0 }, { opacity: target.opacity }], ENTER, enterStart, ENTER_EASING);
          return;
        }
        const dx = source.x - target.x;
        const dy = source.y - target.y;
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
          animate(target.node, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0px, 0px)" }],
            MOVE, moveStart, MOVE_EASING);
        }
        // Common icons (including more) never fade out. If a reversal catches
        // an incomplete entrance, finish it from its actual current opacity.
        if (Math.abs(source.opacity - target.opacity) > 0.001) {
          animate(target.node, [{ opacity: source.opacity }, { opacity: target.opacity }], ENTER, 0, ENTER_EASING);
        }
      });

      if (!active.animations.length) { finish(); return; }
      Promise.all(active.animations.map(animation => animation.finished.catch(() => {}))).then(() => {
        if (session === active) finish();
      });
    }

    reduced.addEventListener("change", () => { if (reduced.matches) finish(); });
    return Object.freeze({ capture, play, finish, isRunning: () => Boolean(session),
      whenIdle(callback) { idleCallbacks.add(callback); notifyIdle(); }
    });
  }

  window.TrainSeatAmenitiesMotion = Object.freeze({ create });
})();
