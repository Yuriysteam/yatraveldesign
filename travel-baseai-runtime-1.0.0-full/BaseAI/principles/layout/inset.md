# Inset Layout

Inset layout uses two structural surface layers. `Background Primary` islands are cut into a shared `Background Secondary` container. Content inside inset islands usually stays on the island surface instead of creating additional `Background Secondary` surfaces.

## Use For

- Раздел Мои бронирования
- Настройки
- Nested groups, settings, booking groups, forms with internal sectioning.

## Surface Model

- Outer container: `Background Secondary`
- Inset islands: `Background Primary`
- Content inside islands: no additional surface by default

## Content Rules

- Inside inset islands, `Background Secondary` is normally reserved for controls: buttons, chips, inputs, and dropdowns.
- Other elements almost never use `Background Secondary` inside inset islands; treat it as a rare exception.
- Typical inner content is `Text with icon` and `ListItem`; other element types are rare.

## Platform Rules

- App: outer radius `32px`.
- Desktop: outer radius `40px`.
- Container padding: `8px`.
- Gap between inset islands: `4px`.
- Inner radius formula: `outer radius - 8px`.

## Desktop Titles

On desktop, section titles may be placed outside inset islands when it improves scanning. The island itself should contain the grouped content.

## Validation

- There are two structural surface levels: outer container and inset islands.
- Inset islands are separated by `4px` gaps.
- Outer container padding is `8px`.
- Inner radius follows `outer radius - 8px`.
- Non-control content inside inset islands does not create `Background Secondary` surfaces.
