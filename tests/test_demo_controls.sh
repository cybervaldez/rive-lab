#!/bin/bash
# tests/test_demo_controls.sh — Verify start/reset animation controls
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "Demo Controls / Animation Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

agent-browser open "$BASE_URL/components/progress-bar"
sleep 2

# 1. Reset sets state to idle, progress to 0, isActive to false
agent-browser eval "document.querySelector('[data-testid=\"btn-reset\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
[ "$VALUE" = "idle" ] && pass "Reset: machine state = idle" || fail "Reset machine state: got '$VALUE' (expected: idle)"

# 2. Reset progress is 0
VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]')?.textContent")
[ "$VALUE" = "0" ] && pass "Reset: progress = 0" || fail "Reset progress: got '$VALUE' (expected: 0)"

# 3. Reset isActive is false
VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-active\"]')?.textContent")
[ "$VALUE" = "false" ] && pass "Reset: isActive = false" || fail "Reset isActive: got '$VALUE' (expected: false)"

# 4. Start transitions to loading
agent-browser eval "document.querySelector('[data-testid=\"btn-start\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
[ "$VALUE" = "loading" ] && pass "Start: machine state = loading" || fail "Start machine state: got '$VALUE' (expected: loading)"

# 5. Progress increments (should be > 0 after 0.5s)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]')?.textContent")
[ "$VALUE" -gt 0 ] 2>/dev/null && pass "Start: progress incrementing ($VALUE > 0)" || fail "Start progress not incrementing: got '$VALUE'"

# 6. Animation completes — wait for full animation (60ms/tick * ~100 ticks = ~6s + buffer)
sleep 7

VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
PROG=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]')?.textContent")
ACTIVE=$(browser_eval "document.querySelector('[data-testid=\"readout-active\"]')?.textContent")
[ "$VALUE" = "complete" ] && [ "$PROG" = "100" ] && [ "$ACTIVE" = "false" ] && pass "Animation complete: state=complete, progress=100, isActive=false" || fail "Animation end state: state='$VALUE' progress='$PROG' isActive='$ACTIVE' (expected: complete/100/false)"

# 7. Double-start is safe (clicking start again while complete should not error)
agent-browser eval "document.querySelector('[data-testid=\"btn-start\"]')?.click()" 2>/dev/null
sleep 0.5
VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
[ -n "$VALUE" ] && pass "Double-start safe: state='$VALUE' (no crash)" || fail "Double-start caused an error"

agent-browser close 2>/dev/null || true
print_summary
