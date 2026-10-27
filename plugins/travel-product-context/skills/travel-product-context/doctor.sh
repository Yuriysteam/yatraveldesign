#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
mode=${1:---pack-only}
codex_root=${CODEX_HOME:-"$HOME/.codex"}
target="$codex_root/skills/travel-product-context"
receipt="$codex_root/skills/.travel-product-context.receipt"

if [ "$#" -gt 1 ] || { [ "$mode" != "--pack-only" ] && [ "$mode" != "--installed" ]; }; then
  echo "Использование: $0 [--pack-only|--installed]" >&2
  exit 2
fi

bash "$root/scripts/validate.sh"
if [ ! -f "$root/MANIFEST.sha256" ]; then
  echo "Ошибка: отсутствует MANIFEST.sha256" >&2
  exit 1
fi

expected=$(mktemp "${TMPDIR:-/tmp}/travel-context-expected.XXXXXX")
actual=$(mktemp "${TMPDIR:-/tmp}/travel-context-actual.XXXXXX")
cleanup() {
  if [ -f "$expected" ]; then unlink "$expected"; fi
  if [ -f "$actual" ]; then unlink "$actual"; fi
}
trap cleanup EXIT HUP INT TERM

awk '{ line=$0; sub(/^[0-9a-fA-F]+  /, "", line); print line }' "$root/MANIFEST.sha256" | LC_ALL=C sort > "$expected"
(
  cd "$root"
  find . \( -path './.git' -o -path './dist' \) -prune -o -type f ! -name 'MANIFEST.sha256' ! -name '.DS_Store' -print | sed 's#^./##' | LC_ALL=C sort
) > "$actual"

if ! diff -u "$expected" "$actual" >/dev/null; then
  echo "Ошибка: состав package не совпадает с manifest" >&2
  diff -u "$expected" "$actual" >&2 || true
  exit 1
fi
if ! (cd "$root" && shasum -a 256 -c MANIFEST.sha256 >/dev/null); then
  echo "Ошибка: checksum validation не пройдена" >&2
  exit 1
fi
echo "✓ Package manifest и checksums корректны"

if [ "$mode" = "--pack-only" ]; then exit 0; fi
if [ ! -f "$receipt" ]; then
  echo "Ошибка: нет install receipt: $receipt" >&2
  exit 1
fi
receipt_source=$(sed -n 's/^source=//p' "$receipt")
if [ "$receipt_source" != "$root" ]; then
  echo "Ошибка: receipt указывает на другой source" >&2
  exit 1
fi
if [ ! -L "$target" ] || ! [ "$target" -ef "$root" ]; then
  echo "Ошибка: установка повреждена или подменена: $target" >&2
  exit 1
fi
echo "✓ travel-product-context установлен корректно"
