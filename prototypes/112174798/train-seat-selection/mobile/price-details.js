/* Shared sheet motion; keep both price and selected-place entry points. */
(() => {
  const sheet = document.querySelector('.m-ticket-details');
  if (!sheet) return;
  const close = () => window.SeatSelectionSheetMotion.close(sheet);
  const open = data => {
    window.SeatSelectionTicketDetails.render(sheet, data);
    window.SeatSelectionSheetMotion.open(sheet);
    sheet.querySelector('.m-ticket-details__scroll').scrollTop = 0;
  };
  sheet.querySelector('.m-ticket-details__done').addEventListener('click', close);
  window.SeatSelectionMobilePriceDetails = {open, close};
})();
