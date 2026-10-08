#!/bin/sh
# Ежедневная копия данных сайта (запускается cron, см. README.md): копия
# accounts.json с датой в /var/backups/taraplus, хранятся 30 последних.
# Копии остаются на этом же сервере в России; если нужна копия вне сервера,
# только в другое хранилище в РФ (требование 152-ФЗ о локализации).
set -e
SRC=/var/lib/taraplus/accounts.json
DST=/var/backups/taraplus
[ -f "$SRC" ] || exit 0
mkdir -p "$DST"
cp "$SRC" "$DST/accounts-$(date +%F).json"
chmod 600 "$DST"/accounts-*.json
ls -1t "$DST"/accounts-*.json | tail -n +31 | xargs -r rm -f
