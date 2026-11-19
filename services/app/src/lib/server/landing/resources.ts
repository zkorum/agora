import matter from "gray-matter";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import type { locales } from "$lib/paraglide/runtime";
import { baseLocale, localizeHref, toLocale } from "$lib/paraglide/runtime";
import { SITE_ORIGIN } from "$lib/seo";
import { parseResourceDate } from "$logic/shared/resource-date";

type Locale = (typeof locales)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

const resourceTypes = ["vision", "case-study", "guide", "tech"] as const;
export type ResourceType = (typeof resourceTypes)[number];

interface ResourcePost extends ResourcePostMeta {
  readonly content: string;
}

export interface ResourcePostMeta {
  readonly slug: string;
  readonly type: ResourceType;
  readonly title: string;
  readonly description: string;
  readonly author: string;
  readonly date: Date;
  readonly thumbnail: string;
  readonly image: string | undefined;
}

const markdownFiles = import.meta.glob<string>(
  ["/src/lib/posts/**/*.md", "!/src/lib/posts/README.md"],
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
);

interface ResourceSource {
  readonly meta: ResourcePostMeta;
  readonly markdown: string;
}

function parseResourceMeta({
  data,
  slug,
}: {
  data: unknown;
  slug: string;
}): ResourcePostMeta {
  if (!isRecord(data)) throw new TypeError("Expected a frontmatter object");
  const { title, description, author, date, thumbnail, image } = data;

  const type = resourceTypes.find((candidate) => candidate === data.type);
  if (type === undefined) {
    throw new TypeError("Expected a valid resource type");
  }
  if (
    typeof title !== "string" ||
    typeof description !== "string" ||
    typeof author !== "string" ||
    typeof thumbnail !== "string" ||
    thumbnail.trim() === "" ||
    (image !== undefined && (typeof image !== "string" || image.trim() === ""))
  ) {
    throw new TypeError(
      "Expected text in title, description and author, and non-empty image paths when provided",
    );
  }

  return {
    slug,
    type,
    title,
    description,
    author,
    date: parseResourceDate(date),
    thumbnail,
    image,
  };
}

function loadResourceSources() {
  const byLocale = new Map<Locale, Map<string, ResourceSource>>();
  for (const [path, raw] of Object.entries(markdownFiles)) {
    const [, localeSegment, slug] =
      /^\/src\/lib\/posts\/([^/]+)\/([^/]+)\.md$/.exec(path) ?? [];
    const locale = toLocale(localeSegment);
    if (!locale || !slug) {
      throw new Error(`Invalid resource path: ${path}`);
    }

    try {
      const { data, content: markdown } = matter(raw);
      const source = { meta: parseResourceMeta({ data, slug }), markdown };
      let posts = byLocale.get(locale);
      if (!posts) {
        posts = new Map();
        byLocale.set(locale, posts);
      }
      posts.set(slug, source);
    } catch (cause) {
      throw new Error(`Invalid resource: ${path}`, { cause });
    }
  }
  return byLocale;
}

const resourceSources = loadResourceSources();

export function getResourcePosts({
  locale,
}: {
  locale: Locale;
}): ResourcePostMeta[] {
  const posts = new Map(resourceSources.get(locale));
  for (const [slug, source] of resourceSources.get(baseLocale) ?? []) {
    if (!posts.has(slug)) posts.set(slug, source);
  }
  return Array.from(posts.values(), ({ meta }) => meta).sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
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
  const source =
    resourceSources.get(locale)?.get(slug) ??
    resourceSources.get(baseLocale)?.get(slug);
  if (!source) return null;

  return {
    ...source.meta,
    content: await renderResourceMarkdown({
      markdown: source.markdown,
      locale,
    }),
  };
}

export function getAllSlugs(): string[] {
  const slugs = new Set<string>();
  for (const posts of resourceSources.values()) {
    for (const slug of posts.keys()) slugs.add(slug);
  }
  return [...slugs];
}
