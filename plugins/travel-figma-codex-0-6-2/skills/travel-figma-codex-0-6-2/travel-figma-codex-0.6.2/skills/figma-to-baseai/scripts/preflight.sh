#!/bin/sh

set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
skill_root=$(dirname -- "$script_dir")
pack_root=$(dirname -- "$(dirname -- "$skill_root")")
workspace_root=${1:-}
explicit_baseai_root=${2:-}
codex_root_dir=${CODEX_HOME:-"$HOME/.codex"}
runtime_receipt="$codex_root_dir/team-runtimes/BaseAI/.active"
baseai_root=""

if [ "$#" -gt 2 ]; then
  echo "Использование: $0 [workspace-root] [baseai-root]" >&2
  exit 2
fi

if [ -n "$workspace_root" ]; then
  case "$workspace_root" in
    /*) ;;
    *) echo "workspace-root должен быть абсолютным путём" >&2; exit 1 ;;
  esac
  if [ -d "$workspace_root/BaseAI" ]; then
    baseai_root="$workspace_root/BaseAI"
  fi
fi

if [ -z "$baseai_root" ] && [ -f "$runtime_receipt" ]; then
  installed_runtime=$(sed -n 's/^source=//p' "$runtime_receipt" | head -n 1)
  case "$installed_runtime" in
    /*) ;;
    *) echo "Некорректный BaseAI receipt: $runtime_receipt" >&2; exit 1 ;;
  esac
  if [ -d "$installed_runtime/BaseAI" ]; then
    baseai_root="$installed_runtime/BaseAI"
  else
    echo "BaseAI receipt указывает на отсутствующий runtime: $installed_runtime" >&2
    exit 1
  fi
fi

if [ -z "$baseai_root" ] && [ -d "$pack_root/BaseAI" ]; then
  baseai_root="$pack_root/BaseAI"
fi

if [ -z "$baseai_root" ] && [ -n "$explicit_baseai_root" ]; then
  case "$explicit_baseai_root" in
    /*) ;;
    *) echo "baseai-root должен быть абсолютным путём" >&2; exit 1 ;;
  esac
  if [ -d "$explicit_baseai_root" ]; then
    baseai_root="$explicit_baseai_root"
  fi
fi

if [ -z "$baseai_root" ]; then
  echo "BaseAI не найдена в workspace, отдельном runtime, legacy package или явно переданном каталоге." >&2
  exit 1
fi

for required_path in \
  AGENT.md AI_USAGE.md fonts.css library.css components.json manifest.json \
  snippets/snippets.json principles/layouts.md principles/visual-style.md \
  principles/tokens.md principles/validation.md icons/index.json; do
  if [ ! -f "$baseai_root/$required_path" ]; then
    echo "В BaseAI отсутствует обязательный файл: $required_path" >&2
    exit 1
  fi
done

echo "✓ BaseAI runtime: $baseai_root"

node_runtime=""
if command -v node >/dev/null 2>&1; then
  node_runtime=$(command -v node)
fi

if [ -n "$node_runtime" ] && [ -n "$workspace_root" ] && (cd "$workspace_root" && "$node_runtime" -e "require.resolve('playwright')" >/dev/null 2>&1); then
  echo "✓ Локальный Playwright доступен"
else
  echo "• Локальный Playwright не подтверждён; перед работой проверь browser/computer-use инструмент в текущей сессии." >&2
fi

echo "• Figma MCP проверяется отдельным read-only вызовом к целевому node." >&2
