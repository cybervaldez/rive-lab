#!/bin/bash
# tests/test_welcome.sh — Verify homepage renders correctly
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "Welcome / Homepage Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

agent-browser open "$BASE_URL"
sleep 2

# 1. Homepage renders rive-lab heading
VALUE=$(browser_eval "document.querySelector('h1')?.textContent")
echo "$VALUE" | grep -q "rive-lab" && pass "rive-lab heading rendered" || fail "rive-lab heading not found: got '$VALUE'"

# 2. Primary CTA links to demo
VALUE=$(browser_eval "document.querySelector('a[href=\"/components/progress-bar\"]') !== null")
[ "$VALUE" = "true" ] && pass "Try the demo CTA present" || fail "Try the demo CTA missing"

# 3. Browse all link present
VALUE=$(browser_eval "document.querySelector('a[href=\"/components\"]') !== null")
[ "$VALUE" = "true" ] && pass "Browse all CTA present" || fail "Browse all CTA missing"

# 4. Contract table present
VALUE=$(browser_eval "document.querySelector('.contract-table') !== null")
[ "$VALUE" = "true" ] && pass "Contract table present" || fail "Contract table missing"

# 5. Explore section has apps link
VALUE=$(browser_eval "document.querySelector('a[href=\"/apps\"]') !== null")
[ "$VALUE" = "true" ] && pass "Apps link present" || fail "Apps link missing"

# 6. No JS errors
JS_ERRORS=$(agent-browser errors 2>/dev/null || echo "")
if [ -z "$JS_ERRORS" ] || echo "$JS_ERRORS" | grep -q "^\[\]$"; then
    pass "No JS errors on homepage"
else
    fail "JS errors: $JS_ERRORS"
fi

agent-browser close 2>/dev/null || true
print_summary
