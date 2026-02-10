#!/bin/bash
# tests/test_instruct_tab.sh — Verify instruct tab content
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "Instruct Tab Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

agent-browser open "$BASE_URL"
sleep 2

# 1. Click instruct tab — tab becomes active
agent-browser eval "document.querySelector('[data-testid=\"tab-instruct\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"tab-instruct\"]')?.classList.contains('active')")
[ "$VALUE" = "true" ] && pass "Instruct tab is active" || fail "Instruct tab not active: got '$VALUE'"

# 2. Instruct list exists
VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-list\"]') !== null")
[ "$VALUE" = "true" ] && pass "Instruct list exists" || fail "Instruct list not found"

# 3. Progress-bar recipe has 7 steps
VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-list\"]')?.querySelectorAll('li').length")
[ "$VALUE" = "7" ] && pass "Progress-bar instruct: 7 steps" || fail "Progress-bar instruct steps: got '$VALUE' (expected: 7)"

# 4. First step title is "Create ViewModel"
TITLE=$(browser_eval "document.querySelector('[data-testid=\"instruct-step-0\"] .instruct-step-title')?.textContent")
[ "$TITLE" = "Create ViewModel" ] && pass "First step title: Create ViewModel" || fail "First step title: got '$TITLE' (expected: Create ViewModel)"

# 5. First step detail is correct
DETAIL=$(browser_eval "document.querySelector('[data-testid=\"instruct-step-0\"] .instruct-step-detail')?.textContent")
[ "$DETAIL" = "Add a ViewModel named ProgressBarVM to the artboard" ] && pass "First step detail: Add a ViewModel named ProgressBarVM to the artboard" || fail "First step detail: got '$DETAIL'"

# 6. Switch to toggle-switch → 5 steps
agent-browser eval "document.querySelector('[data-testid=\"entry-toggle-switch\"]')?.click()" 2>/dev/null
sleep 0.5
agent-browser eval "document.querySelector('[data-testid=\"tab-instruct\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-list\"]')?.querySelectorAll('li').length")
[ "$VALUE" = "5" ] && pass "Toggle-switch instruct: 5 steps" || fail "Toggle-switch instruct steps: got '$VALUE' (expected: 5)"

# 7. Toggle-switch first step title is "Create ViewModel"
TITLE=$(browser_eval "document.querySelector('[data-testid=\"instruct-step-0\"] .instruct-step-title')?.textContent")
[ "$TITLE" = "Create ViewModel" ] && pass "Toggle-switch first step: Create ViewModel" || fail "Toggle-switch first step: got '$TITLE' (expected: Create ViewModel)"

agent-browser close 2>/dev/null || true
print_summary
