/* Indication only, ReDesign 19573:373650. No fare is applied automatically.
   The demo offer belongs to carriage NUMBER 3, not the third card/fixture.
   Original inventory, prices and seat geometry remain unchanged. */
(() => {
  const seats = [33, 34, 35, 36];
  const hasOffer = car => !window.SeatSelectionSapsan && car.number === 3 && (!car.type || car.type === 'coupe');
  const isEligible = (car, number) => hasOffer(car) && number !== null && seats.includes(number);
  const renderLegend = car => hasOffer(car) ? `<span class="nonrefundable-legend" data-node-id="19573:373764">
    <img class="nonrefundable-legend__dot" src="./scheme-assets/nonrefundable-legend.svg" width="12" height="12" alt="">
    <span>Невозвратный</span>
    <button class="nonrefundable-legend__more" type="button" aria-label="Подробнее о невозвратном тарифе" aria-disabled="true"><img src="./scheme-assets/nonrefundable-more.svg" width="12" height="12" alt=""></button>
  </span>` : '';
  // More is an explicit placeholder until the explanation/application step is designed.
  window.SeatSelectionNonRefundable = Object.freeze({ hasOffer, isEligible, renderLegend });
})();
