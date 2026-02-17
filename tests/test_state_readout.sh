#!/bin/bash
# tests/test_state_readout.sh — Verify live state via topbar + __xstate__ API
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "State Readout Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

agent-browser open "$BASE_URL/components/progress-bar"
sleep 2

# 1. Initial state shows progress-bar values (idle/0/false)
STATE=$(browser_eval "document.querySelector('[data-testid=\"app-state\"]')?.textContent")
PROG=$(browser_eval "window.__xstate__?.ProgressBarSM?.context()?.progress")
ACTIVE=$(browser_eval "window.__xstate__?.ProgressBarSM?.context()?.isActive")
[ "$STATE" = "idle" ] && [ "$PROG" = "0" ] && [ "$ACTIVE" = "false" ] && pass "Initial: state=idle, progress=0, isActive=false" || fail "Initial: state='$STATE' progress='$PROG' isActive='$ACTIVE' (expected: idle/0/false)"

# 2. State updates on recipe change (toggle-switch: state=off, isActive=false)
agent-browser open "$BASE_URL/components/toggle-switch" 2>/dev/null
sleep 2

STATE=$(browser_eval "document.querySelector('[data-testid=\"app-state\"]')?.textContent")
ACTIVE=$(browser_eval "window.__xstate__?.ToggleSwitchSM?.context()?.isActive")
[ "$STATE" = "off" ] && [ "$ACTIVE" = "false" ] && pass "Toggle-switch: state=off, isActive=false" || fail "Toggle-switch: state='$STATE' isActive='$ACTIVE' (expected: off/false)"

# 3. Switch to counter — shows count=0
agent-browser open "$BASE_URL/components/counter" 2>/dev/null
sleep 2

STATE=$(browser_eval "document.querySelector('[data-testid=\"app-state\"]')?.textContent")
COUNT=$(browser_eval "window.__xstate__?.CounterSM?.context()?.count")
[ "$STATE" = "idle" ] && [ "$COUNT" = "0" ] && pass "Counter: state=idle, count=0" || fail "Counter: state='$STATE' count='$COUNT' (expected: idle/0)"

# 4. State tracks animation (progress-bar: reset, start, check progress increments)
agent-browser open "$BASE_URL/components/progress-bar" 2>/dev/null
sleep 2
agent-browser eval "document.querySelector('[data-testid=\"btn-reset\"]')?.click()" 2>/dev/null
sleep 0.5
agent-browser eval "document.querySelector('[data-testid=\"btn-start\"]')?.click()" 2>/dev/null
sleep 1

PROG=$(browser_eval "window.__xstate__?.ProgressBarSM?.context()?.progress")
[ "$PROG" -gt 0 ] 2>/dev/null && pass "Tracks animation: progress=$PROG (incrementing)" || fail "Not tracking animation: progress='$PROG'"

# 5. State is consistent (still loading or complete)
STATE=$(browser_eval "document.querySelector('[data-testid=\"app-state\"]')?.textContent")
[ -n "$STATE" ] && pass "State visible: '$STATE'" || fail "State empty"

agent-browser close 2>/dev/null || true
print_summary
