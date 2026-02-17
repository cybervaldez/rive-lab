#!/bin/bash
# tests/test_stream_ws.sh — E2E tests for WebSocket event relay
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5173}"
WS_PORT="${WS_PORT:-3001}"
WS_URL="http://localhost:$WS_PORT"
WS_PID=""

# Kill a process tree (parent + all children)
kill_tree() {
    local pid=$1
    if [ -z "$pid" ]; then return; fi
    # Kill child processes first
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
    # Also kill anything left on the port
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
print_header "WebSocket Relay Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Dev server not running on $BASE_URL"
    print_summary
fi

# ============================================================================
# PHASE 1: Start WS server and verify health
# ============================================================================
echo ""
echo "--- PHASE 1: WS server health ---"

# Kill any existing WS server on the port
lsof -ti:$WS_PORT 2>/dev/null | xargs -r kill 2>/dev/null
sleep 0.5

# Start WS server in background
npx tsx src/server/ws.ts &
WS_PID=$!
sleep 2

# 1. Health endpoint responds
HEALTH=$(curl -sf "$WS_URL/health" 2>/dev/null)
echo "$HEALTH" | grep -q '"ok"' && pass "Health endpoint returns ok" || fail "Health: '$HEALTH'"

# 2. Client count starts at 0
echo "$HEALTH" | grep -q '"clients":0' && pass "0 clients initially" || fail "Clients: '$HEALTH'"

# 3. 404 for unknown routes
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$WS_URL/unknown" 2>/dev/null)
[ "$HTTP_CODE" = "404" ] && pass "404 for unknown route" || fail "Unknown route: $HTTP_CODE"

# ============================================================================
# PHASE 2: Control room connects to WS
# ============================================================================
echo ""
echo "--- PHASE 2: Control room WS connection ---"

agent-browser open "$BASE_URL/apps/stream-overlay" 2>/dev/null
sleep 4

# 4. Switch to API tab
browser_eval "document.querySelector('[data-testid=\"stream-tab-api\"]')?.click()" > /dev/null
sleep 1

# 5. Connection status should be connected
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-api-status\"]')?.textContent?.trim()")
[ "$VALUE" = "connected" ] && pass "Control room: connected" || fail "Control room status: '$VALUE'"

# 6. Health shows 1 client
HEALTH=$(curl -sf "$WS_URL/health" 2>/dev/null)
echo "$HEALTH" | grep -q '"clients":1' && pass "Health: 1 client" || fail "Health clients: '$HEALTH'"

# 7. Event log should show WS connected event
VALUE=$(browser_eval "document.querySelectorAll('[data-testid=\"stream-api-event\"]').length")
[ "$VALUE" -ge "1" ] && pass "Connection event logged" || fail "Event count: $VALUE"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-api-event\"]')?.textContent")
echo "$VALUE" | grep -q "connected" && pass "Event mentions 'connected'" || fail "Event text: '$VALUE'"

# ============================================================================
# PHASE 3: HTTP POST relay to control room
# ============================================================================
echo ""
echo "--- PHASE 3: HTTP POST relay ---"

# 8. POST an event via HTTP
RESULT=$(curl -sf -X POST "$WS_URL/api/events" \
  -H "Content-Type: application/json" \
  -d '{"type":"TRIGGER_INPUT","action":"INPUT_JUMP","source":"api"}' 2>/dev/null)
echo "$RESULT" | grep -q '"relayed":1' && pass "POST relayed to 1 client" || fail "POST result: '$RESULT'"
sleep 0.5

# 9. JUMP action should activate on control room (live tab)
browser_eval "document.querySelector('[data-testid=\"stream-tab-live\"]')?.click()" > /dev/null
sleep 0.3

# The trigger lasts briefly — check via the event log instead
browser_eval "document.querySelector('[data-testid=\"stream-tab-api\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "Array.from(document.querySelectorAll('[data-testid=\"stream-api-event\"]')).some(e => e.textContent.includes('TRIGGER_INPUT'))")
[ "$VALUE" = "true" ] && pass "TRIGGER_INPUT event in log" || fail "No TRIGGER_INPUT in log"

# 10. POST with invalid JSON returns 400
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$WS_URL/api/events" \
  -H "Content-Type: application/json" \
  -d 'not json' 2>/dev/null)
[ "$HTTP_CODE" = "400" ] && pass "Invalid JSON returns 400" || fail "Invalid JSON: $HTTP_CODE"

# 11. POST without type field returns 400
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$WS_URL/api/events" \
  -H "Content-Type: application/json" \
  -d '{"action":"INPUT_JUMP"}' 2>/dev/null)
[ "$HTTP_CODE" = "400" ] && pass "Missing type returns 400" || fail "Missing type: $HTTP_CODE"

# ============================================================================
# PHASE 4: Test console relay via WS
# ============================================================================
echo ""
echo "--- PHASE 4: Test console relay ---"

# 12. Clear log first
browser_eval "document.querySelector('[data-testid=\"stream-api-clear\"]')?.click()" > /dev/null
sleep 0.3

# 13. Click ATTACK trigger in test console
browser_eval "document.querySelector('[data-testid=\"stream-api-trigger-INPUT_ATTACK\"]')?.click()" > /dev/null
sleep 0.5

# 14. Event log should show RELAY source (since WS is connected)
VALUE=$(browser_eval "Array.from(document.querySelectorAll('[data-testid=\"stream-api-event\"]')).some(e => e.textContent.includes('RELAY'))")
[ "$VALUE" = "true" ] && pass "Trigger logged as RELAY" || fail "No RELAY in log"

# ============================================================================
# PHASE 5: Live view receives relayed events
# ============================================================================
echo ""
echo "--- PHASE 5: Live view relay ---"

# Open live view in a new browser instance
agent-browser close 2>/dev/null
sleep 1

agent-browser open "$BASE_URL/apps/stream-overlay/live" 2>/dev/null
sleep 4

# 15. Live page renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-live\"]') !== null")
[ "$VALUE" = "true" ] && pass "Live page renders" || fail "Live page missing"

# 16. Health shows 1 client (live view — control room disconnected since we closed browser)
# Actually it might take a moment for the server to register the close
sleep 1
HEALTH=$(curl -sf "$WS_URL/health" 2>/dev/null)
CLIENTS=$(echo "$HEALTH" | grep -o '"clients":[0-9]*' | grep -o '[0-9]*')
[ "$CLIENTS" -ge "1" ] && pass "Live view connected (${CLIENTS} client(s))" || fail "Health: '$HEALTH'"

# 17. POST TRIGGER_INPUT and check if live view activates
curl -sf -X POST "$WS_URL/api/events" \
  -H "Content-Type: application/json" \
  -d '{"type":"TRIGGER_INPUT","action":"INPUT_JUMP","source":"api"}' > /dev/null 2>&1
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-action-INPUT_JUMP\"]')?.classList.contains('demo-input-action--active')")
[ "$VALUE" = "true" ] && pass "JUMP activates via HTTP relay" || fail "JUMP not active: '$VALUE'"

# 18. POST CLEAR_TRIGGER to deactivate
curl -sf -X POST "$WS_URL/api/events" \
  -H "Content-Type: application/json" \
  -d '{"type":"CLEAR_TRIGGER","action":"INPUT_JUMP"}' > /dev/null 2>&1
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-action-INPUT_JUMP\"]')?.classList.contains('demo-input-action--active')")
[ "$VALUE" = "false" ] && pass "JUMP deactivates via CLEAR relay" || fail "JUMP still active: '$VALUE'"

# 19. POST ATTACK trigger
curl -sf -X POST "$WS_URL/api/events" \
  -H "Content-Type: application/json" \
  -d '{"type":"TRIGGER_INPUT","action":"INPUT_ATTACK","source":"api"}' > /dev/null 2>&1
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-action-INPUT_ATTACK\"]')?.classList.contains('demo-input-action--active')")
[ "$VALUE" = "true" ] && pass "ATTACK activates via HTTP relay" || fail "ATTACK not active"

curl -sf -X POST "$WS_URL/api/events" \
  -H "Content-Type: application/json" \
  -d '{"type":"CLEAR_TRIGGER","action":"INPUT_ATTACK"}' > /dev/null 2>&1
sleep 0.3

# ============================================================================
# PHASE 6: Reconnection after server restart
# ============================================================================
echo ""
echo "--- PHASE 6: Reconnection ---"

# 20. Kill WS server
stop_ws
sleep 1

# Live view should still render (just disconnected)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-live\"]') !== null")
[ "$VALUE" = "true" ] && pass "Live view persists after server kill" || fail "Live view gone"

# 21. Keyboard still works locally on live view
browser_eval "document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }))" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-action-INPUT_JUMP\"]')?.classList.contains('demo-input-action--active')")
[ "$VALUE" = "true" ] && pass "Keyboard works without WS server" || fail "Keyboard broken without WS"

browser_eval "document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', bubbles: true }))" > /dev/null
sleep 0.3

# 22. Restart WS server
npx tsx src/server/ws.ts &
WS_PID=$!
sleep 3

# Wait for reconnection (backoff may take a few seconds)
sleep 5

# 23. Health shows client reconnected
HEALTH=$(curl -sf "$WS_URL/health" 2>/dev/null)
CLIENTS=$(echo "$HEALTH" | grep -o '"clients":[0-9]*' | grep -o '[0-9]*')
[ "$CLIENTS" -ge "1" ] && pass "Client reconnected after restart ($CLIENTS)" || fail "No reconnection: '$HEALTH'"

# 24. POST event still works after reconnection
curl -sf -X POST "$WS_URL/api/events" \
  -H "Content-Type: application/json" \
  -d '{"type":"TRIGGER_INPUT","action":"INPUT_DEFEND","source":"api"}' > /dev/null 2>&1
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-action-INPUT_DEFEND\"]')?.classList.contains('demo-input-action--active')")
[ "$VALUE" = "true" ] && pass "DEFEND activates after reconnection" || fail "DEFEND not active after reconnect"

curl -sf -X POST "$WS_URL/api/events" \
  -H "Content-Type: application/json" \
  -d '{"type":"CLEAR_TRIGGER","action":"INPUT_DEFEND"}' > /dev/null 2>&1
sleep 0.3

# ============================================================================
# PHASE 7: Control room connection status badge
# ============================================================================
echo ""
echo "--- PHASE 7: Connection status badge ---"

agent-browser close 2>/dev/null
sleep 1

agent-browser open "$BASE_URL/apps/stream-overlay" 2>/dev/null
sleep 4

# 25. Switch to API tab
browser_eval "document.querySelector('[data-testid=\"stream-tab-api\"]')?.click()" > /dev/null
sleep 1

# 26. Should show connected
VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-api-status\"]')?.textContent?.trim()")
[ "$VALUE" = "connected" ] && pass "Badge: connected" || fail "Badge: '$VALUE'"

# 27. Kill server — badge should change
stop_ws
sleep 6

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-api-status\"]')?.textContent?.trim()")
echo "$VALUE" | grep -qiE "reconnecting|disconnected" && pass "Badge: $VALUE (server down)" || fail "Badge after kill: '$VALUE'"

# 28. Restart — badge returns to connected
npx tsx src/server/ws.ts &
WS_PID=$!
sleep 10

VALUE=$(browser_eval "document.querySelector('[data-testid=\"stream-api-status\"]')?.textContent?.trim()")
[ "$VALUE" = "connected" ] && pass "Badge: reconnected" || fail "Badge after restart: '$VALUE'"

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
