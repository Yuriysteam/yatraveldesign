(function () {
  "use strict";
  if (new URLSearchParams(location.search).get("qa") === "1") return;

  const LIST_PATH = new URL("./train-seat-list.html", location.href).pathname;
  const SCHEME_PATH = new URL("./train-seat-scheme.html", location.href).pathname;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let active = null;

  function safeUrl(value, path) {
    try {
      const url = new URL(value, location.href);
      return url.origin === location.origin && url.pathname === path ? url : null;
    } catch (_) { return null; }
  }

  function withoutSelection(value, path) {
    const url = safeUrl(value, path);
    if (url) url.searchParams.delete("selections");
    return url;
  }

  function send(session, type) {
    session.frame.contentWindow?.postMessage({ type: `train-seat-sheet:${type}` }, location.origin);
  }

  function cancelAnimations(session) {
    session.animations.forEach((animation) => animation.cancel());
    session.animations = [];
  }

  function restoreScroll(session) {
    session.listScroll?.scrollTo(session.listScrollLeft, session.listScrollTop);
    window.scrollTo(session.scrollX, session.scrollY);
  }

  function pinStatus(session) {
    if (session.fixedStatus) return;
    const source = session.frame.contentDocument?.querySelector(".status-bar");
    if (!source) return;
    const clone = source.cloneNode(true);
    // Reuse the actual vector status bar and its measured styling, not a new glyph.
    const sources = [source, ...source.querySelectorAll("*")];
    const clones = [clone, ...clone.querySelectorAll("*")];
    sources.forEach((node, index) => {
      const style = session.frame.contentWindow.getComputedStyle(node);
      for (const property of style) clones[index].style.setProperty(property, style.getPropertyValue(property));
    });
    const wrapper = document.createElement("div");
    wrapper.className = "scheme-sheet__fixed-status";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.appendChild(clone);
    session.dialog.querySelector(".scheme-sheet__device").appendChild(wrapper);
    session.fixedStatus = wrapper;
    session.sourceStatus = source;
    session.sourceVisibility = source.style.visibility;
    source.style.visibility = "hidden";
    if (session.listStatus) session.listStatus.style.visibility = "hidden";
  }

  function unpinStatus(session) {
    session.fixedStatus?.remove();
    session.fixedStatus = null;
    if (session.sourceStatus) session.sourceStatus.style.visibility = session.sourceVisibility;
  }

  function animate(session, opening) {
    const from = [session.panel, session.scrim, session.surround].map((node) => {
      const style = getComputedStyle(node);
      return { transform: style.transform, opacity: style.opacity };
    });
    cancelAnimations(session);
    const duration = reduced.matches ? 0 : opening ? 380 : 280;
    const options = { duration, easing: opening ? "cubic-bezier(0.2, 0, 0, 1)" : "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" };
    const target = opening ? "translateY(0px)" : `translateY(${session.panel.clientHeight}px)`;
    session.animations = [
      session.panel.animate([{ transform: from[0].transform }, { transform: target }], options),
      session.scrim.animate([{ opacity: from[1].opacity }, { opacity: opening ? 1 : 0 }], options),
      session.surround.animate([{ opacity: from[2].opacity }, { opacity: opening ? 1 : 0 }], options)
    ];
    return Promise.all(session.animations.map((animation) => animation.finished.catch(() => {})));
  }

  function updateHistory(session, push) {
    const entry = {
      id: session.id, returnUrl: session.returnUrl,
      scrollX: session.scrollX, scrollY: session.scrollY,
      listScrollLeft: session.listScrollLeft, listScrollTop: session.listScrollTop
    };
    history[push ? "pushState" : "replaceState"](
      { ...history.state, trainSeatSheet: entry }, "", session.url
    );
    session.hasEntry = true;
  }

  function cleanup(session, restoreState) {
    if (active !== session) return;
    const reopenEntry = restoreState && location.pathname === SCHEME_PATH ? history.state?.trainSeatSheet : null;
    const reopenUrl = location.href;
    active = null;
    clearTimeout(session.timeout);
    cancelAnimations(session);
    unpinStatus(session);
    session.dialog.close();
    session.dialog.remove();
    if (session.listStatus) session.listStatus.style.visibility = session.listStatusVisibility;
    if (session.list) session.list.inert = session.listWasInert;
    document.documentElement.style.overflow = session.overflow;
    history.scrollRestoration = session.scrollRestoration;
    if (restoreState && !reopenEntry) {
      const returnUrl = withoutSelection(session.returnUrl, LIST_PATH);
      dispatchEvent(new CustomEvent("train-seat-sheet:return", { detail: { url: returnUrl.href } }));
    }
    restoreScroll(session);
    session.trigger?.focus({ preventScroll: true });
    document.title = session.title;
    // A quick Forward during closing should reopen, not overwrite its URL.
    if (reopenEntry) open(reopenUrl, session.trigger, reopenEntry);
  }

  async function close(session) {
    if (active !== session || session.phase === "closing") return;
    clearTimeout(session.timeout);
    session.phase = "closing";
    session.dialog.classList.remove("scheme-sheet--settled");
    session.frame.inert = true;
    send(session, "closing");
    pinStatus(session);
    await animate(session, false);
    cleanup(session, true);
  }

  function requestClose(session) {
    if (active !== session || session.phase === "closing" || session.backRequested) return;
    session.backRequested = true;
    if (session.hasEntry && history.state?.trainSeatSheet?.id === session.id) history.back();
    else close(session);
  }

  async function beginOpen(session) {
    if (active !== session || session.phase !== "loading" || !session.ready || !session.loaded) return;
    session.phase = "preparing";
    const doc = session.frame.contentDocument;
    // Hidden documents need not request their display font through layout yet.
    const number = doc.querySelector(".car-panel__header--a .car-number__value");
    if (number) {
      const style = session.frame.contentWindow.getComputedStyle(number);
      await doc.fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, "0123456789").catch(() => {});
    }
    await doc.fonts.ready;
    await Promise.all(Array.from(doc.images, (image) => image.decode().catch(() => {})));
    if (active !== session || session.phase !== "preparing") return;
    clearTimeout(session.timeout);
    session.phase = "opening";
    updateHistory(session, !session.fromHistory);
    pinStatus(session);
    session.dialog.showModal();
    // Synchronous, after layout exists but before the first opening frame.
    // postMessage/"opened" would arrive too late to prepare the number drum.
    const frameWindow = session.frame.contentWindow;
    frameWindow.dispatchEvent(new frameWindow.Event("train-seat-sheet:prepare"));
    restoreScroll(session);
    await animate(session, true);
    if (active !== session || session.phase !== "opening") return;
    session.panel.style.transform = "translateY(0px)";
    session.scrim.style.opacity = "1";
    session.surround.style.opacity = "1";
    cancelAnimations(session);
    unpinStatus(session);
    session.phase = "open";
    session.dialog.classList.add("scheme-sheet--settled");
    session.frame.inert = false;
    session.frame.contentWindow.focus();
    if (session.keyboard) session.frame.contentDocument.querySelector(".close-button")?.focus({ preventScroll: true });
    send(session, "opened");
  }

  function open(urlValue, trigger, entry) {
    const url = safeUrl(urlValue, SCHEME_PATH);
    if (!url || !window.HTMLDialogElement) return false;
    if (active) return true;
    // Forward after a completed/canceled attempt must not resurrect its seats.
    // The departing iframe keeps its display intact until closing has finished.
    if (entry) url.searchParams.delete("selections");

    const dialog = document.createElement("dialog");
    dialog.className = "scheme-sheet";
    dialog.setAttribute("aria-label", "Выбор места в вагоне");
    dialog.innerHTML = '<div class="scheme-sheet__surround"></div><div class="scheme-sheet__device"><div class="scheme-sheet__scrim"></div><div class="scheme-sheet__panel"><iframe class="scheme-sheet__frame" title="Схема вагона — выбор места"></iframe></div></div>';
    const frame = dialog.querySelector("iframe");
    const listScroll = document.querySelector(".seat-list__content");
    const session = {
      id: entry?.id || `sheet-${Date.now()}`,
      url: url.href,
      returnUrl: entry?.returnUrl || location.href,
      fromHistory: Boolean(entry), hasEntry: Boolean(entry),
      scrollX: entry?.scrollX ?? window.scrollX,
      scrollY: entry?.scrollY ?? window.scrollY,
      listScroll,
      listScrollLeft: entry?.listScrollLeft ?? listScroll?.scrollLeft ?? 0,
      listScrollTop: entry?.listScrollTop ?? listScroll?.scrollTop ?? 0,
      scrollRestoration: history.scrollRestoration,
      overflow: document.documentElement.style.overflow,
      title: document.title, trigger, dialog, frame,
      keyboard: Boolean(trigger?.matches(":focus-visible")),
      list: document.querySelector(".seat-list"),
      listWasInert: Boolean(document.querySelector(".seat-list")?.inert),
      listStatus: document.querySelector(".seat-list .status-bar"),
      listStatusVisibility: document.querySelector(".seat-list .status-bar")?.style.visibility || "",
      panel: dialog.querySelector(".scheme-sheet__panel"),
      scrim: dialog.querySelector(".scheme-sheet__scrim"),
      surround: dialog.querySelector(".scheme-sheet__surround"),
      phase: "loading", animations: [], loaded: false, ready: false
    };
    active = session;
    frame.inert = true;
    if (session.list) session.list.inert = true;
    history.scrollRestoration = "manual";
    document.documentElement.style.overflow = "hidden";
    restoreScroll(session);
    frame.addEventListener("load", () => {
      if (active !== session) return;
      session.loaded = true;
      beginOpen(session);
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      requestClose(session);
    });
    session.timeout = setTimeout(() => {
      if (active !== session || !["loading", "preparing"].includes(session.phase)) return;
      cleanup(session, false);
      location.assign(session.url);
    }, 10000);
    // Loading outside an open dialog prevents a blank surface from flashing.
    frame.src = url.href;
    document.body.appendChild(dialog);
    return true;
  }

  addEventListener("message", (event) => {
    const session = active;
    if (!session || event.origin !== location.origin || event.source !== session.frame.contentWindow) return;
    const message = event.data;
    if (!message || typeof message !== "object" || session.phase === "closing") return;
    if (message.type === "train-seat-sheet:state" || message.type === "train-seat-sheet:ready") {
      const url = safeUrl(message.url, SCHEME_PATH);
      const returnUrl = safeUrl(message.returnUrl, LIST_PATH);
      if (!url || !returnUrl) return;
      session.url = url.href;
      session.returnUrl = returnUrl.href;
      if (session.hasEntry) updateHistory(session, false);
      if (typeof message.title === "string") document.title = message.title;
      if (message.type === "train-seat-sheet:ready") {
        session.ready = true;
        beginOpen(session);
      }
    } else if (message.type === "train-seat-sheet:close") {
      const returnUrl = safeUrl(message.returnUrl, LIST_PATH);
      if (returnUrl) session.returnUrl = returnUrl.href;
      requestClose(session);
    }
  });

  addEventListener("popstate", (event) => {
    const entry = event.state?.trainSeatSheet;
    if (active && (!entry || entry.id !== active.id)) close(active);
    else if (!active && entry && location.pathname === SCHEME_PATH) {
      const car = new URL(location.href).searchParams.get("car");
      const trigger = Array.from(document.querySelectorAll(".car-card")).find((node) => node.dataset.carId === car);
      open(location.href, trigger, entry);
    }
  });
  reduced.addEventListener("change", () => {
    if (reduced.matches) active?.animations.forEach((animation) => animation.finish());
  });
  addEventListener("keydown", (event) => {
    if (event.key === "Escape" && active && ["loading", "preparing"].includes(active.phase)) {
      event.preventDefault();
      requestClose(active);
    }
  });
  window.TrainSeatSheet = Object.freeze({ open });
})();
