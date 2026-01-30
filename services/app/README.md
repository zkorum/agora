# Agora App (`services/app`)

Modern SvelteKit frontend for Agora Citizen Network, progressively replacing `services/agora` (Vue/Quasar).

## Why SvelteKit?

- **SSR + CSR**: Better first paint performance with server-side rendering, then client-side hydration
- **Per-route control**: Configure prerendering, SSR, or CSR on a per-route basis
- **Smaller bundles**: Svelte compiles away the framework - no runtime overhead
- **Modern stack**: Tailwind CSS v4 + Bits UI (headless components) - clean slate, easy to maintain
- **Future-ready**: Easy path to native apps via Tauri if needed
- **Agent-friendly**: Simple file-based routing and explicit data flow - easy for AI coding agents

The landing page is embedded in the app (not a separate static site) because features like "Explore Conversations" will need database access via SSR.

## Tech Stack

- **Framework**: [SvelteKit](https://svelte.dev/docs/kit) with [Svelte 5](https://svelte.dev/docs/svelte) (runes)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (CSS-first config)
- **Components**: [Bits UI](https://bits-ui.com/) (headless, unstyled)
- **i18n**: [Paraglide.js v2](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) (compile-time, type-safe)
- **Adapter**: `@sveltejs/adapter-node` (SSR production)

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Or from repo root:
make dev-app-new
```

## Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm preview      # Preview production build locally

pnpm check        # Type checking (svelte-check)
pnpm lint         # ESLint + Prettier check
pnpm lint:fix     # Auto-fix lint and format issues

pnpm test:unit    # Run Vitest unit tests
pnpm test:e2e     # Run Playwright E2E tests
```

## Project Structure

```
src/
  app.html              # HTML shell
  app.css               # Tailwind CSS v4 entry
  lib/
    ui/{app}/           # Design system (Bits UI wrappers)
      shared/           # Core design system (Button, Dialog, Icons)
      landing/          # Landing-specific UI (if needed)
      facilitator/      # Facilitator-specific UI (if needed)
      participant/      # Participant-specific UI (if needed)
    components/{app}/   # Application features (business logic)
      shared/           # Reusable across apps
      landing/          # Landing page sections
      facilitator/      # Facilitator app components
      participant/      # Participant app components
    logic/{app}/        # Pure TS functions + colocated tests
      shared/           # Shared utilities (usually starts here)
      landing/          # Landing-specific logic (if needed)
      facilitator/      # Facilitator-specific logic (if needed)
      participant/      # Participant-specific logic (if needed)
    state/{app}/        # Reactive state (.svelte.ts)
      shared/           # Global config, feature flags (usually starts here)
      landing/          # Landing-specific state (if needed)
      facilitator/      # Facilitator-specific state (if needed)
      participant/      # Participant-specific state (if needed)
    server/{app}/       # Server-only code
      landing/          # Blog, marketing data
      facilitator/      # Facilitator data fetching
      participant/      # Participant data fetching
    paraglide/          # Generated i18n runtime
    assets/             # Static assets (favicon, etc.)
  routes/
    +layout.svelte      # Root layout
    +page.svelte        # Landing page (/)
    blog/               # Blog (/blog)
    facilitator/        # Facilitator app (/facilitator)
    participant/        # Participant app (/participant)
  content/
    blog/               # Markdown blog posts by locale
messages/               # Paraglide translation files
static/                 # Static files (images, robots.txt)
tests/                  # Playwright E2E tests
```

Apps: `shared/`, `landing/`, `facilitator/`, `participant/`

## Coding Guidelines

### File Naming

Use **kebab-case** for all files: `gradient-button.svelte`, `language-switcher.svelte`

### Path Aliases

Configured in `svelte.config.js`:

| Alias         | Path                 | Purpose                          |
| ------------- | -------------------- | -------------------------------- |
| `$ui`         | `src/lib/ui`         | Design system (Bits UI wrappers) |
| `$components` | `src/lib/components` | Application features             |
| `$logic`      | `src/lib/logic`      | Pure functions                   |
| `$state`      | `src/lib/state`      | Reactive state                   |
| `$server`     | `src/lib/server`     | Server-only code                 |

**Note:** After adding/changing aliases, run `pnpm dev` once to auto-generate tsconfig paths.

### Import Rules

```typescript
// ✅ GOOD - direct imports with aliases
import { Button } from "$ui/shared/button";
import { GradientText } from "$ui/landing/gradient-text";
import { Navbar } from "$components/landing/navbar";
import { validate } from "$logic/shared/validation";
import { config } from "$state/shared/config";

// ❌ BAD - barrel imports (breaks tree-shaking)
import { Button, Dialog } from "$ui/shared";

// ❌ BAD - cross-feature imports
import { Something } from "$components/facilitator/something"; // from landing

// ❌ BAD - direct Bits UI (always use $ui/ wrappers)
import { Button } from "bits-ui";
```

**Rules:**

- **No barrel files** (`index.ts` re-exports) - breaks tree-shaking
- **No cross-feature imports** - each feature imports only from itself or `shared/`
- **Never import Bits UI directly** - always use `$ui/` wrappers

**Forbidden cross-feature imports:**

- `landing/` ↛ `facilitator/`
- `landing/` ↛ `participant/`
- `facilitator/` ↛ `landing/`
- `facilitator/` ↛ `participant/`
- `participant/` ↛ `landing/`
- `participant/` ↛ `facilitator/`

**Rule:** If you need to import across features, move the code to `shared/` first.

### ui/ vs components/

| Folder        | Purpose                                                                                                                   | Examples                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `ui/`         | Design system wrappers on Bits UI. Views only, no business logic. Can have internal UI state (open/closed, hover, focus). | Button, Input, Dialog, Icons, GradientText, Badge, Spinner, Card, Tooltip |
| `components/` | Application features with business logic (data fetching, API calls, validation). Compose `$ui/` primitives.               | LoginForm, Navbar, ConversationCard, ConfirmDeleteDialog, CommentThread   |

**`ui/` = Design System Abstraction Layer:**

- **NEVER use Bits UI directly** in `components/` or routes
- **ALWAYS import from `$ui/`** - this is your internal design system
- If you swap Bits UI for another library, only `ui/` needs to change

```svelte
<!-- ui/shared/button.svelte - wraps Bits UI -->
<script lang="ts">
  import { Button as BitsButton } from "bits-ui";
  let { children, variant = "primary", ...props } = $props();
</script>

<BitsButton.Root class="..." {...props}>
  {@render children()}
</BitsButton.Root>
```

**Quick test:** "If I swap Bits UI for another library, does this file change?"

- Yes → `ui/`
- No → `components/`

### Component Hierarchy (Routes → Components → UI)

Routes and layouts should be simple and readable by composing components, not containing business logic directly.

```
+page.svelte / +layout.svelte
    └── imports from $components/
            └── composes granular components
                    └── uses $ui/ primitives (Button, Input, etc.)
```

**Rules:**

- **Routes (`+page.svelte`)**: Only layout and component composition. No business logic.
- **Components (`$components/`)**: Feature logic, data fetching, state management. Compose UI primitives.
- **UI (`$ui/`)**: Pure presentation. Bits UI wrappers. No business logic.

**Example:**

```svelte
<!-- routes/+page.svelte - SIMPLE, just composition -->
<script>
  import { HeroSection } from "$components/landing/hero-section";
  import { FeaturesGrid } from "$components/landing/features-grid";
  import { Footer } from "$components/shared/footer";
</script>

<HeroSection />
<FeaturesGrid />
<Footer />
```

```svelte
<!-- components/landing/hero-section.svelte - Feature component -->
<script>
  import { Button } from "$ui/shared/button";
  import { GradientText } from "$ui/landing/gradient-text";
  // Business logic here
</script>

<section>
  <GradientText>Welcome</GradientText>
  <Button onclick={handleClick}>Get Started</Button>
</section>
```

**Goal:** Routes should read like a table of contents. All complexity lives in components.

### When to Move Code to `shared/`

| Folder        | Promote to `shared/` when...                                                          |
| ------------- | ------------------------------------------------------------------------------------- |
| `ui/`         | **Usually starts in shared** - design system components are inherently reusable       |
| `logic/`      | **Usually starts in shared** - pure functions are easy to share                       |
| `components/` | **Wait until mature** - only when 2+ features need it AND it's stable                 |
| `state/`      | **Rare** - most state is feature-specific; only truly global config belongs in shared |

Move to `shared/` only when:

1. **Two or more features** actually need it (not preemptively)
2. The code is **stable** (not actively changing)
3. It has **no feature-specific dependencies**

Don't preemptively put things in `shared/` - start in feature folders and promote when needed.

### State Management & SSR Safety

**The Problem:** Module-level `$state()` is shared across ALL server requests:

```
SERVER (single Node.js process)
┌─────────────────────────────────────────────────────┐
│  // state/shared/user.svelte.ts                     │
│  export const userState = $state({ name: '' });     │
│                                                     │
│  This SINGLE object is shared by ALL requests!     │
└─────────────────────────────────────────────────────┘
         │                           │
    Request A (Alice)           Request B (Bob)
         │                           │
    userState.name = 'Alice'    userState.name = 'Bob'
         │                           │
    ⚠️ Alice might see "Hello Bob" if requests overlap!
```

**When You DON'T Need Context API (Simpler):**

```typescript
// ✅ SAFE: Read-only config in state/ folder
// state/shared/config.svelte.ts
export const config = $state({
  apiUrl: "https://api.example.com",
  features: { darkMode: true },
});
```

```svelte
<!-- ✅ SAFE: Client-side only data (onMount) -->
<script>
  import { onMount } from "svelte";
  let user = $state(null);

  onMount(async () => {
    user = await fetchCurrentUser(); // Runs only in browser
  });
</script>
```

```svelte
<!-- ✅ SAFE: SSG pages (prerender=true) - built once at build time -->
<!-- No user-specific data, no SSR state issues -->
```

**When You NEED Context API (Server-Side User Data):**

Only use context API if you load user-specific data in `+page.server.ts` load functions:

```svelte
<!-- +layout.svelte - ONLY if using server-side auth -->
<script>
  import { setContext } from "svelte";
  let { data, children } = $props();
  setContext("user", $state(data.user));
</script>

{@render children()}
```

**Decision Guide:**

| Scenario                      | Use `state/` folder | Use Context API | Use local `$state` |
| ----------------------------- | ------------------- | --------------- | ------------------ |
| App config, feature flags     | ✅                  |                 |                    |
| i18n locale strings           | ✅                  |                 |                    |
| User data (client-side fetch) |                     |                 | ✅ (in component)  |
| User data (server-side load)  |                     | ✅              |                    |
| Form state, UI state          |                     |                 | ✅ (in component)  |

**Default to simplest option.** Only use Context API for server-side auth with load functions.

### Testing Strategy

| Layer               | Tool                             | What it tests                                  |
| ------------------- | -------------------------------- | ---------------------------------------------- |
| **Unit tests**      | Vitest                           | Pure logic in `.ts` and `.svelte.ts` files     |
| **Component tests** | Vitest + @testing-library/svelte | Components in isolation (jsdom)                |
| **Visual tests**    | Storybook 9 (future)             | Components in real browser, design system docs |
| **E2E tests**       | Playwright                       | Full app user flows                            |

**Why @testing-library/svelte?**

- **Semantic queries**: `getByRole('button')`, `getByText()` instead of `querySelector`
- **User-centric**: Tests simulate real user interactions
- **Less brittle**: Tests don't break when internal structure changes

**Storybook deployment:** Netlify subdomain (future: `storybook.agoracitizen.network`)

### Testing File Patterns

| File Type                     | Test File                         | Example                 |
| ----------------------------- | --------------------------------- | ----------------------- |
| Pure functions (`.ts`)        | `*.test.ts`                       | `validation.test.ts`    |
| Reactive state (`.svelte.ts`) | `*.svelte.test.ts`                | `user.svelte.test.ts`   |
| Components (`.svelte`)        | `*.test.ts` with @testing-library | `Button.test.ts`        |
| User flows                    | Playwright                        | `tests/landing.spec.ts` |

### Testing Best Practices

| Scenario             | Approach                                                  |
| -------------------- | --------------------------------------------------------- |
| Testing `$state`     | Direct mutation + `flushSync()`                           |
| Testing `$effect`    | Wrap in `$effect.root()` + `flushSync()`                  |
| Testing `$derived`   | Test input → output relationship                          |
| Component mounting   | `render()` from @testing-library/svelte                   |
| User interactions    | `userEvent.setup()` then `user.click()` (NOT `fireEvent`) |
| Async/loading states | `waitFor()` from @testing-library                         |
| Network errors       | Mock `fetch` with `vi.spyOn(global, 'fetch')`             |

**Best practice:** Extract testable logic into `logic/` or `state/`. Focus on testing critical logic, not quantity.

**Skip testing:** Pure UI components, layouts, styling - catch these in code review.

### Example: Testing Pure Functions

```
logic/shared/validation.ts
logic/shared/validation.test.ts
```

### Example: Testing Reactive State

Use `.svelte.test.ts` extension to enable runes in tests:

```typescript
// user.svelte.test.ts
import { flushSync } from "svelte";
import { expect, test } from "vitest";

test("effect tracks state changes", () => {
  const cleanup = $effect.root(() => {
    let count = $state(0);
    let doubled = $derived(count * 2);

    expect(doubled).toBe(0);

    count = 5;
    flushSync();
    expect(doubled).toBe(10);
  });
  cleanup();
});
```

### Example: Testing Component Interactions

```typescript
// Button.test.ts
import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import Button from "./Button.svelte";

test("button increments counter", async () => {
  const user = userEvent.setup();
  render(Button, { props: { initial: 0 } });

  const button = screen.getByRole("button");
  expect(button).toHaveTextContent("0");

  await user.click(button);
  expect(button).toHaveTextContent("1");
});
```

### Example: Testing Loading States

```typescript
import { render, screen, waitFor } from "@testing-library/svelte";

test("shows loading then data", async () => {
  render(AsyncComponent);

  expect(screen.getByText("Loading...")).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText("Data loaded")).toBeInTheDocument();
  });
});
```

### Example: Testing Network Errors / Offline

```typescript
import { vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/svelte";

test("handles network failure", async () => {
  vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

  render(DataFetcher);

  await waitFor(() => {
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  vi.restoreAllMocks();
});
```

### Images

Use `<enhanced:img>` from `@sveltejs/enhanced-img` for all images (except SVGs):

```svelte
<enhanced:img
  src="$lib/assets/hero.png"
  alt="Hero"
  sizes="min(1280px, 100vw)"
/>
```

Images must be in `$lib/` or use relative path for build-time processing. SVGs use regular `<img>` tags.

## Rendering Strategy

- **Landing page** (`/`): Currently SSG, but embedded in app to allow SSR when "Explore Conversations" needs database access
- **Blog posts** (`/blog/[slug]`): Prerendered at build time from markdown
- **Dynamic pages**: SSR + CSR hydration (SvelteKit default)

Per-route configuration allows mixing SSG/SSR/CSR as features evolve.

## Internationalization

Uses Paraglide.js v2 with URL-based locale routing:

- `/` → English (default)
- `/fr` → French
- `/es` → Spanish
- `/ar` → Arabic
- `/ja` → Japanese
- `/zh-hans` → Simplified Chinese
- `/zh-hant` → Traditional Chinese

Translation files are in `messages/*.json`. The compiler generates type-safe message functions.

## Environment Variables

Environment variables are validated at build time. See `src/lib/paraglide/` for i18n config.

For production deployment, configure:

- `ORIGIN` - The app's public URL (required for SSR)

## Migration from services/agora

This service will progressively take over features from `services/agora`:

| Feature        | Status      |
| -------------- | ----------- |
| Landing page   | ✅ Complete |
| Blog           | ✅ Complete |
| Auth/Login     | 🔜 Planned  |
| Conversations  | 🔜 Planned  |
| User dashboard | 🔜 Planned  |

## Future: API Client Strategy

### Recommended: @hey-api/openapi-ts

Modern generator (used by Vercel, PayPal) to replace `openapi-generator-cli`:

- ✅ **Zod schemas** directly from OpenAPI (no manual Zod!)
- ✅ **TanStack Query hooks** (plugin)
- ✅ **Fetch-based client** (not axios)
- ✅ **Tree-shakeable** (only import what you use)

Use the [Fastify plugin](https://heyapi.dev/openapi-ts/plugins/fastify) for backend integration.

### Future Architecture

```
src/lib/
├── api/                    # Generated by @hey-api/openapi-ts
│   ├── client.ts           # Fetch client
│   ├── schemas/            # Generated Zod schemas
│   ├── services/           # Generated API functions
│   └── types.ts            # Generated TypeScript types
├── api-hooks/              # TanStack Query wrappers
└── ...
```

**Barrel files exception:** For generated API code, barrel files are OK (generated code is tree-shakeable by design).

### Shared Code After Migration

After migrating to @hey-api, only ~300 lines of shared code needed:

| Keep                             | Delete                               |
| -------------------------------- | ------------------------------------ |
| SSE types (~67 lines)            | Zod schemas (generated from OpenAPI) |
| Language utilities (~40 lines)   | UCAN/DID auth (deprecated)           |
| Consensus algorithms (~60 lines) |                                      |
| HTML sanitization (~80 lines)    |                                      |
| Polis URL validation (~35 lines) |                                      |

**SSE types stay as shared TypeScript** - OpenAPI doesn't handle Server-Sent Events well. No AsyncAPI needed for current scope (4 event types).

## License

[MPL-2.0](./COPYING) - See [COPYING-README.md](../../COPYING-README.md) for details.
