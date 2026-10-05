import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { computed } from "vue";
import { z } from "zod";

export const viewerQueryScopeSchema = z.object({
  kind: z.literal("viewer"),
  userId: z.string().optional(),
});

export type ViewerQueryScope = z.infer<typeof viewerQueryScopeSchema>;

export function isQueryForViewerScope({
  queryKey,
  viewerScope,
}: {
  queryKey: readonly unknown[];
  viewerScope: ViewerQueryScope;
}): boolean {
  const scope = viewerQueryScopeSchema.safeParse(queryKey.at(-1));
  return scope.success && scope.data.userId === viewerScope.userId;
}

export function useViewerQueryScope() {
  const { isGuestOrLoggedIn, userId } = storeToRefs(useAuthenticationStore());
  return computed<ViewerQueryScope>(() => ({
    kind: "viewer",
    userId: isGuestOrLoggedIn.value ? userId.value : undefined,
  }));
}
