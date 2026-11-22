# Workspace navigation assets

These SVGs are local exports from the Figma Navigation section (`24105:142114`).
They preserve its icon geometry, stroke widths and token colors; do not replace
them with visually similar glyphs or inline SVG copies.

- Sidebar: default `24302:200119`, children expanded `24302:200178`, collapsed
  `24302:200249`.
- Account popover: `24328:298617`.
- `NavigationIcon` is the shared rendering component. It retains the exported
  14px, 16px and 20px dimensions and handles directional icons in RTL.
- The existing `agora-icon.svg` supplies the matching brand artwork.
- The organization avatar is intentionally not exported: the signed-in account
  always belongs to an individual. Personal initials come from the supplied
  user, not a static design asset.

The sidebar, account menu and Storybook stories reuse these assets and the same
production UI components. Figma screenshots are references, never app assets.
