# BaseAI Travel UI Library

Local snapshot of Travel UI Kit Storybook rendered with `designSystem:new`.

## Contents

- `components/` — semantic component folders with `meta.json` and `markup.html`.
- `components.json` — flat machine-readable component index.
- `snippets/` — production-safe HTML snippets for generated prototypes; Storybook demo tables, code blocks, lorem placeholders, and reference-only helper examples are excluded from the generation index.
- `icons/` — 856 bundled Travel SVG icons in native 12/16/20/24px sizes, plus a searchable provenance index.
- `illustrations/` — local illustration index; currently empty because illustrations are not bundled here.
- `library.css` — Storybook CSS chunks plus captured runtime CSS variables.
- `fonts.css` and `fonts/` — bundled YS font families.
- `catalog/` — category indexes for humans and agents.
- `principles/` — visual and layout principles for using BaseAI in Travel product prototypes.
- `principles/layouts.md` — layout selection, desktop/touch/mobile structure, and surface layering rules.
- `principles/visual-style.md` — gradients, typography, components, actions, icons, and surface fill discipline.
- `principles/tokens.md` — semantic surface and typography mapping to CSS variables.
- `principles/generation-guards.md` — temporary product-generation guardrails.
- `principles/validation.md` — single validation checklist for generated prototypes.
- `principles/index.json` — machine-readable index of BaseAI principles and route hints.
- `AGENT.md` — building-block usage contract for AI agents that generate Travel product prototypes.
- `AI_USAGE.md` — operational workflow for assembling prototypes from principles, snippets, components, tokens, fonts, and icons.
- `_build/snippets-cleanup-report.json` — audit trail for snippets excluded from generation.
- `_test/sanity.html` — visual page with all harvested stories.

## Snapshot

- Source: https://travel-frontend-storybook.s3.mds.yandex.net/travel-frontend-ui-kit/trunk/
- Storybook stories: 628
- Semantic component folders: 141
- CSS chunks: 148
- Failures: 0

## Notes

Nested Storybook sections are grouped as component views. For example, `Controls/Input/Outlined` and `Controls/Input/Solid` live under `components/Input/`.

For generated prototypes, use this `BaseAI/` directory as the source for runtime assets, UI building blocks, visual principles, and component metadata: `fonts.css`, `library.css`, `tokens/`, `principles/`, `snippets/snippets.json`, `components/`, `icons/`, and `illustrations/`. Do not link to archived or non-BaseAI folders at runtime.
