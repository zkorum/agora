# state/

Reactive state using Svelte 5 runes (`.svelte.ts` files).

## Structure

```
state/{app}/
  shared/       # Global config, feature flags
  landing/      # Landing-specific state (if needed)
  facilitator/  # Facilitator-specific state (if needed)
  participant/  # Participant-specific state (if needed)
```

## Rules

- Use `.svelte.ts` extension to enable runes
- Module-level `$state()` is shared across ALL server requests
- For user-specific data loaded server-side, use Context API instead

## Sharing

**Rare** - most state is app-specific. Only truly global config/feature flags belong in `shared/`.
