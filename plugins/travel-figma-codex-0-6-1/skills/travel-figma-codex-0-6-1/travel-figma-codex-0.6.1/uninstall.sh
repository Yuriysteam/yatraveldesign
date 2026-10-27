#!/bin/sh

set -eu

pack_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
codex_root_dir=${CODEX_HOME:-"$HOME/.codex"}
codex_skills_dir="$codex_root_dir/skills"
required_packages="figma-workflow-router figma-design-machine figma-spec-builder travel-figma-design-system yandex-travel-ux-writing html-to-figma-spec figma-to-baseai"
receipt="$codex_skills_dir/.travel-figma-codex.receipt"
apply=false

if [ "$#" -gt 1 ]; then
  echo "Использование: $0 [--apply]" >&2
  exit 2
fi
if [ "$#" -eq 1 ]; then
  if [ "$1" != "--apply" ]; then
    echo "Использование: $0 [--apply]" >&2
    exit 2
  fi
  apply=true
fi

if [ ! -f "$receipt" ]; then
  echo "Нет install receipt: $receipt" >&2
  exit 1
fi

receipt_source=$(sed -n 's/^source=//p' "$receipt")
if [ "$receipt_source" != "$pack_root" ]; then
  echo "Receipt принадлежит другому source: $receipt_source" >&2
  exit 1
fi

for package_name in $required_packages; do
  source_path="$pack_root/skills/$package_name"
  target_path="$codex_skills_dir/$package_name"
  if [ ! -L "$target_path" ] || ! [ "$target_path" -ef "$source_path" ]; then
    echo "Отмена: $target_path не является управляемой ссылкой этого package." >&2
    exit 1
  fi
done

echo "Будут удалены только эти управляемые ссылки:"
for package_name in $required_packages; do
  echo "- $codex_skills_dir/$package_name"
done
echo "- $receipt"

if [ "$apply" != true ]; then
  echo "Dry run. Для выполнения запусти: bash uninstall.sh --apply"
  exit 0
fi

for package_name in $required_packages; do
  unlink "$codex_skills_dir/$package_name"
done
unlink "$receipt"
echo "✓ Управляемые ссылки удалены; source package остался на месте."
