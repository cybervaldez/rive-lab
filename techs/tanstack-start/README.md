# TanStack Start

A full-stack React framework built on TanStack Router, Vite, and Nitro. It provides type-safe file-based routing, isomorphic loaders, server functions (`createServerFn`), streaming SSR, selective SSR/SPA/SSG modes, and universal deployment. Currently at Release Candidate (v1) — feature-complete with a stable API. A client-side-first alternative to Next.js with stronger TypeScript integration and no RSC dependency.

## Domain Classification

| Domain | Applies |
|--------|---------|
| State Management | No |
| UI Components | No |
| Data Fetching | Yes |
| Form Handling | No |
| Animation | No |
| Routing | Yes |
| Testing Tools | No |
| Build Tools | Yes |
| Styling | No |
| Auth | No |

## Pipeline Impact

Based on domain classification, these skills may need tech-specific references:

| Skill | Impact | Reason |
|-------|--------|--------|
| create-task | High | File-based routing conventions, loader patterns, server function structure, and route-level data fetching change how features are scaffolded |
| coding-guard | High | Anti-patterns around server function boundaries, loader vs. server function misuse, search param typing, route tree config |
| e2e | Medium | SSR hydration timing affects selectors; server functions have unique URL keys that complicate mocking; Playwright needs server startup coordination |
| e2e-guard | Medium | Test generation must account for SSR hydration, loader data availability, and server function boundaries |
| cli-first | Medium | `window.__xstate__` exposure must account for SSR (server vs. client context); loader data is observable via route context |
| ux-planner | Low | Route-level code splitting and selective SSR affect page transition UX |
| ux-review | None | No direct impact on visual review |
| ui-planner | None | No direct impact on visual design |
| research | None | N/A |

## Core Concepts

### File-Based Routing
Routes live in `src/routes/`. Directory structure maps to URL paths. Conventions:
- `$param.tsx` — dynamic path segment
- `_pathless.tsx` — layout wrapper without URL segment
- `index.tsx` — index route for a directory
- Route tree is auto-generated; ignore the generated file in linter/formatter config

### Isomorphic Loaders
Route loaders run server-side on initial page load (SSR) and client-side on subsequent navigations. Same code, no waterfall. Return values are typed and provided to the route component.

```tsx
// src/routes/recipes/$recipeId.tsx
export const Route = createFileRoute('/recipes/$recipeId')({
  loader: async ({ params }) => {
    return fetchRecipe(params.recipeId)
  },
  component: RecipeComponent,
})
```

### Server Functions (`createServerFn`)
Type-safe RPCs between client and server. Explicit HTTP method, runs only on the server, callable from anywhere.

```tsx
import { createServerFn } from '@tanstack/start'

const getRecipes = createServerFn({ method: 'GET' })
  .handler(async () => {
    return db.recipes.findMany()
  })
```

### Selective SSR
Per-route control over rendering strategy:
- Full SSR (default) — server-rendered, hydrated on client
- SPA mode — client-only rendering for specific routes
- Static prerendering — build-time generation for static content

### Deployment via Nitro
Nitro provides universal deployment. Supported targets:
- Cloudflare Workers
- AWS Lambda (with streaming)
- Netlify Functions
- Railway / traditional Node.js
- Bun custom server
- Static export (SSG)

## Common Patterns

### Route-Level Data Loading
Prefer loaders over `useEffect` for data fetching. Loaders run before the component renders, eliminating loading spinners on navigation.

### Server Function Composition
Server functions can call other server functions. Use `createMiddleware` for shared auth/validation logic across server functions.

### Search Params as State
TanStack Router treats search params as first-class typed state. Use `validateSearch` on routes for type-safe URL state.

### Code Organization
Vertical modules — each route file contains or imports everything it needs. Shared code lives at the nearest common ancestor in the route hierarchy.

## Anti-Patterns & Gotchas

- **Calling server functions in loaders without need** — Loaders already run on the server during SSR; wrapping DB calls in `createServerFn` inside a loader adds unnecessary indirection on first load
- **Ignoring the generated route tree** — The route tree file is auto-generated; don't edit it manually. Add it to `.gitignore` or commit it but never hand-modify
- **Using `useEffect` for initial data** — Use loaders instead; `useEffect` causes client-side waterfalls and flash of empty content
- **Not specifying HTTP methods on server functions** — Always be explicit (`GET` for reads, `POST` for mutations); defaults may not match your caching intent
- **Leaking server-only code to client** — Ensure server functions don't import client-only modules and vice versa; Vite tree-shaking relies on proper boundaries
- **SSR hydration mismatches** — Avoid `Date.now()`, `Math.random()`, or browser-only APIs in components without proper client guards

## Testing Considerations

- **E2E with Playwright** is the primary testing approach; official testing docs are still emerging
- **SSR hydration timing** — Add appropriate wait strategies in Playwright; elements may exist in HTML before React hydrates them
- **Server function mocking** — Server functions get unique URL keys; mock at the network level (MSW) rather than function level for E2E
- **Vitest for unit tests** — Use `@tanstack/react-router` test utilities for testing route components with manually defined routes
- **Dev server startup** — Vite dev server needs to be running; coordinate startup in CI with health-check polling

## Resources

- Official docs: https://tanstack.com/start/latest/docs/framework/react/overview
- GitHub: https://github.com/TanStack/router (Start lives in the router monorepo)
- npm: https://www.npmjs.com/package/@tanstack/start
- Comparison vs Next.js: https://tanstack.com/start/latest/docs/framework/react/comparison
- Server Functions guide: https://tanstack.com/start/latest/docs/framework/react/guide/server-functions
- Hosting guide: https://tanstack.com/start/latest/docs/framework/react/guide/hosting
