import { error } from "@sveltejs/kit";

import * as m from "#lib/paraglide/messages.js";
import { getLocale } from "#lib/paraglide/runtime.js";
import { type SeoData, SITE_ORIGIN } from "#lib/seo.js";
import { getAllSlugs, getResourcePost } from "$server/landing/resources";

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
  const { pathname } = new URL(url);
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg"))
    return "image/jpeg";
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".webp")) return "image/webp";
  return undefined;
}

export const load: PageServerLoad = async ({ params }) => {
  const locale = getLocale();
  const post = await getResourcePost({ slug: params.slug, locale });

  if (!post) {
    error(404, m.resources_post_not_found());
  }

  const ogImage = resolveImageUrl(post.image ?? post.thumbnail);

  const seo: SeoData = {
    title: post.title,
    description: post.description,
    ogType: "article",
    ogImage,
    ogImageType: inferImageType(ogImage),
    articleAuthor: post.author,
  };

  return { post, seo };
};
