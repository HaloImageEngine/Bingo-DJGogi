# GetGogi Admin Dashboard — Workspace Guidelines

Angular 17 standalone admin dashboard for GetGogi. See [README.md](../README.md) for feature map and quick-start.

## Build & Test

```bash
npm start          # dev server at http://localhost:4200 (proxy enabled)
npm run build      # production build → dist/
npm test           # Karma + Jasmine unit tests
npm run watch      # watch mode build
```

Scaffold new components:
```bash
ng generate component pages/my-feature --standalone --style=scss --skip-tests
```

## Architecture

- **Standalone components** — no NgModule. Every page component uses `@Component({ standalone: true, imports: [...] })`.
- **Lazy-loaded routes** — all pages use `loadComponent()` in `app.routes.ts`. Never import page components eagerly.
- **Angular signals for state** — use `signal()`, `computed()`, and `effect()`. No NgRx, no BehaviorSubject for UI state.
- **Subscription cleanup** — always use `takeUntilDestroyed(destroyRef)` when subscribing to observables. Never unsubscribe manually.
- **Services at root scope** — all services use `providedIn: 'root'`. Do not provide services in component metadata.
- **Models are interfaces only** — `src/app/models/*.model.ts` defines interfaces and type aliases, never classes.

## Conventions

### State flags
UI state fields follow this naming: `loading`, `error`, `dirty`, `saving`, `rowError`, `rowSuccess`. Boolean flags use `is*` prefix only for domain properties (e.g. `IsAvailable`, `IsActive`) — not for UI state.

### SCSS
Shared design tokens live in `src/styles.scss`. Do not hardcode colors or spacing that should use tokens.

### Environment
`src/environments/environment.ts` controls:
- `useMockMenuApi` — set `true` to bypass the live CMS endpoint and use `src/app/mocks/mock-menu-items.ts`
- `ordersRefreshIntervalSeconds` — polling interval for the Orders List page
- `version` — formatted `YY.MM.DD.T`; update when releasing

Never commit real credentials to environment files.

## Critical Pitfalls

### API responses are shape-unpredictable
The GetGogi API can return data under different keys (`data`, `Data`, `items`, `Items`, `result`, `Result`, `payload`, `Payload`) and may return a single object or an array. Always normalize:
```typescript
// Find the array in the response
const candidates = ['data','Data','items','Items','result','Result','payload','Payload'];
let arr = candidates.map(k => (res as any)[k]).find(v => Array.isArray(v)) ?? res;
// Guard single-vs-array
const items: MenuItem[] = Array.isArray(arr) ? arr : [arr];
```
For mutation responses, use:
```typescript
const updated = Array.isArray(result) ? result.find(i => i.ItemID === row.ItemID) ?? payload : result;
```

### Three menu service variants
- `MenuService` → main menu (`CRUD_ReadALL`)
- `MenuBVService` → BV branch (`CRUD_Read_BV`)
- `MenuPSService` → PS branch (`CRUD_Read_PS`)

`MenuPSService` has a copy-paste bug: the class is named `MenuService` inside the file. When injecting it, use the correct import path.

### Auth guard
`AuthGuard` checks `localStorage.getItem('authToken')`. On redirect it stores `postLoginRedirect` in localStorage so the login page can send users to the right page after sign-in.

### Fullscreen / sidebar expand
`orders-list` toggles `document.body.classList` with `workspace-expanded` to collapse the sidebar. Any new full-screen-capable page should follow the same pattern and remove the class in `ngOnDestroy`.

## Proxy

In dev, `/gogi-api/*` proxies to `https://api.getgogi.com` (see `proxy.conf.json`). Direct API calls in services use the full URL from `environment.*ApiBaseUrl`. Do not change this without updating both environment files.
