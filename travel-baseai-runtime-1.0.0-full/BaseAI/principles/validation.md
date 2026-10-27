# Principles: Validation

Use this checklist as the single validation source for generated BaseAI prototypes.

## Required Checks

- A layout model was selected from `principles/layouts.md` and followed consistently.
- Temporary generation guards from `principles/generation-guards.md` were checked against product area and user request.
- Combined layouts are used only when the page changes product phase; each phase still follows flat, island, or inset rules.
- Surface roles follow `principles/layouts.md` and CSS variable mapping from `principles/tokens.md`.
- `fonts.css` and `library.css` are linked or their equivalent assets are available.
- Components come from `snippets/` or `components/` before custom HTML/CSS is introduced.
- Buttons, controls, typography, badges, tabs, inputs, and interactive states are not recreated in page CSS when BaseAI markup exists.
- Visible native browser controls are blocking validation failures. Raw `button`, `input`, `select`, `textarea`, checkbox, radio, range, or file controls may remain only as internal functional elements inside a preserved BaseAI wrapper.
- Every raw form/control tag in final HTML has been audited and either mapped to a BaseAI component subtree or replaced.
- Custom CSS is limited to layout wrappers, spacing, placement, and responsive adaptation.
- Custom spacing uses the `4px` grid unless copying an existing BaseAI value.
- Horizontal rows of buttons, chips, segmented actions, or similar controls use an `8px` gap.
- No generated page, card, avatar, or decorative CSS gradient was added.
- No arbitrary borders or outlines were added around snippets, cards, or islands.
- Shadows are not used for regular layout surfaces unless the selected existing component/snippet already includes them.
- Snippet wrappers have no custom border or outline.
- Selected card/island containers do not get custom highlight fills; selection uses BaseAI control states.
- Icons are real Travel icons from the approved library or canonical inline SVGs.
- Emoji are not used as product icon replacements.
- No archived or non-BaseAI folders are linked at runtime.
- Raw Storybook demo tables, prop code blocks, lorem placeholders, demo color blocks, and reference-only helper examples are not included in final UI.
- Generated markup uses realistic Travel content and does not keep irrelevant Storybook demo text.
- Empty, error, loading, selected, and disabled states are present when relevant to the requested screen.
- The screen is usable at the requested viewport and does not stretch mobile structure into desktop or compress desktop structure into mobile.

## File Checks

- Generated HTML uses output-relative links to `BaseAI/fonts.css` and `BaseAI/library.css` when possible.
- Page-specific CSS does not contain `linear-gradient`, `radial-gradient`, or `conic-gradient` except when preserving a gradient inside an existing source asset.
- Page-specific CSS does not hardcode layout surface colors such as `#fff` or `#f5f5f5`; use `principles/tokens.md` variables instead.
- Page-specific CSS does not define custom visual states for native controls, including `button`, `input`, `select`, `textarea`, `[type="checkbox"]`, `[type="radio"]`, or `[type="range"]`, except for layout placement or visually hidden functional inputs inside BaseAI wrappers.
- Runtime code does not link to old archive folders or local paths outside the final artifact.
