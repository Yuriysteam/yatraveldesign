# QA and delivery

## File checks

Default technical contract:

- `1254 x 1254` pixels;
- PNG color type RGBA;
- genuine transparency;
- no crop of geometry or contact shadow.

Run the alpha-bounds analyzer on every selected file:

```bash
Skills/travel-3d-icons/scripts/analyze_alpha_bounds.sh path/to/icon-a.png path/to/icon-b.png
```

It reports fully transparent canvas area, alpha fill, bounding-box size, center, and bottom using `alpha > 16/255`. It exits non-zero when a file has no fully transparent pixels. Treat geometric deviations as warnings. Compare wide icons primarily with wide icons and tall icons with tall icons.

When a generated transparent master has isolated colored fringe pixels or unsupported low-alpha speckles, clean only the alpha edge before export:

```bash
Skills/travel-3d-icons/scripts/clean_alpha_edges.sh input.png output.png
```

This pass removes near-transparent debris, neutralizes unsupported colored shadow pixels, and decontaminates saturated semi-transparent edges from nearby opaque colors. It must not replace visual inspection or be used to hide a bad render.

## Visual checks

Inspect each icon:

1. On the real light-gray UI card.
2. On white, black, and checkerboard backgrounds.
3. At actual UI size and at 100% zoom.
4. In a common labeled grid with equal card dimensions.

Check camera direction, light direction, visual mass, optical center, baseline, small-size silhouette, shared material color and texture, contact shadow, safe margins, and transparent edges.

Build a deterministic labeled sheet from the same manifest used for packaging:

```bash
Skills/travel-3d-icons/scripts/make_contact_sheet.sh path/to/manifest.json --out path/to/contact-sheet.png --columns 3
```

For edge QA, rerun with `--background white`, `--background black`, and `--background checkerboard`. Use `--card <pixels>` to match the production card size when known.

For a small-size variant, preserve the real rendered size inside a larger review card instead of scaling the icon up. Example for the M variant:

```bash
Skills/travel-3d-icons/scripts/make_contact_sheet.sh path/to/manifest.json --out path/to/contact-sheet-m.png --columns 5 --card 128 --icon-size 74
```

## Manifest

Never infer approval from filename order. Create an explicit JSON manifest:

```json
{
  "set": "travel-room-icons",
  "version": "2026-09-21-v1",
  "icons": [
    {"name": "bedroom", "label": "Спальня", "source": "../room-3d-icons/bedroom-v5.png"},
    {"name": "living-room", "label": "Гостиная", "source": "../room-3d-icons/living-room-v4.png"}
  ]
}
```

Paths are resolved relative to the manifest. `name` becomes the archive filename, so keep it unique and filesystem-safe.

## Package

Build a ZIP only from the explicit manifest:

```bash
python3 Skills/travel-3d-icons/scripts/package_icon_set.py path/to/manifest.json --out path/to/room-icons.zip
```

The script validates the PNG signature, dimensions, RGBA color type, unique names, and source existence before writing the archive. Transparency is checked separately with the alpha-bounds analyzer and visual backgrounds. The ZIP also embeds the manifest as `manifest.json`.

## Delivery checklist

- Individual selected PNGs are in the project, not only in the generator cache.
- A labeled contact sheet shows the exact files in the manifest.
- The ZIP listing matches the manifest and contains no rejected iteration.
- Source versions remain intact.
- Report final paths, the material or camera anchors used, the imagegen mode, and a short prompt summary.
