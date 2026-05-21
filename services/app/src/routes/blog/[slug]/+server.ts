import { redirect } from "@sveltejs/kit";

import { localizeHref } from "$lib/paraglide/runtime";

import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ params, url }) => {
  redirect(308, `${localizeHref(`/resources/${params.slug}`)}${url.search}`);
};
