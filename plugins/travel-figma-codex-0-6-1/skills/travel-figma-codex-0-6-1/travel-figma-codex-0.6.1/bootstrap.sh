#!/bin/sh

set -eu
umask 077

upload_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
codex_root_dir=${CODEX_HOME:-"$HOME/.codex"}
codex_skills_dir="$codex_root_dir/skills"
pack_name=$(sed -n 's/.*"name": "\([^"]*\)".*/\1/p' "$upload_root/PACK.json" | head -n 1)
pack_version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$upload_root/PACK.json" | head -n 1)
managed_parent="$codex_root_dir/team-packs/travel-figma-codex"
managed_root="$managed_parent/$pack_version"

if [ "$#" -gt 0 ]; then
  echo "Использование: $0" >&2
  exit 2
fi

if [ "$(uname -s)" != "Darwin" ]; then
  echo "Этот release проверен только на macOS (darwin)." >&2
  exit 1
fi

for required_file in PACK.json codex-install.json MANIFEST.sha256 doctor.sh install.sh; do
  required_path="$upload_root/$required_file"
  if [ ! -f "$required_path" ] || [ -L "$required_path" ]; then
    echo "Нет обязательного обычного файла: $required_file" >&2
    exit 1
  fi
done

if [ "$pack_name" != "travel-figma-codex" ]; then
  echo "Неожиданное имя package: $pack_name" >&2
  exit 1
fi
case "$pack_version" in
  ""|.|..|*[!A-Za-z0-9._-]*)
    echo "Некорректная версия package: $pack_version" >&2
    exit 1
    ;;
esac

case "$codex_root_dir" in
  /*) ;;
  *) echo "CODEX_HOME должен быть абсолютным путём. Ничего не изменено." >&2; exit 1 ;;
esac
case "$codex_root_dir" in
  /|*//*|*/./*|*/../*|*/.|*/..)
    echo "Небезопасный CODEX_HOME: $codex_root_dir" >&2
    exit 1
    ;;
esac
case "$codex_root_dir" in
  *'
'*) echo "CODEX_HOME содержит перевод строки." >&2; exit 1 ;;
esac

assert_no_symlink_chain() {
  inspected_path=$1
  remaining=${inspected_path#/}
  current_path=""

  while [ -n "$remaining" ]; do
    case "$remaining" in
      */*) segment=${remaining%%/*}; remaining=${remaining#*/} ;;
      *) segment=$remaining; remaining="" ;;
    esac
    current_path="$current_path/$segment"
    if [ -L "$current_path" ]; then
      echo "Symlink в цепочке CODEX_HOME запрещён: $current_path" >&2
      exit 1
    fi
    if [ -e "$current_path" ] && [ ! -d "$current_path" ]; then
      echo "Компонент пути не является каталогом: $current_path" >&2
      exit 1
    fi
  done
}

preflight_directory() {
  candidate=$1
  label=$2
  if [ -L "$candidate" ]; then
    echo "$label является symlink: $candidate" >&2
    exit 1
  fi
  if [ -e "$candidate" ] && [ ! -d "$candidate" ]; then
    echo "$label не является каталогом: $candidate" >&2
    exit 1
  fi
}

bash "$upload_root/doctor.sh" --pack-only
assert_no_symlink_chain "$codex_root_dir"
preflight_directory "$codex_root_dir" "CODEX_HOME"
preflight_directory "$codex_root_dir/team-packs" "Каталог team-packs"
preflight_directory "$managed_parent" "Каталог travel-figma-codex"

for writable_candidate in "$codex_root_dir" "$codex_root_dir/team-packs" "$managed_parent"; do
  if [ -d "$writable_candidate" ] && [ ! -w "$writable_candidate" ]; then
    echo "Нет прав на запись в $writable_candidate" >&2
    exit 1
  fi
done

if [ -e "$managed_root" ] || [ -L "$managed_root" ]; then
  preflight_directory "$managed_root" "Managed package"
  if [ ! -f "$managed_root/doctor.sh" ] || [ ! -f "$managed_root/MANIFEST.sha256" ]; then
    echo "Managed package той же версии неполон: $managed_root" >&2
    exit 1
  fi
  bash "$managed_root/doctor.sh" --pack-only
  if ! cmp -s "$upload_root/MANIFEST.sha256" "$managed_root/MANIFEST.sha256"; then
    echo "Версия $pack_version уже существует, но её manifest отличается. Ничего не перезаписано." >&2
    exit 1
  fi
  assert_no_symlink_chain "$managed_root"
  echo "✓ Управляемая копия $pack_version уже существует"
  CODEX_HOME="$codex_root_dir" bash "$managed_root/install.sh"
  exit 0
fi

if [ -e "$codex_skills_dir" ] || [ -L "$codex_skills_dir" ]; then
  preflight_directory "$codex_skills_dir" "Каталог skills"
  if [ ! -w "$codex_skills_dir" ]; then
    echo "Нет прав на запись в $codex_skills_dir" >&2
    exit 1
  fi
  for package_name in figma-workflow-router figma-design-machine figma-spec-builder travel-figma-design-system yandex-travel-ux-writing html-to-figma-spec figma-to-baseai; do
    target_path="$codex_skills_dir/$package_name"
    if [ -e "$target_path" ] || [ -L "$target_path" ]; then
      echo "Конфликт: $target_path уже существует. Managed copy не создана." >&2
      exit 1
    fi
  done
  if [ -e "$codex_skills_dir/.travel-figma-codex.receipt" ] || [ -L "$codex_skills_dir/.travel-figma-codex.receipt" ]; then
    echo "Конфликт install receipt. Managed copy не создана." >&2
    exit 1
  fi
fi

codex_parent_dir=$(dirname -- "$codex_root_dir")
if [ ! -d "$codex_parent_dir" ] || [ -L "$codex_parent_dir" ] || [ ! -w "$codex_parent_dir" ]; then
  echo "Родитель CODEX_HOME недоступен или небезопасен: $codex_parent_dir" >&2
  exit 1
fi

if [ ! -d "$codex_root_dir" ]; then mkdir "$codex_root_dir"; fi
if [ ! -d "$codex_root_dir/team-packs" ]; then mkdir "$codex_root_dir/team-packs"; fi
if [ ! -d "$managed_parent" ]; then mkdir "$managed_parent"; fi
assert_no_symlink_chain "$managed_parent"

if [ ! -w "$managed_parent" ]; then
  echo "Нет прав на запись в $managed_parent" >&2
  exit 1
fi

if ! mkdir "$managed_root"; then
  echo "Не удалось атомарно зарезервировать $managed_root. Ничего не перезаписано." >&2
  exit 1
fi

if ! cp -R -P "$upload_root/." "$managed_root/"; then
  echo "Копирование прервано. Неполный каталог оставлен заблокированным для безопасного разбора: $managed_root" >&2
  exit 1
fi

if ! bash "$managed_root/doctor.sh" --pack-only; then
  echo "Постпроверка managed copy не пройдена. Каталог оставлен для безопасного разбора: $managed_root" >&2
  exit 1
fi
assert_no_symlink_chain "$managed_root"

echo "✓ Package сохранён в постоянную папку: $managed_root"
CODEX_HOME="$codex_root_dir" bash "$managed_root/install.sh"
