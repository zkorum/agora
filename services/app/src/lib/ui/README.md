# ui/

Design system - styled wrappers around Bits UI with Tailwind.

## Structure

```
ui/
  shared/       # Core design system (Button, Input, Dialog, Icons)
  landing/      # Landing-specific UI (if needed)
```

## Rules

- Wraps Bits UI primitives with project styling
- No business logic - only presentation
- Internal UI state is OK (open/closed, hover, focus)
- If swapping Bits UI for another library, only this folder changes

## Sharing

**Usually starts in `shared/`** - design system components are inherently reusable.
Landing-specific UI belongs in `landing/` only when it would not be useful elsewhere.
