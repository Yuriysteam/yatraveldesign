# BaseAI AI Usage Guide

This guide explains how an agent should use `BaseAI` to build Travel-looking HTML prototypes and UI fragments.

## Mission

Build Travel product prototypes by assembling existing BaseAI resources. Use the folder as a local design-system knowledge base: first follow principles, then select snippets, then use raw component markup only as fallback.

## Resource Map

- `AGENT.md` — shortest building-block contract for agents.
- `README.md` and `manifest.json` — snapshot metadata.
- `principles/layouts.md` — layout selection, platform structure, and surface layering rules.
- `principles/visual-style.md` — visual rules for gradients, typography, components, actions, icons, and surface fills.
- `principles/tokens.md` — semantic surface and typography mapping to CSS variables.
- `principles/generation-guards.md` — temporary product-generation guardrails.
- `principles/validation.md` — single validation checklist for generated prototypes.
- `snippets/snippets.json` — index of production-safe snippets.
- `snippets/**/*.html` — reusable HTML snippets referenced by the snippet index.
- `components.json` — flat component index.
- `components/<Component>/meta.json` — stories and variants for one component.
- `components/<Component>/markup.html` — harvested Storybook markup.
- `components/<Component>/behavior.json` — interaction and accessibility notes when available.
- `catalog/*.md` — human-readable component indexes by category.
- `library.css` — bundled Storybook CSS and captured runtime variables.
- `fonts.css` and `fonts/` — bundled YS fonts.
- `tokens/theme-vars.css` — captured design-system CSS variables.
- `icons/index.json` — bundled Travel icon manifest with canonical names, sizes, local SVG paths, and Figma provenance.
- `illustrations/index.json` — local illustration index.
- `_test/*.html` — visual sanity and example pages.

## Workflow

1. Resolve the BaseAI folder path and call it `BASEAI_ROOT`.
2. Read `AGENT.md`, `principles/layouts.md`, `principles/visual-style.md`, `principles/tokens.md`, and `principles/generation-guards.md`.
3. Determine the target platform: `app`, `touch`, `desktop`, or wide desktop.
4. Choose the layout model: flat, island, inset, or a justified combination from `principles/layouts.md`.
5. Search `snippets/snippets.json` for matching component, category, variant, label, slot, or `useWhen` values.
6. Read the referenced snippet HTML file and adapt text/data while preserving classes and structure.
7. For every interactive control, keep a BaseAI snippet/component as the markup source. Native HTML controls are allowed only when embedded inside the matching BaseAI wrapper, for example `NativeSelect`, `DateInput`, or a custom JS range input hidden under an `InputRange` visual wrapper.
8. If no snippet fits, use `components.json`, `catalog/*.md`, and `components/<Component>/meta.json` to find the closest component.
9. Read `components/<Component>/markup.html` as fallback reference and extract the smallest useful component structure.
10. Run a native-control audit on the generated markup. Visible raw `button`, `input`, `select`, `textarea`, checkbox, radio, range, or custom `div`/`a` controls are invalid unless they sit inside the closest preserved BaseAI component wrapper.
11. Link or otherwise include `library.css` and `fonts.css` in generated HTML. Use token variables from `tokens/theme-vars.css` in custom wrapper CSS.
12. Validate the result against `principles/validation.md` and the component provenance gate below.

## Resource Priority

Use resources in this order:

1. Layout and visual rules from `principles/`.
2. Production-safe snippets from `snippets/`.
3. Component metadata and behavior from `components/`.
4. Raw Storybook markup from `components/<Component>/markup.html`.
5. Minimal custom HTML and CSS only for missing layout wrappers or task-specific composition.

Do not start by hand-coding controls. A custom button, input, badge, tab, card, or typography style is usually wrong if a BaseAI snippet exists.

## Component Provenance Gate

This gate is mandatory before delivering any prototype.

- A prototype fails this gate if visible browser-default controls remain. Replace them with BaseAI snippets/components before delivery.
- Raw control tags are allowed only as internal functional elements of a preserved BaseAI wrapper. Examples: native `select` inside `NativeSelect`, `input` inside `DateInput`, hidden range input under an `InputRange` visual wrapper.
- Build all interactive controls from BaseAI snippets/components first: `Button`, `Input`, `TextArea`, `DateInput`, `DatePicker`, `Select`, `NativeSelect`, `Checkbox`, `RadioGroup`, `RadioBlockGroup`, `Switch`, `InputRange`, `Tabs`, chips, menus, modals, drawers, and popups.
- Do not create visual clones of controls with generic `button`, `input`, `select`, `textarea`, `div`, or custom CSS when BaseAI has a matching component.
- If native HTML is required for prototype interactivity, place the native element inside the preserved BaseAI component structure and keep it visually subordinate or transparent.
- Preserve the component subtree: class names, nested wrappers, ARIA attributes, `data-*` attributes, selected/checked/disabled state classes, inline SVGs, and indicator elements.
- Custom CSS may position or size the component wrapper, but must not redefine internal component states such as range rails/knobs, select arrows, radio indicators, checkbox marks, switch knobs, date field states, tabs, chips, or button themes.
- If no BaseAI snippet/component can represent the control, document the missing component in a comment or delivery note and use the smallest possible fallback.
- In desktop island layout, never place controls directly on the page backdrop. Buttons, filters, dropdowns, sliders, date fields, toggles, tabs, and chips must live inside an island or product snippet island.

## Choosing A Layout Model

- `flat` — one continuous surface; blocks are separated mostly by spacing and hierarchy.
- `island` — independent functional sections or product snippets on a contrasting background.
- `inset` — nested grouped content cut into a shared surface.
- `combined` — not a separate principle; a page that intentionally combines documented models across product phases, for example flat hero plus island checkout blocks.

Choose from `principles/layouts.md`. Use combined composition only when each page phase still follows flat, island, or inset rules.

## Using Snippets

Each item in `snippets/snippets.json` can include identifiers such as component, category, variant, view, label, path, slots, and use hints.

When adapting a snippet:

- Replace user-facing text, prices, dates, counts, destinations, and labels as needed.
- Keep class names, ARIA attributes, `data-*` attributes, nested structure, and state classes unless the task requires a smaller composition.
- Do not wrap every snippet in custom bordered cards. Let the selected layout principle provide surfaces and spacing.
- Preserve inline SVGs that belong to the snippet or replace icons only with real Travel icons.

## Using Raw Component Markup

Raw component markup is useful only when a needed variant is absent from `snippets/`. It may contain Storybook tables, demo descriptions, code blocks, lorem placeholders, and reference-only wrappers.

When using raw markup:

- Read `meta.json` first to understand available stories and variants.
- Use comment markers in `markup.html` to locate the needed variant when present.
- Extract the smallest real component subtree, not the entire Storybook demo table.
- Remove Storybook-only code examples, lorem placeholders, prop displays, and demo color blocks.
- Preserve component classes, states, accessibility attributes, and inline SVGs.
- Read `behavior.json` when present for interaction and accessibility expectations.

## CSS, Tokens, And Fonts

Generated HTML should include the BaseAI styles:

```html
<link rel="stylesheet" href="BASEAI_ROOT/fonts.css">
<link rel="stylesheet" href="BASEAI_ROOT/library.css">
```

Use an output-relative path when the generated file lives near `BaseAI`; use an absolute local path only for local prototypes. For portable artifacts, copy required assets only when the user explicitly requests portability.

For custom layout CSS:

- Use CSS variables from `tokens/theme-vars.css`.
- Use `font-family: var(--yatraveluikit-fontFamily);` when defining page-level font styles.
- Use `var(--yatraveluikit-bg-...)`, `var(--yatraveluikit-text-...)`, and radius tokens instead of hard-coded colors and radii when matching existing tokens.
- Keep custom values on the `4px` grid unless copying an existing BaseAI value.
- Do not add custom component-state CSS that competes with BaseAI classes.
- Do not add CSS gradients for pages, cards, avatars, or decorative backgrounds.

## Icons And Illustrations

`icons/index.json` contains 856 bundled Travel icons in native 12, 16, 20, and 24px sizes.

When an icon is needed:

- Search `icons/index.json` first and use its exact local `path`.
- Choose the native size required by the BaseAI component; do not scale a smaller glyph when the matching size exists.
- Inline the indexed SVG when it must inherit CSS `color`; the bundled monochrome files use `currentColor`.
- Keep explicit width and height and preserve the SVG viewBox.
- Do not use emoji as icon replacements.
- Do not link to archived folders or external local paths that are not part of the final artifact.

`illustrations/` is currently only an index. Do not invent illustrations unless the user asks for custom imagery.

## Platform Rules

- Choose platform composition before adapting sizes.
- Do not stretch one layout across app, touch, and desktop.
- Preserve semantic content parity between platforms for the same route state.
- Desktop should not look like an enlarged app screen; app should not look like compressed desktop.
- Use responsive mapping from `principles/layouts.md` before changing component scale.

## Validation

Before finishing generated UI, validate it with `principles/validation.md`.

## Common Recipes

### Need A Button

Search `snippets/snippets.json` for `Button`. Pick by size, theme, width, icon, or caption. Read the snippet file and replace only the label/caption/icon content needed by the task.

### Need A Form

Use snippets for `Input`, `TextArea`, `Select`, `NativeSelect`, `Checkbox`, `RadioGroup`, `RadioBlockGroup`, `Switch`, `InputRange`, `DateInput`, `DatePicker`, `PhoneInput`, and `Button`. Compose them with layout wrappers and BaseAI spacing. Do not create custom input styles or native controls outside BaseAI wrappers.

Before delivery, search the final HTML for raw `button`, `input`, `select`, and `textarea`. Each match must belong to a BaseAI component subtree; otherwise replace it.

### Need A Hotel Or Travel Card

Search for `Card`, `Cell`, `TravelImage`, `Rating`, `Stars`, `Price`, `Label`, `Badge`, `Text`, and `Button` snippets. Choose the correct layout model before assembling the card or list.

### Need Navigation

Search for `Tabs`, `TabsNew`, `TabBar`, `NavBar`, `LinkNew`, and `Anchor` snippets. Match platform composition before choosing the navigation model.

### Need A Modal Or Overlay

Use `Modal`, `BottomSheet`, `Drawer`, `Popup`, `Tooltip`, or `SidePanel` snippets. Read `behavior.json` when present and keep accessibility attributes.
