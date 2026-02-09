#!/bin/bash
# tests/test_welcome.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5173}"

cleanup() {
    agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

agent-browser open "$BASE_URL"
sleep 1

# Check welcome message
agent-browser snapshot -c | grep -q "Welcome to rive-playbook-guidelines"

# Verify window state
STATE=$(agent-browser eval "window.appState?.initialized" 2>/dev/null)
[ "$STATE" = "true" ] && echo "  [PASS] App state initialized"

echo "PASS: Welcome page loads successfully"
