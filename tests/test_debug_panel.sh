#!/bin/bash
# tests/test_debug_panel.sh — Verify dedicated resizable debug panel
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
# PHASE 1: Debug panel toggle
# ============================================================================
echo ""
echo "--- PHASE 1: Debug panel toggle ---"

agent-browser open "$BASE_URL/components/counter" 2>/dev/null
sleep 3

# 1. Debug button exists
VALUE=$(browser_eval "document.querySelector('[data-testid=\"tab-debug\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug button exists" || fail "Debug button missing"

# 2. Debug panel not open initially
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "false" ] && pass "Debug panel hidden by default" || fail "Debug panel should be hidden"

# 3. Click debug button opens panel
browser_eval "document.querySelector('[data-testid=\"tab-debug\"]')?.click()" > /dev/null
sleep 1

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug panel opens on click" || fail "Debug panel not opened"

# 4. Debug panel contains StateGraph
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"] [data-testid=\"state-graph\"]') !== null")
[ "$VALUE" = "true" ] && pass "StateGraph present in debug panel" || fail "StateGraph missing"

# 5. Debug panel contains ContextInspector
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"] [data-testid=\"context-inspector\"]') !== null")
[ "$VALUE" = "true" ] && pass "ContextInspector present in debug panel" || fail "ContextInspector missing"

# 6. Debug panel contains EventLog
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"] [data-testid=\"event-log\"]') !== null")
[ "$VALUE" = "true" ] && pass "EventLog present in debug panel" || fail "EventLog missing"

# 7. State graph shows current: idle
VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-graph-current\"]')?.textContent")
echo "$VALUE" | grep -q "idle" && pass "State graph shows current: idle" || fail "State graph current: '$VALUE'"

# 8. Context shows count: 0
VALUE=$(browser_eval "document.querySelector('[data-testid=\"ctx-count\"]')?.textContent")
echo "$VALUE" | grep -q "0" && pass "Context shows count: 0" || fail "Context count: '$VALUE'"

# 9. Click debug button again closes panel
browser_eval "document.querySelector('[data-testid=\"tab-debug\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "false" ] && pass "Debug panel closes on second click" || fail "Debug panel still open"

# ============================================================================
# PHASE 2: Mutual exclusivity
# ============================================================================
echo ""
echo "--- PHASE 2: Mutual exclusivity ---"

# 10. Open debug panel
browser_eval "document.querySelector('[data-testid=\"tab-debug\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug panel open" || fail "Debug panel not open"

# 11. Click instructions — debug closes, instructions opens
browser_eval "document.querySelector('[data-testid=\"tab-panel\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "false" ] && pass "Debug panel closed when instructions opened" || fail "Debug panel still open"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"recipe-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Instructions panel opened" || fail "Instructions panel not found"

# 12. Click debug — instructions closes, debug opens
browser_eval "document.querySelector('[data-testid=\"tab-debug\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"recipe-panel\"]') !== null")
[ "$VALUE" = "false" ] && pass "Instructions panel closed when debug opened" || fail "Instructions still open"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug panel opened" || fail "Debug panel not found"

# ============================================================================
# PHASE 3: Live state updates
# ============================================================================
echo ""
echo "--- PHASE 3: Live state updates ---"

# 13. Send increment — state graph updates, context updates, event log captures
browser_eval "window.__xstate__['CounterSM'].send({ type: 'increment' })" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-graph-current\"]')?.textContent")
echo "$VALUE" | grep -q "counting" && pass "State graph updates to counting" || fail "State graph current: '$VALUE'"

# 14. Context inspector shows updated count
VALUE=$(browser_eval "document.querySelector('[data-testid=\"ctx-count\"] .context-inspector-value')?.textContent")
[ "$VALUE" = "1" ] && pass "Context inspector shows count: 1" || fail "Context count: '$VALUE'"

# 15. Event log has entries
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
# PHASE 5: App page — debug panel with nested states
# ============================================================================
echo ""
echo "--- PHASE 5: App page (input-demo) ---"

agent-browser open "$BASE_URL/apps/input-demo" 2>/dev/null
sleep 3

# 18. Debug button exists
VALUE=$(browser_eval "document.querySelector('[data-testid=\"tab-debug\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug button on app page" || fail "Debug button missing on app page"

# 19. Open debug panel
browser_eval "document.querySelector('[data-testid=\"tab-debug\"]')?.click()" > /dev/null
sleep 1

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug panel opens on app page" || fail "Debug panel not found"

# 20. State graph shows active state
VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-graph-current\"]')?.textContent")
echo "$VALUE" | grep -q "active" && pass "State graph shows active state" || fail "State graph: '$VALUE'"

# 21. Context inspector shows bindings
VALUE=$(browser_eval "document.querySelector('[data-testid=\"ctx-bindings\"]') !== null")
[ "$VALUE" = "true" ] && pass "Context shows bindings key" || fail "bindings not in context"

# 22. Transition to configuring — nested states visible
browser_eval "window.__xstate__['InputDemoSM'].send({ type: 'OPEN_MAPPER' })" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-graph-current\"]')?.textContent")
echo "$VALUE" | grep -q "configuring" && pass "Graph shows configuring after transition" || fail "Graph: '$VALUE'"

# 23. Event log captured OPEN_MAPPER
VALUE=$(browser_eval "document.querySelector('[data-testid=\"event-log-entries\"]')?.textContent")
echo "$VALUE" | grep -q "OPEN_MAPPER" && pass "Event log captured OPEN_MAPPER" || fail "OPEN_MAPPER not in log"

# 24. Reset machine
browser_eval "window.__xstate__['InputDemoSM'].reset()" > /dev/null
sleep 0.5

# ============================================================================
# PHASE 6: Resize handle exists
# ============================================================================
echo ""
echo "--- PHASE 6: Resize handle ---"

# 25. Resize handle present when panel is open
VALUE=$(browser_eval "document.querySelector('[data-testid=\"resize-handle\"]') !== null")
[ "$VALUE" = "true" ] && pass "Resize handle present" || fail "Resize handle missing"

# 26. Close button works
browser_eval "document.querySelector('[data-testid=\"right-panel-close\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "false" ] && pass "Panel closed via close button" || fail "Panel not closed"

agent-browser close 2>/dev/null || true
print_summary
