#!/bin/bash
# tests/test_contract_tab.sh — Verify contract table content
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "Contract Tab Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

agent-browser open "$BASE_URL"
sleep 2

# 1. Click contract tab — panel becomes visible
agent-browser eval "document.querySelector('[data-testid=\"tab-contract\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"tab-contract\"]')?.classList.contains('active')")
[ "$VALUE" = "true" ] && pass "Contract tab is active" || fail "Contract tab not active: got '$VALUE'"

# 2. Contract table exists
VALUE=$(browser_eval "document.querySelector('[data-testid=\"contract-table\"]') !== null")
[ "$VALUE" = "true" ] && pass "Contract table exists" || fail "Contract table not found"

# 3. Progress-bar recipe has 7 contract data rows
VALUE=$(browser_eval "document.querySelectorAll('[data-testid=\"contract-row\"]').length")
[ "$VALUE" = "7" ] && pass "Progress-bar contract: 7 data rows" || fail "Progress-bar contract rows: got '$VALUE' (expected: 7)"

# 4. First data row contains 'context.progress' → 'ViewModel property progress (Number)'
XSTATE=$(browser_eval "document.querySelector('[data-testid=\"contract-row\"] td:first-child')?.textContent")
RIVE=$(browser_eval "document.querySelector('[data-testid=\"contract-row\"] td:last-child')?.textContent")
[ "$XSTATE" = "context.progress" ] && [ "$RIVE" = "ViewModel property progress (Number)" ] && pass "First row: context.progress -> ViewModel property progress (Number)" || fail "First row: got '$XSTATE' -> '$RIVE'"

# 4b. Contract has group headers (Properties, Triggers, States)
HAS_PROPS=$(browser_eval "!!document.querySelector('.contract-group-header')")
FIRST_GROUP=$(browser_eval "document.querySelector('.contract-group-header')?.textContent")
[ "$HAS_PROPS" = "true" ] && [ "$FIRST_GROUP" = "Properties" ] && pass "Contract has group headers (first: Properties)" || fail "Contract group headers: exists='$HAS_PROPS' first='$FIRST_GROUP'"

# 5. Table headers are correct
TH1=$(browser_eval "document.querySelector('[data-testid=\"contract-table\"] thead th:first-child')?.textContent")
TH2=$(browser_eval "document.querySelector('[data-testid=\"contract-table\"] thead th:last-child')?.textContent")
[ "$TH1" = "XState (now)" ] && [ "$TH2" = "Rive (later)" ] && pass "Headers: 'XState (now)' | 'Rive (later)'" || fail "Headers: got '$TH1' | '$TH2'"

# 6. Switch to toggle-switch and verify row count changes
agent-browser eval "document.querySelector('[data-testid=\"entry-toggle-switch\"]')?.click()" 2>/dev/null
sleep 0.5
agent-browser eval "document.querySelector('[data-testid=\"tab-contract\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelectorAll('[data-testid=\"contract-row\"]').length")
[ "$VALUE" = "5" ] && pass "Toggle-switch contract: 5 data rows" || fail "Toggle-switch contract rows: got '$VALUE' (expected: 5)"

# 7. Toggle-switch first data row content
XSTATE=$(browser_eval "document.querySelector('[data-testid=\"contract-row\"] td:first-child')?.textContent")
[ "$XSTATE" = "context.isOn" ] && pass "Toggle-switch first row: context.isOn" || fail "Toggle-switch first row: got '$XSTATE' (expected: context.isOn)"

agent-browser close 2>/dev/null || true
print_summary
