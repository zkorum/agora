import { defineStore } from "pinia";
import type { ConversationEmailUpdateWorkspaceRequest } from "src/shared/types/dto";
import { shallowRef, watch } from "vue";

import { useAuthenticationStore } from "./authentication";

interface ComposerDraft {
  selectedScopeId: string;
  selectedConversationIds: readonly string[];
  subject: string;
  bodyHtml: string;
  bodyPlainText: string;
}

export const useConversationUpdateComposerStore = defineStore(
  "conversationUpdateComposer",
  () => {
    const auth = useAuthenticationStore();
    // Memory only. Review and test authorizations must never survive navigation.
    const drafts = shallowRef<ReadonlyMap<string, ComposerDraft>>(new Map());
    watch(
      () => auth.userId,
      () => {
        drafts.value = new Map();
      },
      { flush: "sync" }
    );

    function forCurrentAccount() {
      const ownerId = auth.userId;
      function get(
        context: ConversationEmailUpdateWorkspaceRequest["context"]
      ): ComposerDraft | undefined {
        return auth.userId === ownerId
          ? drafts.value.get(JSON.stringify(context))
          : undefined;
      }
      function save({
        context,
        draft,
      }: {
        context: ConversationEmailUpdateWorkspaceRequest["context"];
        draft: ComposerDraft;
      }): void {
        if (auth.userId !== ownerId) return;
        drafts.value = new Map(drafts.value).set(
          JSON.stringify(context),
          draft
        );
      }
      return { get, save };
    }
    return { forCurrentAccount };
  }
);
