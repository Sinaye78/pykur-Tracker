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

health_ready=0
for attempt in {1..20}; do
  if curl --fail --silent --show-error http://127.0.0.1:3000/api/health; then
    health_ready=1
    break
  fi
  sleep 1
done

if [ "$health_ready" -ne 1 ]; then
  printf '\nL API ne repond pas apres 20 secondes.\n' >&2
  pm2 logs pykur-api --lines 30 --nostream >&2 || true
  exit 1
fi
printf '\nDéploiement terminé.\n'
