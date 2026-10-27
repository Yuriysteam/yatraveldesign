---
name: travel-3d-icons
description: Generate, edit, harmonize, concept-sketch, visually QA, and package branded Travel 3D room-category icons. Use for L/M room illustrations, composition variants, targeted object or material changes, camera/scale alignment, transparency cleanup, and consistent icon-set updates.
version: v0.1
metadata:
  short-description: Create consistent Travel-style 3D room icons
  updated: "2026-09-25"
---

# Travel 3D Room Icons

Create compact transparent 3D room vignettes that read as one system in the Travel interface. Preserve approved assets and make the smallest targeted change that resolves the user's feedback.

## Required context

- Read [references/visual-contract.md](references/visual-contract.md) before generating or editing an icon.
- Read [references/workflow-and-prompts.md](references/workflow-and-prompts.md) when shaping prompts, harmonizing a set, or interpreting reference images.
- Read [references/room-semantics.md](references/room-semantics.md) before creating or changing any named room in the maintained set. It contains the current approved object-level distinctions and removals.
- Read [references/qa-and-delivery.md](references/qa-and-delivery.md) before finalizing a set, contact sheet, manifest, or ZIP.
- Read [references/size-variants.md](references/size-variants.md) whenever the request names `L`, `M`, `S`, a rendered pixel size, or reduced detail.
- Use the bundled files in `assets/` as visual sources of truth. Inspect only the assets relevant to the current change.

## Core workflow

1. Classify every supplied image as an edit target, camera/composition reference, material reference, color reference, or semantic reference. Never assume every image is an edit target.
2. Identify the approved anchor before editing. If “make them the same” could refer to more than one material or either image could be the anchor, state the intended anchor and ask only if the choice cannot be inferred safely.
3. Match fidelity to the request. If the user asks for wireframes, drafts, or composition options, produce quick low-detail diagrams or silhouettes first; do not spend time on material rendering until a direction is selected.
4. Use the built-in image generation/editing path and follow the `imagegen` skill for raster production. Prefer editing the latest approved version over regenerating a scene.
5. For a new set, stabilize in this order: scene semantics, camera handedness, optical scale/placement, shared materials/colors, then edge/shadow cleanup.
6. Make one targeted change per iteration. Repeat invariants in every edit prompt: change only X; preserve geometry, camera, object relationships, materials not in scope, lighting, transparency, and edge quality. When another icon is a shape reference, copy only the requested object's shape—not its surrounding props or layout.
7. Inspect the result visually and in the real UI grid. For sets, run the deterministic alpha-bounds check and compare a contact sheet before acceptance.
   When a shared lavender accent has drifted across otherwise approved assets, use `scripts/harmonize_lavender.sh` with the canonical living-room asset as the anchor, then inspect the exact-size result; this preserves local texture and shading while aligning perceived hue, saturation, and middle lightness.
8. Save versioned outputs without overwriting approved sources. Record the selected files in an explicit manifest; package from that manifest, never from the highest filename version.

## Non-negotiable invariants

- Keep the canonical elevated 3/4 direction and upper-left light unless the user explicitly changes the system.
- Keep the background genuinely transparent and the contact shadow minimal and local.
- Match shared materials to their approved visual references, accounting for local light rather than forcing flat RGB equality.
- Preserve fine texture without noisy, muddy, painterly, or oversharpened surfaces.
- Reject halos, colored fringes, pixel speckles, broad gray shadow stains, accidental crop, and scene drift.
- Treat automated measurements as guardrails. Final approval is optical comparison at actual UI size.
- Keep rejected iterations out of the manifest and delivery archive even when their version number is higher.

## Canonical assets

- `assets/canonical-bedroom.png`: camera, handedness, scale, warm bedding, wood, and purple accent.
- `assets/canonical-living-room.png`: warm milk-ivory upholstery color and balanced wide composition.
- `assets/canonical-kitchen.png`: stone, wood, metal, and dense-object calibration.
- `assets/metal-example-balcony.png`: long brushed-silver metal behavior only; not a camera or scale anchor.
- `assets/material-stone.png`: approved milk-cream stone.
- `assets/material-metal.png`: approved satin brushed silver.
- `assets/material-board.png`: broader material-language overview.

## Done means

- The requested semantic scene is clear at card size.
- Direction, optical weight, center, baseline, material language, and shadow strength fit the approved set.
- The PNG is `1254 x 1254`, RGBA, and genuinely transparent unless the user requests another spec.
- The final project path, prompt summary, and imagegen mode are reported.
- A multi-icon delivery includes individual PNGs, a review contact sheet, an explicit selected-files manifest, and a ZIP built only from that manifest.
- Size variants are separate approved assets; never obtain `M` by only shrinking `L` without simplifying its geometry and material frequency first.
