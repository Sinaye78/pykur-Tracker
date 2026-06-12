#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${PYKUR_APP_DIR:-/var/www/pykur-tracker}"

systemctl enable nginx
systemctl start nginx

if ! pm2 describe pykur-api >/dev/null 2>&1; then
  cd "$APP_DIR/server"
  pm2 start server.js --name pykur-api --update-env
fi

pm2 save
pm2 startup systemd -u root --hp /root
systemctl enable pm2-root
systemctl restart pm2-root

echo "Démarrage automatique configuré pour Nginx et pykur-api."
