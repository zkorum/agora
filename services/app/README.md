# Agora Svelte app (`services/app`)

SvelteKit home for Agora's landing page, resources and new shared product UI.
The product entry point `/home` redirects to the localized `/projects` overview.
Project creation is developed through a clearly marked, disposable mock API;
real authentication and backend writes are not integrated yet.

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
- **Adapter**: `@sveltejs/adapter-netlify` (Netlify Frameworks API)

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Or from repo root:
make dev-landing
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
pnpm test:storybook # Browser regressions against a separate static Storybook build
pnpm test:projects # Mock-backed project creation in an explicit staging build
pnpm storybook    # Browse shared UI components at http://127.0.0.1:6006
pnpm storybook:build # Build a separate, local Storybook in storybook-static/
```

## Browse the shared components with Storybook

Run `pnpm storybook`, then open **http://127.0.0.1:6006**. Choose an individual
component under **Shared** or **Agora** in the sidebar.
Use Storybook's viewport toolbar to review mobile sizes, and its Controls panel
to inspect the inputs exposed by a story. Each story is a live Svelte component,
not a screenshot or a test-results report. Interactions use local fixture state;
there are no API requests, saved settings or real submissions.

## Local fonts

The app and Storybook share repository-owned Albert Sans variable fonts, using
the same version as the Vue app. Upright and real italic faces cover weights
100–900. WOFF2 assets are fingerprinted by Vite and served from our own origin;
the upright face is preloaded through SvelteKit, while italics load on demand.
No external font service or font-package dependency is required. See
[`font provenance and regeneration`](src/lib/assets/fonts/albert-sans/README.md).

## Product routes

- `/` remains the public landing page; visiting it does not redirect to the app.
- `/home` redirects to `/projects`, preserving the selected language. Product
  routes use the responsive app layout rather than the marketing header/footer.
  It remains a stable entry point: the temporary 307 destination can later depend
  on the user's context without changing existing entry links.
- The `(agora)` route group separates the product layout without adding a URL
  prefix. Future product routes can share that layout.
- `/projects` hosts the overview and creation, with a centered creation action
  when no projects exist. `/project/[projectSlug]` displays the result without
  invented activities. Production features without a real API remain unavailable.
  Populated desktop overviews place a compact creation button beside the heading;
  the project grid contains only actual projects, not a creation placeholder card.
- `/project/[projectSlug]/draft/[draftId]` is the activity workspace. In
  development, open `/projects`, create or open a project, then choose an activity
  type to open its draft. Unpublished edits stay on the page. Creating the
  activity keeps its configuration in the mock workspace for this browser tab.
  See the [activity design notes](ACTIVITY-DESIGN.md).
- Mock-backed creation is enabled in development, or explicitly in staging with
  **both** `VITE_STAGING=true` and `VITE_PROJECTS_MOCK=true`. It starts with no
  projects, persists creations in the current tab's `sessionStorage`, and has
  visible mock/reset controls. It does not simulate a real login or write to the
  backend. Normal production refuses mock mode even if the mock flag is set.

The product shell reuses `WorkspaceSidebar`, `WorkspaceNavigationItem` and
`AccountMenu` in desktop navigation, the mobile drawer and component stories.
The sidebar follows Figma's Navigation section (`24105:142114`), including the
196px expanded and 69px collapsed widths. Its icon assets are local exports of
that design, not replacement glyphs.

**Settings** in the sidebar footer (or the mobile navigation drawer) is available
before login. It contains the interface language, privacy policy, terms of service
and community guidelines, with a link to the product roadmap. Account controls appear
only when the shell has a signed-in identity. Settings for a particular project
or activity are opened from that project or activity.

**Temporary legal-page ownership:** The Vue app (`services/agora/src/pages/legal/`)
owns the published privacy policy, terms of service and community guidelines.
All three documents open as sections inside Svelte Settings. Each section links to
the published version until its local copy is ready. Before launch, replace the
placeholders with the current text and translations. Before
deploying Svelte on the Vue app’s domain or retiring Vue, verify that the
public `/legal/privacy/`, `/legal/terms/` and `/legal/guidelines/` URLs still
work without login.

The project list starts expanded. Projects is an ordinary navigation link;
only its disclosure control changes list expansion. That choice survives
navigation, closing the mobile drawer and responsive layout changes. With many
projects, the project list scrolls internally while Participate, notifications
and account controls remain visible. Mobile project links have larger touch
targets and clearer spacing than the compact desktop reference.
Short windows use tighter vertical spacing without shrinking touch targets.
Below 480px height, the navigation itself can scroll as an accessibility
fallback, so no controls are clipped.

On mobile, project detail uses one compact back/settings/share header instead of
stacking the global navigation bar above it. The projects overview retains its
navigation header. The **New project** and **New activity** buttons float on
mobile and sit inline at `md` and above; their labels and styling stay the same.

The account menu always represents the individual user. Organization management
does not switch the signed-in identity: organizations publish projects but cannot
participate in conversations. The organization to publish from belongs in project
creation, not in login or the account menu. Real authentication and project
creation are not wired yet; production shows no fabricated user or projects.

### Data access and rendering

`src/lib/api/agora/projects.ts` is the small feature-facing API boundary.
The temporary implementation is isolated in `api/agora/mock/`; selection occurs
once at the workspace bootstrap, never inside individual controls. Replacing it
must not require rewriting the form or project screens. See
[`api/agora/README.md`](src/lib/api/agora/README.md) for the removal checklist,
current backend contract gaps and research references.

Keep API integration separate from pure `logic/`, reactive `state/`, feature
`components/` and presentation `ui/`. UI must not import API implementations;
the existing lint boundary enforces this.

The landing/resources pages are statically generated at **build time**, then
served as files—not rendered by a backend on each visit. Product routes retain
SSR for the initial render and client-side SPA navigation afterward. Their
temporary browser-local mock data loads after hydration. Do not disable SSR
globally, keep user state in a module singleton or copy UCAN private keys to a
server to make private SSR possible.

`pnpm test:storybook` uses the existing Playwright dependency to check signed-in
presentation fixtures without adding authentication or a test route to the app.
It builds and serves Storybook separately on port 6007; production page tests
remain in `tests/`. Run these checks sequentially with other builds because they
share generated translations.

This is the real application, not a parallel preview app. Build product screens
under `(agora)` and compose the normal feature components and shared UI.
Temporary sample data lives in one file, `src/lib/mock-data.ts`; it is currently
used by component stories, not `/home`. Future mock and real data sources should
supply the same compositions without introducing another set of screens.

## Storybook implementation boundaries

Stories in `stories/` import the actual UI and feature components. They may
supply props, snippets and deterministic local state, but
must not reimplement product markup. Keep reusable presentation changes in
`src/lib/ui/shared/`, `src/lib/ui/agora/` or the shared Agora compositions, never
in story-only copies. These are production-intended Svelte components, not yet wired
into the Vue application or authenticated production routes.

Storybook deliberately covers the building blocks and their variants, not
whole-screen stories. Full-page composition and integration checks belong to
the normal application routes and Playwright suite, not a separate gallery.

### Components and stateful views

`ui/agora/` contains controlled presentation components: they display values and
emit user actions. Reusable compositions in `components/agora/` own local
interaction state; calculations belong in small `logic/agora/` functions.
Storybook supplies fixtures to those same source compositions, not a separate
implementation of their behaviour. For quadratic allocation, changing a row
updates the shared budget state and remaining-credit display; the presentation
component owns the sticky balance/submit footer. Submission and persistence
remain outside this preview.

The participation and analysis compositions receive typed data props;
data is supplied at their entry points. Keep temporary data in `mock-data.ts`,
not embedded in reusable UI or duplicated in a preview implementation.

### Production boundary

- Storybook and its Svelte story-format addon are **devDependencies**. There is
  no Vitest component-test suite, Vitest Storybook addon, jsdom or browser-test
  provider added by this setup. Storybook itself has transitive testing utilities;
  that does not enable a component-test runner.
- `.storybook/vite.config.ts` is independent of the production `vite.config.ts`:
  it loads Svelte, Tailwind and the existing Paraglide message generator, not Kit
  routing, Netlify or Sentry. Message generation lets localized shared components
  work on a fresh checkout; it uses the same output/strategy as the app.
  Presentation stories currently do not need Kit module mocks.
- The normal `pnpm build` / Netlify pipeline is unchanged and does not run
  Storybook. `storybook-static/` is separate ignored output, not deployment input.
- Application source may not import Storybook or story/config files (enforced by
  ESLint). Production Tailwind scans `src/`; `.storybook/preview.css` also
  scans `stories/` so fixture utilities work without being shipped in production.
  Storybook telemetry is off.
- There is no `/dev/design-system` gallery or preview-specific build configuration.
  Production checks exercise `/home` and the public landing page directly.
  Product routes do not import or ship the unused Storybook sample data.
- Existing Vitest logic tests and Playwright page tests remain separate. Run
  checks, tests and production builds sequentially as noted below.

### OpenCode MCP integration

The official `@storybook/addon-mcp` serves **http://127.0.0.1:6006/mcp** while
`pnpm storybook` is running. The repository's `opencode.json` configures it as
`agora-storybook`, with automatic connection disabled. No separate skill
installation is required. When story-authoring guidance or previews are useful,
start Storybook, temporarily set this server's `disabled` field to `false`, and
check the connection with `opencode mcp list` (or `/mcps` in OpenCode). OpenCode
reloads configuration automatically. Restore `disabled: true` after use; normal
application development does not require this server.

Only the development toolset is enabled: story-authoring instructions and
previews. Component-manifest lookup is unavailable for Svelte in Storybook
10.6, and the test toolset is deliberately disabled; do not install the Vitest
addon just to enable it. The endpoint is local development tooling, never a
production application route. Start Storybook before using its MCP tools.

## Dependency and Build Notes

- SvelteKit configuration lives in `vite.config.ts`; Kit 3 no longer uses `svelte.config.js`.
- Kit 3.1.1, Netlify adapter 7.0.1 and enhanced-img 1.0.0 are pinned to the reviewed migration versions. Keep the existing five-day dependency release-age policy.
- Kit 3.1.1 declares TypeScript `^6.0.0`. Do not upgrade to TypeScript 7 without checking the framework/tooling peer ranges first.
- Netlify output uses `.netlify/v1/`; prerendered pages and client assets remain in `build/`. Local Netlify CLI previews require CLI 17.31.0 or later.
- Use `SENTRY_UPLOAD_SOURCEMAPS=false VITE_STAGING=true pnpm build` for local build verification without publishing source maps or runtime telemetry. Normal production builds retain source-map uploads. Server instrumentation is disabled during builds, development and staging.
- Run `pnpm check`, unit tests and builds sequentially: these commands can regenerate the same Paraglide output.
- Bits UI currently uses Kit-independent exports from Runed 0.35.1. Runed's optional Kit peer range still targets Kit 2; its separate `runed/kit` helpers have incompatible navigation options and are blocked by ESLint. The peer warning is retained rather than declaring unsupported compatibility through an override.
- Security overrides in `pnpm-workspace.yaml` update typography's selector parser
  and the affected Minimatch toolchain paths. Import-X is pinned to 4.18.0
  because older versions import `makeRe`, removed in Minimatch 11. Keep the
  compatibility checks and audit clean of moderate-or-higher advisories when
  revisiting these overrides. The low-severity `deepmerge` advisory currently has
  no patched upstream release; it is not suppressed or hidden by a downgrade.

### Sentry 11

- `@sentry/sveltekit` is pinned to **11.11.0**, eligible under the five-day policy.
  Its bundler dependency supplies patched Glob 14 directly; no Glob override or
  old `@sentry/cli` build-script allowance is needed.
- The build plugin comes from `@sentry/sveltekit/vite`. Source-map options are
  top-level `sourcemaps`, retaining the existing upload opt-out, asset paths and
  post-upload deletion. Runtime imports do not import the Vite entry point.
- `src/lib/sentry-options.ts` shares canonical browser/server-checked options.
  The explicit `dataCollection` policy preserves the restrictive v10 baseline;
  v11's defaults would otherwise enable cookies, bodies and other sensitive
  content. One header policy applies in both directions. This is Sentry's
  [documented migration](https://docs.sentry.io/platforms/javascript/guides/sveltekit/migration/v10-to-v11/#data-collection),
  not a custom SDK wrapper or a guarantee that manually attached data is safe.
- Sampling stays at 10% client / 100% server. SDK initialization stays disabled
  in development/staging and during server builds. Removed `enableLogs` is not
  replaced by a console-logging integration. SvelteKit's default OpenTelemetry
  bridge remains enabled; no second tracer provider is added.
- Tracing uses v11's streamed-span lifecycle. Review Sentry dashboards/alerts
  that rely on transaction events, old span names/ops/attributes, or browser
  crash-free session rates; these external settings cannot be verified here.
- `browser-targets.ts` shares JavaScript/CSS transform targets between the app
  and Storybook: ES2020, Chrome 86, Firefox 91 and Safari/iOS Safari 15. Safari 14
  is no longer an SDK-supported target. Existing Tailwind 4 native CSS browser
  requirements still apply; build targets do not provide runtime polyfills.
  Node engines and Netlify's Node 24.22.1 already satisfy Sentry 11's requirements.

## Project Structure

```
src/
  app.html              # HTML shell
  app.css               # Tailwind CSS v4 entry
  lib/
    ui/                 # Design system (Bits UI wrappers)
      shared/           # Core design system (Button, Dialog, Icons)
      agora/            # Controlled product presentation components
      landing/          # Landing-specific UI (if needed)
    components/         # Application features (business logic)
      shared/           # Reusable landing/blog components
      landing/          # Landing page sections
      agora/            # Product compositions and local interaction state
    logic/              # Pure TS functions + colocated tests
      shared/           # Shared utilities (usually starts here)
      landing/          # Landing-specific logic (if needed)
      agora/            # Pure product calculations and tests
    state/              # Reactive state (.svelte.ts)
      shared/           # Global config, feature flags (usually starts here)
      landing/          # Landing-specific state (if needed)
    server/             # Server-only code
      landing/          # Blog, marketing data
    posts/              # Markdown blog posts by locale
    paraglide/          # Generated i18n runtime
    assets/             # Vite-processed images (enhanced:img, cache-busted)
  routes/
    +layout.svelte      # Root layout
    +page.svelte        # Landing page (/)
    blog/               # Blog (/blog)
messages/               # Paraglide translation files
static/                 # Unprocessed static files (favicons, OG images, blog images)
tests/                  # Playwright E2E tests
```

Feature areas: `shared/`, `landing/`, `agora/`.

`app` names this entire Svelte service, not a feature folder. Within each layer,
`agora/` owns the product experience (projects, statements, participation and
voting); `landing/` owns public marketing/resources; `shared/` owns domain-neutral
building blocks reusable across them. Reuse across product screens, or between
server and client, does not by itself make code shared. For example, quadratic
calculations belong in `logic/agora/`, resource contracts in `logic/landing/`, and
generic controls in `ui/shared/`. This is separate from the older Vue service at
`services/agora`; do not import that application's implementation here.

## Coding Guidelines

### File Naming

Use **kebab-case** for all files: `gradient-button.svelte`, `language-switcher.svelte`

### Path Aliases

Feature aliases are configured in `vite.config.ts`. Kit's former automatic
`$lib` alias is replaced by the native `#lib/*` package import in `package.json`;
use explicit module extensions, for example `#lib/seo.js`.

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
// Direct imports with aliases and explicit extensions
import Button from "$ui/shared/button.svelte";
import GradientText from "$ui/shared/gradient-text.svelte";
import Header from "$components/landing/header.svelte";
import { getRemainingCredits } from "$logic/agora/quadratic-allocation.js";

// ❌ BAD - barrel imports (breaks tree-shaking)
import { Button, Dialog } from "$ui/shared";

// ❌ BAD - direct Bits UI (always use $ui/ wrappers)
import { Button } from "bits-ui";
```

**Rules:**

- **No barrel files** (`index.ts` re-exports) - breaks tree-shaking
- **No cross-feature imports** - landing-specific code imports only from `landing/` or `shared/`
- **Never import Bits UI directly** - always use `$ui/` wrappers

The Bits restriction applies **outside `ui/`**: the wrappers themselves are the
intended Bits integration point. Do not import Vue, Vue Router or Quasar into this
Svelte app.

### Enforced lint contracts

`pnpm lint` runs ESLint with **zero warnings allowed**, then checks formatting.
Generic checks use the maintained TypeScript/Svelte/import plugins,
`eslint-plugin-check-file`, and ESLint Community's comment rules. The remaining
local rules in `eslint/app-policy.js` express our import policy and handle
Svelte-aware barrel exports/HTML lint directives. They build on the maintained
ESLint static-value utilities and TypeScript resolver; none ships with the app.
The evaluated `eslint-plugin-no-barrel-files` was removed because its root-program
scan misses exports inside Svelte module scripts; regression tests cover both
TypeScript and Svelte rather than assuming generic plugin coverage.

- Type assertions are prohibited; `as const` remains supported. Non-null
  assertions, unsafe operations and TypeScript suppression directives are also
  rejected. Inline ESLint configuration cannot weaken the checks; legitimate
  exceptions must be narrow and documented in the configuration.
- Promise checks apply to **unit and Playwright tests**, not just production
  code. Await browser actions and retrying assertions. Built-in prototype
  extension is forbidden.
- Authored filenames use kebab-case, with reserved Kit route/type names and
  ordinary dotted config/declaration suffixes supported. Tests must end in
  `.test.ts`; `.spec.*` and other `.test.*` extensions fail lint.
- Authored library re-export barrels are forbidden, including renamed barrels
  and forwarding imported bindings. Import the defining module instead. Route
  exports, actual definitions and declaration modules are not blanket-banned.
- Production source cannot import test, story, Storybook or lint-tool modules,
  including local test files. Guards cover static imports/re-exports and dynamic
  imports whose paths can be evaluated statically: literals, templates,
  concatenations and constant bindings. Explicit Vite glob paths are also
  checked. Source JS and rune modules are included.
- Source imports stay in this app or canonical `services/shared/src` code. UI
  cannot depend on feature components, application state or server code; pure
  logic cannot depend on UI, state, server code or navigation APIs. State cannot
  depend on UI/components/server code. Library layers cannot depend on routes.
  Cross-feature dependencies must use genuinely shared code, not another
  feature's folders. Tests can inspect layers directly.
- Svelte checks require TypeScript on script blocks, explicit native button
  types, safe new-tab links and SSR-safe top-level browser access, including Kit 3
  `$app/env` guards. Debug tags/inspection are errors. The only raw-HTML exception
  is the existing repository-owned Markdown renderer in the resource `[slug]`
  page—not every resource subroute.

`pnpm test:unit --run eslint/app-policy.test.ts` checks the effective configuration
against allowed code and regression/bypass cases, outside production source.
Runtime-computed imports and the files matched by broad globs still require
production dependency/build review.
Lint does not prove Figma fidelity, complete widget passthrough, state ownership,
RTL layout or lifecycle/interaction correctness; keep those in types, browser and
logic tests, and review. The navigation lint exception for Paraglide is retained;
the installed resolve-only rule does not model `localizeHref()`.

**Rule:** If landing/blog code needs the same utility or component, move it to `shared/` first.

### ui/ vs components/

| Folder        | Purpose                                                                                                                   | Examples                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `ui/`         | Design system wrappers on Bits UI. Views only, no business logic. Can have internal UI state (open/closed, hover, focus). | Button, Input, Dialog, Icons, GradientText, Badge, Spinner, Card, Tooltip |
| `components/` | Application features with business logic (data fetching, API calls, validation). Compose `$ui/` primitives.               | LoginForm, Navbar, ConversationCard, ConfirmDeleteDialog, CommentThread   |

**`ui/` = Design System Abstraction Layer:**

Use Tailwind utilities for component and story styling. Shared design tokens and
Tailwind utilities belong in `src/app.css`. Bind runtime values such as vote
percentages through `style:--amount={value}` and consume them in a utility;
do not add scoped stylesheets, inline style strings, or static style directives.
`app-policy/use-design-system` checks all Svelte markup, including stories.
There are no per-file exemptions. Use shared controls in features, pages and
stories. Use Bits UI inside the wrapper when it provides the behavior; native
form elements in the wrapper are appropriate for ordinary text or number entry.
For example, the Mapping display selector and activity-type picker both use
`SelectionCard` in radio mode, while cards that immediately start a new draft
use the same component in action mode.

- **NEVER use Bits UI directly** in `components/` or routes
- **ALWAYS import from `$ui/`** - this is your internal design system
- If you swap Bits UI for another library, only `ui/` needs to change
- **Build UI primitive wrappers on Bits UI.** Components use `$ui/`; `$ui/`
  wraps Bits UI. Keep product styling and the public component contract in that
  wrapper, and reuse Bits UI's underlying behavior rather than reimplementing it.
- Reuse existing higher-level `$ui/` components first. Within UI, prefer the
  appropriate higher-level Bits UI component (Dialog, Select, RadioGroup, Tabs,
  etc.), composing other UI pieces as needed. Reach for low-level primitives
  such as Bits UI Button when building custom controls—not to rebuild behavior
  that a higher-level component already provides.

For primitive wrappers, derive props from the corresponding Bits UI types rather
than maintaining a second handwritten copy. Preserve the primitive's supported
events, refs and snippets, alongside design-system variants. Keep multi-part
component options explicit rather than flattening unrelated root/content props
into one ambiguous object. Feature components still import only from `$ui/`;
ESLint enforces this boundary.

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
  import HeroSection from "$components/landing/hero-section.svelte";
  import ForCitizens from "$components/landing/for-citizens.svelte";
  import Footer from "$components/landing/footer.svelte";
</script>

<HeroSection />
<ForCitizens />
<Footer />
```

```svelte
<!-- components/landing/hero-section.svelte - Feature component -->
<script>
  import Button from "$ui/shared/button.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
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
// Static configuration does not need reactive state.
export const config = {
  apiUrl: "https://api.example.com",
  features: { darkMode: true },
} as const;
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

Keep server-loaded data in the page/component tree. Pass it through props; use
typed context only when descendants need shared ownership. Do not copy request
data into module-level state. Treat load data as reactive because Kit reuses
components during navigation:

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import type { LayoutProps } from "./$types.js";
  let { data, children }: LayoutProps = $props();
  // Use data directly or derive values; do not capture its initial value.
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

**Default to the simplest option.** Use `$derived` for computed values and reserve
`$effect` for external side effects. Prefer attachments for element-owned DOM
observers/listeners, with cleanup when the element is removed.

### Testing Strategy

| Layer                | Tool         | What it tests                                 |
| -------------------- | ------------ | --------------------------------------------- |
| **Unit tests**       | Vitest       | Pure logic in `.ts` and `.svelte.ts` files    |
| **Component review** | Storybook 10 | Actual shared components and fixture variants |
| **E2E tests**        | Playwright   | Full app user flows                           |

No Vitest component-test addon, Svelte Testing Library or DOM test environment is
configured. Do not add another test stack by default. Storybook is local tooling,
not a production deployment. Use semantic Playwright queries for integration,
keyboard/focus, responsive/RTL and scrolling regressions.

### Testing File Patterns

Use **`.test.ts`** consistently, not `.spec.ts`. Runner configuration separates
colocated unit tests in `src/` from Playwright integration tests in `tests/`.
ESLint rejects `.spec.*` and other `.test.*` extensions so they cannot silently
bypass the configured test runners. Lint-policy unit tests live in `eslint/`;
normal application unit tests remain colocated in `src/`.

| File Type                  | Test File                | Example                     |
| -------------------------- | ------------------------ | --------------------------- |
| Pure functions (`.ts`)     | `*.test.ts`              | `validation.test.ts`        |
| Reactive module public API | `*.test.ts`              | `scroll-visibility.test.ts` |
| Component integration      | Playwright on app routes | `tests/home.test.ts`        |
| User flows                 | Playwright               | `tests/hello.test.ts`       |

### Testing Best Practices

| Scenario               | Approach                                      |
| ---------------------- | --------------------------------------------- |
| Logic/state modules    | Test their public input → output contract     |
| Effects and lifecycle  | Playwright in the actual browser              |
| Component interactions | Playwright semantic queries and user actions  |
| Async/loading states   | Playwright's retrying assertions              |
| Network errors         | Mock `fetch` with `vi.spyOn(global, 'fetch')` |

**Best practice:** Extract testable logic into `logic/` or `state/`. Focus on testing critical logic, not quantity.

Use browser checks for meaningful UI contracts; visual captures remain review
evidence until screenshot baselines receive explicit approval.

### Example: Testing Pure Functions

```
logic/shared/validation.ts
logic/shared/validation.test.ts
```

### Example: Testing Reactive State

Import the rune module into a normal `.test.ts` file and test its public API.
The current Vitest configuration runs in Node with server-side Svelte resolution;
browser effects do not run there. Keep DOM/lifecycle coverage in Playwright
rather than adding a second runtime or component-test setup by default.

```typescript
import { expect, test } from "vitest";
import { createScrollVisibility } from "./scroll-visibility.svelte.js";

test("scrolling past the threshold hides the header", () => {
  const visibility = createScrollVisibility({ threshold: 50 });
  visibility.update(60);
  expect(visibility.hidden).toBe(true);
});
```

### Images

This project uses two directories for images, each with distinct behavior:

| Directory         | Behavior                                                                                                                       | Use for                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `src/lib/assets/` | Processed by Vite at build time — generates WebP/AVIF formats, responsive `srcset`, content-hashed filenames for cache-busting | Images referenced in `.svelte` component templates                                                  |
| `static/images/`  | Served as-is at `/images/...`, no processing                                                                                   | Favicons, Open Graph/meta images, blog markdown images — anything needing a stable, predictable URL |

**Why two directories?** `@sveltejs/enhanced-img` can only optimize images that are imported through Vite's module system. HTML `<link>` tags (favicons), `<meta>` tags (Open Graph), and markdown `<img>` tags are outside Vite's scope and need plain URLs from `static/`.

#### `src/lib/assets/` — Vite-processed images

Use `<enhanced:img>` for images in Svelte component templates. At build time, it generates a `<picture>` element with multiple formats (WebP, AVIF) and sizes.

**Static src (single image in template):**

```svelte
<enhanced:img
  src="#lib/assets/hero.png"
  alt="Hero"
  sizes="min(1376px, 100vw)"
/>
```

**Dynamic src (images in arrays/loops) — use `?enhanced` imports:**

```svelte
<script lang="ts">
  import heroImg from "#lib/assets/hero.png?enhanced";
  import featureImg from "#lib/assets/feature.png?enhanced";

  const items = [
    { img: heroImg, label: "Hero" },
    { img: featureImg, label: "Feature" },
  ];
</script>

{#each items as item (item.label)}
  <enhanced:img src={item.img} alt={item.label} sizes="270px" />
{/each}
```

**SVGs — use standard Vite imports (not `enhanced:img`):**

```svelte
<script lang="ts">
  import logo from "#lib/assets/logo.svg";
</script>

<img src={logo} alt="Logo" />
```

SVGs get content-hashed filenames for cache-busting but don't need format conversion.

**`sizes` attribute guidelines:**

| Image type                 | `sizes` value                    | Why                                 |
| -------------------------- | -------------------------------- | ----------------------------------- |
| Full-width hero/background | `min(1376px, 100vw)`             | Capped at max container width       |
| Half-width (2-column grid) | `(min-width: 768px) 50vw, 100vw` | Full on mobile, half on desktop     |
| Fixed-width element        | `350px` or `270px`               | Match the CSS width                 |
| Small logos/icons          | Omit                             | Not worth generating multiple sizes |

**LCP image:** Set `fetchpriority="high"` on the largest contentful paint image (typically the hero background) so the browser prioritizes loading it.

#### `static/images/` — unprocessed files

Files here are served directly at `/images/...` with no build-time processing. Use for:

- **Favicons** — `<link rel="icon">` tags need stable paths
- **Open Graph / Twitter Card images** — social crawlers need absolute URLs
- **Blog images** — referenced from markdown via raw `<img>` HTML, outside Vite's module system

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
- `/fa` → Persian
- `/he` → Hebrew
- `/ja` → Japanese
- `/ky` → Kyrgyz
- `/ru` → Russian
- `/zh-hans` → Simplified Chinese
- `/zh-hant` → Traditional Chinese

Translation files are in `messages/*.json`. The compiler generates type-safe message functions.

The landing page supports the same 11 UI languages as `services/agora`, defined by `ZodSupportedDisplayLanguageCodes` in `services/shared/src/languages.ts`. Chinese locale codes use lowercase URL prefixes here (`zh-hans`, `zh-hant`) and title-case script subtags in the Quasar app (`zh-Hans`, `zh-Hant`). The much larger spoken-language list describes content languages, not available UI translations.

`project.inlang/settings.json` is the landing locale source of truth. The server injects its generated locale list into `app.html`, and the language switcher and FAQ use the same generated types. Localized URLs take precedence over stored/device preferences. Arabic, Persian, and Hebrew pages also render with `dir="rtl"` on the server, including when JavaScript is disabled.

Localization tests check parity with the Quasar UI languages, message keys and placeholders, translated resource availability, and copied English paragraphs. Browser tests exercise the FAQ, case-study navigation, and mobile layout in every language.

## Environment Variables

Environment variables are validated at build time. See `src/lib/paraglide/` for i18n config.

For production deployment, configure:

- `ORIGIN` - The app's public URL (required for SSR)
- `VITE_SENTRY_ENABLED=true` - Opt in to production Sentry reporting at build time. Netlify sets this only for its production context; leave it unset for local builds and tests.

## Scope

This service owns the public landing and content experience:

| Feature               | Status      |
| --------------------- | ----------- |
| Landing page          | ✅ Complete |
| Blog                  | ✅ Complete |
| Explore conversations | 🔜 Planned  |

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

### Shared Code if API Usage Grows

If this service needs more backend API access, keep the shared surface small:

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
