import type { ConversationTypeConfig } from "src/shared/types/zod";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";

export type OpinionView =
  | { kind: "one_at_a_time"; order: "discover" | "new" }
  | { kind: "list"; filter: CommentFilterOptions };

export function resolveOpinionView({
  metadata,
  routeContext,
  filter,
}: {
  metadata: ConversationTypeConfig;
  routeContext: ConversationRouteContext;
  filter: CommentFilterOptions;
}): OpinionView {
  if (metadata.conversationType !== "polis") {
    return { kind: "list", filter };
  }
  if (routeContext.kind === "embed") {
    return { kind: "one_at_a_time", order: "discover" };
  }
  if (
    metadata.votingPresentation === "one_at_a_time" &&
    (filter === "discover" || filter === "new")
  ) {
    return { kind: "one_at_a_time", order: filter };
  }
  return { kind: "list", filter };
}
