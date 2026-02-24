import { error } from "@sveltejs/kit";

import { getLocale } from "$lib/paraglide/runtime";
import { type SeoData, SITE_ORIGIN } from "$lib/seo";
import { getAllSlugs, getBlogPost } from "$server/landing/blog";

import type { EntryGenerator, PageServerLoad } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => {
  return getAllSlugs().map((slug) => ({ slug }));
};

function resolveImageUrl(imagePath: string): string {
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  return `${SITE_ORIGIN}${imagePath}`;
}

function inferImageType(url: string): string | undefined {
  if (url.endsWith(".jpg") || url.endsWith(".jpeg")) return "image/jpeg";
  if (url.endsWith(".png")) return "image/png";
  return undefined;
}

export const load: PageServerLoad = async ({ params }) => {
  const locale = getLocale();
  const post = await getBlogPost({ slug: params.slug, locale });

  if (!post) {
    error(404, "Post not found");
  }

  const ogImagePath = post.image || post.thumbnail;
  const ogImage = ogImagePath ? resolveImageUrl(ogImagePath) : undefined;

  const seo: SeoData = {
    title: post.title,
    description: post.description,
    ogType: "article",
    ogImage,
    ogImageType: ogImage ? inferImageType(ogImage) : undefined,
    articleAuthor: post.author,
  };

  return { post, seo };
};
