import { redirect } from "@sveltejs/kit";

import { localizeHref } from "#lib/paraglide/runtime.js";

import type { PageLoad } from "./$types.js";

export const load: PageLoad = () => {
  redirect(307, localizeHref("/projects"));
};
