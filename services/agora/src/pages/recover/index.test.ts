import { createPinia, setActivePinia } from "pinia";
import { QBtn, QCheckbox, Quasar } from "quasar";
import { useAuthenticationStore } from "src/stores/authentication";
import { emailVerificationStore } from "src/stores/onboarding/email";
import type { useAuthEmailApi } from "src/utils/api/auth-email";
import type { useAuthPhoneApi } from "src/utils/api/auth-phone";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, nextTick } from "vue";

const mocks = vi.hoisted(() => ({
  sendEmailCode: vi.fn<ReturnType<typeof useAuthEmailApi>["sendEmailCode"]>(),
  sendSmsCode: vi.fn<ReturnType<typeof useAuthPhoneApi>["sendSmsCode"]>(),
  rotateKey: vi.fn().mockResolvedValue("token"),
  hasGuestKey: vi.fn().mockResolvedValue(false),
}));
vi.mock("src/utils/api/auth-email", () => ({
  useAuthEmailApi: () => ({ sendEmailCode: mocks.sendEmailCode }),
}));
vi.mock("src/utils/api/auth-phone", () => ({
  useAuthPhoneApi: () => ({ sendSmsCode: mocks.sendSmsCode }),
}));
vi.mock("src/utils/api/accountRecovery", () => ({
  useAccountRecoveryApi: () => ({ recoverGuestAccount: vi.fn() }),
}));
vi.mock("src/utils/auth/guestRecoveryKey", () => ({
  hasGuestRecoveryKey: mocks.hasGuestKey,
}));
vi.mock("src/utils/crypto/ucan/operation", () => ({
  buildUcanForRequest: mocks.rotateKey,
}));
vi.mock("src/utils/processEnv", () => ({ processEnv: {} }));
vi.mock("src/composables/layout/usePageLayout", () => ({
  usePageLayout: vi.fn(),
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("src/composables/verification/useVerificationComplete", () => ({
  useVerificationComplete: () => ({ completeVerification: vi.fn() }),
}));
vi.mock("src/components/verification/EmailInputForm.vue", () => ({
  default: {
    emits: ["submit"],
    template:
      "<button data-submit @click=\"$emit('submit')\">Send email</button>",
  },
}));
vi.mock("src/components/verification/PhoneInputForm.vue", () => ({
  default: {
    emits: ["submit"],
    methods: { takeTurnstileToken: () => undefined },
    template:
      "<button data-submit @click=\"$emit('submit', { internationalPhoneNumber: '+33612345678', countryCallingCode: '33' })\">Send phone</button>",
  },
}));
vi.mock("src/components/verification/EmailOtpForm.vue", () => ({
  default: {
    emits: ["changeIdentifier"],
    template:
      "<button data-change @click=\"$emit('changeIdentifier')\">Change email</button>",
  },
}));
vi.mock("src/components/verification/PhoneOtpForm.vue", () => ({
  default: {
    emits: ["changeIdentifier"],
    template:
      "<button data-change @click=\"$emit('changeIdentifier')\">Change phone</button>",
  },
}));
vi.mock("src/components/verification/RarimoVerificationForm.vue", () => ({
  default: { template: "<div />" },
}));

import RecoveryPage from "./index.vue";

const apps: App[] = [];
beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  mocks.hasGuestKey.mockResolvedValue(false);
  const times = {
    codeExpiry: new Date(Date.now() + 300_000),
    nextCodeSoonestTime: new Date(),
  };
  mocks.sendEmailCode.mockResolvedValue({
    status: "success",
    data: { success: true, ...times },
  });
  mocks.sendSmsCode.mockResolvedValue({
    status: "success",
    data: { success: true, ...times },
  });
});
afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
});

function mountPage() {
  const element = document.createElement("div");
  document.body.append(element);
  const app = createApp(RecoveryPage);
  app.use(Quasar, { components: { QBtn, QCheckbox } });
  apps.push(app);
  app.mount(element);
  return element;
}

function button({ element, text }: { element: HTMLElement; text: string }) {
  const result = [...element.querySelectorAll("button")].find(
    (candidate) => candidate.textContent === text
  );
  if (result === undefined) throw new Error(`Missing button: ${text}`);
  return result;
}

describe("account recovery steps", () => {
  it.each(["email", "phone"])(
    "allows changing the %s identifier and sending another code without rotating keys again",
    async (method) => {
      useAuthenticationStore().isAuthInitialized = true;
      emailVerificationStore().verificationEmail = "recover@example.org";
      const element = mountPage();
      const checkbox = element.querySelector('[role="checkbox"]');
      if (!(checkbox instanceof HTMLElement))
        throw new Error("Missing explicit consent");
      checkbox.click();
      await nextTick();
      button({ element, text: method }).click();
      await vi.waitFor(() =>
        expect(element.querySelector("[data-submit]")).not.toBeNull()
      );
      for (let attempt = 0; attempt < 2; attempt++) {
        const submit = element.querySelector("[data-submit]");
        if (!(submit instanceof HTMLElement))
          throw new Error("Missing identifier step");
        submit.click();
        await vi.waitFor(() =>
          expect(element.querySelector("[data-change]")).not.toBeNull()
        );
        const change = element.querySelector("[data-change]");
        if (!(change instanceof HTMLElement))
          throw new Error("Missing OTP step");
        change.click();
        await nextTick();
      }
      expect(
        method === "email" ? mocks.sendEmailCode : mocks.sendSmsCode
      ).toHaveBeenCalledTimes(2);
      expect(mocks.rotateKey).toHaveBeenCalledOnce();
    }
  );

  it("does not rotate a key before authentication initialization and consent", async () => {
    const element = mountPage();
    expect(button({ element, text: "email" }).disabled).toBe(true);
    useAuthenticationStore().isAuthInitialized = true;
    await nextTick();
    expect(button({ element, text: "email" }).disabled).toBe(true);
    expect(mocks.rotateKey).not.toHaveBeenCalled();
  });

  it("keeps credential recovery usable when guest-key storage fails", async () => {
    mocks.hasGuestKey.mockRejectedValueOnce(new Error("Storage unavailable"));
    const element = mountPage();
    await nextTick();
    expect(element.textContent).toContain("email");
    expect(
      [...element.querySelectorAll("button")].some(
        (candidate) => candidate.textContent === "guest"
      )
    ).toBe(false);
  });
});
