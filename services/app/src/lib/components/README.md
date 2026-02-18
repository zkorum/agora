# components/

Application features with business logic. Compose `$ui/` primitives.

## Structure

```
components/{app}/
  shared/       # Shared across all apps
  landing/      # Landing page sections
  facilitator/  # Facilitator app
  participant/  # Participant app
```

## Import Rules

- Import UI from `$ui/`, never directly from `bits-ui`
- No cross-app imports: `landing/` cannot import from `facilitator/` or `participant/`
- Can always import from `shared/`

## Sharing

**Wait until mature** - only move to `shared/` when 2+ apps need it AND the component is stable.
Don't preemptively share; start in app folders and promote when genuinely needed.
