import type { ParticipationMode } from "src/shared/types/zod";

export type PartialEmailReachParticipationMode = Extract<
  ParticipationMode,
  "account_required" | "guest" | "strong_verification"
>;

export type PartialEmailReachAction =
  | "turn_updates_off"
  | "enforce_email_verification"
  | "keep_updates_on";

export interface ConversationUpdatesReachState {
  participationMode: ParticipationMode;
  effectiveEmailUpdatesEnabled: boolean;
}

export function areConversationUpdatesReachStatesEqual({
  left,
  right,
}: {
  left: ConversationUpdatesReachState;
  right: ConversationUpdatesReachState;
}): boolean {
  return (
    left.participationMode === right.participationMode &&
    left.effectiveEmailUpdatesEnabled === right.effectiveEmailUpdatesEnabled
  );
}

export function getPartialEmailReachParticipationMode(
  participationMode: ParticipationMode
): PartialEmailReachParticipationMode | undefined {
  switch (participationMode) {
    case "account_required":
    case "guest":
    case "strong_verification":
      return participationMode;
    case "email_verification":
      return undefined;
  }
}

export function getPartialEmailReachWarning({
  previous,
  next,
}: {
  previous: ConversationUpdatesReachState;
  next: ConversationUpdatesReachState;
}): PartialEmailReachParticipationMode | undefined {
  const warningMode = getPartialEmailReachParticipationMode(
    next.participationMode
  );
  if (
    warningMode === undefined ||
    !next.effectiveEmailUpdatesEnabled ||
    (previous.effectiveEmailUpdatesEnabled &&
      previous.participationMode === next.participationMode)
  ) {
    return undefined;
  }
  return warningMode;
}

export function getUnacknowledgedPartialEmailReachWarning({
  state,
  acknowledgedState,
}: {
  state: ConversationUpdatesReachState;
  acknowledgedState: ConversationUpdatesReachState | undefined;
}): PartialEmailReachParticipationMode | undefined {
  const warningMode = getPartialEmailReachParticipationMode(
    state.participationMode
  );
  if (
    warningMode === undefined ||
    !state.effectiveEmailUpdatesEnabled ||
    (acknowledgedState !== undefined &&
      areConversationUpdatesReachStatesEqual({
        left: state,
        right: acknowledgedState,
      }))
  ) {
    return undefined;
  }
  return warningMode;
}

export function resolvePartialEmailReachAction({
  action,
  participationMode,
  conversationEmailUpdateEnabledOverride,
}: {
  action: PartialEmailReachAction;
  participationMode: ParticipationMode;
  conversationEmailUpdateEnabledOverride: boolean | undefined;
}): {
  participationMode: ParticipationMode;
  conversationEmailUpdateEnabledOverride: boolean | undefined;
} {
  switch (action) {
    case "turn_updates_off":
      return {
        participationMode,
        conversationEmailUpdateEnabledOverride: false,
      };
    case "enforce_email_verification":
      return {
        participationMode: "email_verification",
        conversationEmailUpdateEnabledOverride,
      };
    case "keep_updates_on":
      return {
        participationMode,
        conversationEmailUpdateEnabledOverride,
      };
  }
}
