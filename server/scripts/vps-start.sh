#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${PYKUR_APP_DIR:-/var/www/pykur-tracker}"

systemctl start nginx
if pm2 describe pykur-api >/dev/null 2>&1; then
  pm2 restart pykur-api --update-env
else
  cd "$APP_DIR/server"
  pm2 start server.js --name pykur-api --update-env
fi
pm2 save

curl --fail --silent --show-error http://127.0.0.1:3000/api/health
printf '\nSite démarré.\n'
