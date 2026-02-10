# TanStack Start Patterns for e2e-guard

Coverage patterns, element selection, API verification, and state assertions for TanStack Start test generation.

---

## Coverage Patterns

### What to Test Per Route

| Route Type | Required Tests |
|------------|---------------|
| Index route (`index.tsx`) | Loader data renders, elements have testids |
| Dynamic route (`$param.tsx`) | Loader with valid param, loader with invalid param (error boundary) |
| Pathless layout (`_layout.tsx`) | Layout wrapper renders, children render inside it |
| Route with search params | Default params work, explicit params work, invalid params handled |

### What to Test Per Server Function

| Server Function Type | Required Tests |
|---------------------|---------------|
| GET (read) | Returns expected data via UI, handles missing data |
| POST (mutation) | UI updates after mutation, error displayed on failure |
| With validator | Valid input accepted, invalid input rejected |

### What to Test Per Navigation Path

| Navigation Type | Required Tests |
|----------------|---------------|
| Link click (SPA) | URL changes, new route content renders, no full reload |
| Direct URL load (SSR) | Page renders server-side, hydration completes |
| Programmatic navigate | Route changes, search params update |
| Back/forward | Previous route restores, loader data still available |

---

## Element Selection

### SSR vs Hydrated Elements

SSR-rendered HTML exists in the DOM before React hydrates. Selection strategy matters.

| Strategy | SSR Safe | Hydration Safe | Recommended |
|----------|----------|----------------|-------------|
| `data-testid` | Yes | Yes | **Always use** |
| `data-state` attribute | Yes | Yes | For state-driven elements |
| React-specific attrs | No | Yes | Avoid |
| CSS class selectors | Yes | Fragile | Avoid |
| Text content | Yes | Yes | Fallback only |

```bash
# GOOD: data-testid works in both SSR and hydrated contexts
SNAPSHOT=$(agent-browser snapshot -c 2>/dev/null)
echo "$SNAPSHOT" | grep -q 'data-testid="recipe-list"' && pass "Found" || fail "Missing"

# BAD: React-specific attributes may not exist before hydration
echo "$SNAPSHOT" | grep -q '__reactFiber' && pass "Found" || fail "Missing"
```

### TestID Conventions for Routes

| Element | TestID Pattern | Example |
|---------|---------------|---------|
| Route container | `{route-name}-page` | `recipes-page` |
| Loader-rendered list | `{resource}-list` | `recipe-list` |
| List item | `{resource}-item` | `recipe-item` |
| Detail view | `{resource}-detail` | `recipe-detail` |
| Error boundary | `route-error` | `route-error` |
| Loading state | `route-loading` | `route-loading` |
| Search param control | `{param}-control` | `page-control` |

---

## API Verification (Server Functions)

Server functions have unique URL keys (Nitro RPC endpoints). Do **not** intercept network requests. Instead, verify return values through the UI.

```bash
# GOOD: Verify server function effect through rendered UI
agent-browser open "http://localhost:5173/recipes"
sleep 2

COUNT=$(agent-browser eval "document.querySelectorAll('[data-testid=\"recipe-item\"]').length" 2>/dev/null)
[ "$COUNT" -gt 0 ] && pass "Server fn returned $COUNT recipes" || fail "No recipes rendered"

# GOOD: Verify server function via exposed debug state
LOADER=$(agent-browser eval "window.__DEBUG__?.loaderData?.length" 2>/dev/null)
[ "$LOADER" -gt 0 ] && pass "Loader data has $LOADER items" || fail "Empty loader data"
```

```bash
# BAD: Intercepting server function network calls
# Server function URLs are internal implementation details
curl "http://localhost:5173/_server/?fn=getRecipes"  # Fragile, URL changes
```

### Mutation Verification

```bash
# Verify mutation server function via UI state change
# 1. Capture before state
BEFORE=$(agent-browser eval "document.querySelectorAll('[data-testid=\"recipe-item\"]').length" 2>/dev/null)

# 2. Trigger mutation
agent-browser click '[data-testid="add-recipe-btn"]'
sleep 1
agent-browser fill '[data-testid="recipe-name-input"]' "New Recipe"
agent-browser click '[data-testid="save-btn"]'
sleep 2

# 3. Verify after state
AFTER=$(agent-browser eval "document.querySelectorAll('[data-testid=\"recipe-item\"]').length" 2>/dev/null)
[ "$AFTER" -gt "$BEFORE" ] && pass "Recipe added" || fail "Count unchanged: $BEFORE -> $AFTER"
```

---

## State Assertions

### Loader State via Debug Window

```bash
# Verify specific loader fields
NAME=$(agent-browser eval "window.__DEBUG__?.loaderData?.name" 2>/dev/null)
[ "$NAME" = "Pasta" ] && pass "Recipe name: $NAME" || fail "Wrong name: $NAME"
```

### Search Params via URL

```bash
# Verify search params are in the URL
URL=$(agent-browser get url 2>/dev/null)
echo "$URL" | grep -q "page=2" && pass "Page param set" || fail "Missing page param"
echo "$URL" | grep -q "sort=name" && pass "Sort param set" || fail "Missing sort param"
```

### XState State in Route Component

```bash
# Verify XState actor state exposed from route component
STATE=$(agent-browser eval "window.__xstate__?.state()" 2>/dev/null)
[ "$STATE" = "idle" ] && pass "Machine state: $STATE" || fail "Wrong state: $STATE"

# Or via data-state attribute
SNAPSHOT=$(agent-browser snapshot -c 2>/dev/null)
echo "$SNAPSHOT" | grep -q 'data-state="idle"' && pass "State in DOM" || fail "State not reflected"
```

---

## Test Generation Template for a Route

When generating E2E tests for a TanStack Start route, cover these cases:

```bash
# Template: tests/test_{route_name}.sh

echo "--- TEST 1: SSR Load ---"
agent-browser open "$BASE_URL/{route}"
sleep 2
SNAPSHOT=$(agent-browser snapshot -c 2>/dev/null)
echo "$SNAPSHOT" | grep -q 'data-testid="{route}-page"' && \
    pass "SSR rendered" || fail "Not rendered"

echo "--- TEST 2: Loader Data ---"
DATA=$(agent-browser eval "window.__DEBUG__?.loaderData" 2>/dev/null)
[ "$DATA" != "null" ] && [ "$DATA" != "undefined" ] && \
    pass "Loader data present" || fail "No loader data"

echo "--- TEST 3: Error Boundary ---"
agent-browser open "$BASE_URL/{route}/invalid-id-999"
sleep 2
SNAPSHOT=$(agent-browser snapshot -c 2>/dev/null)
echo "$SNAPSHOT" | grep -q 'data-testid="route-error"' && \
    pass "Error boundary shown" || fail "No error boundary"

echo "--- TEST 4: Navigation ---"
agent-browser open "$BASE_URL/"
sleep 2
agent-browser eval "document.querySelector('a[href=\"/{route}\"]').click()" 2>/dev/null
sleep 1
URL=$(agent-browser get url 2>/dev/null)
echo "$URL" | grep -q "/{route}" && pass "SPA navigation" || fail "Navigation failed"
```

---

## Coverage Checklist

For each route in the app:

- [ ] SSR first-load renders correctly
- [ ] Loader data populates UI elements
- [ ] Error boundary shows for invalid params
- [ ] Client navigation works (SPA transition)
- [ ] Search params reflected in URL and UI
- [ ] Server function mutations update the UI
- [ ] All interactive elements have `data-testid`
- [ ] `data-state` attributes reflect current state (if XState)

---

## See Also

- `e2e/references/tanstack-start.md` — Server startup and timing
- `cli-first/references/tanstack-start.md` — State exposure patterns
