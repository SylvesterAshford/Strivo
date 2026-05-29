#!/usr/bin/env bash
# Update mobile/.env's EXPO_PUBLIC_API_BASE_URL to the laptop's current LAN IP.
# Run any time the WiFi network changes:
#
#     ./scripts/sync-lan-ip.sh
#
# Then restart Metro with cache cleared: `npx expo start -c`
set -euo pipefail

ENV_FILE="$(dirname "$0")/../.env"

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
if [ -z "$IP" ]; then
  echo "✗ No LAN IP found on en0 / en1. Are you connected to WiFi?"
  exit 1
fi

PORT=3000
NEW_URL="http://${IP}:${PORT}"

# Read current value, compare.
CURRENT=$(grep "^EXPO_PUBLIC_API_BASE_URL=" "$ENV_FILE" 2>/dev/null | sed 's/EXPO_PUBLIC_API_BASE_URL=//')

if [ "$CURRENT" = "$NEW_URL" ]; then
  echo "✓ mobile/.env already points at ${NEW_URL}"
  exit 0
fi

# macOS sed needs the empty string argument after -i.
sed -i '' "s|^EXPO_PUBLIC_API_BASE_URL=.*|EXPO_PUBLIC_API_BASE_URL=${NEW_URL}|" "$ENV_FILE"

echo "✓ Updated mobile/.env:"
echo "    old: ${CURRENT:-<unset>}"
echo "    new: ${NEW_URL}"
echo
echo "Next: restart Metro with cleared cache so the new env loads:"
echo "    npx expo start -c"
