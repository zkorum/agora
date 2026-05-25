# components/

Application features with business logic. Compose `$ui/` primitives.

## Structure

```
components/
  shared/       # Shared across landing and blog
  landing/      # Landing page sections
```

## Import Rules

- Import UI from `$ui/`, never directly from `bits-ui`
- Keep landing-specific code in `landing/`
- Can always import from `shared/`

## Sharing

**Wait until mature** - only move to `shared/` when landing and blog both need it AND the component is stable.
Don't preemptively share; start in feature folders and promote when genuinely needed.
