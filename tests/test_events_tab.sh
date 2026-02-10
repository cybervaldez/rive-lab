#!/bin/bash
# tests/test_events_tab.sh — Verify events table content
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "Events Tab Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

agent-browser open "$BASE_URL"
sleep 2

# 1. Click events tab — tab becomes active
agent-browser eval "document.querySelector('[data-testid=\"tab-events\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"tab-events\"]')?.classList.contains('active')")
[ "$VALUE" = "true" ] && pass "Events tab is active" || fail "Events tab not active: got '$VALUE'"

# 2. Events table exists
VALUE=$(browser_eval "document.querySelector('[data-testid=\"events-table\"]') !== null")
[ "$VALUE" = "true" ] && pass "Events table exists" || fail "Events table not found"

# 3. Progress-bar recipe has 6 event rows
VALUE=$(browser_eval "document.querySelector('[data-testid=\"events-table\"]')?.querySelectorAll('tbody tr').length")
[ "$VALUE" = "6" ] && pass "Progress-bar events: 6 rows" || fail "Progress-bar event rows: got '$VALUE' (expected: 6)"

# 4. First row name is "progress"
NAME=$(browser_eval "document.querySelector('[data-testid=\"events-table\"] tbody tr:first-child td:first-child')?.textContent")
[ "$NAME" = "progress" ] && pass "First row name: progress" || fail "First row name: got '$NAME' (expected: progress)"

# 5. Table headers are correct
TH1=$(browser_eval "document.querySelector('[data-testid=\"events-table\"] thead th:nth-child(1)')?.textContent")
TH2=$(browser_eval "document.querySelector('[data-testid=\"events-table\"] thead th:nth-child(2)')?.textContent")
TH3=$(browser_eval "document.querySelector('[data-testid=\"events-table\"] thead th:nth-child(3)')?.textContent")
TH4=$(browser_eval "document.querySelector('[data-testid=\"events-table\"] thead th:nth-child(4)')?.textContent")
[ "$TH1" = "Name" ] && [ "$TH2" = "Direction" ] && [ "$TH3" = "Type" ] && [ "$TH4" = "Description" ] && pass "Headers: Name | Direction | Type | Description" || fail "Headers: got '$TH1' | '$TH2' | '$TH3' | '$TH4'"

# 6. Switch to toggle-switch → 3 event rows
agent-browser eval "document.querySelector('[data-testid=\"entry-toggle-switch\"]')?.click()" 2>/dev/null
sleep 0.5
agent-browser eval "document.querySelector('[data-testid=\"tab-events\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"events-table\"]')?.querySelectorAll('tbody tr').length")
[ "$VALUE" = "3" ] && pass "Toggle-switch events: 3 rows" || fail "Toggle-switch event rows: got '$VALUE' (expected: 3)"

# 7. Toggle-switch first row name is "isOn"
NAME=$(browser_eval "document.querySelector('[data-testid=\"events-table\"] tbody tr:first-child td:first-child')?.textContent")
[ "$NAME" = "isOn" ] && pass "Toggle-switch first row: isOn" || fail "Toggle-switch first row: got '$NAME' (expected: isOn)"

agent-browser close 2>/dev/null || true
print_summary
