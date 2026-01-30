# logic/

Pure TypeScript functions with colocated tests.

## Structure

```
logic/{app}/
  shared/       # Shared pure functions
  landing/      # Landing-specific logic (if needed)
  facilitator/  # Facilitator-specific logic (if needed)
  participant/  # Participant-specific logic (if needed)
```

## Rules

- No side effects, no state, no DOM access
- Object parameters for 2+ args: `fn({ a, b })`
- Colocated `.test.ts` files run with Vitest

## Sharing

**Usually starts in `shared/`** - pure functions have no dependencies and are easy to share.
