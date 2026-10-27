#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
repo_parent=$(dirname -- "$repo_root")
repo_name=$(basename -- "$repo_root")
version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$repo_root/PACK.json" | head -n 1)
dist_dir="$repo_root/dist"
archive="$dist_dir/travel-figma-codex-$version.zip"
checksum="$archive.sha256"

case "$version" in
  ""|.|..|*[!A-Za-z0-9._-]*) echo "Некорректная версия: $version" >&2; exit 1 ;;
esac

bash "$repo_root/doctor.sh" --pack-only

if [ -e "$archive" ] || [ -e "$checksum" ]; then
  echo "Артефакт версии $version уже существует. Ничего не перезаписано." >&2
  exit 1
fi
if [ ! -d "$dist_dir" ]; then mkdir "$dist_dir"; fi

(
  cd "$repo_parent"
  zip -qr "$archive" "$repo_name" -x "$repo_name/.git/*" "$repo_name/dist/*" "$repo_name/.DS_Store" "$repo_name/*/.DS_Store"
)
shasum -a 256 "$archive" > "$checksum"

echo "✓ Архив: $archive"
echo "✓ SHA-256: $checksum"
