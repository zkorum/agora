import { createPinia, setActivePinia } from "pinia";
import type { Dto } from "src/shared/types/dto";
import { useAuthenticationStore } from "src/stores/authentication";
import type { SettingsInterface } from "src/utils/component/settings/settings";
import type { useDialog } from "src/utils/ui/dialog";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, ref } from "vue";
import type { z } from "zod";

import SettingsPage from "./index.vue";

const mocks = vi.hoisted(() => ({
  remove: vi.fn<() => Promise<z.infer<typeof Dto.deleteUserAccountResponse>>>(),
  dialog: vi.fn<ReturnType<typeof useDialog>["showDeleteAccountDialog"]>(),
  notify: vi.fn(),
  updateAuth: vi.fn(),
  navigate: vi.fn(),
  preserveGuest: vi.fn(),
}));
vi.mock("src/utils/api/account", () => ({
  useBackendAccountApi: () => ({ deleteUserAccount: mocks.remove }),
}));
vi.mock("src/utils/api/auth", () => ({
  useBackendAuthApi: () => ({ updateAuthState: mocks.updateAuth }),
}));
vi.mock("src/utils/api/useManagementAccess", () => ({
  useManagementAccess: () => ({ data: ref(undefined) }),
}));
vi.mock("src/utils/ui/dialog", () => ({
  useDialog: () => ({ showDeleteAccountDialog: mocks.dialog }),
}));
vi.mock("src/utils/ui/notify", () => ({
  useNotify: () => ({ showNotifyMessage: mocks.notify }),
}));
vi.mock("src/utils/auth/guestRecoveryKey", () => ({
  preserveGuestRecoveryKey: mocks.preserveGuest,
}));
vi.mock("src/utils/auth/phoneAuthMode", () => ({
  usePhoneAuthAvailability: () => ref({ available: false }),
}));
vi.mock("src/utils/auth/setup", () => ({
  useAuthSetup: () => ({ logoutRequested: vi.fn() }),
}));
vi.mock("src/stores/loginIntention", () => ({
  useLoginIntentionStore: () => ({ setActiveUserIntention: vi.fn() }),
}));
vi.mock("src/stores/onboarding/flow", () => ({
  onboardingFlowStore: () => ({ onboardingMode: "LOGIN" }),
}));
vi.mock("src/composables/layout/usePageLayout", () => ({
  usePageLayout: () => ({ isActive: ref(false) }),
}));
vi.mock("src/composables/useFeaturedBannerVisibility", () => ({
  useFeaturedBannerVisibility: () => ({ hasCompletedRanking: ref(false) }),
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: (texts: { en: Record<string, string> }) => ({
    t: (key: string) => texts.en[key] ?? key,
  }),
}));
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mocks.navigate, replace: vi.fn() }),
}));
vi.mock("src/components/navigation/header/variants", () => ({
  StandardMenuBar: () => null,
}));
vi.mock("src/components/administrator/ManagementNavigation.vue", () => ({
  default: () => null,
}));
vi.mock("src/components/ui-library/ListSection.vue", async () => {
  const { defineComponent, h } = await import("vue");
  return {
    default: defineComponent(
      (props: { settingsItemList: SettingsInterface[] }) => () =>
        h(
          "section",
          props.settingsItemList.map((item) =>
            item.type === "action"
              ? h("button", { onClick: item.action }, item.label)
              : null
          )
        ),
      { props: { settingsItemList: { type: Array, required: true } } }
    ),
  };
});

const cleanups: Array<() => void> = [];
beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function confirmDeletion() {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthenticationStore().setLoginStatus({
    isKnown: true,
    userId: "account",
    isLoggedIn: true,
  });
  const app = createApp(SettingsPage);
  app.use(pinia);
  const container = document.createElement("div");
  document.body.append(container);
  app.mount(container);
  cleanups.push(() => {
    app.unmount();
    container.remove();
  });
  const button = [...container.querySelectorAll("button")].find(
    (button) => button.textContent === "Delete Account"
  );
  if (button === undefined) throw new Error("Missing account deletion action");
  button.click();
  const confirmation = mocks.dialog.mock.calls.at(0)?.[0];
  if (confirmation === undefined)
    throw new Error("Missing deletion confirmation");
  confirmation.callbackSuccess();
}

describe("account deletion feedback", () => {
  it("keeps the account signed in and directs a refused last admin to the administrator", async () => {
    mocks.remove.mockResolvedValue({
      success: false,
      reason: "last_active_organization_admin",
    });
    confirmDeletion();
    await vi.waitFor(() =>
      expect(mocks.notify).toHaveBeenCalledWith(
        "You’re the last organization Admin. Contact the administrator."
      )
    );
    expect(mocks.updateAuth).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.preserveGuest).not.toHaveBeenCalled();
  });
  it("signs out and navigates away only after deletion is accepted", async () => {
    mocks.remove.mockResolvedValue({ success: true });
    confirmDeletion();
    expect(mocks.dialog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "Withdrawing votes does not erase saved voting data."
        ),
      })
    );
    await vi.waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({ name: "/welcome/" })
    );
    expect(mocks.updateAuth).toHaveBeenCalledWith({
      partialLoginStatus: { isKnown: false },
    });
    expect(mocks.notify).toHaveBeenCalledWith("Account deleted");
  });
});
