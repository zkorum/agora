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

interface AgreementIntention {
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
  | "newOpinion";

export const useLoginIntentionStore = defineStore("loginIntention", () => {
  const router = useRouter();

  let activeIntention: PossibleIntentions = "none";

  const showPostLoginIntention = ref(false);

  let votingIntention: VotingIntention = {
    enabled: false,
    conversationSlugId: "",
  };

  let agreementIntention: AgreementIntention = {
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

  function createAgreementIntention(
    conversationSlugId: string,
    opinionSlugId: string
  ) {
    agreementIntention = {
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

  function clearAllOtherIntentions(excludeIntention: PossibleIntentions) {
    if (excludeIntention != "newOpinion") {
      clearNewOpinionIntention();
    }
  }

  async function routeUserAfterLogin() {
    clearAllOtherIntentions(activeIntention);

    if (activeIntention != "none") {
      showPostLoginIntention.value = true;
    }

    if (activeIntention == "none") {
      await router.push({ name: "/" });
    } else if (activeIntention == "agreement") {
      //
    } else if (activeIntention == "newConversation") {
      await router.push({ name: "/conversation/create/" });
    } else if (activeIntention == "newOpinion") {
      await router.push({
        name: "/conversation/[postSlugId]",
        params: { postSlugId: newOpinionIntention.conversationSlugId },
      });
    } else if (activeIntention == "voting") {
      //
    } else {
      console.error("Unknown intension");
    }

    votingIntention;
    agreementIntention;
    newConversationIntention;
    newOpinionIntention;

    activeIntention = "none";
  }

  function composePostLoginDialogMessage(
    intention: PossibleIntentions
  ): string {
    if (intention == "newOpinion") {
      return "Your written opinion had been restored";
    } else if (intention == "newConversation") {
      return "Your written conversation had been restored";
    } else {
      return "UNKNOWN INTENTION";
    }
  }

  function composeLoginIntentionDialogMessage(
    intention: PossibleIntentions
  ): string {
    activeIntention = intention;
    if (intention == "newOpinion") {
      return "Your written opinion will be restored after you are logged in";
    } else if (intention == "newConversation") {
      return "Your written conversation will be restored after you are logged in";
    } else {
      return "";
    }
  }

  function clearNewOpinionIntention(): NewOpinionIntention {
    const savedIntention: NewOpinionIntention = newOpinionIntention;
    newOpinionIntention = {
      enabled: false,
      conversationSlugId: "",
      opinionBody: "",
    };
    return savedIntention;
  }

  function clearNewConversationIntention(): NewConversationIntention {
    const savedIntention: NewConversationIntention = newConversationIntention;
    newConversationIntention = {
      enabled: false,
      conversationDraft: structuredClone(emptyConversationDraft),
    };
    return savedIntention;
  }

  return {
    createVotingIntention,
    createAgreementIntention,
    createNewConversationIntention,
    createNewOpinionIntention,
    routeUserAfterLogin,
    composeLoginIntentionDialogMessage,
    composePostLoginDialogMessage,
    clearNewOpinionIntention,
    clearNewConversationIntention,
    showPostLoginIntention,
  };
});
