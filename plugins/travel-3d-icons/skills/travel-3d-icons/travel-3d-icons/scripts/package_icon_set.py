#!/usr/bin/env python3

import argparse
import json
import re
import struct
import sys
import zipfile
from pathlib import Path

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
SAFE_NAME = re.compile(r"^[a-z0-9][a-z0-9-]*$")


def png_info(path: Path) -> tuple[int, int, int]:
    with path.open("rb") as handle:
        signature = handle.read(8)
        if signature != PNG_SIGNATURE:
            raise ValueError("not a PNG")
        length = struct.unpack(">I", handle.read(4))[0]
        chunk_type = handle.read(4)
        if chunk_type != b"IHDR" or length != 13:
            raise ValueError("missing standard IHDR")
        width, height, bit_depth, color_type, _, _, _ = struct.unpack(">IIBBBBB", handle.read(13))
    if bit_depth != 8:
        raise ValueError(f"expected 8-bit PNG, found {bit_depth}-bit")
    return width, height, color_type


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate and package an explicit room-icon manifest.")
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--expected-size", type=int, default=1254)
    args = parser.parse_args()

    manifest_path = args.manifest.resolve()
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    icons = data.get("icons")
    if not isinstance(icons, list) or not icons:
        raise ValueError("manifest must contain a non-empty icons array")

    selected: list[tuple[str, Path]] = []
    seen: set[str] = set()
    for index, icon in enumerate(icons):
        if not isinstance(icon, dict):
            raise ValueError(f"icons[{index}] must be an object")
        name = icon.get("name")
        source = icon.get("source")
        if not isinstance(name, str) or not SAFE_NAME.fullmatch(name):
            raise ValueError(f"icons[{index}].name must match {SAFE_NAME.pattern}")
        if name in seen:
            raise ValueError(f"duplicate icon name: {name}")
        if not isinstance(source, str) or not source:
            raise ValueError(f"icons[{index}].source must be a path")
        seen.add(name)

        path = (manifest_path.parent / source).resolve()
        if not path.is_file():
            raise FileNotFoundError(path)
        width, height, color_type = png_info(path)
        if (width, height) != (args.expected_size, args.expected_size):
            raise ValueError(f"{path}: expected {args.expected_size}x{args.expected_size}, found {width}x{height}")
        if color_type != 6:
            raise ValueError(f"{path}: expected PNG color type 6 (RGBA), found {color_type}")
        selected.append((name, path))

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        archive.writestr("manifest.json", json.dumps(data, ensure_ascii=False, indent=2) + "\n")
        for name, path in selected:
            archive.write(path, arcname=f"{name}.png")

    print(f"Packaged {len(selected)} icons -> {args.out}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
