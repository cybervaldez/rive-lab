#!/bin/bash
# tests/test_recipe_panel.sh — Verify RecipePanel tabbed docs across components + apps
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "RecipePanel Tabbed Docs Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

# ============================================================================
# PHASE 1: Component page — RecipePanel with Steps + Reference tabs (no concept)
# ============================================================================
echo ""
echo "--- PHASE 1: Component page (counter) ---"

agent-browser open "$BASE_URL/components/counter" 2>/dev/null
sleep 3

# 1. Open instructions panel
browser_eval "document.querySelector('[data-testid=\"tab-panel\"]')?.click()" > /dev/null
sleep 1

# 2. RecipePanel renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"recipe-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "RecipePanel renders on component page" || fail "RecipePanel missing"

# 3. Tab bar renders with correct tabs (no concept tab for counter)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"recipe-tab-concept\"]') !== null")
[ "$VALUE" = "false" ] && pass "No concept tab for counter (correct)" || fail "Concept tab should not show for counter"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"recipe-tab-steps\"]') !== null")
[ "$VALUE" = "true" ] && pass "Steps tab present" || fail "Steps tab missing"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"recipe-tab-reference\"]') !== null")
[ "$VALUE" = "true" ] && pass "Reference tab present" || fail "Reference tab missing"

# 4. Default tab is steps (since no concept)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"recipe-tab-steps\"]')?.classList.contains('recipe-panel-tab--active')")
[ "$VALUE" = "true" ] && pass "Steps tab active by default (no concept)" || fail "Steps tab not active by default"

# 5. Steps tab shows instruct list
VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-list\"]') !== null")
[ "$VALUE" = "true" ] && pass "Instruct list renders in steps tab" || fail "Instruct list missing"

# 6. Switch to Reference tab
browser_eval "document.querySelector('[data-testid=\"recipe-tab-reference\"]')?.click()" > /dev/null
sleep 0.5

# 7. Reference tab shows machine doc (meta section) but NOT state graph
VALUE=$(browser_eval "document.querySelector('[data-testid=\"section-meta\"]') !== null")
[ "$VALUE" = "true" ] && pass "Machine doc meta section renders in reference tab" || fail "Machine doc missing"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"reference-tab\"] [data-testid=\"state-graph\"]') !== null")
[ "$VALUE" = "false" ] && pass "StateGraph NOT in reference tab (moved to debug)" || fail "StateGraph should not be in reference tab"

# 8. Docs pill removed from topbar (merged into reference tab)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"topbar-docs\"]') !== null")
[ "$VALUE" = "false" ] && pass "Docs pill removed from topbar" || fail "Docs pill still in topbar"

# 9. Stage always shows demo (no MachineDoc in stage)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stage-live\"]') !== null")
[ "$VALUE" = "true" ] && pass "Stage shows live demo (not docs)" || fail "Stage not showing demo"

# ============================================================================
# PHASE 2: App page — RecipePanel with Concept + Steps + Reference tabs
# ============================================================================
echo ""
echo "--- PHASE 2: App page (input-demo) ---"

agent-browser open "$BASE_URL/apps/input-demo" 2>/dev/null
sleep 3

# 10. Open instructions panel
browser_eval "document.querySelector('[data-testid=\"tab-panel\"]')?.click()" > /dev/null
sleep 1

# 11. RecipePanel renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"recipe-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "RecipePanel renders on app page" || fail "RecipePanel missing on app page"

# 12. All three tabs present
VALUE=$(browser_eval "document.querySelector('[data-testid=\"recipe-tab-concept\"]') !== null")
[ "$VALUE" = "true" ] && pass "Concept tab present for input-demo" || fail "Concept tab missing"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"recipe-tab-steps\"]') !== null")
[ "$VALUE" = "true" ] && pass "Steps tab present" || fail "Steps tab missing"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"recipe-tab-reference\"]') !== null")
[ "$VALUE" = "true" ] && pass "Reference tab present" || fail "Reference tab missing"

# 13. Default tab is concept (since concept exists)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"recipe-tab-concept\"]')?.classList.contains('recipe-panel-tab--active')")
[ "$VALUE" = "true" ] && pass "Concept tab active by default" || fail "Concept tab not active by default"

# 14. Concept tab shows summary
VALUE=$(browser_eval "document.querySelector('[data-testid=\"concept-summary\"]')?.textContent")
echo "$VALUE" | grep -qi "two independent visual regions" && pass "Concept summary renders" || fail "Concept summary: '$VALUE'"

# 15. Concept tab shows regions table
VALUE=$(browser_eval "document.querySelector('[data-testid=\"concept-regions\"]') !== null")
[ "$VALUE" = "true" ] && pass "Concept regions table renders" || fail "Regions table missing"

# 16. Region rows correct
VALUE=$(browser_eval "document.querySelector('[data-testid=\"concept-region-receiver\"]') !== null")
[ "$VALUE" = "true" ] && pass "Receiver region row present" || fail "Receiver region missing"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"concept-region-mapper-overlay\"]') !== null")
[ "$VALUE" = "true" ] && pass "Mapper Overlay region row present" || fail "Mapper Overlay region missing"

# ============================================================================
# PHASE 3: Tab switching + instruct checklist still works
# ============================================================================
echo ""
echo "--- PHASE 3: Tab switching + checklist ---"

# 17. Switch to steps tab
browser_eval "document.querySelector('[data-testid=\"recipe-tab-steps\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-list\"]') !== null")
[ "$VALUE" = "true" ] && pass "Steps tab shows instruct list" || fail "Instruct list missing in steps tab"

# 18. Instruct step count correct (7 steps for input-demo)
VALUE=$(browser_eval "document.querySelectorAll('.instruct-step').length")
[ "$VALUE" = "7" ] && pass "7 instruct steps rendered" || fail "Expected 7 steps, got $VALUE"

# 19. Test button present
VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-test-btn\"]') !== null")
[ "$VALUE" = "true" ] && pass "Test button present in steps tab" || fail "Test button missing"

# 20. Switch back to concept tab
browser_eval "document.querySelector('[data-testid=\"recipe-tab-concept\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"concept-tab\"]') !== null")
[ "$VALUE" = "true" ] && pass "Concept tab content shows after switch" || fail "Concept tab content missing"

agent-browser close 2>/dev/null || true
print_summary
