# Asset Sourcing

BaseAI generation must use real Travel assets, not improvised placeholders.

## Icons

- Search the bundled Travel snapshot in `BaseAI/icons/index.json` first.
- Use the exact indexed SVG path and native size. Inline it when it must inherit CSS `color`.
- If a required icon is not bundled, resolve the canonical source from the approved Travel icon library, preferably `@yandex-travel/icons`, and embed the exact SVG inline.
- Do not draw new pictograms manually when a matching library icon exists.
- Do not use emoji, random third-party icon sets, or decorative placeholder shapes as product icons.
- Do not create runtime dependencies on archive layers or old design-system folders to load icons.

## Photos

- Use real photos when the task asks for photo-based cards or listings.
- External photo URLs are acceptable only when the user explicitly allows web images.
- Photos must remain content assets, not CSS backgrounds with gradients or decorative overlays.

## Illustrations

- `BaseAI/illustrations/index.json` is empty while no illustration files are bundled.
- Do not reference archived or non-BaseAI illustration folders at runtime.

## Validation

- Every generated product icon maps to an indexed bundled Travel SVG or an explicitly embedded approved source.
- Generated HTML has no runtime icon dependency on archived or non-BaseAI folders.
- Generated HTML has no runtime illustration dependency on archived or non-BaseAI folders.
- If external photos are used, they are limited to image content requested by the task.
