# Visual Style

BaseAI layouts should stay within the Travel design-system visual language.

## No Gradients

- Do not use gradients as page, card, avatar, or decorative backgrounds.
- Use semantic background tokens and layout layers instead: `Background Primary`, `Background Secondary`, and existing component states.
- If a source asset already contains a gradient, keep it only as part of that asset; do not create new CSS gradients.

## Typography

- Use bundled YS fonts through the design-system font files.
- Use typography tokens for headings, titles, body text, and captions.
- Do not rely on browser default fonts.
- Do not hand-code parallel typography styles when a BaseAI typography class or snippet exists.

## Components

- Use `components/` and `snippets/` as the primary source for buttons, controls, typography, badges, tabs, inputs, and interactive states.
- Do not invent replacement buttons, controls, or state styles in page CSS.
- Custom CSS should be limited to layout wrappers, spacing, placement, and responsive behavior.
- Do not add borders or outlines around snippets. Snippets should sit on the selected layout surface without a wrapper stroke.

## Clarity And Primary Actions

- Prefer light, understandable interfaces: fewer competing blocks, clear grouping, and obvious next steps.
- Use only one Primary button on a page. All other actions must be secondary, outlined, text links, chips, or contextual controls.
- Use `gap: 8px` between buttons, chips, segmented actions, and similar horizontal control rows.
- If multiple areas need actions, make the page-level decision Primary and keep local actions visually quieter.
- Do not highlight selected cards or islands with custom colored backgrounds. Show selection through BaseAI control states: selected chip, active tab, checked radio/checkbox, or selected action button.

## Icons

- Search `BaseAI/icons/index.json` and use the bundled Travel SVG at its native size.
- Keep explicit width and height; inline the SVG when it must inherit `currentColor`.
- Do not invent pictograms or replace icons with emoji when a library icon exists.
- Do not mix the Travel set with third-party icon styles on one product surface.
- If an icon asset is not bundled locally, embed the canonical approved SVG inline rather than linking to a non-BaseAI folder.

## Surface Fill Discipline

- Do not make isolated interface chunks with `Background Primary` as content fill.
- `Background Primary` is for the page/background/cut-in layer; it is not a card style.
- Summary cards, payment blocks, form groups, and content cards must follow the selected layout principle instead of inventing new primary-filled chunks.

## Validation

- No `linear-gradient`, `radial-gradient`, or `conic-gradient` in generated page CSS.
- Font CSS is linked and typography token variables are used.
- Visual hierarchy comes from surfaces, spacing, radius, typography, and real Travel icons.
- No standalone content block uses `Background Primary` as its fill.
- Product icons are real library SVGs or inline copies of real library SVGs.
- Buttons, controls, and typography come from BaseAI component/snippet markup before custom CSS is introduced.
- The page has no more than one Primary button and does not create unnecessary visual competition between actions.
- Horizontal rows of buttons, chips, segmented actions, or similar controls use an `8px` gap.
- Snippet wrappers have no custom border or outline.
- Selected card/island containers do not get custom highlight fills.
