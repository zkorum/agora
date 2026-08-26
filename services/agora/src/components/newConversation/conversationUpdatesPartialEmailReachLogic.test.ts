import { describe, expect, it } from "vitest";

import {
  areConversationUpdatesReachStatesEqual,
  getPartialEmailReachParticipationMode,
  getPartialEmailReachWarning,
  getUnacknowledgedPartialEmailReachWarning,
  type PartialEmailReachAction,
  resolvePartialEmailReachAction,
} from "./conversationUpdatesPartialEmailReachLogic";

describe("conversationUpdatesPartialEmailReachLogic", () => {
  it.each([
    ["account_required", "account_required"],
    ["guest", "guest"],
    ["strong_verification", "strong_verification"],
    ["email_verification", undefined],
  ] as const)("classifies %s", (participationMode, expected) => {
    expect(getPartialEmailReachParticipationMode(participationMode)).toBe(
      expected
    );
  });

  it("warns when updates become effective under partial email reach", () => {
    expect(
      getPartialEmailReachWarning({
        previous: {
          participationMode: "account_required",
          effectiveEmailUpdatesEnabled: false,
        },
        next: {
          participationMode: "account_required",
          effectiveEmailUpdatesEnabled: true,
        },
      })
    ).toBe("account_required");
  });

  it("warns when enabled updates move to another partial-reach mode", () => {
    expect(
      getPartialEmailReachWarning({
        previous: {
          participationMode: "account_required",
          effectiveEmailUpdatesEnabled: true,
        },
        next: {
          participationMode: "guest",
          effectiveEmailUpdatesEnabled: true,
        },
      })
    ).toBe("guest");
  });

  it("does not warn for unchanged, disabled, or email-required states", () => {
    expect(
      getPartialEmailReachWarning({
        previous: {
          participationMode: "guest",
          effectiveEmailUpdatesEnabled: true,
        },
        next: {
          participationMode: "guest",
          effectiveEmailUpdatesEnabled: true,
        },
      })
    ).toBeUndefined();
    expect(
      getPartialEmailReachWarning({
        previous: {
          participationMode: "email_verification",
          effectiveEmailUpdatesEnabled: false,
        },
        next: {
          participationMode: "guest",
          effectiveEmailUpdatesEnabled: false,
        },
      })
    ).toBeUndefined();
    expect(
      getPartialEmailReachWarning({
        previous: {
          participationMode: "guest",
          effectiveEmailUpdatesEnabled: true,
        },
        next: {
          participationMode: "email_verification",
          effectiveEmailUpdatesEnabled: true,
        },
      })
    ).toBeUndefined();
  });

  it("warns at submission until the risky state is acknowledged", () => {
    const state = {
      participationMode: "guest" as const,
      effectiveEmailUpdatesEnabled: true,
    };

    expect(
      getUnacknowledgedPartialEmailReachWarning({
        state,
        acknowledgedState: undefined,
      })
    ).toBe("guest");
    expect(
      getUnacknowledgedPartialEmailReachWarning({
        state,
        acknowledgedState: state,
      })
    ).toBeUndefined();
    expect(
      areConversationUpdatesReachStatesEqual({
        left: state,
        right: { ...state, participationMode: "account_required" },
      })
    ).toBe(false);
  });

  it.each([
    [
      "turn_updates_off",
      {
        participationMode: "guest",
        conversationEmailUpdateEnabledOverride: false,
      },
    ],
    [
      "enforce_email_verification",
      {
        participationMode: "email_verification",
        conversationEmailUpdateEnabledOverride: undefined,
      },
    ],
    [
      "keep_updates_on",
      {
        participationMode: "guest",
        conversationEmailUpdateEnabledOverride: undefined,
      },
    ],
  ] satisfies ReadonlyArray<
    [
      PartialEmailReachAction,
      {
        participationMode: "guest" | "email_verification";
        conversationEmailUpdateEnabledOverride: boolean | undefined;
      },
    ]
  >)("resolves %s", (action, expected) => {
    expect(
      resolvePartialEmailReachAction({
        action,
        participationMode: "guest",
        conversationEmailUpdateEnabledOverride: undefined,
      })
    ).toEqual(expected);
  });
});
