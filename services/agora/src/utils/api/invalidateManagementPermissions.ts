import type { QueryClient } from "@tanstack/vue-query";

// Permissions travel with resource data, not only with the settings navigation.
export async function invalidateManagementPermissions(
  queryClient: QueryClient
): Promise<void> {
  const refreshes = [
    "managementAccess",
    "conversation",
    "feed",
    "projectPage",
    "projectConversationPage",
    "comments",
    "opinionTarget",
    "survey-completion-counts",
    "exportHistory",
    "exportReadiness",
  ].map(
    async (family) =>
      await queryClient.invalidateQueries({ queryKey: [family] })
  );
  // These can contain restricted answers or owner-only signed download URLs.
  await Promise.all([
    ...refreshes,
    queryClient.resetQueries({ queryKey: ["survey-results-aggregated"] }),
    queryClient.resetQueries({ queryKey: ["exportStatus"] }),
  ]);
}
