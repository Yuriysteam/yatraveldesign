/* Keep one pay-later informer after the first visible carriage, across train
   types and filters. Move the existing node without rebuilding any cards. */
(() => {
  const root = document.querySelector('#mobile-carriages, .exact-carriages');
  const informer = root?.querySelector('.m-booking-informer, .exact-informer');
  if (!informer) return;
  const place = () => {
    const first = [...root.querySelectorAll('article[data-car-number]')]
      .find(card => !card.closest('[hidden]'));
    if (informer.hidden !== !first) informer.hidden = !first;
    if (first && first.nextElementSibling !== informer) first.after(informer);
  };
  place();
  window.SeatSelectionBookingInformer = Object.freeze({ place });
  // All current filters preserve cards and hide a card or its category.
  new MutationObserver(place).observe(root, {
    subtree:true, attributes:true, attributeFilter:['hidden'],
  });
})();
