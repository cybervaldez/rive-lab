# TanStack Start Patterns for cli-first

State exposure, verification commands, and token cost patterns for TanStack Start SSR context.

---

## SSR vs Client State Exposure

TanStack Start runs loaders on the server during SSR. `window` does not exist on the server. All state exposure must guard for this.

| Context | `window` Available | Loader Runs | Component Renders |
|---------|-------------------|-------------|-------------------|
| SSR (first load) | No | Yes (server) | Yes (server) |
| Client hydration | Yes | No (uses SSR data) | Yes (client) |
| Client navigation | Yes | Yes (client) | Yes (client) |

### Safe State Exposure Pattern

```tsx
// GOOD: Guard with typeof window + useEffect
function RecipeComponent() {
  const recipe = Route.useLoaderData()

  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      window.__DEBUG__ = {
        route: '/recipes/$recipeId',
        loaderData: recipe,
      }
    }
  }, [recipe])

  return <div data-testid="recipe-detail">{recipe.name}</div>
}
```

```tsx
// BAD: Runs during SSR — crashes server
function RecipeComponent() {
  const recipe = Route.useLoaderData()
  window.__DEBUG__ = { loaderData: recipe }  // ReferenceError on server
  return <div>{recipe.name}</div>
}
```

### XState Actor Exposure in SSR Context

```tsx
// GOOD: Expose XState actor only after hydration
import { useActor } from '@xstate/react'

function CheckoutRoute() {
  const [state, send] = useActor(checkoutMachine)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__xstate__ = {
        state: () => state.value,
        context: () => state.context,
        send,
      }
    }
  }, [state, send])

  return <div data-testid="checkout" data-state={state.value}>...</div>
}
```

---

## Verification Commands

### Verify Loader Data

```bash
# After page load — loader data is available via exposed window object
RECIPE=$(agent-browser eval "window.__DEBUG__?.loaderData?.name" 2>/dev/null)
[ -n "$RECIPE" ] && pass "Loader data: $RECIPE" || fail "No loader data"
```

### Verify Route Params

```bash
# Check current URL for route param
URL=$(agent-browser get url 2>/dev/null)
echo "$URL" | grep -q "/recipes/" && pass "On recipe route" || fail "Wrong route: $URL"

# Extract param from URL
RECIPE_ID=$(echo "$URL" | grep -oP '/recipes/\K[^/]+')
[ -n "$RECIPE_ID" ] && pass "Param: $RECIPE_ID" || fail "No recipe ID in URL"
```

### Verify Search Params

```bash
# Check typed search params via URL
URL=$(agent-browser get url 2>/dev/null)
echo "$URL" | grep -q "page=" && pass "Has page param" || fail "Missing page param"

# Or via JavaScript
PAGE=$(agent-browser eval "new URL(window.location.href).searchParams.get('page')" 2>/dev/null)
[ "$PAGE" = "2" ] && pass "Page: $PAGE" || fail "Wrong page: $PAGE"
```

### Verify Server Function Response (via UI)

```bash
# Server functions are called through loaders or events
# Verify their effect on the UI rather than intercepting network
agent-browser open "http://localhost:5173/recipes"
sleep 2

SNAPSHOT=$(agent-browser snapshot -c 2>/dev/null)
echo "$SNAPSHOT" | grep -q 'data-testid="recipe-list"' && \
    pass "Server fn returned data" || fail "No recipe list"
```

### Verify XState State in SSR App

```bash
# Must wait for hydration before querying window state
agent-browser open "http://localhost:5173/checkout"
sleep 2  # Wait for hydration

STATE=$(agent-browser eval "window.__xstate__?.state()" 2>/dev/null)
[ "$STATE" = "cart" ] && pass "XState state: $STATE" || fail "Wrong state: $STATE"
```

---

## Token Cost Considerations

| Method | Tokens | When to Use |
|--------|--------|-------------|
| `eval "window.__DEBUG__.loaderData.field"` | ~100 | Single loader field |
| `eval "window.__DEBUG__.loaderData"` | ~300-800 | Full loader object (can be large) |
| `get url` + grep | ~100 | Route param / search param check |
| `snapshot -c \| grep testid` | ~500 | Element presence after SSR |
| `snapshot -c` (full) | ~800 | Multiple element checks |

### Selective Exposure (Reduce Token Cost)

```tsx
// BAD: Expose entire loader data — can be very large
window.__DEBUG__ = { loaderData: Route.useLoaderData() }

// GOOD: Expose only what tests need
window.__DEBUG__ = {
  recipeName: recipe.name,
  recipeId: recipe.id,
  ingredientCount: recipe.ingredients.length,
}
```

```bash
# Cheap verification of specific fields
NAME=$(agent-browser eval "window.__DEBUG__?.recipeName" 2>/dev/null)
COUNT=$(agent-browser eval "window.__DEBUG__?.ingredientCount" 2>/dev/null)
```

---

## Route Context Data

TanStack Router provides route context which can carry data down the route tree. This is observable for verification.

```tsx
// Route context pattern
export const Route = createFileRoute('/recipes')({
  beforeLoad: async () => {
    return { user: await getCurrentUser() }
  },
  loader: async ({ context }) => {
    return getRecipesForUser({ data: context.user.id })
  },
})
```

```bash
# Verify context-derived data through the UI
SNAPSHOT=$(agent-browser snapshot -c 2>/dev/null)
echo "$SNAPSHOT" | grep -q "Welcome, Alice" && pass "Context user loaded" || fail "No user context"
```

---

## Checklist

- [ ] All `window` assignments guarded with `typeof window !== 'undefined'`
- [ ] State exposure in `useEffect`, not render body
- [ ] Expose only fields needed for verification (token cost)
- [ ] Use `get url` for route/search param checks (cheapest)
- [ ] Wait for hydration before querying `window` state

---

## See Also

- `cli-patterns.md` — Universal CLI-first patterns
- `coding-guard/references/tanstack-start.md` — SSR anti-patterns
