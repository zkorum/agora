import type { OpinionFilterSelection } from "src/composables/opinion/opinionLinkRoute";
import type { OpinionTarget } from "src/shared/types/dto";
import type { ConversationTypeConfig } from "src/shared/types/zod";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import type { ConversationRouteContext } from "src/utils/router/conversationRouteContext";

export type OpinionView =
  | { kind: "one_at_a_time"; order: "discover" | "new" }
  | { kind: "list" };

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
    return { kind: "list" };
  }
  if (routeContext.kind === "embed") {
    return { kind: "one_at_a_time", order: "discover" };
  }
  // Statement links must not turn backend-configured single-statement voting into a list.
  if (
    metadata.votingPresentation === "one_at_a_time" &&
    (filter === "discover" || filter === "new")
  ) {
    return { kind: "one_at_a_time", order: filter };
  }
  return { kind: "list" };
}

export function resolveLinkedOpinionFilter({
  metadata,
  target,
  filterSelection,
}: {
  metadata: ConversationTypeConfig;
  target: OpinionTarget;
  filterSelection: OpinionFilterSelection;
}): CommentFilterOptions {
  if (target.opinion.moderation.status === "moderated") {
    return target.opinion.moderation.action === "hide" ? "hidden" : "moderated";
  }
  if (filterSelection.kind === "explicit") return filterSelection.filter;
  return metadata.conversationType === "polis" &&
    metadata.votingPresentation === "one_at_a_time" &&
    target.isOwn
    ? "my_statements"
    : "discover";
}
