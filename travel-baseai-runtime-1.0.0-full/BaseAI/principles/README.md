# BaseAI Principles

`Principles` are composition rules for AI-generated Travel layouts. They sit above components and snippets: components describe what can be used, principles describe how a page should be assembled.

Use this directory before selecting components when building a page or prototype.

## Generation Flow

1. Detect platform: `app`, `touch`, or `desktop`.
2. Choose platform composition before adapting sizes. Do not stretch one layout across app, touch, and desktop.
3. Detect page type from `index.json` route hints.
4. Select the layout principle: `flat`, `island`, `inset`, or `combined`.
5. Apply the surface model: background tokens, layers, gaps, radii, and content width.
6. Preserve semantic content parity across platforms when they represent the same route state, while allowing platform-specific order, grouping, and placement.
7. Select ready HTML from `snippets/` and component markup from `components/` before writing custom interface code.
8. If no ready snippet exists, compose the smallest possible structure from existing BaseAI classes and tokens.
9. Use custom CSS only for layout wrappers: grid, spacing, placement, and responsive adaptation.
10. Validate the result against the selected principle and shared rules.

## Global Contract

- Do not make desktop look like an enlarged app screen or app look like a compressed desktop screen.
- Use the `4px` base grid for custom spacing, offsets, gaps, widths, radii, and layout measurements almost always.
- Non-4px values must come from an existing BaseAI class, token, component snippet, or documented exception.

## Layout Principles

- [Flat](./layout/flat.md) — one continuous surface, blocks separated by spacing.
- [Island](./layout/island.md) — separate islands on a contrasting background.
- [Inset](./layout/inset.md) — nested islands cut into a shared surface.
- [Combined](./layout/combined.md) — multiple principles on one page or across platforms.

## Shared Rules

- [Surface Depth](./rules/surface-depth.md) — visual depth is created with surface tokens, not arbitrary shadows.
- [Separation](./rules/separation.md) — blocks are separated by spacing, exposed background, or inset gaps depending on the principle.
- [Platform Adaptation](./rules/platform-adaptation.md) — platform composition, app/touch/desktop layout constants, semantic content parity, and the almost-always `4px` grid.
- [Visual Style](./rules/visual-style.md) — no generated gradients; use YS fonts, tokens, surfaces, spacing, radius, and real Travel icons.
- [Asset Sourcing](./rules/asset-sourcing.md) — use bundled Travel SVGs first, approved canonical fallbacks second, and avoid archived folders.

## Component Discipline

Do not hand-build buttons, controls, typography, or component states when BaseAI already has matching markup in `components/` or `snippets/`. Generated pages should look like assembled Travel UI Kit output, not a parallel hand-coded design system.

## Do Not Mix With Components

`Principles` must not duplicate component documentation. Keep component API, markup, and story information in `components/`, `snippets/`, and `catalog/`. Keep page composition, surface hierarchy, and layout decisions here.
