import { type InfiniteData, QueryClient } from "@tanstack/vue-query";
import type { FetchFeedRequest, FetchFeedResponse } from "src/shared/types/dto";
import type { ConversationProjectAssignment } from "src/shared/types/zod";
import { zodConversationProjectContext } from "src/shared/types/zod";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

const stores = vi.hoisted(() => ({ feed: vi.fn(), profile: vi.fn() }));
vi.mock("./feedQueryCache", () => ({
  applyFeedProjectAssignment: stores.feed,
}));
vi.mock("src/stores/user", () => ({
  useUserStore: () => ({ applyProjectAssignment: stores.profile }),
}));
vi.mock("./post", () => ({ useBackendPostApi: vi.fn() }));

import { applyConversationProjectAssignment } from "./conversationProjectCache";
import type * as FeedQueryCache from "./feedQueryCache";
import type { ConversationDetailData } from "./useConversationQuery";

function freshConversation(currentProjectSlug: string): ConversationDetailData {
  return {
    metadata: {
      conversationSlugId: "conv1234",
      currentProjectSlug,
      createdAt: new Date(),
      lastReactedAt: new Date(),
      opinionCount: 0,
      voteCount: 0,
      participantCount: 0,
      totalOpinionCount: 0,
      totalVoteCount: 0,
      totalParticipantCount: 0,
      moderatedOpinionCount: 0,
      hiddenOpinionCount: 0,
      authorUsername: "New owner",
      organization: { name: "New owner", slug: "new-owner", description: "" },
      participationMode: "account_required",
      conversationType: "polis",
      votingPresentation: "list",
      isIndexed: true,
      aiLabelingEnabled: false,
      preferredOpinionGroupCount: null,
      isClosed: false,
      isEdited: false,
      moderation: { status: "unmoderated" },
      externalSourceConfig: null,
      contentLanguageMetadata: {
        detectedDisplayLanguageCode: null,
        detectedSourceLanguageCode: null,
        detectedRawLanguageCode: null,
        detectionConfidence: null,
        autoDetectionStatus: "not_attempted",
      },
      languageSetting: {
        mode: "auto",
        languageCode: null,
        detectedLanguageCode: null,
        detectedSourceLanguageCode: null,
        detectedRawLanguageCode: null,
        detectionConfidence: null,
        autoDetectionStatus: "not_attempted",
      },
      multilingualSetting: {
        additionalLanguageCodes: [],
        dynamicTranslationEnabled: false,
      },
      projectContext: {
        projectSlug: currentProjectSlug,
        originalProjectTitle: "Destination",
        conversationSlugId: "conv1234",
      },
    },
    interaction: {
      hasVoted: false,
      votedIndex: 0,
      conversationCapabilities: {
        canEdit: true,
        canDelete: false,
      },
    },
  };
}

const cachedMetadata = z.object({
  projectContext: zodConversationProjectContext.optional(),
});
const cachedLegacy = z.object({ metadata: cachedMetadata });
const cachedDetail = z.object({
  conversationData: z.object({ metadata: cachedMetadata }),
});

describe("conversation project cache updates", () => {
  it("preserves feed snapshots, viewer interactions, and unrelated caches during assignment projection", async () => {
    const { applyFeedProjectAssignment } =
      await vi.importActual<typeof FeedQueryCache>("./feedQueryCache");
    const queryClient = new QueryClient();
    const ownerKey = [
      "feed",
      "new",
      "fr",
      ["fr"],
      { kind: "viewer", userId: "owner" },
    ];
    const otherViewerKey = [
      "feed",
      "new",
      "fr",
      ["fr"],
      { kind: "viewer", userId: "previous-owner" },
    ];
    const unrelatedKey = [
      "feed",
      "following",
      "en",
      ["en"],
      { kind: "viewer", userId: "owner" },
    ];
    const cached = freshConversation("source");
    const data: InfiniteData<FetchFeedResponse, FetchFeedRequest> = {
      pages: [
        {
          sortAlgorithm: "new",
          nextCursor: null,
          feedItemList: [
            {
              conversationData: {
                ...cached,
                metadata: {
                  ...cached.metadata,
                  conversationViewSnapshotId: 11,
                  voteCount: 3,
                },
                payload: { title: "Cached title" },
              },
            },
          ],
        },
      ],
      pageParams: [{ sortAlgorithm: "new", cursor: null }],
    };
    const unrelated: InfiniteData<FetchFeedResponse, FetchFeedRequest> = {
      pages: [
        { sortAlgorithm: "following", nextCursor: null, feedItemList: [] },
      ],
      pageParams: [{ sortAlgorithm: "following", cursor: null }],
    };
    queryClient.setQueryData(ownerKey, data, { updatedAt: 123 });
    queryClient.setQueryData(otherViewerKey, data, { updatedAt: 123 });
    queryClient.setQueryData(unrelatedKey, unrelated, { updatedAt: 456 });
    const fresh = freshConversation("destination");
    applyFeedProjectAssignment({
      queryClient,
      conversationSlugId: "conv1234",
      assignment: {
        previousProjectSlug: "source",
        projectSlug: "destination",
        projectTitle: "Destination",
        target: { kind: "project", projectSlug: "destination" },
      },
      freshConversation: {
        metadata: {
          ...fresh.metadata,
          conversationViewSnapshotId: 22,
          voteCount: 9,
        },
        interaction: { ...fresh.interaction, hasVoted: true },
      },
      viewerScope: { kind: "viewer", userId: "owner" },
    });
    const owner =
      queryClient.getQueryData<
        InfiniteData<FetchFeedResponse, FetchFeedRequest>
      >(ownerKey)?.pages[0]?.feedItemList[0]?.conversationData;
    const otherViewer =
      queryClient.getQueryData<
        InfiniteData<FetchFeedResponse, FetchFeedRequest>
      >(otherViewerKey)?.pages[0]?.feedItemList[0]?.conversationData;
    expect(owner?.metadata).toMatchObject({
      conversationViewSnapshotId: 11,
      voteCount: 3,
      currentProjectSlug: "destination",
    });
    expect(owner?.interaction.hasVoted).toBe(false);
    expect(owner?.interaction.conversationCapabilities.canEdit).toBe(true);
    expect(otherViewer?.interaction.conversationCapabilities.canEdit).toBe(
      false
    );
    expect(queryClient.getQueryState(ownerKey)).toMatchObject({
      dataUpdatedAt: 123,
      isInvalidated: true,
    });
    expect(queryClient.getQueryState(otherViewerKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryData(unrelatedKey)).toBe(unrelated);
    expect(queryClient.getQueryState(unrelatedKey)).toMatchObject({
      dataUpdatedAt: 456,
      isInvalidated: false,
    });
    queryClient.clear();
  });
  it("updates paged feeds without copying viewer capabilities into public caches", async () => {
    const { applyFeedProjectAssignment } =
      await vi.importActual<typeof FeedQueryCache>("./feedQueryCache");
    const queryClient = new QueryClient();
    const ownerKey = [
      "feed",
      "new",
      "en",
      ["en"],
      { kind: "viewer", userId: "owner" },
    ];
    const publicKey = ["feed", "new", "en", ["en"], { kind: "viewer" }];
    const cached = freshConversation("source");
    const data: InfiniteData<FetchFeedResponse, FetchFeedRequest> = {
      pages: [
        {
          sortAlgorithm: "new",
          nextCursor: null,
          feedItemList: [
            {
              conversationData: {
                ...cached,
                payload: { title: "Cached title" },
                interaction: {
                  ...cached.interaction,
                  conversationCapabilities: {
                    canEdit: false,
                    canDelete: false,
                  },
                },
              },
            },
          ],
        },
      ],
      pageParams: [{ sortAlgorithm: "new", cursor: null }],
    };
    queryClient.setQueryData(ownerKey, data);
    queryClient.setQueryData(publicKey, data);
    applyFeedProjectAssignment({
      queryClient,
      conversationSlugId: "conv1234",
      assignment: {
        previousProjectSlug: "source",
        projectSlug: "destination",
        projectTitle: "Destination",
        target: { kind: "project", projectSlug: "destination" },
      },
      freshConversation: freshConversation("destination"),
      viewerScope: { kind: "viewer", userId: "owner" },
    });
    const owner =
      queryClient.getQueryData<
        InfiniteData<FetchFeedResponse, FetchFeedRequest>
      >(ownerKey)?.pages[0]?.feedItemList[0]?.conversationData;
    const anonymous =
      queryClient.getQueryData<
        InfiniteData<FetchFeedResponse, FetchFeedRequest>
      >(publicKey)?.pages[0]?.feedItemList[0]?.conversationData;
    expect(owner?.interaction.conversationCapabilities.canEdit).toBe(true);
    expect(anonymous?.interaction.conversationCapabilities.canEdit).toBe(false);
    expect(anonymous?.metadata.currentProjectSlug).toBe("destination");
    expect(owner?.payload.title).toBe("Cached title");
    queryClient.clear();
  });
  it("refreshes ownership and capabilities only from the confirmed destination", async () => {
    const queryClient = new QueryClient();
    const key = ["conversation", "conv1234"];
    queryClient.setQueryData(key, {
      metadata: { authorUsername: "Old owner" },
    });
    const fresh = freshConversation("destination");
    await applyConversationProjectAssignment({
      queryClient,
      conversationSlugId: "conv1234",
      assignment: {
        previousProjectSlug: "source",
        projectSlug: "destination",
        projectTitle: "Destination",
        target: { kind: "project", projectSlug: "destination" },
      },
      refreshMetadata: () => Promise.resolve(fresh),
    });
    expect(queryClient.getQueryData(key)).toMatchObject({
      metadata: {
        authorUsername: "New owner",
        currentProjectSlug: "destination",
      },
      interaction: { conversationCapabilities: { canDelete: false } },
    });
    expect(stores.profile).toHaveBeenCalledWith(
      expect.objectContaining({ freshConversation: fresh })
    );
    queryClient.clear();
  });
  it("does not copy ownership from an outdated source response", async () => {
    const queryClient = new QueryClient();
    const key = ["conversation", "conv1234"];
    queryClient.setQueryData(key, {
      metadata: { authorUsername: "Cached owner" },
    });
    await applyConversationProjectAssignment({
      queryClient,
      conversationSlugId: "conv1234",
      assignment: {
        previousProjectSlug: "source",
        projectSlug: "destination",
        projectTitle: "Destination",
        target: { kind: "project", projectSlug: "destination" },
      },
      refreshMetadata: () => Promise.resolve(freshConversation("source")),
    });
    expect(queryClient.getQueryData(key)).toMatchObject({
      metadata: {
        authorUsername: "Cached owner",
        currentProjectSlug: "destination",
      },
    });
    queryClient.clear();
  });
  it("preserves a fresh translated project title when projecting the same scope", async () => {
    const queryClient = new QueryClient();
    const key = ["conversation", "conv1234"];
    queryClient.setQueryData(key, {
      metadata: {
        projectContext: {
          projectSlug: "destination",
          originalProjectTitle: "Destination",
          translatedProjectTitle: "Destination traduite",
          conversationSlugId: "conv1234",
        },
      },
    });
    await applyConversationProjectAssignment({
      queryClient,
      conversationSlugId: "conv1234",
      assignment: {
        previousProjectSlug: "source",
        projectSlug: "destination",
        projectTitle: "Destination",
        target: { kind: "project", projectSlug: "destination" },
      },
    });
    expect(
      cachedLegacy.parse(queryClient.getQueryData(key)).metadata.projectContext
        ?.translatedProjectTitle
    ).toBe("Destination traduite");
    queryClient.clear();
  });
  it("keeps the committed scope after an immediate stale replica refresh", async () => {
    const queryClient = new QueryClient();
    const key = ["conversation", "conv1234"];
    const oldMetadata = {
      projectContext: {
        projectSlug: "source",
        originalProjectTitle: "Source",
        conversationSlugId: "conv1234",
      },
    };
    queryClient.setQueryData(key, { metadata: oldMetadata });
    vi.spyOn(queryClient, "invalidateQueries").mockImplementation((filters) => {
      const resolvedFilters =
        typeof filters === "function" ? filters() : filters;
      if (
        resolvedFilters?.queryKey?.[0] === "conversation" &&
        resolvedFilters.refetchType !== "none"
      )
        queryClient.setQueryData(key, { metadata: oldMetadata });
      return Promise.resolve();
    });
    await applyConversationProjectAssignment({
      queryClient,
      conversationSlugId: "conv1234",
      assignment: {
        previousProjectSlug: "source",
        projectSlug: "destination",
        projectTitle: "Destination",
        target: { kind: "project", projectSlug: "destination" },
      },
      refreshConversation: true,
    });
    expect(
      cachedLegacy.parse(queryClient.getQueryData(key)).metadata.projectContext
        ?.projectSlug
    ).toBe("destination");
    queryClient.clear();
  });

  it("does not apply a superseded SSE assignment after its refresh completes", async () => {
    const queryClient = new QueryClient();
    const key = ["conversation", "conv1234"];
    const latestMetadata = {
      projectContext: {
        projectSlug: "latest",
        originalProjectTitle: "Latest",
        conversationSlugId: "conv1234",
      },
    };
    queryClient.setQueryData(key, { metadata: latestMetadata });
    await applyConversationProjectAssignment({
      queryClient,
      conversationSlugId: "conv1234",
      assignment: {
        previousProjectSlug: "source",
        projectSlug: "destination",
        projectTitle: "Destination",
        target: { kind: "project", projectSlug: "destination" },
      },
      isCurrent: () => false,
    });
    expect(
      cachedLegacy.parse(queryClient.getQueryData(key)).metadata.projectContext
        ?.projectSlug
    ).toBe("latest");
    queryClient.clear();
  });
  it("updates all cached representations and invalidates both project scopes", async () => {
    const queryClient = new QueryClient();
    const originalContext = {
      projectSlug: "source",
      originalProjectTitle: "Source",
      conversationSlugId: "conv1234",
    };
    queryClient.setQueryData(["conversation", "conv1234", "legacy"], {
      metadata: { projectContext: originalContext },
    });
    queryClient.setQueryData(["conversation", "conv1234", "detail"], {
      conversationData: { metadata: { projectContext: originalContext } },
      displayContent: {},
    });
    queryClient.setQueryData(["projectPage", "source"], {});
    queryClient.setQueryData(["projectPage", "destination"], {});
    queryClient.setQueryData(["projectPage", "unrelated"], {});
    const assignment = {
      previousProjectSlug: "source",
      projectSlug: "destination",
      projectTitle: "Destination",
      target: { kind: "project", projectSlug: "destination" },
    } satisfies ConversationProjectAssignment;
    await applyConversationProjectAssignment({
      queryClient,
      conversationSlugId: "conv1234",
      assignment,
    });
    expect(
      cachedLegacy.parse(
        queryClient.getQueryData(["conversation", "conv1234", "legacy"])
      ).metadata.projectContext?.projectSlug
    ).toBe("destination");
    expect(
      cachedDetail.parse(
        queryClient.getQueryData(["conversation", "conv1234", "detail"])
      ).conversationData.metadata.projectContext?.originalProjectTitle
    ).toBe("Destination");
    expect(
      queryClient.getQueryState(["projectPage", "source"])?.isInvalidated
    ).toBe(true);
    expect(
      queryClient.getQueryState(["projectPage", "destination"])?.isInvalidated
    ).toBe(true);
    expect(
      queryClient.getQueryState(["projectPage", "unrelated"])?.isInvalidated
    ).toBe(false);
    expect(stores.feed).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationSlugId: "conv1234",
        assignment,
      })
    );
    expect(stores.profile).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationSlugId: "conv1234",
        assignment,
      })
    );
    queryClient.clear();
  });

  it("removes stale listed-project context when moving into No Project", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["conversation", "conv1234"], {
      metadata: {
        projectContext: {
          projectSlug: "source",
          originalProjectTitle: "Source",
          conversationSlugId: "conv1234",
        },
      },
    });
    await applyConversationProjectAssignment({
      queryClient,
      conversationSlugId: "conv1234",
      assignment: {
        previousProjectSlug: "source",
        projectSlug: "org-default",
        projectTitle: "Owner",
        target: { kind: "no_project", organizationSlug: "owner" },
      },
    });
    expect(
      cachedLegacy.parse(queryClient.getQueryData(["conversation", "conv1234"]))
        .metadata.projectContext
    ).toBeUndefined();
    queryClient.clear();
  });
});
