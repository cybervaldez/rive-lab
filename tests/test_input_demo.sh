#!/bin/bash
# tests/test_input_demo.sh — Verify input demo app + mix-and-match docs
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "Input Demo & Mix-and-Match Docs Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

# ============================================================================
# PHASE 1: Homepage mix-and-match section
# ============================================================================
echo ""
echo "--- PHASE 1: Homepage mix-and-match section ---"

agent-browser open "$BASE_URL" 2>/dev/null
sleep 3

# 1. Mix-and-match section exists
VALUE=$(browser_eval "document.querySelector('[data-testid=\"homepage-mix-match\"]') !== null")
[ "$VALUE" = "true" ] && pass "Mix-and-match section present on homepage" || fail "Mix-and-match section missing"

# 2. Section has correct heading
VALUE=$(browser_eval "document.querySelector('[data-testid=\"homepage-mix-match\"] .homepage-section-title')?.textContent")
echo "$VALUE" | grep -qi "mix and match" && pass "Mix-and-match heading correct" || fail "Heading: got '$VALUE'"

# 3. Section mentions XState as mediator
VALUE=$(browser_eval "document.querySelector('[data-testid=\"homepage-mix-match\"]')?.textContent")
echo "$VALUE" | grep -qi "machine" && pass "Section mentions machine as mediator" || fail "No mention of machine"

# 4. Section appears between contract and code sections
VALUE=$(browser_eval "
  const sections = [...document.querySelectorAll('.homepage-section')];
  const contractIdx = sections.findIndex(s => s.dataset.testid === 'homepage-contract');
  const mixIdx = sections.findIndex(s => s.dataset.testid === 'homepage-mix-match');
  const codeIdx = sections.findIndex(s => s.dataset.testid === 'homepage-code');
  contractIdx < mixIdx && mixIdx < codeIdx
")
[ "$VALUE" = "true" ] && pass "Section positioned between contract and code" || fail "Section out of order"

# ============================================================================
# PHASE 2: Input demo app renders with machine
# ============================================================================
echo ""
echo "--- PHASE 2: Input demo app rendering ---"

agent-browser open "$BASE_URL/apps/input-demo" 2>/dev/null
sleep 3

# 5. App page renders (no placeholder)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"demo-input\"]') !== null")
[ "$VALUE" = "true" ] && pass "InputDemo component rendered (not placeholder)" || fail "InputDemo not found"

# 6. Four action rows present
VALUE=$(browser_eval "document.querySelectorAll('.demo-input-action').length")
[ "$VALUE" = "4" ] && pass "4 action rows rendered" || fail "Expected 4 actions, got $VALUE"

# 7. Action labels correct (JUMP, ATTACK, DEFEND, DASH)
VALUE=$(browser_eval "
  [...document.querySelectorAll('.demo-input-action-name')].map(e => e.textContent).join(',')
")
echo "$VALUE" | grep -q "JUMP" && echo "$VALUE" | grep -q "ATTACK" && echo "$VALUE" | grep -q "DEFEND" && echo "$VALUE" | grep -q "DASH" \
    && pass "All action labels present: $VALUE" || fail "Missing action labels: $VALUE"

# 8. Configure keys button present
VALUE=$(browser_eval "document.querySelector('[data-testid=\"btn-open-mapper\"]')?.textContent")
echo "$VALUE" | grep -qi "configure" && pass "Configure keys button present" || fail "Configure button missing: '$VALUE'"

# 9. Topbar shows live state (not static)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"app-state\"]')?.textContent")
[ "$VALUE" = "active" ] && pass "Topbar shows live state: active" || fail "Expected 'active', got '$VALUE'"

# 10. XState debug API exposed
VALUE=$(browser_eval "typeof window.__xstate__?.InputDemoSM?.state")
[ "$VALUE" = "function" ] && pass "window.__xstate__.InputDemoSM exposed" || fail "XState debug not found: $VALUE"

# ============================================================================
# PHASE 3: Machine state transitions via window API
# ============================================================================
echo ""
echo "--- PHASE 3: Machine state transitions ---"

# 11. Initial state is 'active'
VALUE=$(browser_eval "window.__xstate__['InputDemoSM'].state()")
[ "$VALUE" = "active" ] && pass "Initial state: active" || fail "Initial state: $VALUE"

# 12. OPEN_MAPPER transitions to configuring.idle
browser_eval "window.__xstate__['InputDemoSM'].send({ type: 'OPEN_MAPPER' })" > /dev/null
sleep 0.5
VALUE=$(browser_eval "JSON.stringify(window.__xstate__['InputDemoSM'].state())")
echo "$VALUE" | grep -q "configuring" && pass "OPEN_MAPPER -> configuring state" || fail "Expected configuring, got $VALUE"

# 13. Mapper overlay appears
VALUE=$(browser_eval "document.querySelector('[data-testid=\"mapper-overlay\"]') !== null")
[ "$VALUE" = "true" ] && pass "Mapper overlay rendered" || fail "Mapper overlay not found"

# 14. START_REBIND transitions to listening
browser_eval "window.__xstate__['InputDemoSM'].send({ type: 'START_REBIND', action: 'INPUT_JUMP' })" > /dev/null
sleep 0.5
VALUE=$(browser_eval "JSON.stringify(window.__xstate__['InputDemoSM'].state())")
echo "$VALUE" | grep -q "listening" && pass "START_REBIND -> listening" || fail "Expected listening, got $VALUE"

# 15. KEY_DOWN rebinds and returns to idle
browser_eval "window.__xstate__['InputDemoSM'].send({ type: 'KEY_DOWN', code: 'KeyW' })" > /dev/null
sleep 0.5
VALUE=$(browser_eval "window.__xstate__['InputDemoSM'].context().bindings.INPUT_JUMP")
[ "$VALUE" = "KeyW" ] && pass "Rebind: INPUT_JUMP now KeyW" || fail "Binding not updated: $VALUE"

# 16. Conflict resolution — old binding cleared
browser_eval "window.__xstate__['InputDemoSM'].send({ type: 'START_REBIND', action: 'INPUT_ATTACK' })" > /dev/null
sleep 0.5
browser_eval "window.__xstate__['InputDemoSM'].send({ type: 'KEY_DOWN', code: 'KeyW' })" > /dev/null
sleep 0.5
VALUE=$(browser_eval "window.__xstate__['InputDemoSM'].context().bindings.INPUT_JUMP")
[ "$VALUE" = "" ] && pass "Conflict resolved: old INPUT_JUMP binding cleared" || fail "Old binding not cleared: '$VALUE'"

# 17. Reset restores defaults
browser_eval "window.__xstate__['InputDemoSM'].reset()" > /dev/null
sleep 0.5
VALUE=$(browser_eval "window.__xstate__['InputDemoSM'].state()")
[ "$VALUE" = "active" ] && pass "Reset -> active state" || fail "Reset state: $VALUE"
VALUE=$(browser_eval "window.__xstate__['InputDemoSM'].context().bindings.INPUT_JUMP")
[ "$VALUE" = "Space" ] && pass "Reset restored INPUT_JUMP to Space" || fail "Reset binding: $VALUE"

# ============================================================================
# PHASE 4: Instruct step context note
# ============================================================================
echo ""
echo "--- PHASE 4: Instruct step context ---"

# 18. Open instructions panel via tab-panel and switch to steps tab
browser_eval "document.querySelector('[data-testid=\"tab-panel\"]')?.click()" > /dev/null
sleep 1
browser_eval "document.querySelector('[data-testid=\"recipe-tab-steps\"]')?.click()" > /dev/null
sleep 0.5

# 19. Step 1 detail mentions machine mediation and renderer language
VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-step-0\"] .instruct-step-detail')?.textContent")
echo "$VALUE" | grep -qi "machine mediates" && pass "Step 1 mentions machine mediation" || fail "Step 1 missing context: '$VALUE'"
echo "$VALUE" | grep -qi "renderer" && pass "Step 1 uses renderer terminology" || fail "Step 1 missing renderer term: '$VALUE'"

agent-browser close 2>/dev/null || true
print_summary
