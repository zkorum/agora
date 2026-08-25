import { isManageOptOutDisabled } from "src/components/conversationUpdates/authFreePreferenceManager";
import type { ConversationEmailUpdateActionResolveResponse } from "src/shared/types/dto";
import { describe, expect, it } from "vitest";

import {
  getManageOptOutItems,
  getPreferencesResolution,
  getReportResolution,
  getUnsubscribeResolution,
  optionalReportDetails,
  reportReasons,
} from "./actionPage";

describe("Email Updates action page helpers", () => {
  it("accepts only unsubscribe actions for the unsubscribe page", () => {
    expect(
      getUnsubscribeResolution({
        success: true,
        action: "unsubscribe_project",
        scope: { kind: "project", projectSlug: "project", title: "Project" },
      })
    ).toBeDefined();
    expect(
      getUnsubscribeResolution({
        success: true,
        action: "manage_preferences",
        scope: {
          kind: "no_project",
          conversations: [
            { conversationSlugId: "conv1", title: "Conversation" },
          ],
        },
      })
    ).toBeUndefined();
    expect(
      getUnsubscribeResolution({ success: false, reason: "unavailable" })
    ).toBeUndefined();
  });

  it("accepts only manage and report actions on their matching pages", () => {
    const reportResolution: ConversationEmailUpdateActionResolveResponse = {
      success: true,
      action: "report",
      subject: "Email subject",
      scope: {
        kind: "no_project",
        conversations: [{ conversationSlugId: "conv1", title: "Conversation" }],
      },
    };

    expect(getReportResolution(reportResolution)).toEqual(reportResolution);
    expect(getPreferencesResolution(reportResolution)).toBeUndefined();
    expect(
      getReportResolution({
        success: true,
        action: "unsubscribe_conversation",
        scope: {
          kind: "no_project",
          conversations: [
            { conversationSlugId: "conv1", title: "Conversation" },
          ],
        },
      })
    ).toBeUndefined();
  });

  it("derives opt-out targets only from the resolved scope", () => {
    const resolution = getPreferencesResolution({
      success: true,
      action: "manage_preferences",
      scope: {
        kind: "project",
        projectSlug: "project",
        title: "Project title",
        conversations: [
          { conversationSlugId: "conv1", title: "First conversation" },
          { conversationSlugId: "conv2", title: "Second conversation" },
        ],
      },
    });
    expect(resolution).toBeDefined();
    if (resolution === undefined) return;

    expect(getManageOptOutItems(resolution)).toEqual([
      {
        key: "project:project",
        title: "Project title",
        target: { kind: "project", projectSlug: "project" },
        type: "project",
      },
      {
        key: "conversation:conv1",
        title: "First conversation",
        target: { kind: "conversation", conversationSlugId: "conv1" },
        type: "conversation",
      },
      {
        key: "conversation:conv2",
        title: "Second conversation",
        target: { kind: "conversation", conversationSlugId: "conv2" },
        type: "conversation",
      },
    ]);
  });

  it("keeps report reasons bounded and omits blank details", () => {
    expect(reportReasons).toEqual([
      "spam",
      "abuse",
      "unrelated_content",
      "other",
    ]);
    expect(optionalReportDetails("   ")).toBeUndefined();
    expect(optionalReportDetails("  Context  ")).toBe("Context");
  });

  it("disables only successful or currently pending scoped opt-outs", () => {
    const successfulKeys = new Set(["project:done"]);
    expect(
      isManageOptOutDisabled({
        itemKey: "project:done",
        pendingKey: undefined,
        successfulKeys,
      })
    ).toBe(true);
    expect(
      isManageOptOutDisabled({
        itemKey: "conversation:other",
        pendingKey: "conversation:pending",
        successfulKeys,
      })
    ).toBe(true);
    expect(
      isManageOptOutDisabled({
        itemKey: "conversation:other",
        pendingKey: undefined,
        successfulKeys,
      })
    ).toBe(false);
  });
});
