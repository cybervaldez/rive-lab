# TanStack Start Patterns for e2e

Server startup, hydration timing, and artifact paths for E2E testing TanStack Start apps.

---

## Dev Server Startup

TanStack Start uses Vite under the hood. Default port is **5173**.

### Startup Command

```bash
# Standard startup
npm run dev &
DEV_PID=$!
```

### Health Check Polling

```bash
wait_for_server() {
    local url="${1:-http://localhost:5173}"
    local max_attempts=15
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            return 0
        fi
        ((attempt++))
        sleep 1
    done
    return 1
}

# Usage
npm run dev &
DEV_PID=$!

if ! wait_for_server "http://localhost:5173"; then
    fail "TanStack Start dev server failed to start"
    kill $DEV_PID 2>/dev/null
    exit 1
fi
pass "Dev server running on :5173"
```

### Cleanup Trap

```bash
cleanup() {
    agent-browser close 2>/dev/null || true
    kill $DEV_PID 2>/dev/null || true
}
trap cleanup EXIT
```

---

## SSR Hydration Timing

TanStack Start renders HTML on the server. Elements exist in the DOM **before React hydrates**. Clicking before hydration does nothing.

| Phase | DOM State | Interactive | Duration |
|-------|-----------|-------------|----------|
| SSR HTML received | Elements visible | No | ~0ms |
| React hydration | Elements visible | Partial | ~500-1500ms |
| Fully hydrated | Elements visible | Yes | After hydration |

### Hydration-Aware Wait Pattern

```bash
# Wait for hydration, not just DOM presence
wait_for_hydration() {
    local max_attempts=10
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        # Check for React root hydration marker
        HYDRATED=$(agent-browser eval "document.getElementById('root')?._reactRootContainer !== undefined || document.querySelector('[data-reactroot]') !== null" 2>/dev/null)
        if [ "$HYDRATED" = "true" ]; then
            return 0
        fi
        ((attempt++))
        sleep 0.5
    done
    return 1
}

# Usage
agent-browser open "http://localhost:5173/recipes"
wait_for_hydration && pass "Hydrated" || fail "Hydration timeout"
```

### Simpler Wait: Use data-testid + Interaction

```bash
# Practical approach: wait for an interactive element to respond
agent-browser open "http://localhost:5173/recipes"
sleep 2  # Allow hydration time

# Verify interactivity by checking state exposure
STATE=$(agent-browser eval "typeof window.__DEBUG__" 2>/dev/null)
[ "$STATE" = "object" ] && pass "App hydrated with debug" || fail "Not hydrated"
```

---

## Testing Navigation Between Routes

```bash
# Test client-side navigation (SPA transition)
agent-browser open "http://localhost:5173/"
sleep 2

# Click a link to navigate
agent-browser eval "document.querySelector('a[href=\"/recipes\"]').click()" 2>/dev/null
sleep 1  # Client navigation is fast

# Verify new route loaded
URL=$(agent-browser get url 2>/dev/null)
echo "$URL" | grep -q "/recipes" && pass "Navigated to /recipes" || fail "Wrong URL: $URL"

# Verify loader data rendered
SNAPSHOT=$(agent-browser snapshot -c 2>/dev/null)
echo "$SNAPSHOT" | grep -q 'data-testid="recipe-list"' && \
    pass "Recipe list rendered" || fail "No recipe list"
```

### Testing Dynamic Route Params

```bash
# Navigate to a dynamic route
agent-browser open "http://localhost:5173/recipes/abc-123"
sleep 2

# Verify param was consumed by loader
SNAPSHOT=$(agent-browser snapshot -c 2>/dev/null)
echo "$SNAPSHOT" | grep -q 'data-testid="recipe-detail"' && \
    pass "Recipe detail loaded" || fail "Recipe not found"
```

---

## Testing Server Function Behavior in E2E

Server functions are called via the UI, not directly. Verify their effects.

```bash
# Test a mutation server function through the UI
agent-browser open "http://localhost:5173/recipes/new"
sleep 2

# Fill form and submit
agent-browser fill '[data-testid="recipe-name-input"]' "Test Recipe"
agent-browser click '[data-testid="recipe-submit-btn"]'
sleep 2

# Verify server function effect: redirect or UI update
URL=$(agent-browser get url 2>/dev/null)
echo "$URL" | grep -q "/recipes/" && pass "Redirected after create" || fail "No redirect"
```

---

## Build Output Paths

TanStack Start uses **Nitro** for production builds. Output differs from standard Vite.

| Environment | Output Location | Notes |
|-------------|----------------|-------|
| Dev server | In-memory (Vite) | No disk output |
| Production build | `.output/` | Nitro output directory |
| Static export | `.output/public/` | When using SSG preset |

```
GOOD: Check the correct build output
----------------------------------------------
ls .output/server/     # Server bundle
ls .output/public/     # Static assets

BAD: Looking in the wrong place
----------------------------------------------
ls dist/               # Standard Vite output — NOT used by TanStack Start
ls build/              # Not the output directory
```

---

## Timing Constants for TanStack Start

| Wait Type | Duration | Use Case |
|-----------|----------|----------|
| SSR hydration | 2s | First page load — HTML exists but not interactive |
| Client navigation | 1s | SPA transition between routes |
| Server function response | 1-2s | After form submit or action trigger |
| Dev server startup | 10-15s | Cold start with route tree generation |
| Loader data refresh | 1s | After `router.invalidate()` call |

---

## E2E Test Template

```bash
#!/bin/bash
# tests/test_recipes.sh — E2E test for recipe routes

BASE_URL="http://localhost:5173"
PASSED=0
FAILED=0

pass() { echo "  [PASS] $1"; ((PASSED++)); }
fail() { echo "  [FAIL] $1"; ((FAILED++)); }

cleanup() {
    agent-browser close 2>/dev/null || true
}
trap cleanup EXIT

echo "--- TEST: Recipe Routes ---"

# 1. Verify route loads with SSR
agent-browser open "$BASE_URL/recipes"
sleep 2

SNAPSHOT=$(agent-browser snapshot -c 2>/dev/null)
echo "$SNAPSHOT" | grep -q 'data-testid="recipe-list"' && \
    pass "Recipe list rendered" || fail "No recipe list"

# 2. Verify navigation to detail
agent-browser eval "document.querySelector('[data-testid=\"recipe-item\"]').click()" 2>/dev/null
sleep 1

URL=$(agent-browser get url 2>/dev/null)
echo "$URL" | grep -q "/recipes/" && pass "Navigated to detail" || fail "No navigation"

echo "=== RESULTS: $PASSED passed, $FAILED failed ==="
[ "$FAILED" -eq 0 ] && exit 0 || exit 1
```

---

## See Also

- `testing-conventions.md` — Universal E2E patterns
- `cli-first/references/tanstack-start.md` — State verification commands
