#!/bin/sh

set -eu

case "$#:$*" in
  0:) run_tests=false ;;
  1:--tests) run_tests=true ;;
  *) echo "Использование: $0 [--tests]" >&2; exit 2 ;;
esac

validator_script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
node_runtime=""

if command -v node >/dev/null 2>&1; then
  node_runtime=$(command -v node)
else
  for runtime_candidate in "$HOME"/.cache/codex-runtimes/*/dependencies/node/bin/node; do
    if [ -x "$runtime_candidate" ]; then
      node_runtime=$runtime_candidate
      break
    fi
  done
fi

if [ -z "$node_runtime" ]; then
  echo "Не найден Node.js: пакет не проверен." >&2
  exit 1
fi

"$node_runtime" "$validator_script_dir/validate-package.mjs"
if [ "$run_tests" = true ]; then
  exec "$node_runtime" --test "$validator_script_dir/../tests/validate-package.test.mjs" "$validator_script_dir/../tests/install.test.mjs"
fi
