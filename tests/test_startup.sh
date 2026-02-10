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

agent-browser open "$BASE_URL"
sleep 2

# 1. Stage title shows first recipe name
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stage-title\"]')?.textContent")
[ "$VALUE" = "PROGRESS BAR" ] && pass "Stage title shows 'PROGRESS BAR'" || fail "Stage title: got '$VALUE' (expected: PROGRESS BAR)"

# 2. Machine state shows 'loading'
VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
[ "$VALUE" = "loading" ] && pass "Machine state shows 'loading'" || fail "Machine state: got '$VALUE' (expected: loading)"

# 3. Sidebar bindings count is 7
VALUE=$(browser_eval "document.querySelector('[data-testid=\"status-bindings\"]')?.textContent")
[ "$VALUE" = "7" ] && pass "Sidebar bindings: 7" || fail "Sidebar bindings: got '$VALUE' (expected: 7)"

# 4. Sidebar states count is 3
VALUE=$(browser_eval "document.querySelector('[data-testid=\"status-states\"]')?.textContent")
[ "$VALUE" = "3" ] && pass "Sidebar states: 3" || fail "Sidebar states: got '$VALUE' (expected: 3)"

# 5. Footer bindings matches
VALUE=$(browser_eval "document.querySelector('[data-testid=\"footer-bindings\"]')?.textContent")
[ "$VALUE" = "7" ] && pass "Footer bindings: 7" || fail "Footer bindings: got '$VALUE' (expected: 7)"

# 6. Footer states matches
VALUE=$(browser_eval "document.querySelector('[data-testid=\"footer-states\"]')?.textContent")
[ "$VALUE" = "3" ] && pass "Footer states: 3" || fail "Footer states: got '$VALUE' (expected: 3)"

# 7. Footer triggers matches
VALUE=$(browser_eval "document.querySelector('[data-testid=\"footer-triggers\"]')?.textContent")
[ "$VALUE" = "2" ] && pass "Footer triggers: 2" || fail "Footer triggers: got '$VALUE' (expected: 2)"

# 8. Readout state shows 'loading'
VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
[ "$VALUE" = "loading" ] && pass "Readout state: loading" || fail "Readout state: got '$VALUE' (expected: loading)"

# 9. Readout progress shows 65
VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]')?.textContent")
[ "$VALUE" = "65" ] && pass "Readout progress: 65" || fail "Readout progress: got '$VALUE' (expected: 65)"

# 10. XState window object exposed
VALUE=$(browser_eval "window.__xstate__?.state")
[ -n "$VALUE" ] && pass "XState exposed on window (state=$VALUE)" || fail "XState not exposed on window"

# 11. No JS errors on page load
ERRORS=$(browser_eval "window.__jsErrors?.length || 0")
[ "$ERRORS" = "0" ] || [ -z "$ERRORS" ] && pass "No JS errors detected" || fail "JS errors found: $ERRORS"

agent-browser close 2>/dev/null || true
print_summary
