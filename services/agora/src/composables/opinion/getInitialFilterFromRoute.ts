import type { CommentFilterOptions } from "src/utils/component/opinion";
import type { RouteLocationNormalizedLoaded } from "vue-router";
import { z } from "zod";

const commentFilterSchema = z.enum([
  "new",
  "moderated",
  "hidden",
  "discover",
  "my_votes",
]);

export function getInitialFilterFromRoute(
  route: RouteLocationNormalizedLoaded
): CommentFilterOptions {
  const result = commentFilterSchema.safeParse(route.query.filter);
  return result.success ? result.data : "discover";
}
