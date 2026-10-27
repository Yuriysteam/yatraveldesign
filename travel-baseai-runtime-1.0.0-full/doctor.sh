#!/bin/sh

set -eu

pack_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
mode=${1:---pack-only}
codex_root_dir=${CODEX_HOME:-"$HOME/.codex"}

if [ "$#" -gt 1 ] || { [ "$mode" != "--pack-only" ] && [ "$mode" != "--installed" ]; }; then
  echo "Использование: $0 [--pack-only|--installed]" >&2
  exit 2
fi

for required_file in PACK.json codex-install.json MANIFEST.sha256 BaseAI/AGENT.md BaseAI/AI_USAGE.md BaseAI/fonts.css BaseAI/library.css BaseAI/components.json BaseAI/manifest.json BaseAI/snippets/snippets.json BaseAI/principles/layouts.md BaseAI/principles/visual-style.md BaseAI/principles/tokens.md BaseAI/principles/validation.md BaseAI/icons/index.json; do
  if [ ! -f "$pack_root/$required_file" ] || [ -L "$pack_root/$required_file" ]; then
    echo "Нет обязательного обычного файла: $required_file" >&2
    exit 1
  fi
done

if find "$pack_root" ! -type d ! -type f -print | grep -q .; then
  echo "В runtime package обнаружен symlink или специальный файл." >&2
  exit 1
fi

expected_list=$(mktemp "${TMPDIR:-/tmp}/travel-baseai-expected.XXXXXX")
actual_list=$(mktemp "${TMPDIR:-/tmp}/travel-baseai-actual.XXXXXX")
cleanup() {
  if [ -f "$expected_list" ]; then unlink "$expected_list"; fi
  if [ -f "$actual_list" ]; then unlink "$actual_list"; fi
}
trap cleanup EXIT HUP INT TERM

awk '{ line=$0; sub(/^[0-9a-fA-F]+  /, "", line); print line }' "$pack_root/MANIFEST.sha256" | LC_ALL=C sort > "$expected_list"
(
  cd "$pack_root"
  find . -type f ! -name 'MANIFEST.sha256' ! -name '.DS_Store' -print | LC_ALL=C sort
) > "$actual_list"

if ! diff -u "$expected_list" "$actual_list" >/dev/null; then
  echo "Состав runtime package не совпадает с manifest." >&2
  diff -u "$expected_list" "$actual_list" >&2 || true
  exit 1
fi
if ! (cd "$pack_root" && shasum -a 256 -c MANIFEST.sha256 >/dev/null); then
  echo "Checksum validation не пройдена." >&2
  exit 1
fi

pack_version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$pack_root/PACK.json" | head -n 1)
install_version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$pack_root/codex-install.json" | head -n 1)
baseai_version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$pack_root/BaseAI/manifest.json" | head -n 1)
if [ -z "$pack_version" ] || [ "$pack_version" != "$install_version" ] || [ "$pack_version" != "$baseai_version" ]; then
  echo "Версии PACK.json, codex-install.json и BaseAI/manifest.json не совпадают." >&2
  exit 1
fi

echo "✓ BaseAI runtime $pack_version и checksums корректны"
if [ "$mode" = "--pack-only" ]; then exit 0; fi

active_receipt="$codex_root_dir/team-runtimes/BaseAI/.active"
if [ ! -f "$active_receipt" ] || [ -L "$active_receipt" ]; then
  echo "Нет корректного active receipt: $active_receipt" >&2
  exit 1
fi
receipt_source=$(sed -n 's/^source=//p' "$active_receipt" | head -n 1)
receipt_version=$(sed -n 's/^version=//p' "$active_receipt" | head -n 1)
if [ "$receipt_source" != "$pack_root" ] || [ "$receipt_version" != "$pack_version" ]; then
  echo "Active receipt указывает на другой runtime." >&2
  exit 1
fi
echo "✓ BaseAI runtime активен: $pack_root"
