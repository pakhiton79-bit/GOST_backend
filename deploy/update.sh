#!/bin/sh
# Обновление сайта до последней версии из GitHub (данные в DATA_DIR не
# затрагиваются). Запуск: sudo /opt/taraplus/deploy/update.sh
set -e
cd /opt/taraplus
sudo -u taraplus git pull --ff-only
cd backend
sudo -u taraplus npm ci --omit=dev
systemctl restart taraplus
systemctl --no-pager status taraplus | head -5
