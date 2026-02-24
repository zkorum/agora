import matter from "gray-matter";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  author: string;
  date: string;
  thumbnail: string;
  image: string;
  content: string;
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  author: string;
  date: string;
  thumbnail: string;
  image: string;
}

const markdownFiles: Record<string, string> = import.meta.glob(
  ["/src/lib/posts/**/*.md", "!/src/lib/posts/README.md"],
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
);

function getLocaleFromPath(path: string): string {
  const match = /\/src\/lib\/posts\/([^/]+)\//.exec(path);
  return match?.[1] ?? "en";
}

function getSlugFromPath(path: string): string {
  const match = /\/([^/]+)\.md$/.exec(path);
  return match?.[1] ?? "";
}

export function getBlogPosts({ locale }: { locale: string }): BlogPostMeta[] {
  const posts: BlogPostMeta[] = [];

  for (const [path, raw] of Object.entries(markdownFiles)) {
    if (getLocaleFromPath(path) !== locale) continue;

    const { data } = matter(raw);
    posts.push({
      slug: getSlugFromPath(path),
      title: getString(data.title),
      description: getString(data.description),
      author: getString(data.author),
      date: getString(data.date),
      thumbnail: getString(data.thumbnail),
      image: getString(data.image),
    });
  }

  // Fallback: include English-only posts not available in the requested locale
  if (locale !== "en") {
    const localeSlugs = new Set(posts.map((p) => p.slug));
    for (const [path, raw] of Object.entries(markdownFiles)) {
      if (getLocaleFromPath(path) !== "en") continue;
      const slug = getSlugFromPath(path);
      if (localeSlugs.has(slug)) continue;
      const { data } = matter(raw);
      posts.push({
        slug,
        title: getString(data.title),
        description: getString(data.description),
        author: getString(data.author),
        date: getString(data.date),
        thumbnail: getString(data.thumbnail),
        image: getString(data.image),
      });
    }
  }

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getBlogPost({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}): Promise<BlogPost | null> {
  const path = `/src/lib/posts/${locale}/${slug}.md`;
  let raw = markdownFiles[path];

  // Fallback to English if locale-specific version doesn't exist
  if (!raw && locale !== "en") {
    const fallbackPath = `/src/lib/posts/en/${slug}.md`;
    raw = markdownFiles[fallbackPath];
  }

  if (!raw) return null;

  const { data, content: markdownContent } = matter(raw);

  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify)
    .process(markdownContent);

  return {
    slug,
    title: getString(data.title),
    description: getString(data.description),
    author: getString(data.author),
    date: getString(data.date),
    thumbnail: getString(data.thumbnail),
    image: getString(data.image),
    content: String(result),
  };
}

export function getAllSlugs(): string[] {
  const slugs = new Set<string>();
  for (const path of Object.keys(markdownFiles)) {
    slugs.add(getSlugFromPath(path));
  }
  return [...slugs];
}
