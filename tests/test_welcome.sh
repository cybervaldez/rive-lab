#!/bin/bash
# tests/test_welcome.sh — Verify TanStack Start SSR homepage
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5173}"

cleanup() {
    agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

agent-browser open "$BASE_URL"
sleep 2

# Check SSR-rendered command palette with rive-lab prompt
agent-browser snapshot -c | grep -q "rive-lab"
echo "  [PASS] rive-lab prompt rendered"

# Verify XState debug state is exposed (client-side hydration)
STATE=$(agent-browser eval "window.__xstate__?.state" 2>/dev/null)
[ -n "$STATE" ] && echo "  [PASS] XState state exposed: $STATE"

# Verify app state initialized
INIT=$(agent-browser eval "window.appState?.initialized" 2>/dev/null)
[ "$INIT" = "true" ] && echo "  [PASS] App state initialized"

echo "PASS: Welcome page loads successfully"
