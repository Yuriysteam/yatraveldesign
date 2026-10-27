#!/bin/sh
set -eu
umask 077

upload_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
codex_root=${CODEX_HOME:-"$HOME/.codex"}
version=$(tr -d '[:space:]' < "$upload_root/VERSION")
managed_parent="$codex_root/team-packs/travel-product-context"
managed_root="$managed_parent/$version"
target="$codex_root/skills/travel-product-context"

if [ "$#" -gt 0 ]; then echo "Использование: $0" >&2; exit 2; fi
case "$codex_root" in /*) ;; *) echo "CODEX_HOME должен быть абсолютным путём" >&2; exit 1 ;; esac
if [ "$codex_root" = "/" ]; then echo "Небезопасный CODEX_HOME" >&2; exit 1; fi

bash "$upload_root/doctor.sh" --pack-only

if [ -e "$managed_root" ] || [ -L "$managed_root" ]; then
  if [ ! -d "$managed_root" ] || [ -L "$managed_root" ]; then echo "Конфликт managed package: $managed_root" >&2; exit 1; fi
  bash "$managed_root/doctor.sh" --pack-only
  if ! cmp -s "$upload_root/MANIFEST.sha256" "$managed_root/MANIFEST.sha256"; then
    echo "Версия $version уже существует, но manifest отличается; ничего не перезаписано" >&2
    exit 1
  fi
  CODEX_HOME="$codex_root" bash "$managed_root/install.sh"
  exit 0
fi

if [ -e "$target" ] || [ -L "$target" ]; then
  echo "Конфликт: $target уже существует; managed copy не создана" >&2
  exit 1
fi

mkdir -p "$managed_parent"
if [ -L "$codex_root" ] || [ -L "$codex_root/team-packs" ] || [ -L "$managed_parent" ]; then
  echo "Symlink в пути managed package запрещён" >&2
  exit 1
fi
if ! mkdir "$managed_root"; then echo "Не удалось зарезервировать $managed_root" >&2; exit 1; fi
if ! cp -R -P "$upload_root/." "$managed_root/"; then
  echo "Копирование прервано; неполная папка оставлена для безопасного разбора: $managed_root" >&2
  exit 1
fi
bash "$managed_root/doctor.sh" --pack-only
echo "✓ Скилл сохранён в $managed_root"
CODEX_HOME="$codex_root" bash "$managed_root/install.sh"
