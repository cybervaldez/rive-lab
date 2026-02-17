#!/bin/bash
# tests/test_instruct_tab.sh — Verify instruct panel content (no tabs, single panel)
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "Instruct Panel Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

agent-browser open "$BASE_URL/components/progress-bar"
sleep 2

# 1. Open panel via floating "instructions" button
agent-browser eval "document.querySelector('[data-testid=\"toggle-instruct\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-overlay\"]') !== null")
[ "$VALUE" = "true" ] && pass "Panel opens on click" || fail "Panel not open: got '$VALUE'"

# 2. Instruct list exists (shown directly, no tab selection needed)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-list\"]') !== null")
[ "$VALUE" = "true" ] && pass "Instruct list exists" || fail "Instruct list not found"

# 3. No overlay tabs exist inside instruct overlay
VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-overlay\"] .overlay-tabs') !== null")
[ "$VALUE" = "false" ] && pass "No overlay tabs in instruct panel" || fail "Overlay tabs still present"

# 4. Progress-bar recipe has 7 steps
VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-list\"]')?.querySelectorAll('li').length")
[ "$VALUE" = "7" ] && pass "Progress-bar instruct: 7 steps" || fail "Progress-bar instruct steps: got '$VALUE' (expected: 7)"

# 5. First step title is "Create ViewModel"
TITLE=$(browser_eval "document.querySelector('[data-testid=\"instruct-step-0\"] .instruct-step-title')?.textContent")
[ "$TITLE" = "Create ViewModel" ] && pass "First step title: Create ViewModel" || fail "First step title: got '$TITLE' (expected: Create ViewModel)"

# 6. First step detail is correct
DETAIL=$(browser_eval "document.querySelector('[data-testid=\"instruct-step-0\"] .instruct-step-detail')?.textContent")
[ "$DETAIL" = "Add a ViewModel named ProgressBarVM to the artboard" ] && pass "First step detail correct" || fail "First step detail: got '$DETAIL'"

# 7. Switch to toggle-switch → 5 steps
agent-browser open "$BASE_URL/components/toggle-switch" 2>/dev/null
sleep 2
agent-browser eval "document.querySelector('[data-testid=\"toggle-instruct\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-list\"]')?.querySelectorAll('li').length")
[ "$VALUE" = "5" ] && pass "Toggle-switch instruct: 5 steps" || fail "Toggle-switch instruct steps: got '$VALUE' (expected: 5)"

# 8. Toggle-switch first step title is "Create ViewModel"
TITLE=$(browser_eval "document.querySelector('[data-testid=\"instruct-step-0\"] .instruct-step-title')?.textContent")
[ "$TITLE" = "Create ViewModel" ] && pass "Toggle-switch first step: Create ViewModel" || fail "Toggle-switch first step: got '$TITLE' (expected: Create ViewModel)"

agent-browser close 2>/dev/null || true
print_summary
