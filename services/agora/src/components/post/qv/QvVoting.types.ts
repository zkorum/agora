import type { PrioritizationItem } from "src/shared/types/dto";
import type { ExtendedConversationDisplayData } from "src/shared/types/zod";

export type QvConversationMetadata = Extract<
  ExtendedConversationDisplayData["metadata"],
  { prioritizationType: "qv" }
>;

export type QvItem = Pick<PrioritizationItem, "slugId" | "displayContent">;

export interface QvResponseActions {
  dirty: boolean;
  canSave: boolean;
  canWithdraw: boolean;
  canDiscard: boolean;
  saving: boolean;
  retrying: boolean;
  hasSaved: boolean;
}
