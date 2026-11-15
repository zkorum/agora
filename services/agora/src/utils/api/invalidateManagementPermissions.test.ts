import { QueryClient } from "@tanstack/vue-query";
import { describe, expect, it } from "vitest";

import { invalidateManagementPermissions } from "./invalidateManagementPermissions";

describe("management permission refresh", () => {
  it("refreshes resource permissions without blanking readable content, and discards restricted caches", async () => {
    const queryClient = new QueryClient();
    const resource = {
      title: "Readable conversation",
      permissions: { canEdit: true },
    };
    queryClient.setQueryData(["conversation", "conversation"], resource);
    queryClient.setQueryData(["feed", "new"], [resource]);
    queryClient.setQueryData(["managementAccess"], { canManageProjects: true });
    queryClient.setQueryData(["survey-results-aggregated", "conversation"], {
      restrictedAnswers: ["Restricted"],
    });
    queryClient.setQueryData(["exportStatus", "export"], {
      downloadUrl: "https://example.com/restricted",
    });
    queryClient.setQueryData(["languages"], ["en"]);
    await invalidateManagementPermissions(queryClient);
    expect(queryClient.getQueryData(["conversation", "conversation"])).toEqual(
      resource
    );
    expect(
      queryClient.getQueryState(["conversation", "conversation"])?.isInvalidated
    ).toBe(true);
    expect(queryClient.getQueryState(["feed", "new"])?.isInvalidated).toBe(
      true
    );
    expect(queryClient.getQueryState(["managementAccess"])?.isInvalidated).toBe(
      true
    );
    expect(
      queryClient.getQueryData(["survey-results-aggregated", "conversation"])
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(["exportStatus", "export"])
    ).toBeUndefined();
    expect(queryClient.getQueryState(["languages"])?.isInvalidated).toBe(false);
    queryClient.clear();
  });
});
