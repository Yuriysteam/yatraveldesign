#!/bin/sh

set -eu

pack_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
mode=${1:---pack-only}
codex_root_dir=${CODEX_HOME:-"$HOME/.codex"}
codex_skills_dir="$codex_root_dir/skills"
required_packages="figma-workflow-router figma-design-machine figma-spec-builder travel-figma-design-system yandex-travel-ux-writing html-to-figma-spec"

if [ "$#" -gt 1 ] || { [ "$mode" != "--pack-only" ] && [ "$mode" != "--installed" ]; }; then
  echo "Использование: $0 [--pack-only|--installed]" >&2
  exit 2
fi

if [ ! -f "$pack_root/MANIFEST.sha256" ] || [ ! -f "$pack_root/PACK.json" ]; then
  echo "Не найден manifest или PACK.json в $pack_root" >&2
  exit 1
fi

for package_name in $required_packages; do
  if [ ! -f "$pack_root/skills/$package_name/SKILL.md" ]; then
    echo "Нет обязательного навыка: skills/$package_name" >&2
    exit 1
  fi
done

expected_list=$(mktemp "${TMPDIR:-/tmp}/travel-figma-expected.XXXXXX")
actual_list=$(mktemp "${TMPDIR:-/tmp}/travel-figma-actual.XXXXXX")

cleanup() {
  if [ -f "$expected_list" ]; then unlink "$expected_list"; fi
  if [ -f "$actual_list" ]; then unlink "$actual_list"; fi
}
trap cleanup EXIT HUP INT TERM

if find "$pack_root" \( -path "$pack_root/.git" -o -path "$pack_root/dist" \) -prune -o ! -type d ! -type f -print | grep -q .; then
  echo "В release package обнаружен symlink или специальный файл; поставка должна состоять только из обычных файлов и каталогов." >&2
  exit 1
fi

pack_version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$pack_root/PACK.json" | head -n 1)
install_manifest_version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$pack_root/codex-install.json" | head -n 1)
if [ -z "$pack_version" ] || [ "$pack_version" != "$install_manifest_version" ]; then
  echo "PACK.json и codex-install.json содержат разные версии." >&2
  exit 1
fi

awk '{ line=$0; sub(/^[0-9a-fA-F]+  /, "", line); print line }' "$pack_root/MANIFEST.sha256" | LC_ALL=C sort > "$expected_list"
(
  cd "$pack_root"
  find . \( -path './.git' -o -path './dist' \) -prune -o -type f ! -name 'MANIFEST.sha256' ! -name '.DS_Store' -print | LC_ALL=C sort
) > "$actual_list"

if ! diff -u "$expected_list" "$actual_list" >/dev/null; then
  echo "Состав package не совпадает с manifest: есть пропущенные или лишние файлы." >&2
  diff -u "$expected_list" "$actual_list" >&2 || true
  exit 1
fi

if ! (cd "$pack_root" && shasum -a 256 -c MANIFEST.sha256 >/dev/null); then
  echo "Checksum validation не пройдена: package повреждён или изменён." >&2
  exit 1
fi

echo "✓ Package manifest и checksums корректны"

if [ "$mode" = "--pack-only" ]; then
  exit 0
fi

case "$codex_root_dir" in
  /*) ;;
  *) echo "CODEX_HOME должен быть абсолютным путём." >&2; exit 1 ;;
esac

receipt="$codex_skills_dir/.travel-figma-codex.receipt"
if [ ! -f "$receipt" ]; then
  echo "Нет install receipt: $receipt" >&2
  exit 1
fi

receipt_source=$(sed -n 's/^source=//p' "$receipt")
if [ "$receipt_source" != "$pack_root" ]; then
  echo "Receipt указывает на другой source: $receipt_source" >&2
  exit 1
fi

for package_name in $required_packages; do
  source_path="$pack_root/skills/$package_name"
  target_path="$codex_skills_dir/$package_name"
  if [ ! -L "$target_path" ] || ! [ "$target_path" -ef "$source_path" ]; then
    echo "Установка повреждена или подменена: $target_path" >&2
    exit 1
  fi
done

echo "✓ Шесть навыков Figma-процесса подключены к этому package source"

figma_use_found=false
figma_generate_found=false
for candidate in "$codex_root_dir"/plugins/cache/openai-curated-remote/figma/*/skills/figma-use/SKILL.md; do
  if [ -f "$candidate" ]; then figma_use_found=true; break; fi
done
for candidate in "$codex_root_dir"/plugins/cache/openai-curated-remote/figma/*/skills/figma-generate-design/SKILL.md; do
  if [ -f "$candidate" ]; then figma_generate_found=true; break; fi
done

if [ "$figma_use_found" = true ] && [ "$figma_generate_found" = true ]; then
  echo "✓ Figma prerequisite skills найдены"
  exit 0
fi

echo "• Локальные навыки исправны, но Figma integration не подтверждена. Подключи Figma plugin и повтори doctor." >&2
exit 2
