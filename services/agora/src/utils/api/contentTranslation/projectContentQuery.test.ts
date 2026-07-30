import { describe, expect, it } from "vitest";

import {
  getProjectContentQueryKey,
  getProjectContentStaleTime,
  isProjectTranslatedContentQueryKey,
} from "./projectContentQuery";

const sourceVersion = "00000000-0000-4000-8000-000000000001";

describe("project content query lifecycle", () => {
  it("keeps conversation authorization contexts in separate cache entries", () => {
    const projectQueryKey = getProjectContentQueryKey({
      projectSlug: "project",
      conversationSlugId: undefined,
      sourceVersion,
      mode: "translated",
      targetLanguageCode: "es",
      spokenLanguages: ["en"],
    });
    const conversationQueryKey = getProjectContentQueryKey({
      projectSlug: "project",
      conversationSlugId: "conversation",
      sourceVersion,
      mode: "translated",
      targetLanguageCode: "es",
      spokenLanguages: ["en"],
    });

    expect(projectQueryKey).not.toEqual(conversationQueryKey);
    expect(
      isProjectTranslatedContentQueryKey({
        queryKey: conversationQueryKey,
        projectSlug: "project",
        sourceVersion,
        targetLanguageCode: "es",
      })
    ).toBe(true);
  });

  it("keeps unfinished work stale so remounting checks for completion", () => {
    expect(getProjectContentStaleTime("pending")).toBe(0);
    expect(getProjectContentStaleTime("running")).toBe(0);
    expect(getProjectContentStaleTime("available")).toBe(300_000);
    expect(getProjectContentStaleTime("failed")).toBe(300_000);
  });
});
