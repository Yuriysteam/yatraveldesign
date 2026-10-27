#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
tmp=$(mktemp "${TMPDIR:-/tmp}/travel-product-context-manifest.XXXXXX")

cleanup() {
  if [ -f "$tmp" ]; then unlink "$tmp"; fi
}
trap cleanup EXIT HUP INT TERM

if find "$root" \( -path "$root/.git" -o -path "$root/dist" \) -prune -o ! -type d ! -type f -print | grep -q .; then
  echo "Ошибка: package содержит symlink или специальный файл" >&2
  exit 1
fi

(
  cd "$root"
  find . \( -path './.git' -o -path './dist' \) -prune -o -type f ! -name 'MANIFEST.sha256' ! -name '.DS_Store' -print | LC_ALL=C sort | while IFS= read -r file; do
    shasum -a 256 "${file#./}"
  done
) > "$tmp"

mv "$tmp" "$root/MANIFEST.sha256"
trap - EXIT HUP INT TERM
echo "✓ MANIFEST.sha256 обновлён"
