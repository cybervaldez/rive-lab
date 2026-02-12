#!/bin/bash
# tests/test_state_readout.sh — Verify live state readout panel
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

# 1. Initial readout shows progress-bar values (idle/0/false)
STATE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
PROG=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]')?.textContent")
ACTIVE=$(browser_eval "document.querySelector('[data-testid=\"readout-active\"]')?.textContent")
[ "$STATE" = "idle" ] && [ "$PROG" = "0" ] && [ "$ACTIVE" = "false" ] && pass "Initial readout: state=idle, progress=0, isActive=false" || fail "Initial readout: state='$STATE' progress='$PROG' isActive='$ACTIVE' (expected: idle/0/false)"

# 2. Readout updates on recipe change (toggle-switch: state=off, isOn=false, no progress)
agent-browser open "$BASE_URL/components/toggle-switch" 2>/dev/null
sleep 2

STATE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
ACTIVE=$(browser_eval "document.querySelector('[data-testid=\"readout-active\"]')?.textContent")
HAS_PROGRESS=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]') !== null")
[ "$STATE" = "off" ] && [ "$ACTIVE" = "false" ] && pass "Toggle-switch readout: state=off, isOn=false" || fail "Toggle-switch readout: state='$STATE' isOn='$ACTIVE' (expected: off/false)"
[ "$HAS_PROGRESS" = "false" ] && pass "Toggle-switch hides progress readout" || fail "Toggle-switch still shows progress readout"

# 3. Switch to counter — shows count via progress source
agent-browser open "$BASE_URL/components/counter" 2>/dev/null
sleep 2

STATE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
PROG=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]')?.textContent")
[ "$STATE" = "idle" ] && [ "$PROG" = "0" ] && pass "Counter readout: state=idle, count=0" || fail "Counter readout: state='$STATE' count='$PROG' (expected: idle/0)"

# 4. Readout tracks animation (progress-bar: reset, start, check progress increments)
agent-browser open "$BASE_URL/components/progress-bar" 2>/dev/null
sleep 2
agent-browser eval "document.querySelector('[data-testid=\"btn-reset\"]')?.click()" 2>/dev/null
sleep 0.5
agent-browser eval "document.querySelector('[data-testid=\"btn-start\"]')?.click()" 2>/dev/null
sleep 1

PROG=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]')?.textContent")
[ "$PROG" -gt 0 ] 2>/dev/null && pass "Readout tracks animation: progress=$PROG (incrementing)" || fail "Readout not tracking animation: progress='$PROG'"

# 5. Readout state is consistent (still loading or complete)
DOM_STATE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
[ -n "$DOM_STATE" ] && pass "Readout state visible: '$DOM_STATE'" || fail "Readout state empty"

agent-browser close 2>/dev/null || true
print_summary
