import type { ContentActionContext } from "./types";

type CreateActionContextParams = {
  targetId: string;
  targetAuthor: string;
  currentUser: string | null;
  isSiteModerator: boolean;
  isLoggedIn: boolean;
  isEmbeddedMode: boolean;
} & (
  | { targetType: "post" }
  | {
      targetType: "comment";
      isConversationOwner: boolean;
      isOrgMember: boolean;
    }
);

export function createActionContext(
  params: CreateActionContextParams
): ContentActionContext {
  const common = {
    isOwner: params.currentUser === params.targetAuthor,
    isSiteModerator: params.isSiteModerator,
    isLoggedIn: params.isLoggedIn,
    isEmbeddedMode: params.isEmbeddedMode,
    targetId: params.targetId,
    targetAuthor: params.targetAuthor,
  };

  if (params.targetType === "comment") {
    return {
      ...common,
      targetType: "comment",
      isConversationOwner: params.isConversationOwner,
      isOrgMember: params.isOrgMember,
    };
  }

  return { ...common, targetType: "post" };
}
