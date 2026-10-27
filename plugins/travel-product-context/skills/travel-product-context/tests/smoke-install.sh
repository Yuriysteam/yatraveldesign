#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
test_root=$(mktemp -d "${TMPDIR:-/tmp}/travel-product-context-test.XXXXXX")

cleanup() {
  case "$test_root" in
    "${TMPDIR:-/tmp}"/travel-product-context-test.*)
      if [ -d "$test_root" ] && [ ! -L "$test_root" ]; then rm -rf -- "$test_root"; fi
      ;;
    *) echo "Отмена cleanup: неожиданный путь $test_root" >&2 ;;
  esac
}
trap cleanup EXIT HUP INT TERM

git_home="$test_root/git-home"
CODEX_HOME="$git_home" bash "$root/install.sh"
CODEX_HOME="$git_home" bash "$root/install.sh"
CODEX_HOME="$git_home" bash "$root/doctor.sh" --installed

if [ ! -L "$git_home/skills/travel-product-context" ]; then
  echo "Ошибка: Git install не создал ссылку" >&2
  exit 1
fi

CODEX_HOME="$git_home" bash "$root/uninstall.sh" >/dev/null
CODEX_HOME="$git_home" bash "$root/uninstall.sh" --apply >/dev/null
if [ -e "$git_home/skills/travel-product-context" ] || [ -L "$git_home/skills/travel-product-context" ]; then
  echo "Ошибка: uninstall не удалил управляемую ссылку" >&2
  exit 1
fi

archive="$root/dist/travel-product-context-$(tr -d '[:space:]' < "$root/VERSION").zip"
upload="$test_root/upload"
mkdir "$upload"
unzip -q "$archive" -d "$upload"
package_root=$(find "$upload" -mindepth 1 -maxdepth 1 -type d -print -quit)
if [ -z "$package_root" ] || [ ! -f "$package_root/bootstrap.sh" ]; then
  echo "Ошибка: ZIP не содержит ожидаемый package root" >&2
  exit 1
fi

zip_home="$test_root/zip-home"
CODEX_HOME="$zip_home" bash "$package_root/bootstrap.sh"
managed="$zip_home/team-packs/travel-product-context/$(tr -d '[:space:]' < "$root/VERSION")"
if [ ! -d "$managed" ] || [ ! -L "$zip_home/skills/travel-product-context" ]; then
  echo "Ошибка: bootstrap не создал managed copy и skill link" >&2
  exit 1
fi
CODEX_HOME="$zip_home" bash "$managed/doctor.sh" --installed

echo "✓ Smoke test пройден: Git install, idempotency, uninstall и ZIP bootstrap"
