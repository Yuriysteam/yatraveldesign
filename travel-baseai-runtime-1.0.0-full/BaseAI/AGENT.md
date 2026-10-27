# BaseAI Building-Block Contract

This file is the building-block contract for AI agents that generate Travel product prototypes. For the longer operational workflow, read `AI_USAGE.md`.

BaseAI is the stable substrate, not the generation brain. Treat it as the local Travel UI Kit source with these layers:

1. `library.css`, `fonts.css`, and `tokens/` provide runtime styles, fonts, and design variables.
2. `principles/` provides visual, layout, token, and validation principles for using BaseAI in Travel product prototypes.
3. `snippets/` provides production-safe implementation-ready UI material harvested from Storybook.
4. `components/` provides raw Storybook component markup as fallback when snippets are not enough.
5. `icons/`, `illustrations/`, `catalog/`, `components.json`, `manifest.json`, and `AI_USAGE.md` provide asset, component, and workflow metadata.

Use BaseAI as the source for runtime assets, UI building blocks, visual principles, and component metadata.

## Goal

Provide reliable BaseAI building blocks for new prototype screens that feel like the existing Travel product: same visual density, rhythm, surfaces, typography, controls, product hierarchy, and platform behavior.

Do not generate generic SaaS UI, arbitrary gradients, invented components, or layouts that only vaguely resemble the product.

## Required Inputs

Before generation, collect or infer:

- Product area: B2C, B2B, Extranet, app, touch, or desktop.
- Screen scenario: search, listing, details, checkout, settings, bookings, empty state, error state, onboarding, or another explicit state.
- Platform: `app`, `touch`, or `desktop`.
- Source context: existing product screen, Figma reference, code reference, or nearby prototype path.
- Primary user job and main action.
- Required content and real data constraints.

If product area, platform, or scenario is missing, ask one short question before creating the final prototype.

## Building-Block Workflow

1. Read `principles/layouts.md` before selecting a desktop layout type.
2. Read `principles/visual-style.md` before defining surfaces, typography, icons, actions, and component treatment.
3. Read `principles/tokens.md` before choosing CSS variables for custom wrappers.
4. Read `principles/generation-guards.md` before choosing product composition.
5. Read `AI_USAGE.md` for resource priority, snippet adaptation, raw markup fallback, and CSS/token/font rules.
6. Search `snippets/snippets.json` before hand-writing component markup.
7. Use `components/` only when a needed production-safe snippet is missing.
8. For every interactive control, preserve the closest BaseAI snippet or component subtree as the source markup. Native HTML controls are allowed only when they are the functional element inside a preserved BaseAI wrapper, for example the `select` inside `NativeSelect` or an input inside `DateInput`.
9. Never hand-build, visually clone, or state-style any control, card, navigation item, calendar cell, modal, toast, badge, tab, chip, checkbox, switch, input, textarea, select, range, or button when a matching subtree exists in `snippets/` or `components/`; custom CSS is layout-only.
10. Before delivery, audit generated markup for visible native `button`, `input`, `select`, `textarea`, `label`-built controls, and `div`/`a` controls with custom state CSS. Replace each with a BaseAI snippet/component unless it is inside the matching BaseAI wrapper.
11. Use `fonts.css` and `library.css` in generated prototypes.
12. Write custom CSS only for page layout, responsive placement, spacing, and local composition wrappers.
13. Validate the result with `principles/validation.md`.

## Look-And-Feel Rules

- Use YS typography and BaseAI CSS variables.
- Prefer light, airy, simple, clean, and clarity-first interfaces.
- Choose page background and surface roles from `principles/layouts.md` and `principles/tokens.md`.
- Keep the 4px grid for custom spacing, radii, offsets, and widths almost always.
- Use 8px gaps for horizontal rows of controls, chips, and compact actions.
- Prefer calm surfaces and clear hierarchy over decorative effects.
- Do not invent gradients, glassmorphism, neon accents, random illustrations, or unrelated icon styles.
- Do not hand-build buttons, inputs, tabs, chips, cards, modals, badges, or typography when BaseAI snippets/components already contain them.
- Do not hand-build or visually imitate interactive controls. `Button`, `Input`, `DateInput`, `DatePicker`, `Select`, `NativeSelect`, `Checkbox`, `RadioGroup`, `RadioBlockGroup`, `Switch`, `InputRange`, `Tabs`, chips, modals, drawers, and popups must come from BaseAI snippets/components before any custom fallback is considered.
- Replace all visible native form controls with the closest BaseAI snippets/components, keeping the native element only inside the matching BaseAI wrapper for functionality.
- Do not hand-build repeated product cards inside page CSS. Use BaseAI snippets/components so one semantic product island maps to one reusable snippet instance.
- Preserve BaseAI class names, ARIA attributes, `data-*` attributes, state classes, and nested structure from snippets unless the task requires a smaller composition.
- For desktop island layout, never place buttons, inputs, selects, sliders, toggles, chips, tabs, or other controls directly on the page backdrop. Controls must live inside an island or inside a product snippet island.
- Do not stretch mobile structure into desktop or compress desktop structure into mobile.
- Preserve semantic content parity across platforms while allowing platform-specific grouping and order.
- Search `icons/index.json` first and use the bundled native-size Travel SVG; inline approved canonical SVGs only for missing glyphs, and never use emoji as product icons.
- For B2C products, follow the temporary no-dashboard generation guard in `principles/generation-guards.md` unless the user explicitly asks for a dashboard or analytics screen.

## Prototype Output Contract

Generated HTML prototypes should:

- Be self-contained except for links to `BaseAI/fonts.css` and `BaseAI/library.css`.
- Work at desktop and mobile viewport sizes when the requested platform allows it.
- Include realistic Russian product copy and data, not lorem ipsum.
- Include the requested screen state, not only the default happy path.
- Reuse BaseAI classes and markup wherever possible.
- Keep file paths relative to the prototype location.

## Component Provenance Gate

Before finishing a prototype, every visible interactive control must pass this check:

- Native browser-looking controls are a blocking failure. Do not deliver a prototype with visible plain `button`, `input`, `select`, `textarea`, checkbox, radio, range, or file controls unless the exact control is preserved inside a BaseAI component wrapper.
- If the generated file contains raw form/control tags, each occurrence must be traced to a BaseAI snippet/component or replaced before delivery.
- The control markup came from `snippets/` or `components/`, not from a hand-made visual clone.
- The component source is still recognizable in class names, ARIA attributes, `data-*` attributes, state classes, and nested structure.
- Custom CSS does not restyle internal control states, knobs, rails, dropdown arrows, radio indicators, check marks, or date fields beyond placement and sizing wrappers.
- If a native element is used for functionality, it is embedded inside the matching BaseAI control wrapper.
- In island layout, the control is placed on an island surface, not directly on the backdrop.

## Validation

Before considering a screen complete, validate it with `principles/validation.md`.

## When Existing Product Context Exists

If a product already exists in Figma or code, first extract its calibration signals:

- Navigation structure.
- Surface model and page background.
- Main content width and grid behavior.
- Card density and radius.
- Typography rhythm.
- CTA placement and action hierarchy.
- Common product entities and field names.
- Real copy tone and microcopy patterns.

Then generate the new screen as a sibling to that product, not as a redesign.

## Anti-Patterns

- Creating a full alternative design system inside one prototype.
- Using BaseAI only for colors while inventing all components manually.
- Using BaseAI CSS variables/classes as a skin while replacing system controls with native HTML controls or custom divs.
- Treating native browser elements as acceptable placeholders for buttons, inputs, selects, textareas, checkboxes, radios, ranges, chips, tabs, or dropdowns.
- Copying a Figma screen exactly when the task asks for a new screen.
- Generating visually impressive but product-invalid UI.
- Mixing Base2.0 runtime assets into BaseAI prototypes unless explicitly requested.
- Adding custom visual effects to compensate for missing product hierarchy.
