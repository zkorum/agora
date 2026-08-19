import type { ParticipationMode } from "src/shared/types/zod";

export function hasConversationUpdatesPartialEmailReach(
  participationMode: ParticipationMode
): boolean {
  return (
    participationMode === "account_required" ||
    participationMode === "guest" ||
    participationMode === "strong_verification"
  );
}
