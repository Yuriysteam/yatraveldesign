# Flat Layout

Flat layout uses one continuous surface. All page content is placed on a shared `Background Secondary` layer. Blocks are separated by spacing, not by additional surfaces.

## Use For

- Главная
- Раздел Моя поездка
- Страница Моей поездки
- Continuous content flows, landing-like pages, broad catalog compositions.

## Surface Model

- Page surface: `Background Secondary`
- Extra islands: do not create them by default.
- Separation: vertical spacing between blocks.

## Platform Rules

- App and touch: outer padding `20px`.
- Desktop: main content column `1200px`; keep all content inside it.
- App: large block gap `40px`.
- Desktop: large block gap `120px`.

## Validation

- There is one page-level surface.
- Blocks are separated by spacing, not by background gaps.
- Desktop content does not exceed `1200px`.
- No arbitrary card islands are added only to create separation.
