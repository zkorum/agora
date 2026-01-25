import { error } from "@sveltejs/kit";

import { getLocale } from "$lib/paraglide/runtime";
import { getAllSlugs, getBlogPost } from "$lib/server/blog";

import type { EntryGenerator, PageServerLoad } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => {
  return getAllSlugs().map((slug) => ({ slug }));
};

export const load: PageServerLoad = async ({ params }) => {
  const locale = getLocale();
  const post = await getBlogPost({ slug: params.slug, locale });

  if (!post) {
    error(404, "Post not found");
  }

  return { post };
};
