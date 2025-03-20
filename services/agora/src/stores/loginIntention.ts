import { defineStore } from "pinia";
import {
  emptyConversationDraft,
  NewConversationDraft,
} from "src/utils/component/conversation/newPostDrafts";
import { ref } from "vue";
import { useRouter } from "vue-router";

interface VotingIntention {
  enabled: boolean;
  conversationSlugId: string;
}

interface OpinionAgreementIntention {
  enabled: boolean;
  conversationSlugId: string;
  opinionSlugId: string;
}

interface NewConversationIntention {
  enabled: boolean;
  conversationDraft: NewConversationDraft;
}

interface NewOpinionIntention {
  enabled: boolean;
  conversationSlugId: string;
  opinionBody: string;
}

export type PossibleIntentions =
  | "none"
  | "voting"
  | "agreement"
  | "newConversation"
  | "newOpinion"
  | "reportUserContent";

export const useLoginIntentionStore = defineStore("loginIntention", () => {
  const router = useRouter();

  const activeUserIntention = ref<PossibleIntentions>("none");

  const showPostLoginIntentionDialog = ref(false);

  let votingIntention: VotingIntention = {
    enabled: false,
    conversationSlugId: "",
  };

  let opinionAgreementIntention: OpinionAgreementIntention = {
    enabled: false,
    conversationSlugId: "",
    opinionSlugId: "",
  };

  let newConversationIntention: NewConversationIntention = {
    enabled: false,
    conversationDraft: structuredClone(emptyConversationDraft),
  };

  let newOpinionIntention: NewOpinionIntention = {
    enabled: false,
    conversationSlugId: "",
    opinionBody: "",
  };

  function createVotingIntention(conversationSlugId: string) {
    votingIntention = { enabled: true, conversationSlugId: conversationSlugId };
  }

  function createOpinionAgreementIntention(
    conversationSlugId: string,
    opinionSlugId: string
  ) {
    opinionAgreementIntention = {
      enabled: true,
      conversationSlugId: conversationSlugId,
      opinionSlugId: opinionSlugId,
    };
  }

  function createNewConversationIntention(
    conversationDraft: NewConversationDraft
  ) {
    newConversationIntention = {
      enabled: true,
      conversationDraft: conversationDraft,
    };
  }

  function createNewOpinionIntention(
    conversationSlugId: string,
    opinionBody: string
  ) {
    newOpinionIntention = {
      enabled: true,
      conversationSlugId: conversationSlugId,
      opinionBody: opinionBody,
    };
  }

  function setActiveUserIntention(intention: PossibleIntentions) {
    activeUserIntention.value = intention;
  }

  async function routeUserAfterLogin() {
    switch (activeUserIntention.value) {
      case "none":
        await router.push({ name: "/" });
        break;
      case "agreement":
        await router.push({
          name: "/conversation/[postSlugId]",
          params: { postSlugId: opinionAgreementIntention.conversationSlugId },
          query: { opinion: opinionAgreementIntention.opinionSlugId },
        });
        break;
      case "newConversation":
        await router.push({ name: "/conversation/create/" });
        break;
      case "newOpinion":
        await router.push({
          name: "/conversation/[postSlugId]",
          params: { postSlugId: newOpinionIntention.conversationSlugId },
        });
        break;
      case "voting":
        break;
      default:
        console.error("Unknown intention");
    }

    votingIntention;
    opinionAgreementIntention;
    newConversationIntention;
    newOpinionIntention;
  }

  function composePostLoginDialogMessage(
    intention: PossibleIntentions
  ): string {
    switch (intention) {
      case "newOpinion":
        return "Your written opinion had been restored";
      case "newConversation":
        return "Your written conversation had been restored";
      case "agreement":
        return "You had been returned to the opinion prior to the login";
      default:
        return "";
    }
  }

  function composeLoginIntentionDialogMessage(
    intention: PossibleIntentions
  ): string {
    switch (intention) {
      case "newOpinion":
        return "Your written opinion will be restored after you are logged in";
      case "newConversation":
        return "Your written conversation will be restored after you are logged in";
      case "agreement":
        return "You will be returned to this opinion after you are logged in";
      case "reportUserContent":
        return "A user account is required to report user content";
      default:
        return "";
    }
  }

  function showIntentionDialog(show: boolean, intention: PossibleIntentions) {
    if (show && activeUserIntention.value == intention) {
      showPostLoginIntentionDialog.value = true;
    }
  }

  function clearNewOpinionIntention(): NewOpinionIntention {
    const savedIntention: NewOpinionIntention =
      structuredClone(newOpinionIntention);
    newOpinionIntention = {
      enabled: false,
      conversationSlugId: "",
      opinionBody: "",
    };
    showIntentionDialog(savedIntention.enabled, "newOpinion");
    return savedIntention;
  }

  function clearNewConversationIntention(): NewConversationIntention {
    const savedIntention: NewConversationIntention = newConversationIntention;
    newConversationIntention = {
      enabled: false,
      conversationDraft: structuredClone(emptyConversationDraft),
    };
    showIntentionDialog(savedIntention.enabled, "newConversation");
    return savedIntention;
  }

  function clearOpinionAgreementIntention(): OpinionAgreementIntention {
    const savedIntention: OpinionAgreementIntention = structuredClone(
      opinionAgreementIntention
    );
    opinionAgreementIntention = {
      enabled: false,
      conversationSlugId: "",
      opinionSlugId: "",
    };
    showIntentionDialog(savedIntention.enabled, "agreement");
    return savedIntention;
  }

  return {
    createVotingIntention,
    createOpinionAgreementIntention,
    createNewConversationIntention,
    createNewOpinionIntention,
    routeUserAfterLogin,
    composeLoginIntentionDialogMessage,
    composePostLoginDialogMessage,
    clearNewOpinionIntention,
    clearNewConversationIntention,
    clearOpinionAgreementIntention,
    setActiveUserIntention,
    showPostLoginIntentionDialog,
    activeUserIntention,
  };
});
