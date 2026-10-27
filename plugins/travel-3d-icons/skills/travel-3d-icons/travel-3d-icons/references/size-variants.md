# Size variants

## Current scale contract

- **L:** a detailed high-resolution room illustration for larger placements. It uses resolved material surfaces, refined seams/joints, and a small amount of meaningful secondary detail while keeping a compact silhouette.
- **M:** a separately rendered, lower-detail variant designed to remain clear at exactly `74 x 74 px` in the interface.
- **S:** not defined yet. Do not create or infer it until the user approves a size and simplification level.

Keep a high-resolution transparent master for each variant, then export the production raster at its target size. If L is produced from an approved M composition, rerender material detail and geometry; never merely enlarge the M raster. Do not replace approved assets until the new revision passes QA.

## L visual grammar

- Preserve the approved room semantics, camera, handedness, object relationships, palette, optical mass, and transparent canvas.
- Resolve fine wood grain along each part, restrained stone pores, directional satin-metal brushing, fabric weave, seams, and a few natural folds. Texture must remain clean at 100%, without denoiser blotches, fake embossing, oversharpening, or random stains.
- Add at most one meaningful supporting object when it improves the room story. Do not restore anything the user removed and do not add a decoration merely to carry an accent color.
- Keep broad external shadows out of the cutout. A tiny local contact shadow is acceptable when it fully fades.
- Validate L at native 1254 px and in the shared set grid; L is not approved only because it looks good when reduced.

## M visual grammar at 74 px

- Preserve the room's identity, canonical camera, palette, and main object relationships from L.
- Reduce high-frequency detail before downscaling. A plain resize of L is not an M variant.
- Prefer one dominant silhouette and at most two supporting visual groups.
- Merge or simplify tiny parts: thin seams, small handles, individual fibers, numerous rails, tiny grout lines, dense books, hangers, rolled towels, and decorative props.
- Keep essential semantic props even when they are small. Enlarge or simplify them rather than deleting them when they define the room.
- Use broad material cues: warm milk fabric, dark walnut, milk stone, satin silver, controlled purple/orange accents. Every lavender accent must use the perceived color of the canonical living-room sofa cushion as one shared anchor, while preserving the local material and lighting. Remove fine pores, micro-grain, fringe noise, and complex reflections that will collapse at 74 px.
- Preserve the approved quiet L palette when simplifying M. Do not recolor large neutral surfaces merely to compensate for removed props, and do not introduce tiny props merely to carry accent color.
- Make thin structural parts slightly thicker and gaps slightly wider so they survive reduction.
- Use fewer, broader folds on textiles. Tassels or fringe, when essential, become a small number of thick readable shapes.
- Keep the contact shadow smaller, softer, and lighter than in L.
- Maintain clean transparent margins, but let the main silhouette use the card confidently; judge optical weight at the final 74 px export.

## M semantic minimums

Apply [room-semantics.md](room-semantics.md) first. The rules below describe simplification, not permission to restore removed objects.

- Bedroom: keep only the bed, bedding, blanket, and rug; remove the bedside table and lamp. Keep the blanket in the approved soft lavender and the rug warm milk-cream.
- Living room: keep the sofa, coffee table, warm milk-cream rug, and at most one soft-lavender cushion; remove the floor lamp.
- Kitchen: keep the refrigerator, cooktop/oven/hood group and island distinct. The island has one cutting board with a grip hole; no sink, faucet, kettle, chair, cups, food or utensils.
- Bathroom: tub, faucet, and one textile accent remain; tray and towel geometry are simplified.
- Toilet: keep only mirror, sink/vanity, one solid base and toilet. Remove the rug/mat, soap bottles, rolled towels, cubbies and redundant controls. The toilet remains secondary and on the same level.
- Entryway: mirror and bench remain; shoes merge into one simple pair; scarf loses fringe detail.
- Balcony: railing silhouette remains; furniture becomes simple grouped forms; metal reads silver, never black. Remove cushions and cups; keep both chair upholstery sets milk-cream and the table dark walnut.
- Courtyard: tree and bench remain the dominant pair; small landscaping detail is removed.
- Terrace: umbrella and primary seating or table group remain; thin supports are thickened. Remove cups; keep the tabletop milk-cream stone and the blanket in the approved soft lavender.
- Walk-in wardrobe: cabinet or rack silhouette remains; garments become a few broad color blocks rather than many hangers.

## M production workflow

1. Edit the approved L master with the built-in imagegen path, requesting only detail-frequency reduction and small-size readability.
2. Keep the high-resolution M master as `room-name-m-vN.png`.
3. Export a separate exact `74 x 74` PNG with high-quality downsampling.
4. Inspect the exact-size export on the real UI background, white, black, and checkerboard.
5. Approve the M master only from the 74 px comparison grid; a convincing zoomed master is insufficient.
6. Package M from an explicit M manifest. Keep L and M archives separate.

## M prompt core

```text
Create the M-size variant optimized for an exact 74x74 px UI rendering.
Preserve the room identity, approved camera handedness, composition, palette, object relationships, and transparent canvas from the L edit target.
Reduce only visual detail frequency: simplify geometry, merge tiny secondary parts, thicken fragile thin parts, widen narrow gaps, use fewer broader textile folds, and replace microtextures with broad material cues.
Keep all room-defining semantic objects. Do not redesign the scene, add props, change camera, or change brand materials.
The result must read clearly after high-quality downsampling to 74x74. Minimal local contact shadow; no halos, colored speckles, muddy texture, or fine noise.
```
