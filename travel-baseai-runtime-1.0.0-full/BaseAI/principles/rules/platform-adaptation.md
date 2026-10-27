# Platform Adaptation

Apply platform composition and constants before choosing exact components.

## Platform Composition

- Do not stretch one layout across platforms.
- Choose the platform composition first: `app`, `touch`, `desktop`, and wide desktop may reorder, regroup, or relocate the same semantic content when the product pattern requires it.
- When mobile and desktop represent the same route state, preserve the semantic module set, but allow platform-specific order, grouping, and placement.
- Do not make desktop look like an enlarged app screen or app look like a compressed desktop screen.

## App And Touch

- Flat outer padding: `20px`.
- Flat large block gap: `40px`.
- Island radius: `36px`.
- Inset outer radius: `32px`.
- Combined island outer radius: `32px`.

## Desktop

- Main content column: `1200px` where a principle uses a constrained column.
- Flat large block gap: `120px`.
- Island radius: `40px`.
- Inset outer radius: `40px`.
- Combined island outer radius: `40px`.
- In inset layouts, section titles may be placed outside islands.

## Shared

- Use the `4px` base grid for custom spacing, offsets, gaps, widths, radii, and layout measurements almost always.
- Prefer values that are multiples of `4px`: `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`, etc.
- Avoid arbitrary values such as `7px`, `13px`, `22px`, or `37px` unless copying an existing BaseAI component class or matching a documented component token.
- Island gap: `8px`.
- Inset gap: `4px`.
- Inset container padding: `8px`.
- Inset inner radius: `outer radius - 8px`.

## Validation

- Generated pages choose a platform composition before adapting sizes.
- The same route state keeps semantic content parity across platforms unless the product explicitly changes the state.
- Platform differences are expressed through order, grouping, placement, density, and navigation model, not by deleting required content.
- Generated layout CSS uses `4px`-grid values for custom spacing, offsets, gaps, widths, and radii unless the value comes from an existing BaseAI class, token, or component snippet.
- Non-4px values are intentional exceptions, not default layout choices.
