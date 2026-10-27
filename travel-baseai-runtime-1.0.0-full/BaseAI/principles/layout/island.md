# Island Layout

Island layout uses two layers. The page background is `Background Primary`; content sections are placed as separate `Background Secondary` islands. The exposed background separates islands.

## Use For

- Выдача Отелей
- Выдача жд
- Выдача авиа
- Карты на странице Отеля
- Pages with independent sections, lists, filters, maps, side panels, and grouped cards.

## Surface Model

- Page background: `Background Primary`
- Islands: `Background Secondary`
- Separation: visible background gap between islands.

## Platform Rules

- App: island radius `36px`.
- Desktop: island radius `40px`.
- Gap between islands: `8px`.

## Validation

- Every island represents one semantic section.
- Island gaps are `8px`.
- The page background is visible between islands.
- Do not add large vertical margins where island gaps should do the separation.
- Do not add borders, outlines, or stroke wrappers to islands.
