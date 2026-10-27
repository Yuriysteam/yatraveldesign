#!/bin/sh

set -eu

pack_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
codex_root_dir=${CODEX_HOME:-"$HOME/.codex"}
active_receipt="$codex_root_dir/team-runtimes/BaseAI/.active"
apply=false

if [ "$#" -gt 1 ]; then echo "Использование: $0 [--apply]" >&2; exit 2; fi
if [ "$#" -eq 1 ]; then
  if [ "$1" != "--apply" ]; then echo "Использование: $0 [--apply]" >&2; exit 2; fi
  apply=true
fi
if [ ! -f "$active_receipt" ] || [ -L "$active_receipt" ]; then
  echo "Нет корректного active receipt: $active_receipt" >&2
  exit 1
fi
receipt_source=$(sed -n 's/^source=//p' "$active_receipt" | head -n 1)
if [ "$receipt_source" != "$pack_root" ]; then
  echo "Active receipt принадлежит другому runtime: $receipt_source" >&2
  exit 1
fi

echo "Будет удалён только active receipt: $active_receipt"
echo "Runtime останется на месте: $pack_root"
if [ "$apply" != true ]; then
  echo "Dry run. Для выполнения запусти: bash uninstall.sh --apply"
  exit 0
fi
unlink "$active_receipt"
echo "✓ BaseAI runtime деактивирован; файлы сохранены."
