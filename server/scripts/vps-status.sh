#!/usr/bin/env bash
set -u

echo "=== Nginx ==="
systemctl is-active nginx || true
echo
echo "=== API PM2 ==="
pm2 jlist 2>/dev/null | node -e '
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  try {
    const apps = JSON.parse(input);
    if (!apps.length) {
      console.log("Aucun processus PM2.");
      return;
    }
    for (const app of apps) {
      const env = app.pm2_env || {};
      const memory = app.monit && app.monit.memory ? `${(app.monit.memory / 1048576).toFixed(1)} MB` : "-";
      console.log(`${app.name}: ${env.status || "inconnu"} | pid ${app.pid || "-"} | mémoire ${memory}`);
    }
  } catch (error) {
    console.log("Etat PM2 indisponible.");
  }
});
' || pm2 status || true
echo
echo "=== Santé API ==="
curl --fail --silent --show-error http://127.0.0.1:3000/api/health || true
echo
echo "=== Disque ==="
df -h / | tail -n 1
echo
echo "=== Mémoire ==="
free -h
