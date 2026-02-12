#!/bin/bash
# tests/test_machine_doc.sh — Verify docs pill toggle and MachineDoc terminal rendering
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

# 1. Docs pill exists and is not active initially
VALUE=$(browser_eval "document.querySelector('[data-testid=\"topbar-docs\"]') !== null")
[ "$VALUE" = "true" ] && pass "Docs pill exists" || fail "Docs pill not found"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"topbar-docs\"]')?.classList.contains('active')")
[ "$VALUE" = "false" ] && pass "Docs pill not active initially" || fail "Docs pill active on load: got '$VALUE'"

# 2. Demo is visible initially, machine-doc is not
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stage-live\"]') !== null")
[ "$VALUE" = "true" ] && pass "Stage-live visible initially" || fail "Stage-live missing on load"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"machine-doc\"]') !== null")
[ "$VALUE" = "false" ] && pass "Machine doc hidden initially" || fail "Machine doc visible on load"

# 3. Click docs pill → machine doc appears, demo hidden
agent-browser eval "document.querySelector('[data-testid=\"topbar-docs\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"topbar-docs\"]')?.classList.contains('active')")
[ "$VALUE" = "true" ] && pass "Docs pill active after click" || fail "Docs pill not active after click: got '$VALUE'"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"machine-doc\"]') !== null")
[ "$VALUE" = "true" ] && pass "Machine doc visible after toggle" || fail "Machine doc not found after toggle"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stage-live\"]') !== null")
[ "$VALUE" = "false" ] && pass "Stage-live hidden when docs open" || fail "Stage-live still visible when docs open"

# 4. Titlebar shows machine.describe with machine ID
TITLE=$(browser_eval "document.querySelector('.machine-doc-title')?.textContent")
echo "$TITLE" | grep -q "machine.describe" && pass "Titlebar has machine.describe" || fail "Titlebar missing machine.describe: got '$TITLE'"

TITLE_ID=$(browser_eval "document.querySelector('.machine-doc-title-id')?.textContent")
[ "$TITLE_ID" = "ProgressBarSM" ] && pass "Titlebar shows ProgressBarSM" || fail "Titlebar machine ID: got '$TITLE_ID' (expected: ProgressBarSM)"

# 5. All four sections exist (Meta, Properties, States, Transitions)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"section-meta\"]') !== null")
[ "$VALUE" = "true" ] && pass "Meta section exists" || fail "Meta section not found"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"section-properties\"]') !== null")
[ "$VALUE" = "true" ] && pass "Properties section exists" || fail "Properties section not found"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"section-states\"]') !== null")
[ "$VALUE" = "true" ] && pass "States section exists" || fail "States section not found"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"section-transitions\"]') !== null")
[ "$VALUE" = "true" ] && pass "Transitions section exists" || fail "Transitions section not found"

# 6. Meta section contains riveViewModel and riveStateMachine
VM=$(browser_eval "document.querySelector('[data-testid=\"meta-viewmodel\"]')?.textContent")
echo "$VM" | grep -q "ProgressBarVM" && pass "Meta: riveViewModel = ProgressBarVM" || fail "Meta riveViewModel: got '$VM'"

SM=$(browser_eval "document.querySelector('[data-testid=\"meta-statemachine\"]')?.textContent")
echo "$SM" | grep -q "ProgressBarSM" && pass "Meta: riveStateMachine = ProgressBarSM" || fail "Meta riveStateMachine: got '$SM'"

# 7. Properties section has progress property with number type
VALUE=$(browser_eval "document.querySelector('[data-testid=\"prop-progress\"]') !== null")
[ "$VALUE" = "true" ] && pass "Property 'progress' exists" || fail "Property 'progress' not found"

PTYPE=$(browser_eval "document.querySelector('[data-testid=\"prop-progress\"] .t-prop-type')?.textContent")
[ "$PTYPE" = "number" ] && pass "Property 'progress' type is number" || fail "Property 'progress' type: got '$PTYPE' (expected: number)"

# 8. States section has idle state marked as initial and active
VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-idle\"]') !== null")
[ "$VALUE" = "true" ] && pass "State 'idle' exists" || fail "State 'idle' not found"

LABEL=$(browser_eval "document.querySelector('[data-testid=\"state-idle\"] .t-state-label')?.textContent")
[ "$LABEL" = "initial" ] && pass "State 'idle' marked as initial" || fail "State 'idle' label: got '$LABEL' (expected: initial)"

ACTIVE=$(browser_eval "document.querySelector('[data-testid=\"state-idle\"] .t-state-dot')?.classList.contains('t-state-dot--active')")
[ "$ACTIVE" = "true" ] && pass "State 'idle' dot is active (current state)" || fail "State 'idle' dot not active: got '$ACTIVE'"

# 9. States section has loading, complete, error states
for STATE in loading complete error; do
    VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-${STATE}\"]') !== null")
    [ "$VALUE" = "true" ] && pass "State '$STATE' exists" || fail "State '$STATE' not found"
done

# 10. Transitions section has entries from idle
VALUE=$(browser_eval "document.querySelector('[data-testid=\"transitions-idle-label\"]') !== null")
[ "$VALUE" = "true" ] && pass "Transition group 'from idle' exists" || fail "Transition group 'from idle' not found"

# 11. Close button exists and closes docs
VALUE=$(browser_eval "document.querySelector('[data-testid=\"machine-doc-close\"]') !== null")
[ "$VALUE" = "true" ] && pass "Close button exists" || fail "Close button not found"

agent-browser eval "document.querySelector('[data-testid=\"machine-doc-close\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"machine-doc\"]') !== null")
[ "$VALUE" = "false" ] && pass "Docs closed via close button" || fail "Docs still visible after close"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stage-live\"]') !== null")
[ "$VALUE" = "true" ] && pass "Demo restored after docs close" || fail "Demo not restored after close"

# 12. Switch to toggle-switch → docs show ToggleSwitchSM
agent-browser open "$BASE_URL/components/toggle-switch" 2>/dev/null
sleep 2

agent-browser eval "document.querySelector('[data-testid=\"topbar-docs\"]')?.click()" 2>/dev/null
sleep 0.5

TITLE_ID=$(browser_eval "document.querySelector('.machine-doc-title-id')?.textContent")
[ "$TITLE_ID" = "ToggleSwitchSM" ] && pass "Toggle-switch docs: ToggleSwitchSM" || fail "Toggle-switch docs title ID: got '$TITLE_ID' (expected: ToggleSwitchSM)"

# 13. Toggle-switch has off and on states
VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-off\"]') !== null")
[ "$VALUE" = "true" ] && pass "Toggle-switch state 'off' exists" || fail "Toggle-switch state 'off' not found"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-on\"]') !== null")
[ "$VALUE" = "true" ] && pass "Toggle-switch state 'on' exists" || fail "Toggle-switch state 'on' not found"

agent-browser close 2>/dev/null || true
print_summary
