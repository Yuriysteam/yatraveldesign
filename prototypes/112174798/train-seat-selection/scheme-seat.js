/* Seat / Seats-selection 18999:175302. Presentation only: numbers, fares and availability come
   from the caller. Keep the existing hooks for selection and tooltips. */
(() => {
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const positions = { Top: 'upper', Bottom: 'lower', Right: 'right', Left: 'left' };
  const labels = { Top: 'верхнее', Bottom: 'нижнее', Right: 'сидячее', Left: 'сидячее' };
  function seat({ platform = 'Desktop', carType = 'Sleeper', position = 'Top', state = 'Green', number = 0, car, price, interactive = false, nonRefundable = false } = {}) {
    if (!['Desktop', 'Mobile'].includes(platform) || !['Sleeper', 'Seated'].includes(carType) || !positions[position]) throw new TypeError('Unknown Seat variant');
    const [color, hover] = state.toLowerCase().split(' ');
    if (!['occupied', 'selected', 'green', 'purple', 'blue', 'yellow', 'peach'].includes(color)) throw new TypeError('Unknown Seat state');
    const occupied = color === 'occupied';
    const marked = nonRefundable && !occupied;
    const mobile = platform === 'Mobile';
    const lower = position === 'Bottom';
    const hook = mobile ? 'm-scheme__seat' : 'exact-seat';
    const tierHook = occupied ? '' : mobile ? `m-scheme__seat--${positions[position]}` : `exact-seat--${lower ? 'violet' : 'green'}`;
    const selectable = interactive && !occupied;
    const tag = selectable ? 'button' : 'div';
    const label = occupied ? 'Место занято' : `${car == null ? '' : `${car} вагон, `}место ${number}, ${labels[position]}${marked ? ', доступен невозвратный тариф' : ''}`;
    const data = selectable ? ` type="button" data-seat-car="${escape(car)}" data-seat-number="${escape(number)}" data-seat-price="${escape(price)}" aria-pressed="${color === 'selected'}"` : '';
    const glyph = occupied ? '<span class="scheme-seat__occupied" aria-hidden="true"></span>' : `<span class="scheme-seat__number">${escape(number)}</span>`;
    const marker = carType === 'Sleeper' && !occupied ? '<span class="scheme-seat__marker" aria-hidden="true"></span>' : '';
    const back = carType === 'Seated' ? '<span class="scheme-seat__back" aria-hidden="true"></span>' : '';
    // Figma 19641:486971: visible dot 10px desktop, 8px mobile; surface-colored outline.
    const dot = mobile ? { size: 11, center: 5.5, radius: 4.75, stroke: 1.5 } : { size: 14, center: 7, radius: 6, stroke: 2 };
    const offer = marked ? `<svg class="scheme-seat__nonrefundable" width="${dot.size}" height="${dot.size}" viewBox="0 0 ${dot.size} ${dot.size}" fill="none" aria-hidden="true"><circle cx="${dot.center}" cy="${dot.center}" r="${dot.radius}" fill="#7F5FFF" stroke-width="${dot.stroke}"/></svg>` : '';
    return `<${tag} class="scheme-seat ${hook} ${tierHook}" data-platform="${platform.toLowerCase()}" data-car-type="${carType.toLowerCase()}" data-position="${positions[position]}" data-color="${color}" data-preview-hover="${Boolean(hover)}" data-seat-position="${occupied ? 'occupied' : positions[position]}"${marked ? ' data-non-refundable="true"' : ''} aria-label="${escape(label)}"${data}>${marker}${glyph}${back}${offer}</${tag}>`;
  }
  // Figma axes are Platform / Car type / Position / State. Theme comes from
  // variable modes; hover is a browser interaction, not a component variant.
  const source = Object.freeze({ fileKey: 'dEEebZZNQurp5jLJmXvWl9', componentId: '18999:175302', name: 'Seat' });
  window.SeatSelectionScheme = Object.freeze({ seat, source });
})();
