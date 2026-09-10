(function () {
  "use strict";

  const data = window.TrainSeatPrototype;
  if (!data) return;

  const params = new URLSearchParams(window.location.search);
  const sourceTrain = params.has("train") ? data.normalizeTrain(params.get("train")) : null;
  const sourceFilter = data.normalizeFilter(params.get("filter"), sourceTrain || "long-distance");
  const adults = data.normalizeAdults(params.get("adults"));
  const onboarded = params.get("onboarded") === "1";
  const chainGap = [32, 80].includes(Number(params.get("chainGap"))) ? Number(params.get("chainGap")) : 24;

  document.querySelectorAll(".train-option[data-train]").forEach((option) => {
    const targetTrain = data.normalizeTrain(option.dataset.train);
    option.href = data.buildUrl("./train-seat-list.html", {
      variant: "a",
      screen: "list",
      train: targetTrain,
      filter: targetTrain === sourceTrain ? sourceFilter : "all",
      adults,
      onboarded: onboarded ? "1" : null,
      chainGap
    });
  });
})();
