# Separation

Separation is principle-specific. Choose one separation method per semantic hierarchy level.

## Methods

- Flat: spacing separates blocks.
- Island: exposed `Background Primary` gaps separate islands.
- Inset: `4px` inset gaps and `8px` container padding separate nested surfaces.
- Combined: multiple methods are allowed only across different zones or hierarchy levels.

## Validation

- Do not use dividers, shadows, and extra margins to solve the same separation problem.
- Do not replace island gaps with large vertical spacing.
- Do not use flat section spacing inside inset groups unless it is content spacing, not surface separation.
