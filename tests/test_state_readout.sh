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

agent-browser open "$BASE_URL"
sleep 2

# 1. Initial readout shows progress-bar values
STATE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
PROG=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]')?.textContent")
ACTIVE=$(browser_eval "document.querySelector('[data-testid=\"readout-active\"]')?.textContent")
[ "$STATE" = "loading" ] && [ "$PROG" = "65" ] && [ "$ACTIVE" = "true" ] && pass "Initial readout: state=loading, progress=65, isActive=true" || fail "Initial readout: state='$STATE' progress='$PROG' isActive='$ACTIVE' (expected: loading/65/true)"

# 2. Readout updates on recipe change (switch to toggle-switch) — shows 'isOn' not 'progress'
agent-browser eval "document.querySelector('[data-testid=\"entry-toggle-switch\"]')?.click()" 2>/dev/null
sleep 0.5

STATE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
ACTIVE=$(browser_eval "document.querySelector('[data-testid=\"readout-active\"]')?.textContent")
HAS_PROGRESS=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]') !== null")
[ "$STATE" = "off" ] && [ "$ACTIVE" = "false" ] && pass "Toggle-switch readout: state=off, isOn=false" || fail "Toggle-switch readout: state='$STATE' isOn='$ACTIVE' (expected: off/false)"
[ "$HAS_PROGRESS" = "false" ] && pass "Toggle-switch hides progress readout" || fail "Toggle-switch still shows progress readout"

# 2b. Switch to counter — shows 'count' label via progress source
agent-browser eval "document.querySelector('[data-testid=\"entry-counter\"]')?.click()" 2>/dev/null
sleep 0.5

STATE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
PROG=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]')?.textContent")
ACTIVE=$(browser_eval "document.querySelector('[data-testid=\"readout-active\"]')?.textContent")
[ "$STATE" = "idle" ] && [ "$PROG" = "0" ] && [ "$ACTIVE" = "false" ] && pass "Counter readout: state=idle, count=0, isActive=false" || fail "Counter readout: state='$STATE' count='$PROG' isActive='$ACTIVE' (expected: idle/0/false)"

# 3. Readout tracks animation (switch back to progress-bar, reset, start)
agent-browser eval "document.querySelector('[data-testid=\"entry-progress-bar\"]')?.click()" 2>/dev/null
sleep 0.5
agent-browser eval "document.querySelector('[data-testid=\"btn-reset\"]')?.click()" 2>/dev/null
sleep 0.5
agent-browser eval "document.querySelector('[data-testid=\"btn-start\"]')?.click()" 2>/dev/null
sleep 1

PROG=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]')?.textContent")
[ "$PROG" -gt 0 ] 2>/dev/null && pass "Readout tracks animation: progress=$PROG (incrementing)" || fail "Readout not tracking animation: progress='$PROG'"

# 4. Readout matches window.__xstate__ state
DOM_STATE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
WIN_STATE=$(browser_eval "window.__xstate__?.state")
[ "$DOM_STATE" = "$WIN_STATE" ] && pass "Readout matches __xstate__: state='$DOM_STATE'" || fail "Readout/xstate mismatch: DOM='$DOM_STATE' window='$WIN_STATE'"

# 5. Readout progress matches window.__xstate__ context
DOM_PROG=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]')?.textContent")
WIN_PROG=$(browser_eval "String(window.__xstate__?.context?.progress)")
[ "$DOM_PROG" = "$WIN_PROG" ] && pass "Readout matches __xstate__: progress='$DOM_PROG'" || fail "Readout/xstate progress mismatch: DOM='$DOM_PROG' window='$WIN_PROG'"

agent-browser close 2>/dev/null || true
print_summary
