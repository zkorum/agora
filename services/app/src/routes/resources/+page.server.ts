import { getLocale } from "#lib/paraglide/runtime.js";
import { getResourcePosts } from "$server/landing/resources";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = () => {
  const locale = getLocale();
  const posts = getResourcePosts({ locale });
  return { posts };
};
