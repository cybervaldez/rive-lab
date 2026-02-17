#!/bin/bash
# ============================================================================
# E2E Test Suite: Page Navigation
# ============================================================================
# Tests moving between pages: pagination with error checking, back links,
# sidebar navigation, browser history, state reset, and invalid routes.
#
# Usage: BASE_URL=http://localhost:5173 ./tests/test_navigation.sh
# ============================================================================
set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
setup_cleanup
print_header "Page Navigation Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

# Helper: click testid that navigates to a new URL, then re-open to refresh DOM
nav_click() {
    local TESTID="$1"
    local WAIT="${2:-1}"
    agent-browser eval "document.querySelector('[data-testid=\"$TESTID\"]')?.click()" 2>/dev/null
    sleep "$WAIT"
    local NEW_URL
    NEW_URL=$(browser_eval "window.location.href")
    agent-browser open "$NEW_URL" 2>/dev/null
    sleep 2
}

# Helper: click testid for in-page toggle (no page reload)
ui_click() {
    local TESTID="$1"
    local WAIT="${2:-0.5}"
    agent-browser eval "document.querySelector('[data-testid=\"$TESTID\"]')?.click()" 2>/dev/null
    sleep "$WAIT"
}

# Helper: install JS error capture hook
install_error_hook() {
    agent-browser eval "window.__ERRORS__ = []; window.addEventListener('error', e => window.__ERRORS__.push(e.message)); const origErr = console.error; console.error = (...args) => { const msg = args.join(' '); if (msg.includes('Error:') || msg.includes('Uncaught')) window.__ERRORS__.push(msg); origErr.apply(console, args); }" 2>/dev/null
}

# Helper: check for JS errors and report
check_errors() {
    local LABEL="$1"
    local ERRS
    ERRS=$(browser_eval "JSON.stringify(window.__ERRORS__ || [])")
    if [ "$ERRS" = "[]" ] || [ -z "$ERRS" ]; then
        pass "$LABEL: no JS errors"
    else
        fail "$LABEL: JS errors detected: $ERRS"
    fi
}

# ============================================================================
# PHASE 1: Pagination with JS error checking
# ============================================================================
echo ""
echo "--- PHASE 1: Pagination error-free cycling ---"

agent-browser open "$BASE_URL/components/progress-bar"
sleep 2
install_error_hook

# 1. Verify starting page renders correctly
VALUE=$(browser_eval "window.location.pathname")
STATE=$(browser_eval "document.querySelector('[data-testid=\"app-state\"]')?.textContent")
echo "$VALUE" | grep -q "progress-bar" && pass "Start: progress-bar loaded" || fail "Start: got '$VALUE'"
[ "$STATE" = "idle" ] && pass "Start: state=idle" || fail "Start: state='$STATE'"

# 2. Next → toggle-switch: check URL, state, and no errors
nav_click "pagination-next"
install_error_hook
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "toggle-switch" && pass "Next → toggle-switch" || fail "Next: got '$VALUE'"

STATE=$(browser_eval "document.querySelector('[data-testid=\"app-state\"]')?.textContent")
[ "$STATE" = "off" ] && pass "toggle-switch state=off" || fail "toggle-switch state: '$STATE'"
check_errors "toggle-switch"

# 3. Next → counter: check URL, state, and no errors
nav_click "pagination-next"
install_error_hook
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "counter" && pass "Next → counter" || fail "Next: got '$VALUE'"

STATE=$(browser_eval "document.querySelector('[data-testid=\"app-state\"]')?.textContent")
[ "$STATE" = "idle" ] && pass "counter state=idle" || fail "counter state: '$STATE'"
check_errors "counter"

# 4. Next wraps → progress-bar: check URL, state, and no errors
nav_click "pagination-next"
install_error_hook
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "progress-bar" && pass "Next wraps → progress-bar" || fail "Wrap: got '$VALUE'"

STATE=$(browser_eval "document.querySelector('[data-testid=\"app-state\"]')?.textContent")
[ "$STATE" = "idle" ] && pass "progress-bar state=idle" || fail "progress-bar state: '$STATE'"
check_errors "progress-bar (wrap)"

# 5. Prev wraps → counter: check URL, state, and no errors
nav_click "pagination-prev"
install_error_hook
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "counter" && pass "Prev wraps → counter" || fail "Prev wrap: got '$VALUE'"

STATE=$(browser_eval "document.querySelector('[data-testid=\"app-state\"]')?.textContent")
[ "$STATE" = "idle" ] && pass "counter state after prev" || fail "counter state after prev: '$STATE'"
check_errors "counter (prev)"

# 6. Prev → toggle-switch: check no errors
nav_click "pagination-prev"
install_error_hook
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "toggle-switch" && pass "Prev → toggle-switch" || fail "Prev: got '$VALUE'"
check_errors "toggle-switch (prev)"

# 7. Prev → progress-bar: check no errors
nav_click "pagination-prev"
install_error_hook
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "progress-bar" && pass "Prev → progress-bar" || fail "Prev: got '$VALUE'"
check_errors "progress-bar (prev)"

# ============================================================================
# PHASE 2: Back link navigation
# ============================================================================
echo ""
echo "--- PHASE 2: Back link navigation ---"

# 8. Components page: back link goes to /components
agent-browser open "$BASE_URL/components/progress-bar"
sleep 2

nav_click "topbar-back"
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "^/components$" && pass "Components back link → /components" || fail "Components back link: got '$VALUE'"

# 9. Apps page: back link goes to /apps
agent-browser open "$BASE_URL/apps/input-demo"
sleep 2

nav_click "app-back"
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "^/apps$" && pass "Apps back link → /apps" || fail "Apps back link: got '$VALUE'"

# 10. Test page: back link goes to /test
agent-browser open "$BASE_URL/test/test-bench"
sleep 2

nav_click "topbar-back"
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "^/test$" && pass "Test back link → /test" || fail "Test back link: got '$VALUE'"

# ============================================================================
# PHASE 3: Sidebar navigation (components page)
# ============================================================================
echo ""
echo "--- PHASE 3: Sidebar navigation ---"

agent-browser open "$BASE_URL/components/progress-bar"
sleep 2
install_error_hook

# 11. Open sidebar
ui_click "tab-components" 1
HAS_SIDEBAR=$(browser_eval "!!document.querySelector('[data-testid=\"sidebar-panel\"].sidebar-panel--open')")
[ "$HAS_SIDEBAR" = "true" ] && pass "Sidebar opens" || fail "Sidebar not open: $HAS_SIDEBAR"

# 12. Click counter entry in sidebar — check for errors
nav_click "entry-counter"
install_error_hook
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "counter" && pass "Sidebar entry → counter" || fail "Sidebar entry: got '$VALUE'"

STATE=$(browser_eval "document.querySelector('[data-testid=\"app-state\"]')?.textContent")
[ "$STATE" = "idle" ] && pass "Counter state via sidebar" || fail "Counter state via sidebar: '$STATE'"
check_errors "sidebar → counter"

# 13. Click toggle-switch entry — check for errors
ui_click "tab-components" 1
nav_click "entry-toggle-switch"
install_error_hook
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "toggle-switch" && pass "Sidebar → toggle-switch" || fail "Sidebar: got '$VALUE'"
check_errors "sidebar → toggle-switch"

# ============================================================================
# PHASE 4: State reset on navigation
# ============================================================================
echo ""
echo "--- PHASE 4: State reset on navigate ---"

agent-browser open "$BASE_URL/components/progress-bar"
sleep 2

# 14. Open instruct panel
ui_click "toggle-instruct" 1
HAS_OVERLAY=$(browser_eval "!!document.querySelector('[data-testid=\"instruct-overlay\"]')")
[ "$HAS_OVERLAY" = "true" ] && pass "Instruct panel opened" || fail "Instruct panel not opened: $HAS_OVERLAY"

# 15. Navigate via pagination — panels should reset
nav_click "pagination-next"
HAS_OVERLAY=$(browser_eval "!!document.querySelector('[data-testid=\"instruct-overlay\"]')")
[ "$HAS_OVERLAY" = "false" ] && pass "Instruct panel closed after pagination" || fail "Instruct panel still open: $HAS_OVERLAY"

# 16. Open debug footer, navigate — should reset
ui_click "debug-footer-bar" 1
HAS_DEBUG=$(browser_eval "!!document.querySelector('[data-testid=\"debug-footer-body\"]')")
[ "$HAS_DEBUG" = "true" ] && pass "Debug panel opened" || fail "Debug panel not opened: $HAS_DEBUG"

nav_click "pagination-next"
HAS_DEBUG=$(browser_eval "!!document.querySelector('[data-testid=\"debug-footer-body\"]')")
[ "$HAS_DEBUG" = "false" ] && pass "Debug panel closed after pagination" || fail "Debug panel still open: $HAS_DEBUG"

# ============================================================================
# PHASE 5: Browser history (back/forward)
# ============================================================================
echo ""
echo "--- PHASE 5: Browser history ---"

agent-browser open "$BASE_URL/components/progress-bar"
sleep 2
install_error_hook

# 17. Go forward twice: progress-bar → toggle-switch → counter
nav_click "pagination-next"
nav_click "pagination-next"
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "counter" && pass "Forward nav to counter" || fail "Expected counter: got '$VALUE'"

# 18. Browser back → toggle-switch
agent-browser eval "window.history.back()" 2>/dev/null
sleep 1
agent-browser open "$(browser_eval 'window.location.href')" 2>/dev/null
sleep 2
install_error_hook
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "toggle-switch" && pass "History back → toggle-switch" || fail "History back: got '$VALUE'"
check_errors "history back → toggle-switch"

# 19. Browser back again → progress-bar
agent-browser eval "window.history.back()" 2>/dev/null
sleep 1
agent-browser open "$(browser_eval 'window.location.href')" 2>/dev/null
sleep 2
install_error_hook
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "progress-bar" && pass "History back → progress-bar" || fail "History back: got '$VALUE'"
check_errors "history back → progress-bar"

# 20. Browser forward → toggle-switch
agent-browser eval "window.history.forward()" 2>/dev/null
sleep 1
agent-browser open "$(browser_eval 'window.location.href')" 2>/dev/null
sleep 2
install_error_hook
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "toggle-switch" && pass "History forward → toggle-switch" || fail "History forward: got '$VALUE'"
check_errors "history forward → toggle-switch"

# ============================================================================
# PHASE 6: Invalid route redirect
# ============================================================================
echo ""
echo "--- PHASE 6: Invalid route redirect ---"

# 21. Invalid component key redirects to default
agent-browser open "$BASE_URL/components/nonexistent-recipe"
sleep 2
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "progress-bar" && pass "Invalid component → redirects to default" || fail "Invalid component: got '$VALUE'"

# 22. Invalid app key redirects to /apps
agent-browser open "$BASE_URL/apps/nonexistent-app"
sleep 2
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "^/apps$" && pass "Invalid app → redirects to /apps" || fail "Invalid app: got '$VALUE'"

# 23. Invalid test key redirects to /test
agent-browser open "$BASE_URL/test/nonexistent-test"
sleep 2
VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "^/test$" && pass "Invalid test → redirects to /test" || fail "Invalid test: got '$VALUE'"

# ============================================================================
# PHASE 7: Machine initial values after pagination
# ============================================================================
echo ""
echo "--- PHASE 7: Machine initial values via __xstate__ ---"

# Expected machine contracts:
# ProgressBarSM: state=idle, context={ progress:0, statusText:'', isActive:false }
# ToggleSwitchSM: state=off, context={ isActive:false }
# CounterSM: state=idle, context={ count:0 }

# Start fresh on progress-bar
agent-browser open "$BASE_URL/components/progress-bar"
sleep 2
install_error_hook

# -- progress-bar: verify machine ID, state, and full context --
XSTATE_ID=$(browser_eval "Object.keys(window.__xstate__ || {})[0]")
[ "$XSTATE_ID" = "ProgressBarSM" ] && pass "progress-bar: machine ID = ProgressBarSM" || fail "progress-bar: machine ID = '$XSTATE_ID'"

XSTATE_STATE=$(browser_eval "window.__xstate__?.ProgressBarSM?.state()")
[ "$XSTATE_STATE" = "idle" ] && pass "progress-bar: __xstate__ state = idle" || fail "progress-bar: __xstate__ state = '$XSTATE_STATE'"

XSTATE_PROGRESS=$(browser_eval "window.__xstate__?.ProgressBarSM?.context()?.progress")
[ "$XSTATE_PROGRESS" = "0" ] && pass "progress-bar: context.progress = 0" || fail "progress-bar: context.progress = '$XSTATE_PROGRESS'"

XSTATE_ACTIVE=$(browser_eval "window.__xstate__?.ProgressBarSM?.context()?.isActive")
[ "$XSTATE_ACTIVE" = "false" ] && pass "progress-bar: context.isActive = false" || fail "progress-bar: context.isActive = '$XSTATE_ACTIVE'"

XSTATE_STATUS=$(browser_eval "window.__xstate__?.ProgressBarSM?.context()?.statusText")
[ "$XSTATE_STATUS" = "" ] && pass "progress-bar: context.statusText = ''" || fail "progress-bar: context.statusText = '$XSTATE_STATUS'"

# -- Next → toggle-switch: verify machine swapped --
nav_click "pagination-next"
install_error_hook

# Old machine should be cleaned up
OLD_GONE=$(browser_eval "window.__xstate__?.ProgressBarSM === undefined")
[ "$OLD_GONE" = "true" ] && pass "toggle-switch: ProgressBarSM cleaned up" || fail "toggle-switch: ProgressBarSM still registered"

XSTATE_ID=$(browser_eval "Object.keys(window.__xstate__ || {})[0]")
[ "$XSTATE_ID" = "ToggleSwitchSM" ] && pass "toggle-switch: machine ID = ToggleSwitchSM" || fail "toggle-switch: machine ID = '$XSTATE_ID'"

XSTATE_STATE=$(browser_eval "window.__xstate__?.ToggleSwitchSM?.state()")
[ "$XSTATE_STATE" = "off" ] && pass "toggle-switch: __xstate__ state = off" || fail "toggle-switch: __xstate__ state = '$XSTATE_STATE'"

XSTATE_ACTIVE=$(browser_eval "window.__xstate__?.ToggleSwitchSM?.context()?.isActive")
[ "$XSTATE_ACTIVE" = "false" ] && pass "toggle-switch: context.isActive = false" || fail "toggle-switch: context.isActive = '$XSTATE_ACTIVE'"

check_errors "toggle-switch machine init"

# -- Next → counter: verify machine swapped --
nav_click "pagination-next"
install_error_hook

OLD_GONE=$(browser_eval "window.__xstate__?.ToggleSwitchSM === undefined")
[ "$OLD_GONE" = "true" ] && pass "counter: ToggleSwitchSM cleaned up" || fail "counter: ToggleSwitchSM still registered"

XSTATE_ID=$(browser_eval "Object.keys(window.__xstate__ || {})[0]")
[ "$XSTATE_ID" = "CounterSM" ] && pass "counter: machine ID = CounterSM" || fail "counter: machine ID = '$XSTATE_ID'"

XSTATE_STATE=$(browser_eval "window.__xstate__?.CounterSM?.state()")
[ "$XSTATE_STATE" = "idle" ] && pass "counter: __xstate__ state = idle" || fail "counter: __xstate__ state = '$XSTATE_STATE'"

XSTATE_COUNT=$(browser_eval "window.__xstate__?.CounterSM?.context()?.count")
[ "$XSTATE_COUNT" = "0" ] && pass "counter: context.count = 0" || fail "counter: context.count = '$XSTATE_COUNT'"

check_errors "counter machine init"

# -- Next wraps → progress-bar: verify machine reset to initial --
nav_click "pagination-next"
install_error_hook

OLD_GONE=$(browser_eval "window.__xstate__?.CounterSM === undefined")
[ "$OLD_GONE" = "true" ] && pass "progress-bar (wrap): CounterSM cleaned up" || fail "progress-bar (wrap): CounterSM still registered"

XSTATE_ID=$(browser_eval "Object.keys(window.__xstate__ || {})[0]")
[ "$XSTATE_ID" = "ProgressBarSM" ] && pass "progress-bar (wrap): machine ID = ProgressBarSM" || fail "progress-bar (wrap): machine ID = '$XSTATE_ID'"

XSTATE_STATE=$(browser_eval "window.__xstate__?.ProgressBarSM?.state()")
[ "$XSTATE_STATE" = "idle" ] && pass "progress-bar (wrap): __xstate__ state = idle" || fail "progress-bar (wrap): state = '$XSTATE_STATE'"

XSTATE_PROGRESS=$(browser_eval "window.__xstate__?.ProgressBarSM?.context()?.progress")
[ "$XSTATE_PROGRESS" = "0" ] && pass "progress-bar (wrap): context.progress = 0" || fail "progress-bar (wrap): context.progress = '$XSTATE_PROGRESS'"

XSTATE_ACTIVE=$(browser_eval "window.__xstate__?.ProgressBarSM?.context()?.isActive")
[ "$XSTATE_ACTIVE" = "false" ] && pass "progress-bar (wrap): context.isActive = false" || fail "progress-bar (wrap): context.isActive = '$XSTATE_ACTIVE'"

check_errors "progress-bar machine init (wrap)"

# -- Prev wraps → counter: verify prev also gets clean initial --
nav_click "pagination-prev"
install_error_hook

XSTATE_STATE=$(browser_eval "window.__xstate__?.CounterSM?.state()")
[ "$XSTATE_STATE" = "idle" ] && pass "counter (prev): __xstate__ state = idle" || fail "counter (prev): state = '$XSTATE_STATE'"

XSTATE_COUNT=$(browser_eval "window.__xstate__?.CounterSM?.context()?.count")
[ "$XSTATE_COUNT" = "0" ] && pass "counter (prev): context.count = 0" || fail "counter (prev): context.count = '$XSTATE_COUNT'"

check_errors "counter machine init (prev)"

# ============================================================================
# PHASE 8: Rapid navigation stress test
# ============================================================================
echo ""
echo "--- PHASE 8: Rapid navigation ---"

agent-browser open "$BASE_URL/components/progress-bar"
sleep 2
install_error_hook

agent-browser eval "document.querySelector('[data-testid=\"pagination-next\"]')?.click()" 2>/dev/null
sleep 0.5
agent-browser eval "document.querySelector('[data-testid=\"pagination-next\"]')?.click()" 2>/dev/null
sleep 0.5
agent-browser eval "document.querySelector('[data-testid=\"pagination-next\"]')?.click()" 2>/dev/null
sleep 2

VALUE=$(browser_eval "window.location.pathname")
echo "$VALUE" | grep -q "progress-bar\|toggle-switch\|counter" && pass "Rapid nav lands on valid page" || fail "Rapid nav: got '$VALUE'"
check_errors "rapid navigation"

# ============================================================================
# CLEANUP
# ============================================================================
agent-browser close 2>/dev/null || true
print_summary
