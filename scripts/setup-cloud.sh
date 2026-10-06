#!/usr/bin/env bash
set -euo pipefail
cd /workspace/testing-nature
# Keep cloud tool caches in writable locations; no HOME/system-directory changes.
export npm_config_cache=/tmp/wildfolio-npm
export EXPO_NO_TELEMETRY=1
export __UNSAFE_EXPO_HOME_DIRECTORY=/tmp/wildfolio-expo-home
npm ci
npm run check
# Use the installed SDK compatibility manifest when metadata APIs are unavailable.
EXPO_OFFLINE=1 npx expo install --check
npx expo config --type public --json > /tmp/wildfolio-config.json
