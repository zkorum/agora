# routes/

SvelteKit file-based routing. URL structure maps to folder structure.

## Structure

```
routes/
  +page.svelte        # Landing page (/)
  blog/               # Blog (/blog)
  facilitator/        # Facilitator app (/facilitator)
  participant/        # Participant app (/participant)
```

## Rules

- Routes should be simple - just compose components from `$components/`
- Business logic belongs in components, not routes
- Each route imports from matching `$components/{app}/`

## Sharing

**No shared concept** - routes ARE the URL structure. Shared UI belongs in `$components/shared/`.
