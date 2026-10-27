# Combined Layout

Combined layout allows flat, island, and inset principles to coexist on one page or change between platforms. Use it when different page zones need different separation logic.

## Use For

- Выдача авиа
- Страница отеля
- Страница жд
- Страница авиа
- Чекаут
- Complex pages with hero areas, search/listing zones, details, sidebars, forms, maps, and nested sections.

## Surface Model

- Use each zone's semantic need to choose `flat`, `island`, or `inset` locally.
- Do not combine principles only for decoration.
- Keep transitions between principles intentional and visible.

## Platform Rules

- App: island outer radius `32px` when a combined zone uses islands.
- Desktop: island outer radius `40px`.
- Use both spacing and background exposure only when each separates a different semantic level.

## Validation

- Each zone declares which local layout principle it follows.
- The page does not mix separation methods at the same hierarchy level.
- Platform changes preserve semantic grouping.
