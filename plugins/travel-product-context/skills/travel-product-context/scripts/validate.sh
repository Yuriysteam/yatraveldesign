#!/bin/bash
set -euo pipefail

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)

for required in SKILL.md agents/openai.yaml README.md VERSION codex-install.json references/product-passport/README.md references/product-passport/domains references/product-passport/visual references/product-passport/catalog; do
  if [[ ! -e "$root/$required" ]]; then
    echo "Ошибка: отсутствует $required" >&2
    exit 1
  fi
done

skill_name=$(sed -n 's/^name:[[:space:]]*//p' "$root/SKILL.md" | head -n 1)
skill_version=$(sed -n 's/^[[:space:]]*version:[[:space:]]*//p' "$root/SKILL.md" | head -n 1)
version=$(tr -d '[:space:]' < "$root/VERSION")
install_version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$root/codex-install.json" | head -n 1)

if [[ "$skill_name" != "travel-product-context" ]]; then
  echo "Ошибка: неожиданное имя скилла: $skill_name" >&2
  exit 1
fi
if [[ -z "$version" || "$skill_version" != "$version" || "$install_version" != "$version" ]]; then
  echo "Ошибка: версии в VERSION, SKILL.md и codex-install.json расходятся" >&2
  exit 1
fi

if find "$root" \( -path "$root/.git" -o -path "$root/dist" \) -prune -o ! -type d ! -type f -print | grep -q .; then
  echo "Ошибка: package содержит symlink или специальный файл" >&2
  exit 1
fi

json_files=()
while IFS= read -r -d '' file; do json_files+=("$file"); done < <(find "$root" \( -path "$root/.git" -o -path "$root/dist" \) -prune -o -type f -name '*.json' -print0)

if command -v python3 >/dev/null 2>&1; then
  for file in "${json_files[@]}"; do python3 -m json.tool "$file" >/dev/null; done
elif command -v node >/dev/null 2>&1; then
  for file in "${json_files[@]}"; do node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$file"; done
elif command -v ruby >/dev/null 2>&1; then
  for file in "${json_files[@]}"; do ruby -rjson -e 'JSON.parse(File.read(ARGV.fetch(0)))' "$file"; done
else
  echo "Ошибка: нужен python3, node или ruby для проверки JSON" >&2
  exit 1
fi

if command -v rg >/dev/null 2>&1 && rg -n --hidden --glob '!.git/**' --glob '!dist/**' '(BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|ya29\.[A-Za-z0-9_-]+|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})' "$root"; then
  echo "Ошибка: найден текст, похожий на секрет" >&2
  exit 1
fi

echo "✓ Структура travel-product-context корректна"
