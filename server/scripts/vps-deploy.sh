#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${PYKUR_APP_DIR:-/var/www/pykur-tracker}"
BRANCH="${PYKUR_BRANCH:-main}"

cd "$APP_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

cd "$APP_DIR/server"
npm ci --omit=dev
pm2 restart pykur-api --update-env
pm2 save

if [ "$(id -u)" -eq 0 ] && [ -f "$APP_DIR/server/nginx/familier-tracker-compression.conf" ]; then
  install -m 0644 "$APP_DIR/server/nginx/familier-tracker-compression.conf" /etc/nginx/conf.d/familier-tracker-compression.conf
fi

nginx -t
systemctl reload nginx

curl --fail --silent --show-error http://127.0.0.1:3000/api/health
printf '\nDéploiement terminé.\n'
