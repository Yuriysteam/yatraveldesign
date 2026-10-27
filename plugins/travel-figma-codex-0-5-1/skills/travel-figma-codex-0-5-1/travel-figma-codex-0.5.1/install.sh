#!/bin/sh

set -eu

pack_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
codex_root_dir=${CODEX_HOME:-"$HOME/.codex"}
codex_skills_dir="$codex_root_dir/skills"
required_packages="figma-workflow-router figma-design-machine figma-spec-builder travel-figma-design-system yandex-travel-ux-writing html-to-figma-spec"
receipt="$codex_skills_dir/.travel-figma-codex.receipt"
pack_version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$pack_root/PACK.json" | head -n 1)
created_targets=""
receipt_tmp=""
completed=false

if [ "$#" -gt 0 ]; then
  echo "Использование: $0" >&2
  exit 2
fi

case "$codex_root_dir" in
  /*) ;;
  *) echo "CODEX_HOME должен быть абсолютным путём. Ничего не изменено." >&2; exit 1 ;;
esac

if [ "$codex_root_dir" = "/" ] || [ "$codex_skills_dir" = "/skills" ]; then
  echo "Небезопасный путь установки: $codex_skills_dir" >&2
  exit 1
fi

bash "$pack_root/doctor.sh" --pack-only

for package_name in $required_packages; do
  source_path="$pack_root/skills/$package_name"
  target_path="$codex_skills_dir/$package_name"

  if [ -L "$target_path" ]; then
    if [ "$target_path" -ef "$source_path" ]; then
      continue
    fi
    echo "Конфликт: $target_path уже является другой ссылкой. Ничего не изменено." >&2
    exit 1
  fi

  if [ -e "$target_path" ]; then
    echo "Конфликт: $target_path уже существует. Пакет не перезаписывает чужие навыки." >&2
    exit 1
  fi
done

if [ -e "$receipt" ]; then
  receipt_source=$(sed -n 's/^source=//p' "$receipt")
  receipt_version=$(sed -n 's/^version=//p' "$receipt")
  if [ "$receipt_source" != "$pack_root" ] || [ "$receipt_version" != "$pack_version" ]; then
    echo "Конфликт install receipt: $receipt" >&2
    exit 1
  fi
fi

if [ -e "$codex_skills_dir" ]; then
  if [ ! -d "$codex_skills_dir" ] || [ -L "$codex_skills_dir" ] || [ ! -w "$codex_skills_dir" ]; then
    echo "Каталог недоступен или небезопасен: $codex_skills_dir" >&2
    exit 1
  fi
elif [ -e "$codex_root_dir" ]; then
  if [ ! -d "$codex_root_dir" ] || [ -L "$codex_root_dir" ] || [ ! -w "$codex_root_dir" ]; then
    echo "CODEX_HOME недоступен или является symlink: $codex_root_dir" >&2
    exit 1
  fi
else
  codex_parent_dir=$(dirname -- "$codex_root_dir")
  if [ ! -d "$codex_parent_dir" ] || [ -L "$codex_parent_dir" ] || [ ! -w "$codex_parent_dir" ]; then
    echo "Родитель CODEX_HOME недоступен или является symlink: $codex_parent_dir" >&2
    exit 1
  fi
fi

rollback() {
  status=$?
  trap - EXIT HUP INT TERM
  if [ "$completed" != true ]; then
    if [ -n "$receipt_tmp" ] && [ -f "$receipt_tmp" ]; then unlink "$receipt_tmp"; fi
    printf '%s\n' "$created_targets" | while IFS= read -r target_path; do
      if [ -n "$target_path" ] && [ -L "$target_path" ]; then unlink "$target_path"; fi
    done
  fi
  exit "$status"
}
trap rollback EXIT HUP INT TERM

if [ ! -d "$codex_skills_dir" ]; then
  mkdir -p "$codex_skills_dir"
fi

for package_name in $required_packages; do
  source_path="$pack_root/skills/$package_name"
  target_path="$codex_skills_dir/$package_name"
  if [ -L "$target_path" ] && [ "$target_path" -ef "$source_path" ]; then
    echo "✓ $package_name уже подключён"
    continue
  fi
  ln -s "$source_path" "$target_path"
  created_targets="${created_targets}
${target_path}"
  echo "✓ Подключён $package_name"
done

receipt_tmp="$receipt.tmp.$$"
{
  printf 'pack=travel-figma-codex\n'
  printf 'version=%s\n' "$pack_version"
  printf 'source=%s\n' "$pack_root"
} > "$receipt_tmp"
mv "$receipt_tmp" "$receipt"

completed=true
trap - EXIT HUP INT TERM
echo "✓ Установка завершена"

if bash "$pack_root/doctor.sh" --installed; then
  :
else
  doctor_status=$?
  if [ "$doctor_status" -ne 2 ]; then exit "$doctor_status"; fi
fi

echo "Открой новую задачу Codex и начни с read-only smoke-test из SMOKE-TESTS.md."
