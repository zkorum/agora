# server/

Server-only code. SvelteKit enforces this cannot be imported from client.

## Structure

```
server/{app}/
  landing/      # Blog, marketing data
  facilitator/  # Facilitator data fetching
  participant/  # Participant data fetching
```

## Rules

- Data fetching, database queries, secrets
- Import with `$server/` alias
- Cannot be imported in browser code (SvelteKit enforces)

## Sharing

**Per-app by default** - each app has distinct data needs. No `shared/` folder; create one only if genuinely needed.
