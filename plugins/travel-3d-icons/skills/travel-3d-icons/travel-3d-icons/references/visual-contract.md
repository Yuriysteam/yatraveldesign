# Visual contract

## Style grammar

- Build a compact 3D vignette, not a complete interior. Use one primary object and one to three supporting objects with a clean silhouette at small size.
- Use soft rounded geometry and moderate detail. The finish is premium semi-realistic 3D: neither toy-like low-poly nor a photoreal room render.
- Prefer legible shape and material separation over decorative clutter.
- Use warm milk tones, dark walnut, and cool silver as the base palette. Purple and orange are controlled accents, not universal recolors.
- Keep the background transparent. Use only a soft, tight contact shadow; avoid broad ambient-occlusion stains.
- A composition reference defines the idea, not exact geometry. Translate it into this material system and avoid literal copying.

## Camera and light

`assets/canonical-bedroom.png` is the primary camera/scale anchor.

- Slightly elevated 3/4 view.
- The long rear edge visually climbs toward the upper right.
- The main volume opens or projects toward the lower right.
- Key light comes from the upper left.
- All icons in one set use the same handedness. Do not leave mirrored outliers.
- When correcting direction, rotate or rerender the whole scene while preserving internal object relationships.

## Materials

### Light fabric

The sofa upholstery in `assets/canonical-living-room.png` is the color anchor: warm milk-ivory or creamy off-white. Apply that perceived base color to shared light textiles such as bedroom linens while preserving each object's own weave, folds, and lighting. Do not cool it to neutral white.

### Purple textile

The lavender sofa cushion in `assets/canonical-living-room.png` is the single perceived-color anchor for every lavender accent in the set. Match its dusty, softly desaturated cool lavender across blankets, towels, scarves, cushions, garments, and small colored objects, adjusting only for local light and material response. Preserve each object's material-specific texture, folds, highlights, and shadows; do not force flat RGB equality. Do not spread purple onto functional objects merely for branding; toilet paper remains white.

### Stone

Match `assets/material-stone.png`: milk-cream, matte, softly rounded, with restrained pores and tiny natural inclusions. Avoid gray concrete, glossy marble, strong veining, or high-contrast speckle.

### Metal

Match `assets/material-metal.png`: cool satin/brushed silver with fine directional grain and controlled highlights. Use `assets/metal-example-balcony.png` only to judge that material on long tubes and rails, not as a camera or scale anchor. Avoid black metal and mirror chrome.

### Wood

Use dark walnut with a fine readable grain, rounded edges, and a restrained satin sheen. Keep wood temperature and darkness consistent across the set.

### Rugs and soft accessories

Use tactile but compact texture that survives reduction. Avoid high-frequency noise and large fuzzy halos.

## Optical composition

- Calibrate visual mass in the interface, not real-world furniture dimensions.
- Wide compositions typically land near `45-49%` alpha fill, `x=50-53%`, `y=52-60%`, with the bottom around `92-95%` of the canvas.
- Tall compositions may have lower fill and a lower bottom. Metrics are warning rails, not acceptance criteria.
- If an icon feels more than roughly 10% heavier than its neighbors, uniformly scale the entire locked group. Do not change spacing among objects during technical scaling.
- Align the set by optical center and shared baseline, not only the raw bounding-box center.
- Keep safe air around tall lamps, umbrellas, mirrors, trees, and railings. Nothing should touch the canvas edge.

## Edge and texture quality

Inspect at 100% and at actual card size. Reject:

- colored red, green, or yellow fringe pixels;
- white or dark halos on transparency;
- patchy, muddy, painterly, or overcompressed texture;
- excessive shadow density or gray stains;
- clipped props or shadows;
- microdetail that turns into noise when reduced.

Room-specific object rules live in [room-semantics.md](room-semantics.md). They override older composition references and generic expectations about what a room usually contains.
