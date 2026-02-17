#!/bin/bash
# tests/test_command_palette.sh — Verify recipe selection updates state
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "Command Palette / Recipe Selection Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

# Start at progress-bar
agent-browser open "$BASE_URL/components/progress-bar"
sleep 2

# 1. Initial recipe is progress-bar
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "progress-bar" && pass "Initial recipe: progress-bar" || fail "Initial recipe: got '$VALUE'"

# 2. Navigate to toggle-switch — state updates
agent-browser open "$BASE_URL/components/toggle-switch" 2>/dev/null
sleep 2

VALUE=$(browser_eval "document.querySelector('[data-testid=\"app-state\"]')?.textContent")
[ "$VALUE" = "off" ] && pass "Toggle-switch state: off" || fail "Toggle-switch state: got '$VALUE' (expected: off)"

# 3. Toggle-switch context shows isActive=false
VALUE=$(browser_eval "window.__xstate__?.ToggleSwitchSM?.context()?.isActive")
[ "$VALUE" = "false" ] && pass "Toggle-switch isActive: false" || fail "Toggle-switch isActive: got '$VALUE' (expected: false)"

# 4. Navigate to counter — state updates
agent-browser open "$BASE_URL/components/counter" 2>/dev/null
sleep 2

VALUE=$(browser_eval "document.querySelector('[data-testid=\"app-state\"]')?.textContent")
[ "$VALUE" = "idle" ] && pass "Counter state: idle" || fail "Counter state: got '$VALUE' (expected: idle)"

# 5. Counter context shows count=0
VALUE=$(browser_eval "window.__xstate__?.CounterSM?.context()?.count")
[ "$VALUE" = "0" ] && pass "Counter count: 0" || fail "Counter count: got '$VALUE' (expected: 0)"

# 6. Navigate back to progress-bar — state resets
agent-browser open "$BASE_URL/components/progress-bar" 2>/dev/null
sleep 2

VALUE=$(browser_eval "document.querySelector('[data-testid=\"app-state\"]')?.textContent")
[ "$VALUE" = "idle" ] && pass "Back to progress-bar state: idle" || fail "Back to progress-bar state: got '$VALUE' (expected: idle)"

# 7. Demo view visible (not docs)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stage-live\"]') !== null")
[ "$VALUE" = "true" ] && pass "Stage-live visible after recipe switch" || fail "Stage-live missing after recipe switch"

agent-browser close 2>/dev/null || true
print_summary
