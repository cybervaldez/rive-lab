#!/bin/bash
# tests/test_stream_overlay.sh — E2E tests for StreamOverlay app
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5174}"
setup_cleanup
print_header "StreamOverlay Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

# ============================================================================
# PHASE 1: Control room renders
# ============================================================================
echo ""
echo "--- PHASE 1: Control room renders ---"

agent-browser open "$BASE_URL/apps/stream-overlay" 2>/dev/null
sleep 3

# 1. App theater renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"app-theater\"]') !== null")
[ "$VALUE" = "true" ] && pass "App theater renders" || fail "App theater missing"

# 2. App name shows STREAM OVERLAY
VALUE=$(browser_eval "document.querySelector('[data-testid=\"app-name\"]')?.textContent?.trim()")
echo "$VALUE" | grep -qi "STREAM OVERLAY" && pass "App name: STREAM OVERLAY" || fail "App name: '$VALUE'"

# 3. Tab bar renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-tabs\"]') !== null")
[ "$VALUE" = "true" ] && pass "Tab bar renders" || fail "Tab bar missing"

# 4. All 6 tabs present
VALUE=$(browser_eval "document.querySelectorAll('.stream-tabs [data-testid^=\"stream-tab-\"]').length")
[ "$VALUE" = "6" ] && pass "6 tabs present" || fail "Tab count: $VALUE"

# 5. Live tab active by default
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-tab-live\"]')?.classList.contains('stream-tab--active')")
[ "$VALUE" = "true" ] && pass "Live tab active by default" || fail "Live tab not active"

# 6. Live preview area renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-preview\"]') !== null")
[ "$VALUE" = "true" ] && pass "Live preview area renders" || fail "Live preview missing"

# 7. Stream live view renders inside preview
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-live-view\"]') !== null")
[ "$VALUE" = "true" ] && pass "StreamLiveView renders" || fail "StreamLiveView missing"

# 8. Action indicators render (4 default actions)
VALUE=$(browser_eval "document.querySelectorAll('[data-testid^=\"stream-action-\"]').length")
[ "$VALUE" = "4" ] && pass "4 action indicators render" || fail "Action count: $VALUE"

# ============================================================================
# PHASE 2: Tab switching
# ============================================================================
echo ""
echo "--- PHASE 2: Tab switching ---"

# 9. Click effects tab
browser_eval "document.querySelector('[data-testid=\"stream-tab-effects\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-tab-effects\"]')?.classList.contains('stream-tab--active')")
[ "$VALUE" = "true" ] && pass "Effects tab active after click" || fail "Effects tab not active"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-effects\"]') !== null")
[ "$VALUE" = "true" ] && pass "Effects content renders" || fail "Effects content missing"

# 10. Live preview hidden when on another tab
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-preview\"]')")
[ "$VALUE" = "null" ] && pass "Live preview hidden on effects tab" || fail "Live preview still showing"

# 11. Click mapper tab
browser_eval "document.querySelector('[data-testid=\"stream-tab-mapper\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-tab-mapper\"]')?.classList.contains('stream-tab--active')")
[ "$VALUE" = "true" ] && pass "Mapper tab active" || fail "Mapper tab not active"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-mapper\"]') !== null")
[ "$VALUE" = "true" ] && pass "Mapper content renders" || fail "Mapper content missing"

# 12. Click sources tab
browser_eval "document.querySelector('[data-testid=\"stream-tab-sources\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-tab-sources\"]')?.classList.contains('stream-tab--active')")
[ "$VALUE" = "true" ] && pass "Sources tab active" || fail "Sources tab not active"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-sources\"]') !== null")
[ "$VALUE" = "true" ] && pass "Sources content renders" || fail "Sources content missing"

# 13. Switch back to live
browser_eval "document.querySelector('[data-testid=\"stream-tab-live\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-tab-live\"]')?.classList.contains('stream-tab--active')")
[ "$VALUE" = "true" ] && pass "Live tab active after switch back" || fail "Live tab not active after switch"

# ============================================================================
# PHASE 3: Mapper tab — rebinding
# ============================================================================
echo ""
echo "--- PHASE 3: Mapper tab rebinding ---"

browser_eval "document.querySelector('[data-testid=\"stream-tab-mapper\"]')?.click()" > /dev/null
sleep 0.3

# 14. Mapper rows render
VALUE=$(browser_eval "document.querySelectorAll('[data-testid^=\"stream-mapper-row-\"]').length")
[ "$VALUE" = "4" ] && pass "4 mapper rows render" || fail "Mapper row count: $VALUE"

# 15. Click edit to enter rebind mode
browser_eval "document.querySelector('[data-testid=\"stream-mapper-edit\"]')?.click()" > /dev/null
sleep 0.3

# 16. Rebind buttons appear
VALUE=$(browser_eval "document.querySelectorAll('[data-testid^=\"stream-mapper-rebind-\"]').length")
[ "$VALUE" = "4" ] && pass "Rebind buttons appear" || fail "Rebind buttons: $VALUE"

# 17. Click rebind on JUMP
browser_eval "document.querySelector('[data-testid=\"stream-mapper-rebind-INPUT_JUMP\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-mapper-row-INPUT_JUMP\"]')?.classList.contains('stream-mapper-row--listening')")
[ "$VALUE" = "true" ] && pass "JUMP row in listening state" || fail "JUMP not listening"

# 18. "Press a key..." prompt
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-mapper-row-INPUT_JUMP\"] .stream-mapper-row-key')?.textContent")
[ "$VALUE" = "Press a key..." ] && pass "Press a key... prompt shown" || fail "Prompt: '$VALUE'"

# 19. Cancel rebind
browser_eval "document.querySelector('[data-testid=\"stream-mapper-cancel-INPUT_JUMP\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-mapper-row-INPUT_JUMP\"]')?.classList.contains('stream-mapper-row--listening')")
[ "$VALUE" = "false" ] && pass "Cancelled rebind — no longer listening" || fail "Still listening after cancel"

# 20. Done button closes mapper mode
browser_eval "document.querySelector('[data-testid=\"stream-mapper-done\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-mapper-rebind-INPUT_JUMP\"]')")
[ "$VALUE" = "null" ] && pass "Rebind buttons hidden after done" || fail "Rebind buttons still showing"

# ============================================================================
# PHASE 4: Sources tab
# ============================================================================
echo ""
echo "--- PHASE 4: Sources tab ---"

browser_eval "document.querySelector('[data-testid=\"stream-tab-sources\"]')?.click()" > /dev/null
sleep 0.3

# 21. Keyboard source shows "on"
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-source-status-keyboard\"]')?.textContent?.trim()")
[ "$VALUE" = "on" ] && pass "Keyboard source: on" || fail "Keyboard status: '$VALUE'"

# 22. Voice source shows "coming soon"
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-source-status-voice\"]')?.textContent?.trim()")
[ "$VALUE" = "coming soon" ] && pass "Voice source: coming soon" || fail "Voice status: '$VALUE'"

# 23. Face source shows "coming soon"
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-source-status-face\"]')?.textContent?.trim()")
[ "$VALUE" = "coming soon" ] && pass "Face source: coming soon" || fail "Face status: '$VALUE'"

# 24. API source shows "coming soon"
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-source-status-api\"]')?.textContent?.trim()")
[ "$VALUE" = "coming soon" ] && pass "API source: coming soon" || fail "API status: '$VALUE'"

# ============================================================================
# PHASE 5: API tab
# ============================================================================
echo ""
echo "--- PHASE 5: API tab ---"

# 25. Click API tab
browser_eval "document.querySelector('[data-testid=\"stream-tab-api\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-tab-api\"]')?.classList.contains('stream-tab--active')")
[ "$VALUE" = "true" ] && pass "API tab active after click" || fail "API tab not active"

# 26. API content renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-api\"]') !== null")
[ "$VALUE" = "true" ] && pass "API tab content renders" || fail "API tab content missing"

# 27. Connection section shows disconnected
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-api-status\"]')?.textContent?.trim()")
[ "$VALUE" = "disconnected" ] && pass "Connection status: disconnected" || fail "Connection status: '$VALUE'"

# 28. Connection URL shows default
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-api-url\"]')?.textContent?.trim()")
echo "$VALUE" | grep -q "localhost:3001" && pass "Connection URL shows localhost:3001" || fail "URL: '$VALUE'"

# 29. Trigger buttons render (one per binding)
VALUE=$(browser_eval "document.querySelectorAll('[data-testid^=\"stream-api-trigger-\"]').length")
[ "$VALUE" = "4" ] && pass "4 trigger buttons render" || fail "Trigger button count: $VALUE"

# 30. Click JUMP trigger — event appears in log
browser_eval "document.querySelector('[data-testid=\"stream-api-trigger-INPUT_JUMP\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelectorAll('[data-testid=\"stream-api-event\"]').length")
[ "$VALUE" -ge "1" ] && pass "Event logged after trigger" || fail "Event count: $VALUE"

# 31. Empty state gone after event
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-api-empty\"]')")
[ "$VALUE" = "null" ] && pass "Empty state hidden after event" || fail "Empty state still showing"

# 32. Custom JSON input exists
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-api-custom-input\"]') !== null")
[ "$VALUE" = "true" ] && pass "Custom JSON input exists" || fail "Custom JSON input missing"

# 33. Send invalid JSON — error shows
browser_eval "const inp = document.querySelector('[data-testid=\"stream-api-custom-input\"]'); const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; nativeInputValueSetter.call(inp, 'not json'); inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }))" > /dev/null
sleep 0.3
browser_eval "document.querySelector('[data-testid=\"stream-api-custom-send\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-api-error\"]')?.textContent?.trim()")
[ "$VALUE" = "Invalid JSON" ] && pass "Invalid JSON error shown" || fail "Error: '$VALUE'"

# 34. Clear log button works
browser_eval "document.querySelector('[data-testid=\"stream-api-clear\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelectorAll('[data-testid=\"stream-api-event\"]').length")
[ "$VALUE" = "0" ] && pass "Event log cleared" || fail "Events after clear: $VALUE"

# 35. Endpoint reference renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-api-curl\"]') !== null")
[ "$VALUE" = "true" ] && pass "Curl reference renders" || fail "Curl reference missing"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-api-cli\"]') !== null")
[ "$VALUE" = "true" ] && pass "CLI reference renders" || fail "CLI reference missing"

# Switch back to live for next phases
browser_eval "document.querySelector('[data-testid=\"stream-tab-live\"]')?.click()" > /dev/null
sleep 0.3

# ============================================================================
# PHASE 6: Live view page (OBS transparent)
# ============================================================================
echo ""
echo "--- PHASE 6: Live view page ---"

agent-browser open "$BASE_URL/apps/stream-overlay/live" 2>/dev/null
sleep 3

# 36. Live container renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-live\"]') !== null")
[ "$VALUE" = "true" ] && pass "Live page renders" || fail "Live page missing"

# 37. No topbar
VALUE=$(browser_eval "document.querySelector('[data-testid=\"app-topbar\"]')")
[ "$VALUE" = "null" ] && pass "No topbar on live page" || fail "Topbar found on live page"

# 38. No tab bar
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-tabs\"]')")
[ "$VALUE" = "null" ] && pass "No tab bar on live page" || fail "Tab bar found on live page"

# 39. Action indicators render
VALUE=$(browser_eval "document.querySelectorAll('[data-testid^=\"stream-action-\"]').length")
[ "$VALUE" = "4" ] && pass "4 action indicators on live page" || fail "Action count: $VALUE"

# 40. Background is transparent (class on html element)
VALUE=$(browser_eval "document.documentElement.classList.contains('stream-live-page')")
[ "$VALUE" = "true" ] && pass "Transparent background class applied" || fail "No transparent class"

# 41. Stream live container has transparent background
VALUE=$(browser_eval "getComputedStyle(document.querySelector('[data-testid=\"stream-live\"]')).background")
echo "$VALUE" | grep -qi "transparent\|rgba(0, 0, 0, 0)" && pass "Live container background transparent" || fail "Background: '$VALUE'"

# ============================================================================
# PHASE 7: Keyboard input on live page
# ============================================================================
echo ""
echo "--- PHASE 7: Keyboard input on live page ---"

# 42. Press Space (bound to JUMP)
browser_eval "document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }))" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-action-INPUT_JUMP\"]')?.classList.contains('demo-input-action--active')")
[ "$VALUE" = "true" ] && pass "JUMP activates on Space keydown" || fail "JUMP not active"

# 43. Release Space
browser_eval "document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }))" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-action-INPUT_JUMP\"]')?.classList.contains('demo-input-action--active')")
[ "$VALUE" = "false" ] && pass "JUMP deactivates on Space keyup" || fail "JUMP still active"

# 44. Press KeyX (bound to ATTACK)
browser_eval "document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX', bubbles: true }))" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-action-INPUT_ATTACK\"]')?.classList.contains('demo-input-action--active')")
[ "$VALUE" = "true" ] && pass "ATTACK activates on KeyX" || fail "ATTACK not active"

browser_eval "document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyX', bubbles: true }))" > /dev/null
sleep 0.3

# ============================================================================
# PHASE 8: Debug footer + Instruct overlay
# ============================================================================
echo ""
echo "--- PHASE 8: Debug footer + Instruct overlay ---"

agent-browser open "$BASE_URL/apps/stream-overlay" 2>/dev/null
sleep 3

# 45. Debug footer bar always visible
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-footer-bar\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug footer bar visible" || fail "Debug footer bar missing"

# 46. Footer bar shows debug label and context values
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-footer-bar\"]')?.textContent")
echo "$VALUE" | grep -q "debug" && pass "Footer bar shows debug label" || fail "Footer bar content: '$VALUE'"
echo "$VALUE" | grep -q "bindings:" && pass "Footer bar shows context values" || fail "Footer bar content: '$VALUE'"

# 47. Click bar — debug body expands (entire bar is clickable)
browser_eval "document.querySelector('[data-testid=\"debug-footer-bar\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-footer-body\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug body expands on bar click" || fail "Debug body missing"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "DebugPanel renders inside footer body" || fail "DebugPanel missing"

# 47b. Debug panel tabs render (DevTools-style)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel-tabs\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug panel tabs render" || fail "Debug panel tabs missing"

# 47c. Context tab is active by default
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-tab-context\"]')?.classList.contains('debug-panel-tab--active')")
[ "$VALUE" = "true" ] && pass "Context tab active by default" || fail "Context tab not active"

# 47d. Click State tab — switches content
browser_eval "document.querySelector('[data-testid=\"debug-tab-state\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-tab-state\"]')?.classList.contains('debug-panel-tab--active')")
[ "$VALUE" = "true" ] && pass "State tab activates on click" || fail "State tab not active"

# 47e. Click Events tab — switches content
browser_eval "document.querySelector('[data-testid=\"debug-tab-events\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-tab-events\"]')?.classList.contains('debug-panel-tab--active')")
[ "$VALUE" = "true" ] && pass "Events tab activates on click" || fail "Events tab not active"

# 48. Click bar again — debug body collapses
browser_eval "document.querySelector('[data-testid=\"debug-footer-bar\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-footer-body\"]')")
[ "$VALUE" = "null" ] && pass "Debug body collapsed on bar click" || fail "Debug body still open"

# 49. Instruct toggle button exists
VALUE=$(browser_eval "document.querySelector('[data-testid=\"toggle-instruct\"]') !== null")
[ "$VALUE" = "true" ] && pass "Instruct toggle button exists" || fail "Instruct toggle missing"

# 50. Click instruct — overlay opens
browser_eval "document.querySelector('[data-testid=\"toggle-instruct\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-overlay\"]') !== null")
[ "$VALUE" = "true" ] && pass "Instruct overlay opens" || fail "Instruct overlay missing"

# 51. Close instruct overlay
browser_eval "document.querySelector('[data-testid=\"instruct-close\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-overlay\"]')")
[ "$VALUE" = "null" ] && pass "Instruct overlay closed" || fail "Instruct overlay still open"

# 52. Renderer toggle exists
VALUE=$(browser_eval "document.querySelector('[data-testid=\"renderer-toggle\"]') !== null")
[ "$VALUE" = "true" ] && pass "Renderer toggle exists" || fail "Renderer toggle missing"

# 53. Rive button disabled (no URL)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"renderer-rive\"]')?.disabled")
[ "$VALUE" = "true" ] && pass "Rive button disabled (no URL)" || fail "Rive button not disabled"

# ============================================================================
# PHASE 9: Gallery listing
# ============================================================================
echo ""
echo "--- PHASE 9: Gallery listing ---"

agent-browser open "$BASE_URL/apps" 2>/dev/null
sleep 3

# 50. Stream overlay card in gallery
VALUE=$(browser_eval "document.querySelector('[data-testid=\"gallery-card-stream-overlay\"]') !== null || !!Array.from(document.querySelectorAll('.gallery-card')).find(c => c.textContent.includes('STREAM OVERLAY'))")
[ "$VALUE" = "true" ] && pass "Stream overlay in apps gallery" || fail "Not in gallery"

# ============================================================================
# CLEANUP
# ============================================================================
echo ""
echo "--- Cleanup ---"

agent-browser close 2>/dev/null || true
print_summary
