import type { InfiniteData, QueryClient } from "@tanstack/vue-query";
import type { FetchFeedRequest, FetchFeedResponse } from "src/shared/types/dto";
import type {
  ConversationProjectAssignment,
  ExtendedConversation,
} from "src/shared/types/zod";
import { getConversationProjectContextFromAssignment } from "src/shared/utils/conversationProject";
import {
  isQueryForViewerScope,
  type ViewerQueryScope,
} from "src/utils/query/viewerScope";

type FeedItem = FetchFeedResponse["feedItemList"][number];
type FeedData = InfiniteData<FetchFeedResponse, FetchFeedRequest>;
type ProjectMetadata = Pick<ExtendedConversation, "metadata" | "interaction">;

function updateProjectAssignment({
  item,
  conversationSlugId,
  assignment,
  freshConversation,
  sameViewer,
}: {
  item: FeedItem;
  conversationSlugId: string;
  assignment: ConversationProjectAssignment;
  freshConversation: ProjectMetadata | undefined;
  sameViewer: boolean;
}): FeedItem {
  if (item.conversationData.metadata.conversationSlugId !== conversationSlugId)
    return item;
  const conversation = item.conversationData;
  const transferred =
    conversation.metadata.currentProjectSlug !== assignment.projectSlug;
  const capabilities =
    sameViewer && freshConversation !== undefined
      ? freshConversation.interaction.conversationCapabilities
      : transferred
        ? { canEdit: false, canDelete: false }
        : conversation.interaction.conversationCapabilities;
  return {
    ...item,
    conversationData: {
      ...conversation,
      interaction: {
        ...conversation.interaction,
        conversationCapabilities: capabilities,
      },
      metadata: {
        ...conversation.metadata,
        ...(freshConversation === undefined
          ? {}
          : {
              authorUsername: freshConversation.metadata.authorUsername,
              organization: freshConversation.metadata.organization,
            }),
        currentProjectSlug: assignment.projectSlug,
        projectContext: getConversationProjectContextFromAssignment({
          assignment,
          conversationSlugId,
          currentContext: conversation.metadata.projectContext,
        }),
      },
    },
  };
}

export function applyFeedProjectAssignment({
  queryClient,
  conversationSlugId,
  assignment,
  freshConversation,
  viewerScope,
}: {
  queryClient: QueryClient;
  conversationSlugId: string;
  assignment: ConversationProjectAssignment;
  freshConversation: ProjectMetadata | undefined;
  viewerScope: ViewerQueryScope | undefined;
}): void {
  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: ["feed"] })) {
    const data = queryClient.getQueryData<FeedData>(query.queryKey);
    if (data === undefined) continue;
    const sameViewer =
      viewerScope !== undefined &&
      isQueryForViewerScope({ queryKey: query.queryKey, viewerScope });
    let changed = false;
    const pages = data.pages.map((page) => {
      if (
        !page.feedItemList.some(
          (item) =>
            item.conversationData.metadata.conversationSlugId ===
            conversationSlugId
        )
      )
        return page;
      changed = true;
      return {
        ...page,
        feedItemList: page.feedItemList.map((item) =>
          updateProjectAssignment({
            item,
            conversationSlugId,
            assignment,
            freshConversation,
            sameViewer,
          })
        ),
      };
    });
    if (!changed) continue;
    queryClient.setQueryData<FeedData>(
      query.queryKey,
      { ...data, pages },
      { updatedAt: query.state.dataUpdatedAt }
    );
    // Projection is immediate UI feedback, not a fresh server-authorized feed read.
    void queryClient.invalidateQueries({
      queryKey: query.queryKey,
      exact: true,
      refetchType: "none",
    });
  }
}
