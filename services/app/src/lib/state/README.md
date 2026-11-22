# state/

Reactive state using Svelte 5 runes (`.svelte.ts` files).

## Structure

```
state/
  shared/       # Global config, feature flags
  landing/      # Landing-specific state (if needed)
  agora/        # Workspace-scoped product state
```

## Rules

- Use `.svelte.ts` extension to enable runes
- Module-level `$state()` is shared across ALL server requests
- For user-specific data loaded server-side, use Context API instead
- Product state factories own per-workspace state, receive a typed API dependency,
  and share that instance through typed context. Never store a user's projects
  in a server-process singleton.

## Sharing

**Rare** - most state is feature-specific. Only truly global config/feature flags belong in `shared/`.
