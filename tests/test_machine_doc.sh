#!/bin/bash
# tests/test_machine_doc.sh — Verify MachineDoc rendering in Reference tab of instructions panel
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "Machine Doc Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

agent-browser open "$BASE_URL/components/progress-bar"
sleep 2

# 1. Demo is visible, machine-doc not in stage
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stage-live\"]') !== null")
[ "$VALUE" = "true" ] && pass "Stage-live visible" || fail "Stage-live missing on load"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"machine-doc\"]') !== null")
[ "$VALUE" = "false" ] && pass "Machine doc not in stage initially" || fail "Machine doc visible in stage on load"

# 2. Open instructions panel
browser_eval "document.querySelector('[data-testid=\"toggle-instruct\"]')?.click()" > /dev/null
sleep 1

VALUE=$(browser_eval "document.querySelector('[data-testid=\"recipe-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Instructions panel opens" || fail "Instructions panel missing"

# 3. Switch to Reference tab
browser_eval "document.querySelector('[data-testid=\"recipe-tab-reference\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"recipe-tab-reference\"]')?.classList.contains('recipe-panel-tab--active')")
[ "$VALUE" = "true" ] && pass "Reference tab active" || fail "Reference tab not active"

# 4. All four sections exist in Reference tab (Meta, Properties, States, Transitions)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"section-meta\"]') !== null")
[ "$VALUE" = "true" ] && pass "Meta section exists" || fail "Meta section not found"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"section-properties\"]') !== null")
[ "$VALUE" = "true" ] && pass "Properties section exists" || fail "Properties section not found"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"section-states\"]') !== null")
[ "$VALUE" = "true" ] && pass "States section exists" || fail "States section not found"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"section-transitions\"]') !== null")
[ "$VALUE" = "true" ] && pass "Transitions section exists" || fail "Transitions section not found"

# 5. Meta section contains riveViewModel and riveStateMachine
VM=$(browser_eval "document.querySelector('[data-testid=\"meta-viewmodel\"]')?.textContent")
echo "$VM" | grep -q "ProgressBarVM" && pass "Meta: riveViewModel = ProgressBarVM" || fail "Meta riveViewModel: got '$VM'"

SM=$(browser_eval "document.querySelector('[data-testid=\"meta-statemachine\"]')?.textContent")
echo "$SM" | grep -q "ProgressBarSM" && pass "Meta: riveStateMachine = ProgressBarSM" || fail "Meta riveStateMachine: got '$SM'"

# 6. Properties section has progress property with number type
VALUE=$(browser_eval "document.querySelector('[data-testid=\"prop-progress\"]') !== null")
[ "$VALUE" = "true" ] && pass "Property 'progress' exists" || fail "Property 'progress' not found"

PTYPE=$(browser_eval "document.querySelector('[data-testid=\"prop-progress\"] .t-prop-type')?.textContent")
[ "$PTYPE" = "number" ] && pass "Property 'progress' type is number" || fail "Property 'progress' type: got '$PTYPE' (expected: number)"

# 7. States section has idle state marked as initial and active
VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-idle\"]') !== null")
[ "$VALUE" = "true" ] && pass "State 'idle' exists" || fail "State 'idle' not found"

LABEL=$(browser_eval "document.querySelector('[data-testid=\"state-idle\"] .t-state-label')?.textContent")
[ "$LABEL" = "initial" ] && pass "State 'idle' marked as initial" || fail "State 'idle' label: got '$LABEL' (expected: initial)"

ACTIVE=$(browser_eval "document.querySelector('[data-testid=\"state-idle\"] .t-state-dot')?.classList.contains('t-state-dot--active')")
[ "$ACTIVE" = "true" ] && pass "State 'idle' dot is active (current state)" || fail "State 'idle' dot not active: got '$ACTIVE'"

# 8. States section has loading, complete, error states
for STATE in loading complete error; do
    VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-${STATE}\"]') !== null")
    [ "$VALUE" = "true" ] && pass "State '$STATE' exists" || fail "State '$STATE' not found"
done

# 9. Transitions section has entries from idle
VALUE=$(browser_eval "document.querySelector('[data-testid=\"transitions-idle-label\"]') !== null")
[ "$VALUE" = "true" ] && pass "Transition group 'from idle' exists" || fail "Transition group 'from idle' not found"

# 10. Stage-live still visible (Reference tab doesn't hide demo)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stage-live\"]') !== null")
[ "$VALUE" = "true" ] && pass "Stage-live still visible with Reference tab open" || fail "Stage-live hidden when Reference tab open"

# 11. Switch to toggle-switch → Reference tab shows ToggleSwitchSM
agent-browser open "$BASE_URL/components/toggle-switch" 2>/dev/null
sleep 2

browser_eval "document.querySelector('[data-testid=\"toggle-instruct\"]')?.click()" > /dev/null
sleep 1

browser_eval "document.querySelector('[data-testid=\"recipe-tab-reference\"]')?.click()" > /dev/null
sleep 0.5

# 12. Toggle-switch meta shows correct machine ID
SM=$(browser_eval "document.querySelector('[data-testid=\"meta-statemachine\"]')?.textContent")
echo "$SM" | grep -q "ToggleSwitchSM" && pass "Toggle-switch: riveStateMachine = ToggleSwitchSM" || fail "Toggle-switch meta SM: got '$SM' (expected: ToggleSwitchSM)"

# 13. Toggle-switch has off and on states
VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-off\"]') !== null")
[ "$VALUE" = "true" ] && pass "Toggle-switch state 'off' exists" || fail "Toggle-switch state 'off' not found"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-on\"]') !== null")
[ "$VALUE" = "true" ] && pass "Toggle-switch state 'on' exists" || fail "Toggle-switch state 'on' not found"

agent-browser close 2>/dev/null || true
print_summary
