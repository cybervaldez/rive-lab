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

# 2. Machine state shows 'idle' in topbar
VALUE=$(browser_eval "document.querySelector('[data-testid=\"app-state\"]')?.textContent")
[ "$VALUE" = "idle" ] && pass "Machine state: idle" || fail "Machine state: got '$VALUE' (expected: idle)"

# 3. Machine context via __xstate__ (progress=0, isActive=false)
PROGRESS=$(browser_eval "window.__xstate__?.ProgressBarSM?.context()?.progress")
[ "$PROGRESS" = "0" ] && pass "Initial progress: 0" || fail "Initial progress: got '$PROGRESS' (expected: 0)"

ACTIVE=$(browser_eval "window.__xstate__?.ProgressBarSM?.context()?.isActive")
[ "$ACTIVE" = "false" ] && pass "Initial isActive: false" || fail "Initial isActive: got '$ACTIVE' (expected: false)"

# 4. Debug footer bar visible on load
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-footer-bar\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug footer bar visible on load" || fail "Debug footer bar missing on load"

# 5. Stage-live visible (demo showing, not docs)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stage-live\"]') !== null")
[ "$VALUE" = "true" ] && pass "Stage-live visible on load" || fail "Stage-live missing on load"

# 6. Instructions button exists
VALUE=$(browser_eval "document.querySelector('[data-testid=\"toggle-instruct\"]') !== null")
[ "$VALUE" = "true" ] && pass "Instructions button present" || fail "Instructions button missing"

# 7. XState window object exposed
VALUE=$(browser_eval "window.__xstate__?.ProgressBarSM?.state()")
[ -n "$VALUE" ] && pass "XState exposed on window (state=$VALUE)" || fail "XState not exposed on window"

# 8. No JS errors on page load
JS_ERRORS=$(agent-browser errors 2>/dev/null || echo "")
if [ -z "$JS_ERRORS" ] || echo "$JS_ERRORS" | grep -q "^\[\]$"; then
    pass "No JS errors detected"
else
    fail "JS errors found: $JS_ERRORS"
fi

agent-browser close 2>/dev/null || true
print_summary
