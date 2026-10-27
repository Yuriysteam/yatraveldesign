#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
codex_root=${CODEX_HOME:-"$HOME/.codex"}
target="$codex_root/skills/travel-product-context"
receipt="$codex_root/skills/.travel-product-context.receipt"
apply=false

if [ "$#" -gt 1 ]; then echo "Использование: $0 [--apply]" >&2; exit 2; fi
if [ "$#" -eq 1 ]; then [ "$1" = "--apply" ] || { echo "Использование: $0 [--apply]" >&2; exit 2; }; apply=true; fi
if [ ! -f "$receipt" ]; then echo "Нет install receipt: $receipt" >&2; exit 1; fi
receipt_source=$(sed -n 's/^source=//p' "$receipt")
if [ "$receipt_source" != "$root" ]; then echo "Receipt принадлежит другому source" >&2; exit 1; fi
if [ ! -L "$target" ] || ! [ "$target" -ef "$root" ]; then echo "Отмена: target не является управляемой ссылкой этого package" >&2; exit 1; fi

echo "Будут удалены только:"
echo "- $target"
echo "- $receipt"
if [ "$apply" != true ]; then echo "Dry run. Для выполнения: bash uninstall.sh --apply"; exit 0; fi
unlink "$target"
unlink "$receipt"
echo "✓ Управляемая ссылка удалена; source package сохранён"
