#!/bin/bash
# tests/test_command_palette.sh — Verify recipe selection updates all panels
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "Command Palette / Recipe Selection Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

agent-browser open "$BASE_URL"
sleep 2

# Click toggle-switch entry
agent-browser eval "document.querySelector('[data-testid=\"entry-toggle-switch\"]')?.click()" 2>/dev/null
sleep 0.5

# 1. Stage title updates to TOGGLE SWITCH
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stage-title\"]')?.textContent")
[ "$VALUE" = "TOGGLE SWITCH" ] && pass "Stage title: TOGGLE SWITCH" || fail "Stage title: got '$VALUE' (expected: TOGGLE SWITCH)"

# 2. Machine state updates to 'off'
VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
[ "$VALUE" = "off" ] && pass "Machine state: off" || fail "Machine state: got '$VALUE' (expected: off)"

# 3. Readout state matches
VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-state\"]')?.textContent")
[ "$VALUE" = "off" ] && pass "Readout state: off" || fail "Readout state: got '$VALUE' (expected: off)"

# 4. Readout progress is 0
VALUE=$(browser_eval "document.querySelector('[data-testid=\"readout-progress\"]')?.textContent")
[ "$VALUE" = "0" ] && pass "Readout progress: 0" || fail "Readout progress: got '$VALUE' (expected: 0)"

# 5. Footer bindings updates to 4
VALUE=$(browser_eval "document.querySelector('[data-testid=\"footer-bindings\"]')?.textContent")
[ "$VALUE" = "4" ] && pass "Footer bindings: 4" || fail "Footer bindings: got '$VALUE' (expected: 4)"

# 6. Footer states updates to 2
VALUE=$(browser_eval "document.querySelector('[data-testid=\"footer-states\"]')?.textContent")
[ "$VALUE" = "2" ] && pass "Footer states: 2" || fail "Footer states: got '$VALUE' (expected: 2)"

# 7. XState window state reflects recipe change
VALUE=$(browser_eval "window.__xstate__?.recipeName")
[ "$VALUE" = "toggle-switch" ] && pass "XState recipeName: toggle-switch" || fail "XState recipeName: got '$VALUE' (expected: toggle-switch)"

# 8. Tab resets to demo
VALUE=$(browser_eval "document.querySelector('[data-testid=\"tab-demo\"]')?.classList.contains('active')")
[ "$VALUE" = "true" ] && pass "Tab reset to demo after recipe switch" || fail "Tab not reset to demo: got '$VALUE'"

agent-browser close 2>/dev/null || true
print_summary
