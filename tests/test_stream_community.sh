#!/bin/bash
# tests/test_stream_community.sh — E2E tests for Community tab + Viewer page
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
WS_PORT="${WS_PORT:-3001}"
WS_URL="http://localhost:$WS_PORT"
WS_PID=""
ROOM_ID=""

# Kill a process tree (parent + all children)
kill_tree() {
    local pid=$1
    if [ -z "$pid" ]; then return; fi
    local children
    children=$(pgrep -P "$pid" 2>/dev/null)
    for child in $children; do
        kill_tree "$child"
    done
    kill -9 "$pid" 2>/dev/null
}

stop_ws() {
    if [ -n "$WS_PID" ]; then
        kill_tree "$WS_PID"
        wait "$WS_PID" 2>/dev/null
        WS_PID=""
    fi
    lsof -ti:$WS_PORT 2>/dev/null | xargs -r kill -9 2>/dev/null
    sleep 1
}

setup_cleanup() {
    cleanup() {
        agent-browser close 2>/dev/null || true
        stop_ws
    }
    trap cleanup EXIT
}

setup_cleanup
print_header "Community Tab + Viewer Page Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Dev server not running on $BASE_URL"
    print_summary
fi

# ============================================================================
# PHASE 1: Start WS server
# ============================================================================
echo ""
echo "--- PHASE 1: Setup ---"

lsof -ti:$WS_PORT 2>/dev/null | xargs -r kill -9 2>/dev/null
sleep 0.5
npx tsx src/server/ws.ts &
WS_PID=$!
sleep 2

HEALTH=$(curl -sf "$WS_URL/health" 2>/dev/null)
echo "$HEALTH" | grep -q '"ok"' && pass "WS server running" || fail "WS server not responding"

# ============================================================================
# PHASE 2: Community tab renders and room creation
# ============================================================================
echo ""
echo "--- PHASE 2: Community tab + Room creation ---"

agent-browser open "$BASE_URL/apps/stream-overlay" 2>/dev/null
sleep 4

# 1. Click community tab
browser_eval "document.querySelector('[data-testid=\"stream-tab-community\"]')?.click()" > /dev/null
sleep 1

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-tab-community\"]')?.classList.contains('stream-tab--active')")
[ "$VALUE" = "true" ] && pass "Community tab active" || fail "Community tab not active"

# 2. Community content renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-community\"]') !== null")
[ "$VALUE" = "true" ] && pass "Community tab content renders" || fail "Community content missing"

# 3. Create room button exists
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-community-create\"]') !== null")
[ "$VALUE" = "true" ] && pass "Create room button exists" || fail "Create button missing"

# 4. Click create room
browser_eval "document.querySelector('[data-testid=\"stream-community-create\"]')?.click()" > /dev/null
sleep 1

# 5. Room URL appears
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-community-url\"]')?.textContent?.trim()")
echo "$VALUE" | grep -q "/view/" && pass "Room URL shows /view/ path" || fail "URL: '$VALUE'"

# Extract room ID from URL for later use
ROOM_ID=$(browser_eval "document.querySelector('[data-testid=\"stream-community-url\"]')?.textContent?.trim()?.split('/view/')[1]" | tr -d '"')
echo "  [INFO] Room ID: $ROOM_ID"

# 6. Viewer count starts at 0
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-community-viewers\"]')?.textContent?.trim()")
[ "$VALUE" = "viewers: 0" ] && pass "Viewer count: 0" || fail "Viewer count: '$VALUE'"

# 7. Close room button exists
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-community-close\"]') !== null")
[ "$VALUE" = "true" ] && pass "Close room button exists" || fail "Close button missing"

# 8. Push content section exists
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-community-push\"]') !== null")
[ "$VALUE" = "true" ] && pass "Push content section exists" || fail "Push section missing"

# 9. Preview shows empty state
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-community-preview-empty\"]')?.textContent?.trim()")
[ "$VALUE" = "No content pushed yet" ] && pass "Preview: empty state" || fail "Preview: '$VALUE'"

# ============================================================================
# PHASE 3: Push text content
# ============================================================================
echo ""
echo "--- PHASE 3: Push text content ---"

# 10. Type and send a text message
browser_eval "const inp = document.querySelector('[data-testid=\"stream-community-text-input\"]'); const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; nativeInputValueSetter.call(inp, 'Hello from the streamer!'); inp.dispatchEvent(new Event('input', { bubbles: true }))" > /dev/null
sleep 0.3

browser_eval "document.querySelector('[data-testid=\"stream-community-text-send\"]')?.click()" > /dev/null
sleep 0.5

# 11. Preview shows the text
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-community-preview-text\"]')?.textContent?.trim()")
[ "$VALUE" = "Hello from the streamer!" ] && pass "Preview: text content shown" || fail "Preview text: '$VALUE'"

# 12. Input field cleared after send
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-community-text-input\"]')?.value")
[ "$VALUE" = "" ] && pass "Text input cleared after send" || fail "Input still has: '$VALUE'"

# ============================================================================
# PHASE 4: Viewer page (uses HTTP API to create a persistent room)
# ============================================================================
echo ""
echo "--- PHASE 4: Viewer page ---"

# Close streamer browser — that room will die, but we create a new one via HTTP
agent-browser close 2>/dev/null
sleep 1

# Create a room via HTTP API (no WS streamer = room persists)
HTTP_ROOM=$(curl -sf -X POST "$WS_URL/api/rooms" 2>/dev/null)
HTTP_ROOM_ID=$(echo "$HTTP_ROOM" | grep -o '"roomId":"[^"]*"' | cut -d'"' -f4)
echo "  [INFO] HTTP Room ID: $HTTP_ROOM_ID"
[ -n "$HTTP_ROOM_ID" ] && pass "Room created via HTTP API" || fail "HTTP room creation failed: '$HTTP_ROOM'"

# Push text content via HTTP
curl -sf -X POST "$WS_URL/api/room/$HTTP_ROOM_ID/push" \
  -H "Content-Type: application/json" \
  -d '{"type":"text","value":"Hello from the streamer!"}' > /dev/null 2>&1

# Open viewer page for the HTTP-created room
agent-browser open "$BASE_URL/view/$HTTP_ROOM_ID" 2>/dev/null
sleep 4

# 13. Viewer page renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"viewer-page\"]') !== null")
[ "$VALUE" = "true" ] && pass "Viewer page renders" || fail "Viewer page missing"

# 14. Footer badge exists
VALUE=$(browser_eval "document.querySelector('[data-testid=\"viewer-footer\"]')?.textContent?.trim()")
echo "$VALUE" | grep -q "rive-lab" && pass "Footer shows rive-lab branding" || fail "Footer: '$VALUE'"

# 15. Viewer receives current content (late join)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"viewer-text\"]')?.textContent?.trim()")
[ "$VALUE" = "Hello from the streamer!" ] && pass "Viewer shows text: late join works" || fail "Viewer text: '$VALUE'"

# ============================================================================
# PHASE 5: Live push from HTTP API (viewer still open)
# ============================================================================
echo ""
echo "--- PHASE 5: Push via HTTP API ---"

# 16. Push a link via HTTP
curl -sf -X POST "$WS_URL/api/room/$HTTP_ROOM_ID/push" \
  -H "Content-Type: application/json" \
  -d '{"type":"link","value":"https://example.com/cool"}' > /dev/null 2>&1
sleep 0.5

# 17. Viewer shows the link
VALUE=$(browser_eval "document.querySelector('[data-testid=\"viewer-link\"]')?.textContent?.trim()")
[ "$VALUE" = "https://example.com/cool" ] && pass "Viewer shows link from HTTP push" || fail "Viewer link: '$VALUE'"

# 18. Link is clickable (has href)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"viewer-link\"]')?.href")
echo "$VALUE" | grep -q "example.com/cool" && pass "Link has correct href" || fail "Href: '$VALUE'"

# Clean up HTTP room
curl -sf -X DELETE "$WS_URL/api/room/$HTTP_ROOM_ID" > /dev/null 2>&1

# ============================================================================
# PHASE 6: Clear content (streamer browser)
# ============================================================================
echo ""
echo "--- PHASE 6: Clear content ---"

agent-browser close 2>/dev/null
sleep 1

agent-browser open "$BASE_URL/apps/stream-overlay" 2>/dev/null
sleep 4

# Switch to community tab and create a new room
browser_eval "document.querySelector('[data-testid=\"stream-tab-community\"]')?.click()" > /dev/null
sleep 1

browser_eval "document.querySelector('[data-testid=\"stream-community-create\"]')?.click()" > /dev/null
sleep 1
ROOM_ID=$(browser_eval "document.querySelector('[data-testid=\"stream-community-url\"]')?.textContent?.trim()?.split('/view/')[1]" | tr -d '"')
echo "  [INFO] Room ID: $ROOM_ID"
pass "Created room for clear test"

# Push text content
browser_eval "const inp = document.querySelector('[data-testid=\"stream-community-text-input\"]'); const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; nativeInputValueSetter.call(inp, 'Content to clear'); inp.dispatchEvent(new Event('input', { bubbles: true }))" > /dev/null
sleep 0.3
browser_eval "document.querySelector('[data-testid=\"stream-community-text-send\"]')?.click()" > /dev/null
sleep 0.5

# 19. Preview shows content
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-community-preview-text\"]')?.textContent?.trim()")
[ "$VALUE" = "Content to clear" ] && pass "Content pushed before clear" || fail "Content: '$VALUE'"

# 20. Click clear all
browser_eval "document.querySelector('[data-testid=\"stream-community-clear\"]')?.click()" > /dev/null
sleep 0.5

# 21. Preview back to empty
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-community-preview-empty\"]')?.textContent?.trim()")
[ "$VALUE" = "No content pushed yet" ] && pass "Content cleared" || fail "After clear: '$VALUE'"

# ============================================================================
# PHASE 7: Close room — streamer returns to idle
# ============================================================================
echo ""
echo "--- PHASE 7: Close room ---"

# Push some content first
browser_eval "const inp = document.querySelector('[data-testid=\"stream-community-text-input\"]'); const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; nativeInputValueSetter.call(inp, 'Before close'); inp.dispatchEvent(new Event('input', { bubbles: true }))" > /dev/null
sleep 0.3
browser_eval "document.querySelector('[data-testid=\"stream-community-text-send\"]')?.click()" > /dev/null
sleep 0.5

# Now close the room
browser_eval "document.querySelector('[data-testid=\"stream-community-close\"]')?.click()" > /dev/null
sleep 1

# 22. Streamer is back to idle (create room button shows)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-community-create\"]') !== null")
[ "$VALUE" = "true" ] && pass "Back to idle after close" || fail "Not idle after close"

# 23. Verify room is gone from server
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$WS_URL/api/room/$ROOM_ID" 2>/dev/null)
[ "$HTTP_CODE" = "404" ] && pass "Room deleted from server" || fail "Room still exists: $HTTP_CODE"

# ============================================================================
# PHASE 8: Viewer page — room not found
# ============================================================================
echo ""
echo "--- PHASE 8: Viewer page edge cases ---"

agent-browser close 2>/dev/null
sleep 1

# 24. Open viewer page for non-existent room
agent-browser open "$BASE_URL/view/000000" 2>/dev/null
sleep 4

VALUE=$(browser_eval "document.querySelector('[data-testid=\"viewer-not-found\"]')?.textContent?.trim()")
[ "$VALUE" = "Room not found" ] && pass "Viewer: room not found" || fail "Not found text: '$VALUE'"

# 25. Footer still shows on error page
VALUE=$(browser_eval "document.querySelector('[data-testid=\"viewer-footer\"]')?.textContent?.trim()")
echo "$VALUE" | grep -q "rive-lab" && pass "Footer on error page" || fail "Footer: '$VALUE'"

# ============================================================================
# PHASE 9: Viewer page — stream ended
# ============================================================================
echo ""
echo "--- PHASE 9: Stream ended ---"

agent-browser close 2>/dev/null
sleep 1

# Create room via HTTP, open viewer, then delete room — viewer should see "Stream ended"
HTTP_ROOM=$(curl -sf -X POST "$WS_URL/api/rooms" 2>/dev/null)
HTTP_ROOM_ID=$(echo "$HTTP_ROOM" | grep -o '"roomId":"[^"]*"' | cut -d'"' -f4)
echo "  [INFO] HTTP Room ID: $HTTP_ROOM_ID"

agent-browser open "$BASE_URL/view/$HTTP_ROOM_ID" 2>/dev/null
sleep 4

# Verify viewer is connected first
VALUE=$(browser_eval "document.querySelector('[data-testid=\"viewer-waiting\"]')?.textContent?.trim()")
[ "$VALUE" = "Waiting for the streamer..." ] && pass "Viewer: waiting state" || fail "Viewer state: '$VALUE'"

# Now delete the room — viewer should see "Stream ended"
curl -sf -X DELETE "$WS_URL/api/room/$HTTP_ROOM_ID" > /dev/null 2>&1
sleep 1

# 26. Viewer shows "Stream ended"
VALUE=$(browser_eval "document.querySelector('[data-testid=\"viewer-ended\"]')?.textContent?.trim()")
[ "$VALUE" = "Stream ended" ] && pass "Viewer: stream ended" || fail "Ended text: '$VALUE'"

# ============================================================================
# PHASE 10: Viewer count via room status API
# ============================================================================
echo ""
echo "--- PHASE 10: Viewer count ---"

agent-browser close 2>/dev/null
sleep 1

# Open streamer, create room
agent-browser open "$BASE_URL/apps/stream-overlay" 2>/dev/null
sleep 4
browser_eval "document.querySelector('[data-testid=\"stream-tab-community\"]')?.click()" > /dev/null
sleep 1
browser_eval "document.querySelector('[data-testid=\"stream-community-create\"]')?.click()" > /dev/null
sleep 1
ROOM_ID=$(browser_eval "document.querySelector('[data-testid=\"stream-community-url\"]')?.textContent?.trim()?.split('/view/')[1]" | tr -d '"')
echo "  [INFO] Room ID: $ROOM_ID"

# 27. Check room status shows 0 viewers
ROOM_STATUS=$(curl -sf "$WS_URL/api/room/$ROOM_ID" 2>/dev/null)
echo "$ROOM_STATUS" | grep -q "\"viewers\":0" && pass "Room status: 0 viewers" || fail "Room status: '$ROOM_STATUS'"

# ============================================================================
# CLEANUP
# ============================================================================
echo ""
echo "--- Cleanup ---"

agent-browser close 2>/dev/null
pass "Browser closed"

stop_ws
pass "WS server stopped"

print_summary
