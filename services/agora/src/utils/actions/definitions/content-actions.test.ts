import type { ContentActionContext } from "src/utils/actions/core/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

vi.mock("pinia", () => ({
  storeToRefs: (store: object) => store,
}));

vi.mock("src/stores/authentication", () => ({
  useAuthenticationStore: () => ({ isLoggedIn: ref(true) }),
}));

vi.mock("src/stores/user", () => ({
  useUserStore: () => ({
    profileData: ref({
      userName: "participant",
      organizationList: [],
      isSiteModerator: false,
    }),
  }),
}));

vi.mock("src/utils/ui/embedMode", () => ({
  useEmbedMode: () => ({ isEmbeddedMode: () => false }),
}));

vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("../core/handlers", () => ({
  useActionHandlers: () => ({}),
}));

vi.mock("../core/permissions", () => ({
  createActionContext: vi.fn(),
  useActionPermissions: () => ({}),
}));

import { useContentActions } from "./content-actions";

const context: ContentActionContext = {
  isOwner: false,
  isSiteModerator: false,
  isConversationOwner: false,
  isOrgMember: false,
  isLoggedIn: true,
  isEmbeddedMode: false,
  targetType: "post",
  targetId: "conversation",
  targetAuthor: "owner",
};

describe("content action execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the drawer open when closeOnSelect is false", async () => {
    const handler = vi.fn();
    const contentActions = useContentActions();
    contentActions.dialogState.value = {
      isVisible: true,
      context,
      actions: [],
    };

    await contentActions.executeAction({
      id: "conversationEmailUpdates",
      label: "Receive email updates for this conversation",
      icon: "mdi-email-outline",
      closeOnSelect: false,
      handler,
      isVisible: () => true,
    });

    expect(handler).toHaveBeenCalledWith(context);
    expect(contentActions.dialogState.value).toEqual({
      isVisible: true,
      context,
      actions: [],
    });
  });

  it("continues closing ordinary actions after execution", async () => {
    const handler = vi.fn();
    const contentActions = useContentActions();
    contentActions.dialogState.value = {
      isVisible: true,
      context,
      actions: [],
    };

    await contentActions.executeAction({
      id: "share",
      label: "Share",
      icon: "mdi-share",
      handler,
      isVisible: () => true,
    });

    expect(handler).toHaveBeenCalledWith(context);
    expect(contentActions.dialogState.value).toEqual({
      isVisible: false,
      context: null,
      actions: [],
    });
  });
});
