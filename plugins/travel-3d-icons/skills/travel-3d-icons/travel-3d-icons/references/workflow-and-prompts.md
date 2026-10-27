# Workflow and prompt patterns

## Assign image roles first

For every input, write down one role:

- **Edit target:** the image that may change.
- **Camera/composition reference:** direction, framing, or optical weight only.
- **Material reference:** surface behavior only.
- **Color reference:** perceived base color only; preserve target texture.
- **Semantic reference:** object arrangement or room meaning only; do not copy it literally.

If feedback is ambiguous, identify both the target material and the anchor material. Example: “Make the fabrics the same” may refer to purple accents or primary light upholstery. Use the surrounding conversation to infer; ask a single focused question when the anchor remains genuinely ambiguous.

## Composition exploration

When the user asks what other variants might work, or says “wireframes”, “drafts”, or “quickly”, stay at structural fidelity:

- show three or four clearly different silhouettes or top-down/isometric diagrams;
- label them with short letters or names so feedback can be given in one word;
- vary the primary spatial idea, not surface styling;
- use conditional geometry and flat neutral fills; omit material rendering, alpha cleanup and packaging;
- wait for a selected direction before producing a polished 3D image.

For room icons, useful structural axes include straight vs turning circulation, open vs closed endpoint, one dominant object vs repeated rhythm, and wide vs tall silhouette. Do not create expensive renders merely to answer a composition question.

## New icon

Use the built-in `imagegen` generation path. Attach only the relevant canonical or material assets.

```text
Use case: stylized-concept
Asset type: transparent 3D room-category icon for a UI card
Primary request: Create a compact vignette for <ROOM>.
References: bedroom = camera/scale; stone/metal/living room = material or color only.
Composition: one primary object plus 1-3 supporting objects; canonical elevated 3/4 handedness; safe margins.
Materials: warm milk fabric, dark walnut, approved milk stone, approved satin silver; restrained purple/orange accents.
Lighting: soft upper-left studio light; minimal local contact shadow.
Constraints: 1254x1254 RGBA; genuine transparency; no text; no room shell; no extra props.
Avoid: heavy shadows, gray AO stains, halos, colored speckles, muddy textures, crop, low-poly toy styling.
```

## Targeted material or color edit

Always make the anchor explicit. Preserve the target object's own material response unless the user asks to change the material itself.

```text
Use case: precise-object-edit
Image 1: edit target. Image 2: color-only reference.
Edit ONLY <TARGET OBJECT/MATERIAL> in Image 1.
Match the perceived base color of <ANCHOR OBJECT> in Image 2, adjusted only for Image 1's existing lighting.
Preserve the target's exact geometry, texture family, seams, folds, highlights, shadows, placement, and silhouette.
Preserve every other pixel-level design decision: camera, composition, scale, other materials, background transparency, and edge quality.
Do not copy Image 2's geometry or texture; copy only the requested color/material property.
```

## Targeted shape edit from another icon

Use this when the user says an object should be “like the one” in another approved icon.

```text
Use case: precise-object-edit
Image 1: edit target. Image 2: shape reference only.
Edit ONLY <TARGET OBJECT> in Image 1.
Transfer only these requested shape properties from Image 2: <EXPLICIT PROPERTIES>.
Keep Image 1's position, perspective, approximate footprint, material family, lighting and surrounding geometry.
Do not copy any neighboring objects, layout, camera, or room semantics from Image 2.
Preserve every unmentioned element of Image 1, including transparency and edge quality.
```

## L material enrichment

Use this when creating a detailed L revision from an approved lower-detail composition.

```text
Create the L large-placement edition of this approved composition; do not simply upscale it.
Preserve room semantics, camera handedness, object relationships, palette, optical mass and transparent canvas.
Rerender resolved walnut grain, restrained milk-stone pores, directional satin-silver brushing, fabric weave, seams and a few natural folds.
Add at most one meaningful supporting detail only if it strengthens the room identity; never restore removed objects.
No background, broad cast shadow, gray AO stain, speckles, halos, denoiser blotches, fake embossing or material noise.
```

## Direction correction

```text
Edit only the camera handedness of the complete scene so it matches the bedroom anchor: rear edge rises upper-right, volume projects lower-right, light remains upper-left.
Treat all objects and their shadows as one locked group. Preserve relative positions, design, materials, proportions, and transparent canvas.
Do not mirror text or invent new object faces; rerender coherently in the canonical view.
```

## Optical scale correction

Use measured bounds to describe the current and target footprint, but judge the result visually.

```text
Uniformly scale the entire icon scene as one locked group. Do not change object geometry, spacing, camera, or materials.
Target approximately <WIDTH>% canvas width, <HEIGHT>% canvas height, center near (<X>%, <Y>%), and bottom near <BOTTOM>%.
Match the bedroom/living-room references in perceived weight, with safe transparent margins.
```

Image generation may interpret percentages loosely. Measure the output after every scaling pass. If it overshoots, make one corrective pass instead of mixing in other changes.

## Batch or set harmonization

1. Select an explicit approved file for every room.
2. Build or inspect a contact sheet at actual UI size.
3. Fix camera outliers first.
4. Fix optical mass, center, and baseline.
5. Fix shared material or color mismatches.
6. Fix edges, alpha, and shadows.
7. Rebuild the contact sheet and remeasure.
8. Write the final manifest and package only those files.

Do not regenerate the whole set to solve one outlier. Do not accept an icon in isolation without rechecking the grid.

## Iteration discipline

- One iteration equals one requested change.
- Re-state invariants on every edit.
- Work from the last user-approved source, not automatically from the largest version number.
- Save a sibling `-vN.png`; never overwrite an approved source unless the user explicitly requests replacement.
- Mark rejected iterations clearly and exclude them from the manifest.
