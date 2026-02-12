#!/bin/bash
# tests/test_pagination.sh — Verify prev/next cycling through recipes
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "Pagination Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

agent-browser open "$BASE_URL/components/progress-bar"
sleep 2

# Helper: click pagination button, refresh agent-browser on new URL
pagination_click() {
    local TESTID="$1"
    agent-browser eval "document.querySelector('[data-testid=\"$TESTID\"]')?.click()" 2>/dev/null
    sleep 1
    # Read the new URL and re-open to refresh DOM context
    local NEW_URL
    NEW_URL=$(agent-browser eval "window.location.href" 2>/dev/null)
    NEW_URL="${NEW_URL%\"}"
    NEW_URL="${NEW_URL#\"}"
    agent-browser open "$NEW_URL" 2>/dev/null
    sleep 2
}

# Start at index 0 (progress-bar)

# 1. Next: 0 → 1 (toggle-switch)
pagination_click "pagination-next"

VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "toggle-switch" && pass "Next 0→1: toggle-switch" || fail "Next 0→1: got '$VALUE' (expected: toggle-switch)"

# 2. Next: 1 → 2 (counter)
pagination_click "pagination-next"

VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "counter" && pass "Next 1→2: counter" || fail "Next 1→2: got '$VALUE' (expected: counter)"

# 3. Next wraps: 2 → 0 (progress-bar)
pagination_click "pagination-next"

VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "progress-bar" && pass "Next wraps 2→0: progress-bar" || fail "Next wraps 2→0: got '$VALUE' (expected: progress-bar)"

# 4. Prev wraps: 0 → 2 (counter)
pagination_click "pagination-prev"

VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "counter" && pass "Prev wraps 0→2: counter" || fail "Prev wraps 0→2: got '$VALUE' (expected: counter)"

# 5. Dot 2 is active (index 2 = counter)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"pagination-dot-2\"]')?.classList.contains('active')")
[ "$VALUE" = "true" ] && pass "Dot 2 is active" || fail "Dot 2 not active: got '$VALUE'"

# 6. Dot 0 is not active
VALUE=$(browser_eval "document.querySelector('[data-testid=\"pagination-dot-0\"]')?.classList.contains('active')")
[ "$VALUE" = "false" ] && pass "Dot 0 is not active" || fail "Dot 0 should not be active: got '$VALUE'"

# 7. Readout matches counter recipe (state=idle, count=0)
STATE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
PROG=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]')?.textContent")
[ "$STATE" = "idle" ] && [ "$PROG" = "0" ] && pass "Counter readout: state=idle, count=0" || fail "Counter readout: state='$STATE', count='$PROG' (expected: idle, 0)"

agent-browser close 2>/dev/null || true
print_summary
