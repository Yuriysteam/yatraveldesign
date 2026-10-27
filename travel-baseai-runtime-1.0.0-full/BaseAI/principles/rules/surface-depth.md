# Surface Depth

Surface depth is created with background tokens and spacing. Do not invent depth with arbitrary shadows.

## Rule

- `Background Primary` and `Background Secondary` define page hierarchy.
- Shadows are not the primary separator for layout principles.
- A component may keep its own shadow only when the source component already owns that behavior.
- Do not use borders or outlines to separate islands, snippet wrappers, or generated content chunks.
- Islands and snippets are separated by background exposure, spacing, radius, and the selected surface model, not by strokes.
- Do not mark selected islands or cards by changing their surface fill color. Selection belongs to the control state inside the card, not to the container surface.

## Token Roles

- `Background Primary`: base or cut-in layer depending on the selected principle.
- `Background Secondary`: continuous content surface or island surface depending on the selected principle.

## No Standalone Primary Chunks

- Do not create standalone interface chunks with `Background Primary` as their own content fill.
- `Background Primary` may be used as a page background or as an exposed/cut-in separation layer.
- Content cards, summary cards, form cards, payment blocks, and other readable interface chunks must not use `Background Primary` just to look like separate cards.
- If a chunk contains content, its surface must come from the selected principle: usually `Background Secondary` for islands and content surfaces, or no extra surface in flat layouts.

## Validation

- A layout can explain every visible surface through the selected principle.
- No additional surface token is introduced without a semantic reason.
- No content chunk uses `Background Primary` as a standalone card fill.
- Islands, snippet wrappers, and generated content chunks have no custom border, outline, or stroke-based separator.
- Selected cards and islands keep the same surface fill as unselected cards; only the internal control, label, or action state changes.
