#!/bin/bash
# tests/test_debug_panel.sh — Verify debug footer + panel (standardized layout)
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "Debug Panel Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

# ============================================================================
# PHASE 1: Debug footer toggle (component page)
# ============================================================================
echo ""
echo "--- PHASE 1: Debug footer toggle ---"

agent-browser open "$BASE_URL/components/counter" 2>/dev/null
sleep 3

# 1. Debug footer bar always visible
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-footer-bar\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug footer bar visible" || fail "Debug footer bar missing"

# 2. Debug panel not open initially
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "false" ] && pass "Debug panel hidden by default" || fail "Debug panel should be hidden"

# 3. Click footer bar opens panel
browser_eval "document.querySelector('[data-testid=\"debug-footer-bar\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug panel opens on bar click" || fail "Debug panel not opened"

# 4. Debug panel has tabs
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel-tabs\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug panel tabs present" || fail "Debug panel tabs missing"

# 5. Context tab active by default — ContextInspector visible
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-tab-context\"]')?.classList.contains('debug-panel-tab--active')")
[ "$VALUE" = "true" ] && pass "Context tab active by default" || fail "Context tab not active"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"] [data-testid=\"context-inspector\"]') !== null")
[ "$VALUE" = "true" ] && pass "ContextInspector present in debug panel" || fail "ContextInspector missing"

# 6. Click State tab — StateGraph visible
browser_eval "document.querySelector('[data-testid=\"debug-tab-state\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"] [data-testid=\"state-graph\"]') !== null")
[ "$VALUE" = "true" ] && pass "StateGraph present on State tab" || fail "StateGraph missing"

# 7. State graph shows current: idle
VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-graph-current\"]')?.textContent")
echo "$VALUE" | grep -q "idle" && pass "State graph shows current: idle" || fail "State graph current: '$VALUE'"

# 7b. Click Events tab — EventLog visible
browser_eval "document.querySelector('[data-testid=\"debug-tab-events\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"] [data-testid=\"event-log\"]') !== null")
[ "$VALUE" = "true" ] && pass "EventLog present on Events tab" || fail "EventLog missing"

# 8. Switch back to Context tab — check count: 0
browser_eval "document.querySelector('[data-testid=\"debug-tab-context\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"ctx-count\"]')?.textContent")
echo "$VALUE" | grep -q "0" && pass "Context shows count: 0" || fail "Context count: '$VALUE'"

# 9. Click footer bar again closes panel
browser_eval "document.querySelector('[data-testid=\"debug-footer-bar\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "false" ] && pass "Debug panel closes on second click" || fail "Debug panel still open"

# ============================================================================
# PHASE 2: Debug + Instruct independence
# ============================================================================
echo ""
echo "--- PHASE 2: Debug + Instruct independence ---"

# 10. Open debug panel
browser_eval "document.querySelector('[data-testid=\"debug-footer-bar\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug panel open" || fail "Debug panel not open"

# 11. Open instruct overlay — debug stays open (independent)
browser_eval "document.querySelector('[data-testid=\"toggle-instruct\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug stays open when instruct opened" || fail "Debug closed unexpectedly"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-overlay\"]') !== null")
[ "$VALUE" = "true" ] && pass "Instruct overlay opened" || fail "Instruct overlay not found"

# 12. Close instruct — debug still open
browser_eval "document.querySelector('[data-testid=\"instruct-close\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug still open after instruct closed" || fail "Debug panel not found"

# ============================================================================
# PHASE 3: Live state updates
# ============================================================================
echo ""
echo "--- PHASE 3: Live state updates ---"

# 13. Send increment — state graph updates, context updates, event log captures
browser_eval "window.__xstate__['CounterSM'].send({ type: 'increment' })" > /dev/null
sleep 0.5

# Switch to State tab to check state graph
browser_eval "document.querySelector('[data-testid=\"debug-tab-state\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-graph-current\"]')?.textContent")
echo "$VALUE" | grep -q "counting" && pass "State graph updates to counting" || fail "State graph current: '$VALUE'"

# 14. Switch to Context tab — inspector shows updated count
browser_eval "document.querySelector('[data-testid=\"debug-tab-context\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"ctx-count\"] .context-inspector-value')?.textContent")
[ "$VALUE" = "1" ] && pass "Context inspector shows count: 1" || fail "Context count: '$VALUE'"

# 15. Switch to Events tab — log has entries
browser_eval "document.querySelector('[data-testid=\"debug-tab-events\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelectorAll('[data-testid=\"event-log-entries\"] .event-log-row').length > 0")
[ "$VALUE" = "true" ] && pass "Event log has entries after transition" || fail "Event log empty"

# 16. Event log shows increment event
VALUE=$(browser_eval "document.querySelector('[data-testid=\"event-log-entries\"]')?.textContent")
echo "$VALUE" | grep -q "increment" && pass "Event log shows increment event" || fail "increment not in log: '$VALUE'"

# ============================================================================
# PHASE 4: Event log clear
# ============================================================================
echo ""
echo "--- PHASE 4: Event log clear ---"

# 17. Clear button resets log
browser_eval "document.querySelector('[data-testid=\"event-log-clear\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelectorAll('[data-testid=\"event-log-entries\"] .event-log-row').length")
[ "$VALUE" = "0" ] && pass "Event log cleared" || fail "Event log not cleared: $VALUE entries remain"

# ============================================================================
# PHASE 5: App page — debug footer with nested states
# ============================================================================
echo ""
echo "--- PHASE 5: App page (input-demo) ---"

agent-browser open "$BASE_URL/apps/input-demo" 2>/dev/null
sleep 3

# 18. Debug footer bar exists on app page
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-footer-bar\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug footer bar on app page" || fail "Debug footer bar missing on app page"

# 19. Open debug panel via footer bar
browser_eval "document.querySelector('[data-testid=\"debug-footer-bar\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug panel opens on app page" || fail "Debug panel not found"

# 20. Context tab active by default — shows bindings
VALUE=$(browser_eval "document.querySelector('[data-testid=\"ctx-bindings\"]') !== null")
[ "$VALUE" = "true" ] && pass "Context shows bindings key" || fail "bindings not in context"

# 21. Switch to State tab — shows active state
browser_eval "document.querySelector('[data-testid=\"debug-tab-state\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-graph-current\"]')?.textContent")
echo "$VALUE" | grep -q "active" && pass "State graph shows active state" || fail "State graph: '$VALUE'"

# 22. Transition to configuring — state graph updates
browser_eval "window.__xstate__['InputDemoSM'].send({ type: 'OPEN_MAPPER' })" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-graph-current\"]')?.textContent")
echo "$VALUE" | grep -q "configuring" && pass "Graph shows configuring after transition" || fail "Graph: '$VALUE'"

# 23. Switch to Events tab — log captured OPEN_MAPPER
browser_eval "document.querySelector('[data-testid=\"debug-tab-events\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"event-log-entries\"]')?.textContent")
echo "$VALUE" | grep -q "OPEN_MAPPER" && pass "Event log captured OPEN_MAPPER" || fail "OPEN_MAPPER not in log"

# 24. Reset machine
browser_eval "window.__xstate__['InputDemoSM'].reset()" > /dev/null
sleep 0.5

# ============================================================================
# PHASE 6: Debug footer pin button
# ============================================================================
echo ""
echo "--- PHASE 6: Debug footer pin ---"

# 25. Pin button exists when debug is open
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-footer-pin\"]') !== null")
[ "$VALUE" = "true" ] && pass "Pin button present" || fail "Pin button missing"

# 26. Close debug via footer bar click
browser_eval "document.querySelector('[data-testid=\"debug-footer-bar\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "false" ] && pass "Debug closed via footer bar" || fail "Debug not closed"

agent-browser close 2>/dev/null || true
print_summary
