#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
codex_root=${CODEX_HOME:-"$HOME/.codex"}
skills_dir="$codex_root/skills"
target="$skills_dir/travel-product-context"
receipt="$skills_dir/.travel-product-context.receipt"
version=$(tr -d '[:space:]' < "$root/VERSION")

if [ "$#" -gt 0 ]; then echo "Использование: $0" >&2; exit 2; fi
case "$codex_root" in /*) ;; *) echo "CODEX_HOME должен быть абсолютным путём" >&2; exit 1 ;; esac
if [ "$codex_root" = "/" ] || [ "$skills_dir" = "/skills" ]; then echo "Небезопасный путь установки" >&2; exit 1; fi

bash "$root/doctor.sh" --pack-only

if [ -L "$target" ]; then
  if ! [ "$target" -ef "$root" ]; then echo "Конфликт: $target указывает на другой скилл" >&2; exit 1; fi
elif [ -e "$target" ]; then
  echo "Конфликт: $target уже существует; ничего не перезаписано" >&2
  exit 1
fi

if [ -e "$receipt" ]; then
  receipt_source=$(sed -n 's/^source=//p' "$receipt")
  if [ "$receipt_source" != "$root" ]; then echo "Конфликт install receipt: $receipt" >&2; exit 1; fi
fi

if [ -e "$skills_dir" ]; then
  if [ ! -d "$skills_dir" ] || [ -L "$skills_dir" ] || [ ! -w "$skills_dir" ]; then echo "Небезопасный или недоступный каталог: $skills_dir" >&2; exit 1; fi
else
  mkdir -p "$skills_dir"
fi

if [ ! -L "$target" ]; then ln -s "$root" "$target"; fi
receipt_tmp="$receipt.tmp.$$"
{
  printf 'skill=travel-product-context\n'
  printf 'version=%s\n' "$version"
  printf 'source=%s\n' "$root"
} > "$receipt_tmp"
mv "$receipt_tmp" "$receipt"

echo "✓ Установлен travel-product-context $version"
CODEX_HOME="$codex_root" bash "$root/doctor.sh" --installed
echo "Открой новую задачу Codex, чтобы она увидела скилл."
