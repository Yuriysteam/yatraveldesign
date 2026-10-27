# Principles: Tokens

Use semantic Travel surface names in product decisions, then map them to CSS variables from `tokens/theme-vars.css` in generated HTML/CSS.

## Surface Mapping

The semantic names used in Figma and layout principles do not always match the CSS variable suffix literally. Use this mapping as the source of truth.

| Semantic surface | CSS variable | Role |
| --- | --- | --- |
| `Background Primary` | `var(--yatraveluikit-bg-fill-secondary-color)` | Primary light surface, usually the white foreground/cut-in layer. |
| `Background Secondary` | `var(--yatraveluikit-bg-fill-primary-color)` | Secondary calm substrate, usually the light grey page/background layer. |
| `Card Primary` | `var(--yatraveluikit-bg-card-primary-color)` | Primary card surface. |
| `Card Secondary` | `var(--yatraveluikit-bg-card-secondary-color)` | Secondary card surface. |
| `Text Primary` | `var(--yatraveluikit-text-primary-color)` | Main text. |
| `Text Secondary` | `var(--yatraveluikit-text-secondary-color)` | Captions, metadata, inactive labels. |
| `Text Inverse` | `var(--yatraveluikit-text-inverse-color)` | Text on dark media overlays. |

## Layout Surface Rules

- `principles/layouts.md` defines which semantic surface should be used for each layout layer.
- Do not choose page/background colors directly in page CSS.
- Do not hardcode `#fff`, `#f5f5f5`, or other color literals for layout surfaces.
- If a Figma reference uses a literal color, map it to the closest semantic surface and then to the CSS variable above.
- Component states, button themes, chips, tabs, badges, labels, and controls should use BaseAI component classes instead of custom color variables.

## Typography And Font Tokens

- Link `fonts.css` and `library.css` in generated prototypes.
- Use BaseAI typography snippets/classes before writing custom typography CSS.
- If a page-level wrapper needs a font family, use `font-family: var(--yatraveluikit-fontFamily);`.
- Do not rely on browser default fonts.

## Custom CSS

- Use token variables from `tokens/theme-vars.css` for wrapper backgrounds, text colors, and surface roles.
- Keep custom CSS limited to layout wrappers, spacing, placement, and responsive behavior.
- Use hardcoded sizes only when they are layout measurements from `principles/layouts.md` or copied from an existing BaseAI component/snippet.
