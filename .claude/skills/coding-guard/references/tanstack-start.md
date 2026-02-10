# TanStack Start Patterns for coding-guard

Anti-patterns, silent failures, state mutation, and error handling for TanStack Start.

---

## Anti-Patterns

### 1. Using useEffect for Data Fetching

```tsx
// BAD: Client-side waterfall, flash of empty content
function RecipesPage() {
  const [recipes, setRecipes] = useState([])
  useEffect(() => {
    fetch('/api/recipes').then(r => r.json()).then(setRecipes)
  }, [])
  return <div>{recipes.map(r => <p>{r.name}</p>)}</div>
}

// GOOD: Loader runs before render, no waterfall
export const Route = createFileRoute('/recipes')({
  loader: async () => {
    return getRecipes()
  },
  component: RecipesComponent,
})

function RecipesComponent() {
  const recipes = Route.useLoaderData()
  return <div>{recipes.map(r => <p>{r.name}</p>)}</div>
}
```

### 2. Wrapping DB Calls in createServerFn Inside Loaders

```tsx
// BAD: Unnecessary indirection — loader already runs on server during SSR
export const Route = createFileRoute('/recipes')({
  loader: async () => {
    const serverFn = createServerFn({ method: 'GET' })
      .handler(async () => db.recipes.findMany())
    return serverFn()
  },
})

// GOOD: Direct call in loader for SSR-only data; extract to server fn for reuse
import { getRecipes } from '~/server/functions/recipes'

export const Route = createFileRoute('/recipes')({
  loader: async () => {
    return getRecipes()  // Server fn for reuse across routes
  },
})
```

### 3. Editing the Generated Route Tree

```
BAD: Hand-modifying the auto-generated file
----------------------------------------------
// src/routeTree.gen.ts  <-- NEVER edit this

GOOD: Add to .gitignore or commit as-is, never hand-modify
----------------------------------------------
# .gitignore
src/routeTree.gen.ts
```

### 4. Importing Client-Only Modules in Server Functions

```tsx
// BAD: Browser API in server function — crashes at runtime
import { createServerFn } from '@tanstack/start'
import { localStorage } from '~/utils/storage'  // Uses window.localStorage

const savePrefs = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    localStorage.setItem('prefs', data)  // CRASHES on server
  })

// GOOD: Server functions use server-only APIs
import { createServerFn } from '@tanstack/start'
import { db } from '~/server/db'

const savePrefs = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => {
    await db.preferences.upsert({ data })
  })
```

---

## Silent Failures

### SSR Hydration Mismatches

| Cause | Symptom | Fix |
|-------|---------|-----|
| `Date.now()` in render | Console warning, UI flicker | Move to loader or use `useEffect` |
| `Math.random()` in render | Content mismatch on hydration | Use seeded random or loader data |
| `window.innerWidth` in render | Server renders `undefined` | Guard with `typeof window !== 'undefined'` |
| `localStorage` in render | Server crash or mismatch | Read in `useEffect`, not render body |

```tsx
// BAD: Different value on server vs client
function Banner() {
  return <p>Loaded at {Date.now()}</p>
}

// GOOD: Use loader for server timestamp
export const Route = createFileRoute('/banner')({
  loader: () => ({ timestamp: Date.now() }),
  component: () => {
    const { timestamp } = Route.useLoaderData()
    return <p>Loaded at {timestamp}</p>
  },
})
```

### Leaked Server Code to Client Bundle

```tsx
// BAD: db import leaks to client if not inside createServerFn
import { db } from '~/server/db'

export function getRecipes() {
  return db.recipes.findMany()  // db code bundled to client
}

// GOOD: Always wrap server-only code in createServerFn
import { createServerFn } from '@tanstack/start'

export const getRecipes = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { db } = await import('~/server/db')
    return db.recipes.findMany()
  })
```

### Untyped Search Params

```tsx
// BAD: No validation — params are unknown at runtime
export const Route = createFileRoute('/recipes')({
  component: () => {
    const search = Route.useSearch()
    return <p>Page {search.page}</p>  // search.page is untyped
  },
})

// GOOD: Validate search params for type safety
import { z } from 'zod'

export const Route = createFileRoute('/recipes')({
  validateSearch: z.object({
    page: z.number().default(1),
    sort: z.enum(['name', 'date']).default('name'),
  }),
  component: () => {
    const { page, sort } = Route.useSearch()  // Fully typed
    return <p>Page {page}, sorted by {sort}</p>
  },
})
```

---

## State Mutation

### Search Params as Typed State

```tsx
// BAD: Mutating search params via window.location
window.location.search = '?page=2'  // Full page reload, loses state

// GOOD: Use navigate with typed search params
const navigate = Route.useNavigate()
navigate({ search: (prev) => ({ ...prev, page: prev.page + 1 }) })
```

### Loader Return Value Immutability

```tsx
// BAD: Mutating loader data in component
function RecipesComponent() {
  const recipes = Route.useLoaderData()
  recipes.push(newRecipe)  // Mutates shared loader cache

// GOOD: Derive new state, never mutate loader data
function RecipesComponent() {
  const recipes = Route.useLoaderData()
  const allRecipes = [...recipes, newRecipe]  // New array
```

---

## Error Handling

### Route-Level Error Boundaries

```tsx
export const Route = createFileRoute('/recipes/$recipeId')({
  loader: async ({ params }) => getRecipe({ data: params.recipeId }),
  component: RecipeComponent,
  errorComponent: ({ error }) => (
    <div data-testid="route-error">
      <h2>Failed to load recipe</h2>
      <pre>{error.message}</pre>
    </div>
  ),
})
```

### Server Function Error Propagation

```tsx
// Server function throws — error propagates to errorComponent
export const getRecipe = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const recipe = await db.recipes.findUnique({ where: { id } })
    if (!recipe) {
      throw new Error(`Recipe ${id} not found`)  // Caught by errorComponent
    }
    return recipe
  })
```

### HTTP Method Specification

```tsx
// BAD: Missing method — unclear caching behavior
const getRecipes = createServerFn()
  .handler(async () => db.recipes.findMany())

// GOOD: Explicit method
const getRecipes = createServerFn({ method: 'GET' })
  .handler(async () => db.recipes.findMany())

const createRecipe = createServerFn({ method: 'POST' })
  .handler(async ({ data }) => db.recipes.create({ data }))
```

---

## Quick Audit Checklist

- [ ] No `useEffect` for initial data fetching (use loaders)
- [ ] No hand-edits to `routeTree.gen.ts`
- [ ] All server functions specify HTTP method
- [ ] No `Date.now()` / `Math.random()` in render body
- [ ] No browser APIs used without `typeof window` guard
- [ ] Search params validated with `validateSearch`
- [ ] Loader data never mutated directly
- [ ] All routes have `errorComponent`
- [ ] Server functions don't import client-only modules

---

## See Also

- `techs/tanstack-start/README.md` — Phase 1 research
- `create-task/references/tanstack-start.md` — Scaffolding patterns
