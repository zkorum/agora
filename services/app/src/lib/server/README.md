# server/

Server-only code. SvelteKit enforces this cannot be imported from client.

## Structure

```
server/
  landing/      # Resources and marketing data
```

## Rules

- Data fetching, database queries, secrets
- Import with `$server/` alias
- Cannot be imported in browser code (SvelteKit enforces)

## Sharing

**Feature-specific by default** - keep server code close to the feature that needs it. Create `shared/` only if genuinely needed.
