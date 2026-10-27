#!/bin/sh

set -eu
umask 077

upload_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
codex_root_dir=${CODEX_HOME:-"$HOME/.codex"}
pack_name=$(sed -n 's/.*"name": "\([^"]*\)".*/\1/p' "$upload_root/PACK.json" | head -n 1)
pack_version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$upload_root/PACK.json" | head -n 1)
managed_parent="$codex_root_dir/team-runtimes/BaseAI"
managed_root="$managed_parent/$pack_version"
active_receipt="$managed_parent/.active"
receipt_tmp=""

if [ "$#" -gt 0 ]; then
  echo "Использование: $0" >&2
  exit 2
fi
if [ "$(uname -s)" != "Darwin" ]; then
  echo "Этот release проверен только на macOS (darwin)." >&2
  exit 1
fi
if [ "$pack_name" != "travel-baseai-runtime" ]; then
  echo "Неожиданное имя package: $pack_name" >&2
  exit 1
fi
case "$pack_version" in
  ""|.|..|*[!A-Za-z0-9._-]*) echo "Некорректная версия package: $pack_version" >&2; exit 1 ;;
esac
case "$codex_root_dir" in
  /*) ;;
  *) echo "CODEX_HOME должен быть абсолютным путём." >&2; exit 1 ;;
esac
case "$codex_root_dir" in
  /|*//*|*/./*|*/../*|*/.|*/..) echo "Небезопасный CODEX_HOME: $codex_root_dir" >&2; exit 1 ;;
esac

bash "$upload_root/doctor.sh" --pack-only

for candidate in "$codex_root_dir" "$codex_root_dir/team-runtimes" "$managed_parent"; do
  if [ -L "$candidate" ]; then
    echo "Symlink в цепочке установки запрещён: $candidate" >&2
    exit 1
  fi
  if [ -e "$candidate" ] && [ ! -d "$candidate" ]; then
    echo "Компонент пути не является каталогом: $candidate" >&2
    exit 1
  fi
done

codex_parent_dir=$(dirname -- "$codex_root_dir")
if [ ! -d "$codex_parent_dir" ] || [ -L "$codex_parent_dir" ] || [ ! -w "$codex_parent_dir" ]; then
  echo "Родитель CODEX_HOME недоступен или небезопасен: $codex_parent_dir" >&2
  exit 1
fi
if [ ! -d "$codex_root_dir" ]; then mkdir "$codex_root_dir"; fi
if [ ! -d "$codex_root_dir/team-runtimes" ]; then mkdir "$codex_root_dir/team-runtimes"; fi
if [ ! -d "$managed_parent" ]; then mkdir "$managed_parent"; fi
if [ ! -w "$managed_parent" ]; then
  echo "Нет прав на запись в $managed_parent" >&2
  exit 1
fi

if [ -e "$managed_root" ] || [ -L "$managed_root" ]; then
  if [ ! -d "$managed_root" ] || [ -L "$managed_root" ]; then
    echo "Конфликт runtime path: $managed_root" >&2
    exit 1
  fi
  bash "$managed_root/doctor.sh" --pack-only
  if ! cmp -s "$upload_root/MANIFEST.sha256" "$managed_root/MANIFEST.sha256"; then
    echo "Версия $pack_version уже существует, но её manifest отличается." >&2
    exit 1
  fi
  echo "✓ Управляемая копия BaseAI $pack_version уже существует"
else
  if ! mkdir "$managed_root"; then
    echo "Не удалось зарезервировать $managed_root" >&2
    exit 1
  fi
  if ! cp -R -P "$upload_root/." "$managed_root/"; then
    echo "Копирование прервано. Неполный каталог оставлен для безопасного разбора: $managed_root" >&2
    exit 1
  fi
  bash "$managed_root/doctor.sh" --pack-only
  echo "✓ BaseAI сохранена в постоянную папку: $managed_root"
fi

if [ -L "$active_receipt" ]; then
  echo "Active receipt не должен быть symlink: $active_receipt" >&2
  exit 1
fi
receipt_tmp="$managed_parent/.active.tmp.$$"
{
  printf 'package=travel-baseai-runtime\n'
  printf 'version=%s\n' "$pack_version"
  printf 'source=%s\n' "$managed_root"
} > "$receipt_tmp"
mv "$receipt_tmp" "$active_receipt"

CODEX_HOME="$codex_root_dir" bash "$managed_root/doctor.sh" --installed
echo "✓ BaseAI runtime установлен и активирован"
