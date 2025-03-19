import { defineStore } from "pinia";
import {
  emptyConversationDraft,
  NewConversationDraft,
} from "src/utils/component/conversation/newPostDrafts";
import { ref } from "vue";
import { useRouter } from "vue-router";

interface VotingIntention {
  conversationSlugId: string;
}

interface AgreementIntention {
  conversationSlugId: string;
  opinionSlugId: string;
}

interface NewConversationIntention {
  conversationSlugId: string;
  conversationDraft: NewConversationDraft;
}

interface NewOpinionIntention {
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
    conversationSlugId: "",
  };

  let agreementIntention: AgreementIntention = {
    conversationSlugId: "",
    opinionSlugId: "",
  };

  let newConversationIntention: NewConversationIntention = {
    conversationSlugId: "",
    conversationDraft: emptyConversationDraft,
  };

  let newOpinionIntention: NewOpinionIntention = {
    conversationSlugId: "",
    opinionBody: "",
  };

  function createVotingIntention(conversationSlugId: string) {
    votingIntention = { conversationSlugId: conversationSlugId };
  }

  function createAgreementIntention(
    conversationSlugId: string,
    opinionSlugId: string
  ) {
    agreementIntention = {
      conversationSlugId: conversationSlugId,
      opinionSlugId: opinionSlugId,
    };
  }

  function createNewConversationIntention(
    conversationSlugId: string,
    conversationDraft: NewConversationDraft
  ) {
    newConversationIntention = {
      conversationSlugId: conversationSlugId,
      conversationDraft: conversationDraft,
    };
  }

  function createNewOpinionIntention(
    conversationSlugId: string,
    opinionBody: string
  ) {
    newOpinionIntention = {
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
      //
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
    } else {
      return "";
    }
  }

  function clearNewOpinionIntention() {
    const savedIntention: NewOpinionIntention = newOpinionIntention;
    newOpinionIntention = {
      conversationSlugId: "",
      opinionBody: "",
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
    showPostLoginIntention,
  };
});
