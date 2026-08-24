import type { ConversationEmailUpdateActionManageOptOutRequest } from "src/shared/types/dto";

export interface ManageOptOutItem {
  key: string;
  title: string;
  target: ConversationEmailUpdateActionManageOptOutRequest["target"];
  type: "project" | "conversation";
}

export function isManageOptOutDisabled({
  itemKey,
  pendingKey,
  successfulKeys,
}: {
  itemKey: string;
  pendingKey: string | undefined;
  successfulKeys: ReadonlySet<string>;
}): boolean {
  return pendingKey !== undefined || successfulKeys.has(itemKey);
}
