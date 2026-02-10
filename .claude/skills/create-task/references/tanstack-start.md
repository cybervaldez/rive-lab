# TanStack Start Patterns for create-task

Scaffolding, file structure, and test organization for TanStack Start routes and server functions.

---

## File-Based Routing Conventions

| Convention | File Pattern | URL Result |
|------------|-------------|------------|
| Index route | `src/routes/index.tsx` | `/` |
| Static segment | `src/routes/about.tsx` | `/about` |
| Dynamic param | `src/routes/recipes/$recipeId.tsx` | `/recipes/:recipeId` |
| Pathless layout | `src/routes/_app.tsx` | No URL segment, wraps children |
| Nested index | `src/routes/recipes/index.tsx` | `/recipes` |
| Catch-all | `src/routes/$.tsx` | Matches any unmatched path |

### Directory Structure

```
src/
  routes/
    __root.tsx          # Root layout (always exists)
    index.tsx           # Home page (/)
    about.tsx           # /about
    _app.tsx            # Pathless layout wrapper
    _app/
      dashboard.tsx     # /dashboard (wrapped by _app layout)
    recipes/
      index.tsx         # /recipes
      $recipeId.tsx     # /recipes/:recipeId
  server/
    functions/          # Shared server functions (not route-specific)
```

### Route Tree Generation

The route tree file is **auto-generated**. Never edit it manually.

```
GOOD: Let TanStack generate the route tree
----------------------------------------------
# .gitignore
src/routeTree.gen.ts

BAD: Editing the generated file
----------------------------------------------
// src/routeTree.gen.ts  <-- NEVER touch this
```

---

## Route File Template

```tsx
// src/routes/recipes/$recipeId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { getRecipe } from '~/server/functions/recipes'

export const Route = createFileRoute('/recipes/$recipeId')({
  loader: async ({ params }) => {
    return getRecipe({ data: params.recipeId })
  },
  component: RecipeComponent,
})

function RecipeComponent() {
  const recipe = Route.useLoaderData()
  return (
    <div data-testid="recipe-detail">
      <h1>{recipe.name}</h1>
    </div>
  )
}
```

---

## Server Function Template

```tsx
// src/server/functions/recipes.ts
import { createServerFn } from '@tanstack/start'

export const getRecipe = createServerFn({ method: 'GET' })
  .validator((recipeId: string) => recipeId)
  .handler(async ({ data: recipeId }) => {
    const recipe = await db.recipes.findUnique({ where: { id: recipeId } })
    if (!recipe) throw new Error(`Recipe ${recipeId} not found`)
    return recipe
  })

export const createRecipe = createServerFn({ method: 'POST' })
  .validator((input: { name: string; ingredients: string[] }) => input)
  .handler(async ({ data }) => {
    return db.recipes.create({ data })
  })
```

---

## App Config (app.config.ts)

```ts
// app.config.ts
import { defineConfig } from '@tanstack/start/config'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  vite: {
    plugins: [viteTsConfigPaths()],
  },
})
```

---

## Router Creation Pattern

```tsx
// src/router.tsx
import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
```

---

## Test Organization

| Test Target | File Location | Test Type |
|------------|---------------|-----------|
| Route loader | `tests/test_recipes.sh` | E2E: verify loader data via page content |
| Server function | `tests/test_server_fns.sh` | E2E: verify via UI that calls server fn |
| Navigation | `tests/test_navigation.sh` | E2E: verify route transitions |
| Search params | `tests/test_search_params.sh` | E2E: verify URL state |

---

## Debug Containers for SSR

```tsx
// In route component — guard for SSR context
function RecipeComponent() {
  const recipe = Route.useLoaderData()

  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      window.__DEBUG_ROUTE__ = {
        loaderData: recipe,
        route: '/recipes/$recipeId',
      }
    }
  }, [recipe])

  return <div data-testid="recipe-detail">...</div>
}
```

---

## New Feature Checklist

When scaffolding a new feature (e.g., "add recipe detail page"):

1. Create route file: `src/routes/recipes/$recipeId.tsx`
2. Create server function (if DB access needed): `src/server/functions/recipes.ts`
3. Wire loader to call server function
4. Add `data-testid` attributes to component
5. Add debug exposure in `useEffect` (dev only)
6. Create E2E test: `tests/test_recipes.sh`
7. Run dev server and verify route tree regenerates

---

## See Also

- `techs/tanstack-start/README.md` — Phase 1 research
- `testing-conventions.md` — E2E test patterns
