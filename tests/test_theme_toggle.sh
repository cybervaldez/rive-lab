#!/bin/bash
# tests/test_theme_toggle.sh — Verify theme switching
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "Theme Toggle Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

agent-browser open "$BASE_URL/components/progress-bar"
sleep 2

# 1. Default theme is dark
VALUE=$(browser_eval "document.querySelector('[data-testid=\"theme-label\"]')?.textContent")
[ "$VALUE" = "dark" ] && pass "Default theme: dark" || fail "Default theme: got '$VALUE' (expected: dark)"

# 2. Toggle to light — label and data-theme attribute update
agent-browser eval "document.querySelector('[data-testid=\"theme-toggle\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"theme-label\"]')?.textContent")
ATTR=$(browser_eval "document.documentElement.getAttribute('data-theme')")
[ "$VALUE" = "light" ] && [ "$ATTR" = "light" ] && pass "Toggle to light: label='light', data-theme='light'" || fail "Toggle to light: label='$VALUE', data-theme='$ATTR'"

# 3. Toggle back to dark
agent-browser eval "document.querySelector('[data-testid=\"theme-toggle\"]')?.click()" 2>/dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"theme-label\"]')?.textContent")
ATTR=$(browser_eval "document.documentElement.getAttribute('data-theme')")
[ "$VALUE" = "dark" ] && [ "$ATTR" = "dark" ] && pass "Toggle back to dark: label='dark', data-theme='dark'" || fail "Toggle back to dark: label='$VALUE', data-theme='$ATTR'"

# 4. Theme persists after navigating to another recipe
agent-browser open "$BASE_URL/components/toggle-switch" 2>/dev/null
sleep 2

VALUE=$(browser_eval "document.querySelector('[data-testid=\"theme-label\"]')?.textContent")
[ "$VALUE" = "dark" ] && pass "Theme persists after recipe switch: dark" || fail "Theme changed after recipe switch: got '$VALUE'"

agent-browser close 2>/dev/null || true
print_summary
