# TanStack Start Patterns for e2e-investigate

Failure patterns, log formats, and reproduction steps for debugging TanStack Start E2E failures.

---

## Common Failure Patterns

| Failure | Symptom | Root Cause | Fix |
|---------|---------|------------|-----|
| Hydration mismatch | Console warning: "Text content did not match" | Server HTML differs from client render | Remove `Date.now()`, `Math.random()`, browser APIs from render body |
| 404 on route | Page shows "Not Found" or blank | Missing route file or wrong file name | Verify file exists in `src/routes/` with correct naming convention |
| Server function import error | Runtime crash: "Cannot use import statement" | Client-only module imported in server fn | Move import inside `createServerFn` handler or use dynamic import |
| CORS on server function | Network error in browser console | Server function called cross-origin in dev | Ensure same origin; check Vite proxy config |
| Route tree stale | New route not accessible | Route tree not regenerated | Restart dev server or delete `routeTree.gen.ts` |
| Loader timeout | Page loads but shows error boundary | Server function takes too long | Check DB connection, add timeout handling |
| Search param type error | URL works but params are wrong type | Missing `validateSearch` on route | Add Zod schema to `validateSearch` |

---

## Diagnostic Commands

### Check Server Status

```bash
# Is the dev server running?
curl -sf http://localhost:5173 > /dev/null && echo "Server up" || echo "Server down"

# Check server process
ps aux | grep "vinxi\|vite\|nitro" | grep -v grep
```

### Check for Hydration Errors

```bash
# Open page and capture console errors
agent-browser open "http://localhost:5173/recipes"
sleep 3
ERRORS=$(agent-browser errors 2>/dev/null)
echo "$ERRORS" | grep -qi "hydration\|mismatch\|did not match" && \
    echo "HYDRATION MISMATCH DETECTED" || echo "No hydration errors"
```

### Check Route Accessibility

```bash
# Verify route returns HTML (not 404)
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost:5173/recipes")
[ "$HTTP_CODE" = "200" ] && echo "Route OK" || echo "Route returned $HTTP_CODE"
```

### Check Server Function Errors

```bash
# Server function errors surface in the browser console
agent-browser open "http://localhost:5173/recipes"
sleep 2
ERRORS=$(agent-browser errors 2>/dev/null)
echo "$ERRORS" | grep -qi "server\|function\|500" && \
    echo "SERVER FN ERROR: $ERRORS" || echo "No server function errors"
```

---

## Log Formats

### Vite Dev Server Logs

```
  VITE v5.x.x  ready in 500 ms

  ->  Local:   http://localhost:5173/
  ->  Network: http://192.168.1.x:5173/

  12:00:00 [vite] hmr update /src/routes/recipes.tsx
  12:00:01 [vite] page reload src/routes/recipes.tsx
```

Key log patterns:

| Pattern | Meaning |
|---------|---------|
| `ready in X ms` | Server started successfully |
| `hmr update` | Hot module replacement (file changed) |
| `page reload` | Full page reload triggered (route change) |
| `[ERROR]` | Build or transform error |
| `Pre-transform error` | Module resolution failure |

### Nitro Server Logs (Production / SSR)

```
[nitro] [dev] [request] GET /recipes 200
[nitro] [dev] [request] POST /_server?fn=createRecipe 200
[nitro] [dev] [error] GET /recipes/bad-id 500
```

Key patterns:

| Pattern | Meaning |
|---------|---------|
| `[request] GET /path 200` | Successful SSR page load |
| `[request] POST /_server` | Server function call |
| `[error] ... 500` | Server-side error (check handler) |

### Browser Console (Hydration Warnings)

```
Warning: Text content did not match. Server: "1706000000" Client: "1706000001"
Warning: Expected server HTML to contain a matching <div> in <div>.
```

---

## Reproduction Steps

### SSR Issues vs Client Navigation

SSR issues **only appear on first load** (server-rendered). They do NOT appear on client-side navigation. This distinction is critical for reproduction.

| Issue Type | Reproduction | Why |
|------------|-------------|-----|
| Hydration mismatch | Full page refresh (`Ctrl+R`) or `curl` the URL | Server renders first; client re-renders differently |
| Client navigation bug | Click a link in the app | Loader runs client-side, no SSR |
| Loader error | Direct URL load | Loader runs server-side on first load |

### Reproduction Pattern: SSR Issue

```bash
# Step 1: Load page fresh (SSR path)
agent-browser open "http://localhost:5173/recipes"
sleep 2

# Step 2: Check for hydration errors
ERRORS=$(agent-browser errors 2>/dev/null)
echo "Errors on SSR load: $ERRORS"

# Step 3: Navigate away and back (client path)
agent-browser eval "document.querySelector('a[href=\"/\"]').click()" 2>/dev/null
sleep 1
agent-browser eval "document.querySelector('a[href=\"/recipes\"]').click()" 2>/dev/null
sleep 1

# Step 4: Check errors again — if none, it's SSR-only
ERRORS2=$(agent-browser errors 2>/dev/null)
echo "Errors on client nav: $ERRORS2"
```

### Reproduction Pattern: Missing Route

```bash
# Step 1: Verify the file exists
ls src/routes/recipes/\$recipeId.tsx 2>/dev/null && \
    echo "File exists" || echo "FILE MISSING — this is the cause"

# Step 2: Check route tree includes it
grep "recipeId" src/routeTree.gen.ts 2>/dev/null && \
    echo "In route tree" || echo "NOT in route tree — restart dev server"

# Step 3: Restart dev server to regenerate
# Kill existing and restart
```

### Reproduction Pattern: Server Function Error

```bash
# Step 1: Trigger the server function via UI
agent-browser open "http://localhost:5173/recipes/new"
sleep 2
agent-browser click '[data-testid="save-btn"]'
sleep 2

# Step 2: Check both browser and server logs
ERRORS=$(agent-browser errors 2>/dev/null)
echo "Browser errors: $ERRORS"

# Step 3: Check server logs for 500s
# Look at terminal running dev server for [error] lines
```

---

## Quick Diagnosis Flowchart

```
Page not rendering?
    |
    +-> curl returns 404?
    |       +-> YES: Check src/routes/ file exists + naming
    |       +-> Restart dev server (route tree stale)
    |
    +-> curl returns 500?
    |       +-> YES: Check server logs for error
    |       +-> Likely loader or server function crash
    |
    +-> curl returns 200 but page is blank?
    |       +-> YES: Check browser console for hydration errors
    |       +-> Check if JS bundle loaded (network tab)
    |
    +-> Page renders but data is wrong/missing?
            +-> Check loader data via window.__DEBUG__
            +-> Check server function response in network tab
```

---

## Common Fix Patterns

| Problem | Fix |
|---------|-----|
| Stale route tree | Delete `src/routeTree.gen.ts` and restart dev server |
| Hydration mismatch | Move dynamic values to loader or `useEffect` |
| Server fn import error | Use `await import()` inside handler |
| CORS error | Ensure client and server on same port (Vite proxy) |
| Type error in search params | Add `validateSearch` with Zod schema |

---

## See Also

- `e2e/references/tanstack-start.md` — Server startup and timing
- `coding-guard/references/tanstack-start.md` — Anti-patterns that cause these failures
