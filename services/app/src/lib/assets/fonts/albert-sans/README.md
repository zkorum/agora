# Local Albert Sans

These repository-owned variable fonts are WOFF2 conversions of the Vue app's
Albert Sans **1.025**, from `services/agora/src/css/fonts/Albert_Sans/`.
The conversion preserves all 395 Unicode mappings, the 100–900 weight axis,
metrics, layout tables and upright/italic designs. No glyph subsetting is applied.

| File                               |  Original TTF |        WOFF2 |
| ---------------------------------- | ------------: | -----------: |
| `AlbertSans-Variable.woff2`        | 128,420 bytes | 52,180 bytes |
| `AlbertSans-Italic-Variable.woff2` | 141,380 bytes | 56,464 bytes |

`OFL.txt` is the original SIL Open Font License and copyright notice.

## Regeneration

From the repository root, using FontTools with Brotli support:

```bash
uvx --from 'fonttools[woff]' fonttools ttLib.woff2 compress \
  services/agora/src/css/fonts/Albert_Sans/AlbertSans-VariableFont_wght.ttf \
  -o services/app/src/lib/assets/fonts/albert-sans/AlbertSans-Variable.woff2
uvx --from 'fonttools[woff]' fonttools ttLib.woff2 compress \
  services/agora/src/css/fonts/Albert_Sans/AlbertSans-Italic-VariableFont_wght.ttf \
  -o services/app/src/lib/assets/fonts/albert-sans/AlbertSans-Italic-Variable.woff2
```

Source TTF SHA-256:

- Upright: `73dc7c1fc27e3a23cea1dc6323dc299bede697c91dd87c567683926a357df3db`
- Italic: `78ddc829d258fc6cb1651c69028ff63d0c047def444329dc7a5b7f34f1b96e38`

The application never imports across frontend boundaries. Its global CSS owns
both font faces and is shared with Storybook. Vite fingerprints the local files;
there is no runtime font provider or package dependency. SvelteKit's native
preload filter selects only the upright face, used throughout the UI. Italics
load on demand. `font-display: swap` keeps text readable during loading, and
`font-synthesis: none` prevents fabricated bold/italic faces.

References:

- [SvelteKit font performance](https://svelte.dev/docs/kit/performance#Optimizing-assets-Fonts)
- [Vite asset handling](https://vite.dev/guide/assets)
- [web.dev font best practices](https://web.dev/articles/font-best-practices)
