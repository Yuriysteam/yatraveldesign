#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
parent=$(dirname -- "$root")
folder=$(basename -- "$root")
version=$(tr -d '[:space:]' < "$root/VERSION")
dist="$root/dist"
archive="$dist/travel-product-context-$version.zip"

bash "$root/scripts/refresh-manifest.sh"
bash "$root/doctor.sh" --pack-only
mkdir -p "$dist"
if [ -e "$archive" ]; then echo "Ошибка: архив уже существует: $archive" >&2; exit 1; fi

(
  cd "$parent"
  zip -qr "$archive" "$folder" -x "$folder/.git/*" "$folder/dist/*" "$folder/*.DS_Store" "$folder/__MACOSX/*"
)
shasum -a 256 "$archive" > "$archive.sha256"
echo "✓ Собран $archive"
echo "✓ SHA-256: $archive.sha256"
