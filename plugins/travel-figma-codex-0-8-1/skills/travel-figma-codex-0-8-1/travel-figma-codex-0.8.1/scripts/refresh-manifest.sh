#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
manifest="$repo_root/MANIFEST.sha256"
manifest_tmp=$(mktemp "$repo_root/.MANIFEST.sha256.XXXXXX")

cleanup() {
  if [ -f "$manifest_tmp" ]; then unlink "$manifest_tmp"; fi
}
trap cleanup EXIT HUP INT TERM

for required_file in PACK.json codex-install.json README.md AGENTS.md; do
  if [ ! -f "$repo_root/$required_file" ] || [ -L "$repo_root/$required_file" ]; then
    echo "Нет обязательного обычного файла: $required_file" >&2
    exit 1
  fi
done

if find "$repo_root" \( -path "$repo_root/.git" -o -path "$repo_root/dist" \) -prune -o ! -type d ! -type f -print | grep -q .; then
  echo "Обнаружен symlink или специальный файл; manifest не обновлён." >&2
  exit 1
fi

(
  cd "$repo_root"
  find . \( -path './.git' -o -path './dist' \) -prune -o -type f ! -name 'MANIFEST.sha256' ! -name '.DS_Store' ! -name '.MANIFEST.sha256.*' -print | LC_ALL=C sort | while IFS= read -r relative_path; do
    shasum -a 256 "$relative_path"
  done
) > "$manifest_tmp"

mv "$manifest_tmp" "$manifest"
trap - EXIT HUP INT TERM
echo "✓ MANIFEST.sha256 обновлён"
