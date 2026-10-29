/* First-buyer compartment choice, shared by the mobile sheet and desktop popover.
   The fixture stays immutable: a type only lives for the current seat selection. */
(() => {
  const names = {female:'женское купе', male:'мужское купе', mixed:'смешанное купе'};
  const conflictText = 'Мужские, женские и смешанные купе\nнельзя совмещать в одном заказе';
  const cabinKey = (car, number) => `${car}:${Math.ceil(number / 4)}`;
  window.SeatSelectionGender = {
    conflictText,
    create({root, show, hide, reject}) {
      const cars = window.SeatSelectionPlatskart?.allCarriages || window.SeatSelectionData.carriages;
      const carsByNumber = new Map(cars.map(car => [car.number, car]));
      const cabins = new Map();
      for (const car of cars) {
        for (const [number, type] of Object.entries(car.genderCabins || {})) {
          const seats = car.coupes[Number(number) - 1];
          if (type !== null || !seats?.every(seat => seat !== null)) continue;
          const label = root.querySelector(`article[data-car-number="${car.number}"] [data-cabin-label="${number}"]`);
          cabins.set(`${car.number}:${number}`, {label});
        }
      }
      const chosen = new Map();
      let selection = [];
      let passengerLimit = Infinity;
      let pending;
      const typeOf = seat => chosen.get(cabinKey(seat.car, seat.number))
        || carsByNumber.get(seat.car)?.genderCabins?.[Math.ceil(seat.number / 4)];
      // A different carriage replaces the order, so it must not inherit this constraint.
      const activeType = car => passengerLimit === 1 ? undefined
        : selection.filter(seat => seat.car === car).map(typeOf).find(Boolean);
      const conflict = button => {
        const seat = {car:Number(button.dataset.seatCar), number:Number(button.dataset.seatNumber)};
        if (button.dataset.seatPosition === 'occupied'
          || selection.some(item => item.car === seat.car && item.number === seat.number)) return '';
        const type = typeOf(seat), active = activeType(seat.car);
        return type && active && type !== active ? conflictText : '';
      };
      return {
        conflict,
        getState() { return Object.fromEntries(chosen); },
        restoreState(state) {
          if (!state || typeof state !== 'object' || Array.isArray(state)) return;
          for (const [key, type] of Object.entries(state)) {
            if (cabins.has(key) && typeof type === 'string' && Object.hasOwn(names, type)) chosen.set(key, type);
          }
        },
        reject(button) { reject?.(button, conflictText); },
        request(button, commit) {
          const car = Number(button.dataset.seatCar);
          const key = cabinKey(car, Number(button.dataset.seatNumber));
          if (!cabins.has(key) || chosen.has(key)) return false;
          const inheritedType = activeType(car);
          if (inheritedType) {
            // With multiple passengers, an empty compartment inherits the order's
            // type. Like a manual choice, it lasts only while seats remain selected.
            chosen.set(key, inheritedType);
            commit();
            return true;
          }
          pending = {key, car, commit};
          show(button);
          return true;
        },
        choose(type) {
          if (!pending || !Object.hasOwn(names, type)) return;
          const active = activeType(pending.car);
          if (active && active !== type) return;
          const {key, commit} = pending;
          pending = undefined;
          chosen.set(key, type);
          hide();
          commit();
        },
        cancel() { pending = undefined; },
        sync(places, limit = Infinity) {
          selection = places;
          passengerLimit = limit;
          for (const key of chosen.keys()) {
            if (!places.some(seat => cabinKey(seat.car, seat.number) === key)) chosen.delete(key);
          }
          for (const [key, {label}] of cabins) {
            if (!label) continue;
            const type = chosen.get(key);
            label.textContent = names[type] || '';
            label.dataset.gender = type || '';
            label.hidden = !type;
          }
          window.dispatchEvent(new Event('seat-gender-change'));
        },
      };
    },
  };
})();
