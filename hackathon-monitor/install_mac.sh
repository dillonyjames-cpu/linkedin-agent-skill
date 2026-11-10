#!/bin/bash
# Installs the hourly iMessage sync on this Mac. Run from this folder:
#   bash install_mac.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
PY="$(python3 -c 'import sys; print(sys.executable)')"
LABEL="com.hackathon-monitor.imessage-sync"
DEST="$HOME/Library/LaunchAgents/$LABEL.plist"

[ -f "$DIR/config.json" ] || { echo "Create config.json first (copy config.example.json)."; exit 1; }

echo "Checking that $PY can read Messages..."
if ! "$PY" "$DIR/imessage_sync.py" --dry-run >/dev/null; then
  echo
  echo "It can't yet. Open System Settings > Privacy & Security > Full Disk Access,"
  echo "click +, press Cmd+Shift+G, paste this path, and turn it on:"
  echo "  $PY"
  echo "Then run this script again."
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"
sed -e "s#__PYTHON__#$PY#g" -e "s#__DIR__#$DIR#g" "$DIR/$LABEL.plist" > "$DEST"
launchctl bootout "gui/$(id -u)" "$DEST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$DEST"
echo "Installed. It runs now and then every hour. Log: $DIR/sync.log"
echo "To stop it:  launchctl bootout gui/$(id -u) $DEST"
