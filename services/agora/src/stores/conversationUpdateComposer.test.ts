import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reactive } from "vue";

import { useConversationUpdateComposerStore } from "./conversationUpdateComposer";

const auth = reactive<{ userId: string | undefined }>({ userId: "author" });
vi.mock("./authentication", () => ({ useAuthenticationStore: () => auth }));
beforeEach(() => {
  setActivePinia(createPinia());
  auth.userId = "author";
});
describe("in-memory email composer", () => {
  it("restores only composer fields across workspace mounts and keeps contexts separate", () => {
    const draft = {
      selectedScopeId: "project-one",
      selectedConversationIds: ["conv000001"],
      subject: "Subject",
      bodyHtml: "<p>Message</p>",
      bodyPlainText: "Message",
    };
    const first = useConversationUpdateComposerStore().forCurrentAccount();
    first.save({ context: { kind: "global" }, draft });
    const reopened = useConversationUpdateComposerStore().forCurrentAccount();
    expect(reopened.get({ kind: "global" })).toEqual(draft);
    expect(
      reopened.get({ kind: "project", projectSlug: "another-project" })
    ).toBeUndefined();
    expect(reopened.get({ kind: "global" })).not.toHaveProperty("updateId");
    expect(reopened.get({ kind: "global" })).not.toHaveProperty(
      "testAttemptId"
    );
  });
  it("clears drafts on account change and rejects a stale workspace save", () => {
    const session = useConversationUpdateComposerStore().forCurrentAccount();
    const draft = {
      selectedScopeId: "",
      selectedConversationIds: [],
      subject: "Private",
      bodyHtml: "<p>Private</p>",
      bodyPlainText: "Private",
    };
    session.save({ context: { kind: "global" }, draft });
    auth.userId = "another-author";
    session.save({ context: { kind: "global" }, draft });
    expect(
      useConversationUpdateComposerStore()
        .forCurrentAccount()
        .get({ kind: "global" })
    ).toBeUndefined();
  });
});
