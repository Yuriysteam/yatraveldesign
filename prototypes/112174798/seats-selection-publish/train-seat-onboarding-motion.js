(function (scope) {
  "use strict";

  const DURATION = 2800;
  const TRAVEL = 120;
  const PAD = Object.freeze({ x: 161.375, y: 350.394 });
  const PRESSED_SCALE = 0.976;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const progress = (time, start, end) => clamp((time - start) / (end - start));
  const smooth = (value) => value * value * (3 - 2 * value);

  // A single monotone curve drives both travel and trail length.
  function swipeEase(value) {
    const x = clamp(value);
    let low = 0;
    let high = 1;
    let t = x;
    for (let index = 0; index < 18; index += 1) {
      const inverse = 1 - t;
      const curveX = 3 * inverse * inverse * t * 0.4 + 3 * inverse * t * t * 0.2 + t * t * t;
      if (curveX < x) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    if (x === 0 || x === 1) return x;
    return 3 * (1 - t) * t * t + t * t * t;
  }

  function frameAt(elapsed) {
    const time = ((elapsed % DURATION) + DURATION) % DURATION;
    const down = time >= 1400;
    const pressStart = down ? 1460 : 100;
    const moveStart = down ? 1600 : 240;
    const moveEnd = down ? 2320 : 900;
    const releaseStart = down ? 2380 : 960;
    const releaseEnd = down ? 2540 : 1120;
    const fadeStart = down ? 2420 : 1000;
    const fadeEnd = down ? 2650 : 1230;
    const distance = TRAVEL * swipeEase(progress(time, moveStart, moveEnd));
    const pressure = smooth(progress(time, pressStart, moveStart))
      * (1 - smooth(progress(time, releaseStart, releaseEnd)));
    const y = down ? -TRAVEL + distance : -distance;
    const opacity = distance > 0 ? 1 - smooth(progress(time, fadeStart, fadeEnd)) : 0;

    return {
      time,
      direction: down ? "down" : "up",
      y,
      scale: 1 - (1 - PRESSED_SCALE) * pressure,
      length: distance,
      opacity,
      anchorY: down ? PAD.y - TRAVEL : PAD.y,
      fingerY: PAD.y + y
    };
  }

  function trailPath(distance) {
    const length = Math.max(0, Math.min(TRAVEL, distance));
    if (length === 0) return "";
    // Only the very first, hand-covered pixels use a smaller circle.
    // Once exposed, the 6px round head never stretches with the tail.
    const radius = Math.min(6, length / 2);
    const shoulder = length - radius;
    const bend = Math.max(0, length - radius * 3);
    return `M7 0 C7 ${length * 0.25} ${7 + radius} ${bend} ${7 + radius} ${shoulder}`
      + ` A${radius} ${radius} 0 0 1 ${7 - radius} ${shoulder}`
      + ` C${7 - radius} ${bend} 7 ${length * 0.25} 7 0 Z`;
  }

  function mount(root) {
    const hand = root.querySelector(".onboarding__hand");
    const trail = root.querySelector(".onboarding__motion-trail");
    if (!hand || !trail) return;
    const direction = trail.querySelector(".onboarding__motion-direction");
    const path = trail.querySelector(".onboarding__motion-shape");
    const gradient = trail.querySelector("linearGradient");
    const reduced = scope.matchMedia("(prefers-reduced-motion: reduce)");
    let request = 0;
    let startedAt = 0;
    let running = false;
    let pageActive = true;

    function render(elapsed) {
      const frame = frameAt(elapsed);
      hand.style.transform = `translateY(${frame.y}px) scale(${frame.scale})`;
      direction.setAttribute("transform", frame.direction === "up" ? `translate(0 ${TRAVEL}) scale(1 -1)` : "");
      path.setAttribute("d", trailPath(frame.length));
      gradient.setAttribute("y2", String(Math.max(1, frame.length)));
      trail.style.opacity = String(frame.opacity);
    }

    function tick(now) {
      render(now - startedAt);
      request = scope.requestAnimationFrame(tick);
    }

    function stop() {
      running = false;
      scope.cancelAnimationFrame(request);
      request = 0;
      hand.style.removeProperty("transform");
      trail.style.removeProperty("opacity");
      path.setAttribute("d", "");
      root.classList.remove("is-onboarding-motion");
    }

    function sync() {
      const visible = root.classList.contains("is-interactive")
        && root.classList.contains("is-onboarding")
        && pageActive && !scope.document.hidden && !reduced.matches;
      if (visible && !running) {
        running = true;
        startedAt = scope.performance.now();
        render(0);
        root.classList.add("is-onboarding-motion");
        request = scope.requestAnimationFrame(tick);
      } else if (!visible && running) stop();
    }

    const observer = new scope.MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    reduced.addEventListener("change", sync);
    scope.document.addEventListener("visibilitychange", sync);
    scope.addEventListener("pagehide", () => {
      pageActive = false;
      stop();
    });
    scope.addEventListener("pageshow", () => {
      pageActive = true;
      sync();
    });
    sync();
  }

  const api = Object.freeze({ DURATION, TRAVEL, PAD, frameAt, trailPath });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (scope.document) {
    scope.TrainSeatOnboardingMotion = api;
    const root = scope.document.getElementById("train-scheme");
    if (root) mount(root);
  }
})(typeof window !== "undefined" ? window : globalThis);
