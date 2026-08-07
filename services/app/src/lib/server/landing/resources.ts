import matter from "gray-matter";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import type { locales } from "$lib/paraglide/runtime";
import { localizeHref, toLocale } from "$lib/paraglide/runtime";
import { SITE_ORIGIN } from "$lib/seo";
import { parseResourceDate } from "$logic/shared/resource-date";

type Locale = (typeof locales)[number];

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function localizeResourceHref({
  href,
  locale,
}: {
  href: string;
  locale: Locale;
}): string {
  const isRootRelative = href.startsWith("/") && !href.startsWith("//");
  let url: URL;

  try {
    url = new URL(href, SITE_ORIGIN);
  } catch {
    return href;
  }

  if (!isRootRelative && url.origin !== SITE_ORIGIN) return href;

  const pathSegments = url.pathname.split("/").filter(Boolean);
  if (toLocale(pathSegments[0]) !== undefined) return href;
  if (pathSegments[0] !== "resources" || pathSegments.length < 2) return href;

  return localizeHref(href, { locale });
}

function localizeResourceLinks({
  node,
  locale,
}: {
  node: unknown;
  locale: Locale;
}): void {
  if (!isRecord(node)) return;

  if (node.type === "element" && node.tagName === "a") {
    const properties = node.properties;
    if (isRecord(properties) && typeof properties.href === "string") {
      properties.href = localizeResourceHref({
        href: properties.href,
        locale,
      });
    }
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      localizeResourceLinks({ node: child, locale });
    }
  }
}

function rehypeLocalizeResourceLinks({ locale }: { locale: Locale }) {
  return (tree: unknown): void => {
    localizeResourceLinks({ node: tree, locale });
  };
}

export type ResourceType = "vision" | "case-study" | "guide" | "tech";

export interface ResourcePost {
  slug: string;
  type: ResourceType;
  title: string;
  description: string;
  author: string;
  date: Date;
  thumbnail: string;
  image: string;
  content: string;
}

export interface ResourcePostMeta {
  slug: string;
  type: ResourceType;
  title: string;
  description: string;
  author: string;
  date: Date;
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

function getFallbackType(slug: string): ResourceType {
  if (slug === "facilitation-guide") return "guide";

  if (
    slug === "bloquonstout" ||
    slug === "prototyping-the-future-with-agora" ||
    slug === "tech4nature" ||
    slug === "unesco-mil-alliance"
  ) {
    return "case-study";
  }

  if (
    slug === "broadcasting-to-broadlistening" ||
    slug === "devconnect-finding-common-ground-at-scale" ||
    slug === "ethprague-future-building-starts-with-coordination"
  ) {
    return "vision";
  }

  return "tech";
}

function getResourceType(value: unknown, slug: string): ResourceType {
  const normalized = getString(value)
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

  if (
    normalized === "vision" ||
    normalized === "case-study" ||
    normalized === "guide" ||
    normalized === "tech"
  ) {
    return normalized;
  }

  return getFallbackType(slug);
}

export function getResourcePosts({
  locale,
}: {
  locale: string;
}): ResourcePostMeta[] {
  const posts: ResourcePostMeta[] = [];

  for (const [path, raw] of Object.entries(markdownFiles)) {
    if (getLocaleFromPath(path) !== locale) continue;

    const { data } = matter(raw);
    const slug = getSlugFromPath(path);
    posts.push({
      slug,
      type: getResourceType(data.type, slug),
      title: getString(data.title),
      description: getString(data.description),
      author: getString(data.author),
      date: parseResourceDate(data.date),
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
        type: getResourceType(data.type, slug),
        title: getString(data.title),
        description: getString(data.description),
        author: getString(data.author),
        date: parseResourceDate(data.date),
        thumbnail: getString(data.thumbnail),
        image: getString(data.image),
      });
    }
  }

  return posts.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function renderResourceMarkdown({
  markdown,
  locale,
}: {
  markdown: string;
  locale: Locale;
}): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeLocalizeResourceLinks, { locale })
    .use(rehypeStringify)
    .process(markdown);

  return String(result);
}

export async function getResourcePost({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}): Promise<ResourcePost | null> {
  const path = `/src/lib/posts/${locale}/${slug}.md`;
  let raw = markdownFiles[path];

  // Fallback to English if locale-specific version doesn't exist
  if (!raw && locale !== "en") {
    const fallbackPath = `/src/lib/posts/en/${slug}.md`;
    raw = markdownFiles[fallbackPath];
  }

  if (!raw) return null;

  const { data, content: markdownContent } = matter(raw);

  return {
    slug,
    type: getResourceType(data.type, slug),
    title: getString(data.title),
    description: getString(data.description),
    author: getString(data.author),
    date: parseResourceDate(data.date),
    thumbnail: getString(data.thumbnail),
    image: getString(data.image),
    content: await renderResourceMarkdown({
      markdown: markdownContent,
      locale,
    }),
  };
}

export function getAllSlugs(): string[] {
  const slugs = new Set<string>();
  for (const path of Object.keys(markdownFiles)) {
    slugs.add(getSlugFromPath(path));
  }
  return [...slugs];
}
