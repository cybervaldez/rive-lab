#!/bin/bash
# tests/test_renderer_toggle.sh — Verify renderer toggle [html] [rive] across pages
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5174}"
setup_cleanup
print_header "Renderer Toggle Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

# ============================================================================
# PHASE 1: Test page — toggle renders, rive disabled by default
# ============================================================================
echo ""
echo "--- PHASE 1: Toggle renders (test page) ---"

agent-browser open "$BASE_URL/test/test-bench" 2>/dev/null
sleep 3

# Clean any prior test state
browser_eval "localStorage.removeItem('rive-url:test-bench')" > /dev/null
agent-browser open "$BASE_URL/test/test-bench" 2>/dev/null
sleep 3

# 1. Toggle container renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"renderer-toggle\"]') !== null")
[ "$VALUE" = "true" ] && pass "Renderer toggle renders" || fail "Renderer toggle missing"

# 2. HTML button exists and is active
VALUE=$(browser_eval "document.querySelector('[data-testid=\"renderer-html\"]')?.classList.contains('renderer-toggle-btn--active')")
[ "$VALUE" = "true" ] && pass "HTML button active by default" || fail "HTML button not active"

# 3. Rive button exists and is disabled (no URL stored)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"renderer-rive\"]')?.disabled")
[ "$VALUE" = "true" ] && pass "Rive button disabled (no URL)" || fail "Rive button should be disabled"

# 4. Rive button text is just "rive" (no checkmark)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"renderer-rive\"]')?.textContent?.trim()")
[ "$VALUE" = "rive" ] && pass "Rive button text: 'rive' (no checkmark)" || fail "Rive text: '$VALUE'"

# 5. HTML demo renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"demo-test-bench\"]') !== null")
[ "$VALUE" = "true" ] && pass "HTML demo renders in html mode" || fail "HTML demo missing"

# ============================================================================
# PHASE 2: Test wizard Rive URL input enabled
# ============================================================================
echo ""
echo "--- PHASE 2: Test wizard URL input ---"

# 6. Open instructions + wizard
browser_eval "document.querySelector('[data-testid=\"tab-panel\"]')?.click()" > /dev/null
sleep 0.5
browser_eval "document.querySelector('[data-testid=\"instruct-test-btn\"]')?.click()" > /dev/null
sleep 0.5

# 7. Rive URL input is enabled
VALUE=$(browser_eval "document.querySelector('[data-testid=\"test-wizard-rive-input\"]')?.disabled")
[ "$VALUE" = "false" ] && pass "Rive URL input is enabled" || fail "Rive URL input disabled: $VALUE"

# 8. Label says "rive file url" (not "future")
VALUE=$(browser_eval "document.querySelector('.test-wizard-rive-label')?.textContent")
echo "$VALUE" | grep -qi "rive file url" && pass "Label: 'rive file url'" || fail "Label: '$VALUE'"

# 9. Enter a .riv URL
browser_eval "
  var input = document.querySelector('[data-testid=\"test-wizard-rive-input\"]');
  var nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeSet.call(input, 'https://cdn.example.com/test-bench.riv');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
" > /dev/null
sleep 0.3

# 10. URL stored to localStorage
VALUE=$(browser_eval "localStorage.getItem('rive-url:test-bench')")
[ "$VALUE" = "https://cdn.example.com/test-bench.riv" ] && pass "URL stored to localStorage" || fail "Stored: '$VALUE'"

# 11. Close wizard
browser_eval "document.querySelector('[data-testid=\"test-wizard-close\"]')?.click()" > /dev/null
sleep 0.3
browser_eval "document.querySelector('[data-testid=\"right-panel-close\"]')?.click()" > /dev/null
sleep 0.3

# ============================================================================
# PHASE 3: Rive button enabled after URL stored
# ============================================================================
echo ""
echo "--- PHASE 3: Rive button enabled ---"

# 12. Rive button now enabled
VALUE=$(browser_eval "document.querySelector('[data-testid=\"renderer-rive\"]')?.disabled")
[ "$VALUE" = "false" ] && pass "Rive button enabled after URL stored" || fail "Rive still disabled"

# 13. Rive button shows checkmark
VALUE=$(browser_eval "document.querySelector('[data-testid=\"renderer-rive\"]')?.textContent?.trim()")
echo "$VALUE" | grep -q "✓" && pass "Rive button shows checkmark" || fail "No checkmark: '$VALUE'"

# ============================================================================
# PHASE 4: Switching renderers
# ============================================================================
echo ""
echo "--- PHASE 4: Renderer switching ---"

# 14. Click rive button
browser_eval "document.querySelector('[data-testid=\"renderer-rive\"]')?.click()" > /dev/null
sleep 0.5

# 15. RiveRenderer renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"rive-renderer\"]') !== null")
[ "$VALUE" = "true" ] && pass "RiveRenderer renders" || fail "RiveRenderer missing"

# 16. HTML demo hidden
VALUE=$(browser_eval "document.querySelector('[data-testid=\"demo-test-bench\"]')")
[ "$VALUE" = "null" ] && pass "HTML demo hidden in rive mode" || fail "HTML demo still showing"

# 17. Rive canvas placeholder renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"rive-canvas\"]') !== null")
[ "$VALUE" = "true" ] && pass "Rive canvas placeholder renders" || fail "Canvas placeholder missing"

# 18. URL displayed in rive info
VALUE=$(browser_eval "document.querySelector('[data-testid=\"rive-url-display\"]')?.textContent")
[ "$VALUE" = "https://cdn.example.com/test-bench.riv" ] && pass "Rive URL displayed" || fail "URL: '$VALUE'"

# 19. ViewModel name displayed
VALUE=$(browser_eval "document.querySelector('[data-testid=\"rive-vm-name\"]')?.textContent")
[ "$VALUE" = "TestBenchVM" ] && pass "ViewModel name: TestBenchVM" || fail "VM name: '$VALUE'"

# 20. StateMachine name displayed
VALUE=$(browser_eval "document.querySelector('[data-testid=\"rive-sm-name\"]')?.textContent")
[ "$VALUE" = "TestBenchSM" ] && pass "StateMachine name: TestBenchSM" || fail "SM name: '$VALUE'"

# 21. State value displayed
VALUE=$(browser_eval "document.querySelector('[data-testid=\"rive-state-display\"]')?.textContent")
[ "$VALUE" = "idle" ] && pass "State 'idle' displayed in rive info" || fail "State: '$VALUE'"

# 22. Rive button is active
VALUE=$(browser_eval "document.querySelector('[data-testid=\"renderer-rive\"]')?.classList.contains('renderer-toggle-btn--active')")
[ "$VALUE" = "true" ] && pass "Rive button shows active state" || fail "Rive button not active"

# 23. Switch back to HTML
browser_eval "document.querySelector('[data-testid=\"renderer-html\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"demo-test-bench\"]') !== null")
[ "$VALUE" = "true" ] && pass "HTML demo restored after switch back" || fail "HTML demo not restored"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"rive-renderer\"]')")
[ "$VALUE" = "null" ] && pass "RiveRenderer hidden after switch back" || fail "RiveRenderer still showing"

# ============================================================================
# PHASE 5: Machine resets on renderer switch
# ============================================================================
echo ""
echo "--- PHASE 5: Machine resets on renderer switch ---"

# 25. Activate machine to get out of idle state
browser_eval "document.querySelector('[data-testid=\"btn-activate\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-state\"]')?.textContent")
[ "$VALUE" = "active" ] && pass "Machine in 'active' state before switch" || fail "State before switch: $VALUE"

# 26. Switch to rive — machine should reset to idle
browser_eval "document.querySelector('[data-testid=\"renderer-rive\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"rive-state-display\"]')?.textContent")
[ "$VALUE" = "idle" ] && pass "Machine reset to 'idle' on switch to rive" || fail "State after rive switch: $VALUE"

# 27. Switch back to html — machine should still be idle (not active)
browser_eval "document.querySelector('[data-testid=\"renderer-html\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-state\"]')?.textContent")
[ "$VALUE" = "idle" ] && pass "Machine stays 'idle' on switch back to html" || fail "State after html switch: $VALUE"

# 28. Context also reset — progress should be 0
VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-progress\"]')?.textContent")
[ "$VALUE" = "0" ] && pass "Context reset: progress=0" || fail "Progress after switch: $VALUE"

# ============================================================================
# PHASE 6: App page toggle
# ============================================================================
echo ""
echo "--- PHASE 6: App page toggle ---"

agent-browser open "$BASE_URL/apps/input-demo" 2>/dev/null
sleep 3

# 25. Toggle renders on app page
VALUE=$(browser_eval "document.querySelector('[data-testid=\"renderer-toggle\"]') !== null")
[ "$VALUE" = "true" ] && pass "Toggle renders on app page" || fail "Toggle missing on app page"

# 26. HTML active, rive disabled (no URL for input-demo)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"renderer-html\"]')?.classList.contains('renderer-toggle-btn--active')")
[ "$VALUE" = "true" ] && pass "HTML active on app page" || fail "HTML not active on app page"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"renderer-rive\"]')?.disabled")
[ "$VALUE" = "true" ] && pass "Rive disabled on app page (no URL)" || fail "Rive should be disabled on app page"

# ============================================================================
# PHASE 7: Navigation preserves toggle state
# ============================================================================
echo ""
echo "--- PHASE 7: Navigation reset ---"

# Navigate back to test-bench (should have URL from phase 2)
agent-browser open "$BASE_URL/test/test-bench" 2>/dev/null
sleep 3

# 27. Rive button still enabled (URL persisted)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"renderer-rive\"]')?.disabled")
[ "$VALUE" = "false" ] && pass "Rive button still enabled after navigation" || fail "Rive disabled after nav"

# 28. Renderer resets to HTML on navigation
VALUE=$(browser_eval "document.querySelector('[data-testid=\"renderer-html\"]')?.classList.contains('renderer-toggle-btn--active')")
[ "$VALUE" = "true" ] && pass "Renderer resets to HTML on navigation" || fail "Renderer didn't reset"

# ============================================================================
# CLEANUP
# ============================================================================
echo ""
echo "--- Cleanup ---"

# Remove test localStorage
browser_eval "localStorage.removeItem('rive-url:test-bench')" > /dev/null

agent-browser close 2>/dev/null || true
print_summary
