#!/bin/zsh
# Avvio del controllo quotidiano del backup dall'attività di macOS: trova Node anche dopo un aggiornamento (nvm o Homebrew)
cd "$(dirname "$0")/.." || exit 1
NODE=$(ls -d "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -1)
[ -x "$NODE" ] || NODE=$(command -v node || ls /opt/homebrew/bin/node /usr/local/bin/node 2>/dev/null | head -1)
if [ ! -x "$NODE" ]; then
  osascript -e 'display alert "Backup Academy Casatese" message "Node non trovato: il backup non può partire. Reinstalla Node." as critical'
  exit 1
fi
exec "$NODE" --env-file=.env.local scripts/controlla-backup.mjs
