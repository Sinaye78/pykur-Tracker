#!/usr/bin/env bash
set -u

echo "=== Nginx ==="
systemctl is-active nginx || true
echo
echo "=== API PM2 ==="
pm2 status || true
echo
echo "=== Santé API ==="
curl --fail --silent --show-error http://127.0.0.1:3000/api/health || true
echo
echo "=== Disque ==="
df -h / | tail -n 1
echo
echo "=== Mémoire ==="
free -h
