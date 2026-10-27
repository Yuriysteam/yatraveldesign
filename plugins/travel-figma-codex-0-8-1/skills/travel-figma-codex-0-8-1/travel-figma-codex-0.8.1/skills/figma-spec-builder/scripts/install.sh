#!/bin/sh

set -eu

skill_script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
skill_source_dir=$(dirname -- "$skill_script_dir")
team_skills_dir=$(dirname -- "$skill_source_dir")
codex_root_dir=${CODEX_HOME:-"$HOME/.codex"}
codex_skills_dir="$codex_root_dir/skills"
required_packages="figma-spec-builder figma-design-machine travel-figma-design-system yandex-travel-ux-writing"

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

preflight_source() {
  package_name=$1
  source_path="$team_skills_dir/$package_name"

  if [ ! -f "$source_path/SKILL.md" ]; then
    echo "Нет обязательного пакета: $source_path" >&2
    exit 1
  fi
}

compatible_companion_copy() {
  comparison_source=$1
  comparison_target=$2

  if [ ! -d "$comparison_target" ] || [ -L "$comparison_target" ]; then
    return 1
  fi

  # Reject links and special entries before diff can follow or read them.
  if ! nonregular_entries=$(find "$comparison_source" "$comparison_target" ! -type d ! -type f -print); then
    return 1
  fi
  if [ -n "$nonregular_entries" ]; then
    return 1
  fi

  # Compare every filename and its contents, including references and scripts.
  diff -qr "$comparison_source" "$comparison_target" >/dev/null 2>&1
}

preflight_target() {
  package_name=$1
  source_path="$team_skills_dir/$package_name"
  target_path="$codex_skills_dir/$package_name"

  if [ -L "$target_path" ]; then
    if [ "$target_path" -ef "$source_path" ]; then
      return
    fi
    echo "Конфликт: $target_path уже является другой ссылкой. Ничего не изменено." >&2
    exit 1
  fi

  if [ -e "$target_path" ]; then
    if [ "$package_name" != "figma-spec-builder" ] && compatible_companion_copy "$source_path" "$target_path"; then
      return
    fi
    echo "Конфликт: $target_path уже существует и отличается от командного пакета. Ничего не перезаписано." >&2
    exit 1
  fi
}

preflight_destination() {
  destination_write_needed=false

  for package_name in $required_packages; do
    target_path="$codex_skills_dir/$package_name"
    if [ ! -e "$target_path" ] && [ ! -L "$target_path" ]; then
      destination_write_needed=true
      break
    fi
  done

  if [ "$destination_write_needed" = false ]; then
    return
  fi

  if [ -e "$codex_skills_dir" ]; then
    if [ ! -d "$codex_skills_dir" ] || [ -L "$codex_skills_dir" ] || [ ! -w "$codex_skills_dir" ]; then
      echo "Каталог недоступен или небезопасен для установки: $codex_skills_dir" >&2
      exit 1
    fi
    return
  fi

  if [ -e "$codex_root_dir" ]; then
    if [ ! -d "$codex_root_dir" ] || [ -L "$codex_root_dir" ] || [ ! -w "$codex_root_dir" ]; then
      echo "CODEX_HOME недоступен или является symlink: $codex_root_dir" >&2
      exit 1
    fi
    return
  fi

  codex_parent_dir=$(dirname -- "$codex_root_dir")
  if [ ! -d "$codex_parent_dir" ] || [ -L "$codex_parent_dir" ] || [ ! -w "$codex_parent_dir" ]; then
    echo "Родитель CODEX_HOME недоступен или является symlink: $codex_parent_dir" >&2
    exit 1
  fi
}

install_one() {
  package_name=$1
  source_path="$team_skills_dir/$package_name"
  target_path="$codex_skills_dir/$package_name"

  if [ -L "$target_path" ] && [ "$target_path" -ef "$source_path" ]; then
    echo "✓ $package_name уже подключён к командному источнику"
    return
  fi

  if [ -e "$target_path" ]; then
    echo "✓ $package_name уже установлен совместимой копией"
    return
  fi

  ln -s "$source_path" "$target_path"
  echo "✓ Подключён $package_name"
}

check_figma_prerequisites() {
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
  else
    echo "• Локальные навыки установлены, но Figma integration не подтверждена. Подключи Figma plugin в Codex и запусти read-only smoke-test."
  fi
}

"$skill_source_dir/scripts/validate.sh"

for package_name in $required_packages; do
  preflight_source "$package_name"
  preflight_target "$package_name"
done
preflight_destination

if [ ! -d "$codex_skills_dir" ]; then
  mkdir -p "$codex_skills_dir"
fi

for package_name in $required_packages; do
  install_one "$package_name"
done

check_figma_prerequisites
echo "Готово. Открой новую задачу Codex и начни с read-only вызова \$figma-design-machine или \$figma-spec-builder."
