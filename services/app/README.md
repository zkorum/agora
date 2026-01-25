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
    assets/             # Static assets (favicon, etc.)
    components/
      landing/          # Landing page sections
      shared/           # Reusable components (GradientButton, etc.)
      ui/               # Base UI primitives (Bits UI wrappers)
    logic/              # Pure TS functions + colocated tests
    paraglide/          # Generated i18n runtime
    server/             # Server-only code (blog, data fetching)
  routes/
    +layout.svelte      # Root layout (Header, Footer)
    +page.svelte        # Landing page
    blog/               # Blog routes
  content/
    blog/               # Markdown blog posts by locale
messages/               # Paraglide translation files (en.json, fr.json, etc.)
static/                 # Static files (images, robots.txt)
tests/                  # Playwright E2E tests
```

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

## License

[MPL-2.0](./COPYING) - See [COPYING-README.md](../../COPYING-README.md) for details.
