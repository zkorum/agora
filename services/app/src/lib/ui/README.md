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

## Responsive styling and tokens

- Use Tailwind's `md` and `lg` viewport breakpoints for the workspace shell.
  Below `md` use the drawer; from `md` to `lg` default to the collapsed rail;
  from `lg` default to the expanded sidebar. The toggle stays available in both
  desktop layouts. Prefer container queries when a component adapts to its own
  available space rather than the viewport.
- Use the shared palette in `src/app.css` and Tailwind's spacing and radius
  scales. Keep genuinely component-specific geometry local.
- ESLint checks Svelte components and stories for arbitrary viewport breakpoints and
  literal color utilities. Use Tailwind variants for complex layout and
  descendant selectors for third-party markup. New scoped CSS blocks and
  inline styles fail `app-policy/use-design-system`; bind a CSS custom property
  for a runtime value and consume it in a utility.

## Loading and notifications

- Compose `shared/skeleton.svelte` into the shape of unavailable content on
  first load. Reserve the space the real content will occupy. Keep cached
  content visible during refresh rather than replacing it with a skeleton.
- Use `shared/spinner.svelte` beside a short pending label for a specific
  action. Both visuals are decorative and respect reduced motion. Give the
  region or action a single accessible status, not one per placeholder.
- Mount one `shared/toaster.svelte` in the workspace and emit through
  `shared/toast.ts`. Use a toast for meaningful feedback that otherwise has
  no visible result. Keep form errors next to the action and do not repeat
  confirmations already shown by navigation or a dialog.

## Workspace dialog actions

Use the shared `Button` with `size="control"` for routine create, save, and
cancel actions. Use the shared `Dialog` action footer insets rather than padding
individual buttons or assigning them fixed widths.

### Help me choose

Use `shared/help-dialog.svelte` for read-only comparisons that help users
choose a setting. The feature supplies the comparison content; the dialog
keeps the localized acknowledgment visible below the scrollable body.
Dismissing help returns users to their current choice without saving it.
Use `shared/help-comparison-card.svelte` for each option. It places the icon
beside the heading and the explanation below. Authentication options can add
a requirement badge; activity methods can add a local, interactive example.

## Rich text

Use `shared/rich-text-editor.svelte` for supported HTML body fields only, not
titles. It loads Tiptap on the client and shares its formatting controls between
the roomy inline toolbar and the compact selection bubble. Use the
`agora-rich-text` utility for matching content typography; it does not sanitize
HTML. The feature that owns the field validates the HTML and renders only
sanitized output.

## Selection controls

Use `shared/setting-row.svelte` for a labelled on/off setting with explanatory
text. The whole row is one switch, including the icon and padding. Do not add
a click handler around it: pointer and keyboard input should toggle the same
control exactly once. Disabled rows remain readable but cannot change.

Use `shared/selection-card.svelte` for an immediate action button or a native radio choice with a
rich heading and description. The card owns the input and its accessible
name and description. Use the same `name` within a group and keep the
`fieldset`, layout, and selected value in the owning component. Pass
`checked` and `onselect` to each card, and don't put interactive content
in its heading or description. Activity methods use the same visible radio and
selection colors as the project activity picker.

### Form labels

Use `field-label.svelte` inside an associated label for the shared required `*`
convention. Optional labels have no suffix. `Field` derives its marker from the
active native input/textarea's `required`; Select and Combobox derive it from
`rootProps.required`. The decorative marker is hidden from assistive technology;
the control's native required/ARIA semantics remain authoritative.

### Local image selection

`shared/image-picker.svelte` is a controlled `File | undefined` picker with
choose/replace/remove actions, native keyboard/file selection, format/size
feedback and a temporary local preview. It checks whether a candidate can be
decoded before replacing the current file. Both candidate decoding and the
preview attachment revoke their temporary object URLs when no longer needed.

It never uploads files, writes storage, or converts local object URLs into
persisted image paths. Feature owners retain selected File state separately from
any existing image URL, and must add a real upload integration before promising
saved images. Until upload is available, project credits accept HTTPS image URLs
only. The shared picker's Storybook demonstrates local preview behavior.

Use `shared/select.svelte` for non-searchable choices and
`shared/combobox.svelte` for searchable choices. Both support single and multiple
selection. Keep the selection mode correlated with its value/callback types;
do not pass scalar-or-array values alongside an unrelated Boolean flag.

- Use `field` presentation for forms/settings and `compact` for short toolbar or
  navigation controls. Field menus follow the trigger width; compact menus stay
  readable without stretching their trigger.
- Keep canonical option values separate from labels and search text. Changing a
  search query must not change committed selection or hide its selected label.
- Pass rich presentation through the supported snippets, not domain-specific
  branches inside the primitives. Search aliases and descriptions belong to the
  caller's option metadata.
- Keep fetching, authorization, retries and persisted selection rules in feature
  components. Shared controls only own presentation, filtering and interaction.
- Use Bits UI's selection, keyboard, typeahead, pointer and dismissal behavior.
  Do not rebuild it with menus, native key handlers or DOM positioning code.
- Preserve explicit direction and complete styling across portals. Overlay
  layering must not depend on whether a trigger is compact or full-width.
- Multi-select chips/removal buttons must not nest interactive controls inside a
  trigger button or listbox option. Compact summaries may show a selected count.

The initial responsive surface is an anchored, viewport-constrained popup with
44px option targets. A mobile bottom-sheet presentation is a separate enhancement,
not a reason to introduce another modal for every field.

Selector stories use the real wrappers. Browser checks cover geometry, keyboard
selection, filtering, multiple values, disabled options, external value updates,
RTL and popups inside dialogs.

### Contract and composition

- `items` accepts readonly `SelectItem<Value>` records and retains additional
  caller metadata in rendering snippets. Option IDs must be unique, non-empty
  strings; the empty string is reserved for absence at the Bits UI boundary.
- `type="single"` requires `value: Value | undefined`; `type="multiple"` requires
  `value: Value[]`. Both support `bind:value` or `onValueChange`.
- A single choice cannot be deselected by choosing it again unless `clearable`
  is enabled. `rootProps.required` suppresses clearing.
- `rootProps`, `contentProps`, `portalProps` and trigger/input props remain
  separate. Wrapper-owned values/items/disabled/open state cannot be overridden
  through `rootProps`. Trigger/input props also exclude owned direction and
  disabled state. Put field names and required validation in `rootProps`, not on
  the Combobox's search input; submitted values must be identifiers, not queries.
- Pass visible `label`, `hint` and `error`, or an accessible label through
  `triggerProps` (Select) / `inputProps` (Combobox). Field headings do not
  automatically label an unrelated control.
- Pass `dir` explicitly when the widget's direction differs from the default.
  It also configures the portalled floating layer.
- `status` can present loading or a supplied error message. Status menus remain
  openable, but cannot select cached options. Request/retry behavior stays in the
  owning feature.
- Pass `disabled` to the wrapper during pending form mutations. A disabled
  ancestor fieldset alone does not disable portalled options.
- Disabled options cannot be chosen or toggled through the list, including by
  pointer highlight followed by keyboard selection. Existing unavailable
  selections remain displayed; explicit chip removal/clearing can remove them
  when the overall control is enabled.

Named selectors participate in native required validation and submit canonical
IDs. Multiple selections use repeated entries under the same field name. An
empty required multiple Combobox has a narrow validation-only fallback for Bits
UI 2.18's missing empty validation input; that control has no name and contributes
no submitted value.

**Reset is owner-controlled.** Do not rely on native `form.reset()` alone to
restore a controlled selector model: single and multiple Bits bindings do not
establish identical initial-selection defaults. The owning form should prevent
the reset's default behavior and explicitly restore its bound values. No generic
selector should invent a feature's reset/default-selection policy.

Use `itemLabel` for rich option content, `leading` for a selected item's mark,
and `selectionLabel` for a custom summary. In the Combobox, its input still owns
search text; rich presentation must not replace or interfere with Bits' input
events and accessibility attributes.

Examples and interactive states are in **Shared / Select** and
**Shared / Combobox** in Storybook.
