import { describe, expect, it, vi } from "vitest";

import { type CommentEditAction, getCommentActions } from "./comments";

function actions(edit: CommentEditAction | undefined) {
  return getCommentActions({
    deleteCommentCallback: vi.fn(),
    reportCommentCallback: vi.fn(),
    openUserReportsCallback: vi.fn(),
    muteUserCallback: vi.fn(),
    moderateCommentCallback: vi.fn(),
    shareOpinionCallback: vi.fn(),
    translations: {
      report: "Report",
      muteUser: "Mute",
      delete: "Delete",
      moderate: "Moderate",
      userReports: "Reports",
      share: "Share",
    },
    management: {
      edit,
      canDelete: true,
      canModerate: false,
      editLabel: "Edit",
    },
  });
}

describe("statement edit actions", () => {
  it("omits editing when no editor is available, even if deletion is allowed", () => {
    expect(actions(undefined).some((action) => action.id === "edit")).toBe(
      false
    );
  });

  it("hides unavailable editing rather than showing a disabled explanation", () => {
    const handler = vi.fn();
    expect(
      actions({
        disabled: true,
        description: "Valid votes remain",
        handler,
      }).find((action) => action.id === "edit")
    ).toBeUndefined();
    expect(handler).not.toHaveBeenCalled();
  });
});
