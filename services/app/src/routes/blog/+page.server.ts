import { getLocale } from "$lib/paraglide/runtime";
import { getBlogPosts } from "$server/landing/blog";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = () => {
  const locale = getLocale();
  const posts = getBlogPosts({ locale });
  return { posts };
};
