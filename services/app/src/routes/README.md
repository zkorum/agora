# routes/

SvelteKit file-based routing. URL structure maps to folder structure.

## Structure

```
routes/
  +page.svelte        # Landing page (/)
  (agora)/           # Product layout group (no URL prefix)
    home/            # Localized redirect to /projects
    projects/        # Project list and creation
    project/[projectSlug]/ # Facilitator project page
      draft/[draftId]/ # Activity workspace; editor changes stay on the page
  resources/          # Resources (/resources)
  blog/               # Legacy redirects to resources
```

## Rules

- Routes should be simple - just compose components from `$components/`
- Business logic belongs in components, not routes
- Routes import their feature's components from `$components/`
- `/home` uses the product layout, not marketing navigation or footer
- Keep `/` as the landing page; authentication redirects are not implemented yet
- Landing/resources routes prerender at build time. The product layout explicitly
  retains SSR + CSR without prerendering: initial server-rendered shell, then SPA
  navigation. Browser-local mock data loads after hydration, not from a shared
  server store.

## Sharing

**No shared concept** - routes ARE the URL structure. Shared UI belongs in `$components/shared/`.
