# routes/

SvelteKit file-based routing. URL structure maps to folder structure.

## Structure

```
routes/
  +page.svelte        # Landing page (/)
  resources/          # Resources (/resources)
  blog/               # Legacy redirects to resources
```

## Rules

- Routes should be simple - just compose components from `$components/`
- Business logic belongs in components, not routes
- Routes import landing and shared components from `$components/`

## Sharing

**No shared concept** - routes ARE the URL structure. Shared UI belongs in `$components/shared/`.
