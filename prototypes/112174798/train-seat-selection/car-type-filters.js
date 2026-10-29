/* Run after the train's available categories have been rendered. Count the
   complete inventory, never the categories left visible by a user's filter. */
(() => {
  document.querySelectorAll('.exact-filters, .m-filters').forEach(row => {
    const types = row.querySelectorAll('[data-filter], [data-sapsan-group]');
    row.hidden = types.length <= 1;
  });
})();
