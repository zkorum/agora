# routes/

SvelteKit file-based routing. URL structure maps to folder structure.

## Structure

```
routes/
  +page.svelte        # Landing page (/)
  (agora)/           # Product layout group (no URL prefix)
    home/            # App home (/home), initially layout-only
  resources/          # Resources (/resources)
  blog/               # Legacy redirects to resources
```

## Rules

- Routes should be simple - just compose components from `$components/`
- Business logic belongs in components, not routes
- Routes import their feature's components from `$components/`
- `/home` uses the product layout, not marketing navigation or footer
- Keep `/` as the landing page; authentication redirects are not implemented yet

## Sharing

**No shared concept** - routes ARE the URL structure. Shared UI belongs in `$components/shared/`.
