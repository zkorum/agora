# Posts

Markdown blog posts, organized by locale. Processed at build time — not served as-is.

This follows the convention from [Josh Collinsworth's SvelteKit blog starter](https://joshcollinsworth.com/blog/build-static-sveltekit-markdown-blog) of placing posts under `src/lib/posts/`, leveraging SvelteKit's built-in `$lib` alias. Files are loaded via Vite's `import.meta.glob` in `src/lib/server/landing/blog.ts`.

## Why not `static/`?

`static/` serves files verbatim. These markdown files go through a build pipeline:

1. Vite glob import loads all `.md` files as raw strings at build time
2. `gray-matter` extracts YAML frontmatter (title, author, date, etc.)
3. `unified` / `remark` / `rehype` converts Markdown to sanitized HTML
4. SvelteKit prerenders static HTML pages

## Structure

```
posts/
├── en/
│   ├── bloquonstout.md
│   ├── facilitation-guide.md
│   └── tech4nature.md
├── fr/
├── es/
├── ar/
├── ja/
├── zh-hans/
└── zh-hant/
```

Each locale folder mirrors the same set of slugs. The slug is derived from the filename.

## Adding a new blog post

1. Create a `.md` file in the appropriate locale folder (e.g., `en/my-post.md`)
2. Add YAML frontmatter:
   ```yaml
   ---
   title: "Post Title"
   description: "Brief description"
   author: "Author Name"
   date: "February 2026"
   thumbnail: "/images/my-thumbnail.png"
   ---
   ```
3. Write Markdown content below the frontmatter (raw HTML is supported)
4. Place referenced images in `static/images/`
5. To translate, create the same filename under other locale folders

No code changes needed — the glob import discovers new files automatically.
