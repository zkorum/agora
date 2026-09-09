import { ZodSupportedDisplayLanguageCodes } from "src/shared/languages";
import type { Dto } from "src/shared/types/dto";
import { afterEach, describe, expect, it } from "vitest";
import { type App, createApp, defineComponent, h } from "vue";
import { createI18n } from "vue-i18n";

import ConversationEmailViewer from "./ConversationEmailViewer.vue";
import ConversationUpdateEmailPreview from "./ConversationUpdateEmailPreview.vue";
import { conversationUpdateReviewTranslations } from "./ConversationUpdateReview.i18n";

let app: App | undefined;
afterEach(() => {
  app?.unmount();
  document.body.replaceChildren();
});
describe("server email viewer", () => {
  it("uses the backend review language for metadata and plaintext direction under an English UI", () => {
    const review = {
      updateId: "00000000-0000-4000-8000-000000000001",
      preview: {
        subject: "Server subject",
        html: '<html lang="ar" dir="rtl"><body>Server preview</body></html>',
        text: "Server plaintext",
      },
      language: "ar",
      senderName: "Server sender",
      replyToName: "Server reply",
      replyToEmail: "reply@example.com",
      branding: { name: "Server brand", palette: "blue" },
      unsubscribeScope: "project",
      estimatedEligibleRecipientCount: 42,
      requiredOwnerCopyCount: 2,
      testDestinationEmail: "test@example.com",
      expiresAt: new Date("2099-01-01"),
    } satisfies Extract<
      ReturnType<typeof Dto.conversationEmailUpdatePrepareDraftResponse.parse>,
      { success: true }
    >["review"];
    const container = document.createElement("div");
    document.body.append(container);
    app = createApp(ConversationUpdateEmailPreview, { review });
    app.use(createI18n({ legacy: false, locale: "en", messages: {} }));
    for (const name of ["QCard", "QCardSection", "QChip", "QSeparator"]) {
      app.component(
        name,
        defineComponent(
          (_props, { slots }) =>
            () =>
              h("div", slots.default?.())
        )
      );
    }
    app.mount(container);
    expect(container.querySelector("iframe")?.srcdoc).toBe(review.preview.html);
    expect(container.querySelector("pre")?.lang).toBe("ar");
    expect(container.querySelector("pre")?.dir).toBe("rtl");
    expect(container.querySelector("pre")?.textContent).toBe(
      review.preview.text
    );
    expect(
      container.querySelector(".email-preview__metadata")?.textContent
    ).toContain(`${conversationUpdateReviewTranslations.en.language} ar`);
  });
  it("displays backend HTML unchanged in an unprivileged iframe", () => {
    const email = {
      subject: "Server subject",
      html: '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src none"></head><body>Server preview</body></html>',
      text: "Server plaintext",
    };
    const container = document.createElement("div");
    document.body.append(container);
    app = createApp(ConversationEmailViewer, {
      email,
      language: "ar",
      title: email.subject,
    });
    app.mount(container);
    const frame = container.querySelector("iframe");
    expect(frame?.getAttribute("sandbox")).toBe("");
    expect(frame?.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(frame?.srcdoc).toBe(email.html);
    expect(container.querySelector("pre")?.textContent).toBe(email.text);
    expect(container.querySelector("pre")?.dir).toBe("rtl");
  });
  it("translates review and test invalidation warnings in every supported locale", () => {
    expect(Object.keys(conversationUpdateReviewTranslations).sort()).toEqual(
      [...ZodSupportedDisplayLanguageCodes.options].sort()
    );
    for (const language of ZodSupportedDisplayLanguageCodes.options) {
      const messages = conversationUpdateReviewTranslations[language];
      expect(Object.keys(messages).sort()).toEqual(
        Object.keys(conversationUpdateReviewTranslations.en).sort()
      );
      for (const text of Object.values(messages))
        expect(text.trim()).not.toBe("");
      if (language !== "en") {
        const translatedKeys = [
          "leaveTestWarning",
          "testUnknown",
          "sendUnknown",
          "retryTestRequest",
          "retrySendRequest",
          "checkDelivery",
          "reconcileError",
          "deliveryAccepted",
          "deliveryNotFound",
          "requestIdConflict",
          "testStatusUnavailable",
          "leaveSendUnknown",
        ] satisfies (keyof typeof messages)[];
        for (const key of translatedKeys)
          expect(messages[key]).not.toBe(
            conversationUpdateReviewTranslations.en[key]
          );
      }
      expect(messages.retryTestRequest).not.toBe(messages.retrySendRequest);
      expect(messages.rateLimited).toContain("{date}");
    }
  });
});
