#!/bin/bash
# tests/test_startup.sh — Verify fresh page load renders correct initial state
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "Startup / Fresh Page Load Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

agent-browser open "$BASE_URL/components/progress-bar"
sleep 2

# 1. URL lands on progress-bar (default recipe)
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "progress-bar" && pass "URL lands on progress-bar" || fail "URL: got '$VALUE' (expected: /components/progress-bar)"

# 2. Machine state shows 'idle' (initial state)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
[ "$VALUE" = "idle" ] && pass "Machine state: idle" || fail "Machine state: got '$VALUE' (expected: idle)"

# 3. Readout progress is 0 (initial context)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]')?.textContent")
[ "$VALUE" = "0" ] && pass "Readout progress: 0" || fail "Readout progress: got '$VALUE' (expected: 0)"

# 4. Readout isActive is false (initial context)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-active\"]')?.textContent")
[ "$VALUE" = "false" ] && pass "Readout isActive: false" || fail "Readout isActive: got '$VALUE' (expected: false)"

# 5. Docs pill exists and is not active
VALUE=$(browser_eval "document.querySelector('[data-testid=\"topbar-docs\"]')?.classList.contains('active')")
[ "$VALUE" = "false" ] && pass "Docs pill not active on load" || fail "Docs pill active on load: got '$VALUE'"

# 6. Stage-live visible (demo showing, not docs)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stage-live\"]') !== null")
[ "$VALUE" = "true" ] && pass "Stage-live visible on load" || fail "Stage-live missing on load"

# 7. Instructions button exists
VALUE=$(browser_eval "document.querySelector('[data-testid=\"tab-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Instructions button present" || fail "Instructions button missing"

# 8. XState window object exposed
VALUE=$(browser_eval "window.__xstate__?.state")
[ -n "$VALUE" ] && pass "XState exposed on window (state=$VALUE)" || fail "XState not exposed on window"

# 9. No JS errors on page load
JS_ERRORS=$(agent-browser errors 2>/dev/null || echo "")
if [ -z "$JS_ERRORS" ] || echo "$JS_ERRORS" | grep -q "^\[\]$"; then
    pass "No JS errors detected"
else
    fail "JS errors found: $JS_ERRORS"
fi

agent-browser close 2>/dev/null || true
print_summary
