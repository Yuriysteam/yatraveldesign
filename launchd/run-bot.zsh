#!/bin/zsh
set -euo pipefail

script_dir=${0:A:h:h}
account=$(id -un)
export TELEGRAM_BOT_TOKEN="$(security find-generic-password -a "$account" -s yatraveldesign-bot-token -w)"
exec /usr/bin/python3 "$script_dir/bot.py"
