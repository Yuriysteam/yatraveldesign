(function () {
  "use strict";

  function create(panel, options = {}) {
    const outDuration = options.outDuration ?? 90;
    const inDuration = options.inDuration ?? 140;
    const widthDuration = 300;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let session = null;

    function items() {
      const legend = panel.querySelector(".car-panel__footer > .price-legend");
      return [
        { key: "legend", node: legend, bottomAnchored: true,
          fingerprint: JSON.stringify(Array.from(legend.children, node => [node.className, node.dataset.price ?? node.textContent.trim()])) }
      ];
    }

    function parentOpacity(node) {
      let opacity = 1;
      for (let parent = node.parentElement; parent && parent !== panel; parent = parent.parentElement) {
        opacity *= Number(getComputedStyle(parent).opacity);
      }
      return opacity;
    }

    function snapshot(item) {
      const { node } = item;
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const inheritedOpacity = parentOpacity(node);
      if (!rect.width || !rect.height || style.visibility === "hidden") return null;
      const parentRect = panel.getBoundingClientRect();
      const clone = node.cloneNode(true);
      const sources = [node, ...node.querySelectorAll("*")];
      const copies = [clone, ...clone.querySelectorAll("*")];
      // Preserve the actual SVGs and typography, even after root classes change
      // (gender/placeholder) or this element loses its original ancestors.
      sources.forEach((source, index) => {
        const computed = getComputedStyle(source);
        for (const property of computed) copies[index].style.setProperty(property, computed.getPropertyValue(property));
        for (const attribute of ["id", "role", "tabindex"]) copies[index].removeAttribute(attribute);
      });
      return {
        ...item, clone,
        pills: Array.from(node.children, pill => ({
          tier: pill.dataset.tier, node: pill, width: pill.getBoundingClientRect().width,
          value: pill.querySelector(":scope > .price-legend__value")
        })),
        fingerprint: item.fingerprint ?? node.textContent.trim(),
        x: rect.left - parentRect.left, y: rect.top - parentRect.top,
        bottom: parentRect.bottom - rect.bottom, width: rect.width, height: rect.height,
        opacity: Number(style.opacity) * inheritedOpacity,
        inheritedOpacity, baseOpacity: Number(style.opacity)
      };
    }

    function finish() {
      if (!session) return;
      const previous = session;
      session = null;
      previous.animations.forEach((animation) => animation.cancel());
      previous.layer.remove();
      panel.dataset.contentMotion = "idle";
    }

    function capture() {
      if (reduced.matches) { finish(); return null; }
      // Only one version of a semantic block is visible at any instant. Keep
      // that version when a confirmed reversal interrupts either fade phase.
      const previous = new Map();
      [...items(), ...(session?.ghosts || [])].map(snapshot).filter(Boolean).forEach(source => {
        if (!previous.has(source.key) || source.opacity > previous.get(source.key).opacity) previous.set(source.key, source);
      });
      finish();
      return previous;
    }

    function play(before) {
      if (!before || reduced.matches) return;
      const layer = document.createElement("div");
      layer.className = "car-panel__motion-layer";
      layer.setAttribute("aria-hidden", "true");
      layer.inert = true;
      const active = { layer, animations: [], ghosts: [], mode: "presence" };
      session = active;
      panel.dataset.contentMotion = "running";
      const after = items().map(snapshot).filter(Boolean);
      panel.appendChild(layer);
      // Share an exact start time: the new content cannot appear even one
      // frame before the old block has fully disappeared. Never animate XY.
      const startTime = document.timeline.currentTime;
      const animate = (node, from, to, duration, delay = 0) => {
        const animation = node.animate([{ opacity: from }, { opacity: to }], {
          duration, delay, easing: to === 0 ? "ease-in" : "ease-out", fill: "both"
        });
        animation.startTime = startTime;
        active.animations.push(animation);
      };
      const animateWidth = (node, from, to) => {
        const animation = node.animate([{ width: `${from}px` }, { width: `${to}px` }],
          { duration: widthDuration, easing: "ease-in-out", fill: "both" });
        animation.startTime = startTime;
        active.animations.push(animation);
      };
      const resizePills = (source, target) => {
        // Visibility/composition changes retain the previous presence motion.
        // A stable visible set instead keeps its original coloured DOM pills.
        if (!source || Math.abs(source.opacity - target.opacity) > 0.001 || source.opacity < 0.999
          || source.pills.length !== target.pills.length
          || !source.pills.every((pill, index) => pill.tier && pill.tier === target.pills[index].tier && target.pills[index].value)) return false;
        active.mode = "width";
        target.pills.forEach((pill, index) => {
          const previous = source.pills[index];
          // The destination price is already rendered at full opacity. Only
          // resize the box: no transparent frames, duplicate text or scaling.
          if (Math.abs(previous.width - pill.width) > 0.01) {
            animateWidth(pill.node, previous.width, pill.width);
          }
        });
        return true;
      };
      const outgoing = (source) => {
        if (!source || source.opacity < 0.001) return;
        const ghost = source.clone;
        Object.assign(ghost.style, {
          position: "absolute", margin: "0", left: `${source.x}px`, right: "auto",
          top: source.bottomAnchored ? "auto" : `${source.y}px`,
          bottom: source.bottomAnchored ? `${source.bottom}px` : "auto",
          width: `${source.width}px`, height: `${source.height}px`,
          transform: "none", opacity: String(source.opacity), pointerEvents: "none"
        });
        ghost.dataset.motionBlock = source.key;
        layer.appendChild(ghost);
        active.ghosts.push({ key: source.key, fingerprint: source.fingerprint, bottomAnchored: source.bottomAnchored, node: ghost });
        animate(ghost, source.opacity, 0, outDuration);
      };

      after.forEach(target => {
        const source = before.get(target.key);
        before.delete(target.key);
        if (resizePills(source, target)) return;
        if (source?.fingerprint === target.fingerprint) {
          // An unchanged block stays still, or finishes an already-started
          // entrance from its actual opacity after a rapid reversal.
          const opacity = Math.min(target.baseOpacity, source.opacity / (target.inheritedOpacity || 1));
          if (Math.abs(opacity - target.baseOpacity) > 0.001) animate(target.node, opacity, target.baseOpacity, inDuration);
          return;
        }
        outgoing(source);
        // The DOM already contains the destination for URL/data consistency,
        // but it is hidden until the entire previous block has faded out.
        // A reversal exactly at the invisible hand-off needs no second blank
        // phase: there is no visible old content left to fade out.
        const delay = source && source.opacity < 0.001 ? 0 : outDuration;
        animate(target.node, 0, target.baseOpacity, inDuration, delay);
      });
      before.forEach(outgoing);

      if (!active.animations.length) { finish(); return; }
      Promise.all(active.animations.map((animation) => animation.finished.catch(() => {}))).then(() => {
        if (session === active) finish();
      });
    }

    reduced.addEventListener("change", () => { if (reduced.matches) finish(); });
    return Object.freeze({ capture, play, finish,
      // The local width animation naturally follows panel/checkout layout.
      finishPresence() { if (session?.mode !== "width") finish(); }
    });
  }

  window.TrainSeatPanelMotion = Object.freeze({ create });
})();
