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

agent-browser open "$BASE_URL"
sleep 2

# Start at index 0 (PROGRESS BAR)

# 1. Next: 0 → 1 (TOGGLE SWITCH)
agent-browser eval "document.querySelector('[data-testid=\"pagination-next\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stage-title\"]')?.textContent")
[ "$VALUE" = "TOGGLE SWITCH" ] && pass "Next 0→1: TOGGLE SWITCH" || fail "Next 0→1: got '$VALUE' (expected: TOGGLE SWITCH)"

# 2. Next: 1 → 2 (COUNTER)
agent-browser eval "document.querySelector('[data-testid=\"pagination-next\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stage-title\"]')?.textContent")
[ "$VALUE" = "COUNTER" ] && pass "Next 1→2: COUNTER" || fail "Next 1→2: got '$VALUE' (expected: COUNTER)"

# 3. Next wraps: 2 → 0 (PROGRESS BAR)
agent-browser eval "document.querySelector('[data-testid=\"pagination-next\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stage-title\"]')?.textContent")
[ "$VALUE" = "PROGRESS BAR" ] && pass "Next wraps 2→0: PROGRESS BAR" || fail "Next wraps 2→0: got '$VALUE' (expected: PROGRESS BAR)"

# 4. Prev wraps: 0 → 2 (COUNTER)
agent-browser eval "document.querySelector('[data-testid=\"pagination-prev\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stage-title\"]')?.textContent")
[ "$VALUE" = "COUNTER" ] && pass "Prev wraps 0→2: COUNTER" || fail "Prev wraps 0→2: got '$VALUE' (expected: COUNTER)"

# 5. Dot 2 is active (index 2 = COUNTER)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"pagination-dot-2\"]')?.classList.contains('active')")
[ "$VALUE" = "true" ] && pass "Dot 2 is active" || fail "Dot 2 not active: got '$VALUE'"

# 6. Dot 0 is not active
VALUE=$(browser_eval "document.querySelector('[data-testid=\"pagination-dot-0\"]')?.classList.contains('active')")
[ "$VALUE" = "false" ] && pass "Dot 0 is not active" || fail "Dot 0 should not be active: got '$VALUE'"

# 7. Data matches target recipe (COUNTER: bindings=5, states=3)
BINDINGS=$(browser_eval "document.querySelector('[data-testid=\"footer-bindings\"]')?.textContent")
STATES=$(browser_eval "document.querySelector('[data-testid=\"footer-states\"]')?.textContent")
[ "$BINDINGS" = "5" ] && [ "$STATES" = "3" ] && pass "Counter data: bindings=5, states=3" || fail "Counter data: bindings='$BINDINGS', states='$STATES' (expected: 5, 3)"

agent-browser close 2>/dev/null || true
print_summary
