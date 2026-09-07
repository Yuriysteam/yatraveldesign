(() => {
  const observedCards = new WeakSet();

  function updateAlignment(card) {
    const paragraph = card.querySelector(":scope > div > p");
    if (!paragraph) return;

    const lineHeight = Number.parseFloat(getComputedStyle(paragraph).lineHeight) || 20;
    const isSingleLine = paragraph.scrollHeight <= lineHeight * 1.5;
    card.classList.toggle("outcome-card--single-line", isSingleLine);
  }

  function scanOutcomeCards() {
    document.querySelectorAll(".outcome-card").forEach((card) => {
      updateAlignment(card);
      if (observedCards.has(card)) return;

      observedCards.add(card);
      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(() => updateAlignment(card)).observe(card);
      }
    });
  }

  function start() {
    scanOutcomeCards();
    new MutationObserver(scanOutcomeCards).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
