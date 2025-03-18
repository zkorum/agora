import { defineStore } from "pinia";
import {
  emptyConversationDraft,
  NewConversationDraft,
} from "src/utils/component/conversation/newPostDrafts";

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
  let activeIntention: PossibleIntentions = "none";

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

  function resumeUserIntensionAfterLogin() {
    if (activeIntention == "none") {
      //
    } else if (activeIntention == "agreement") {
      //
    } else if (activeIntention == "newConversation") {
      //
    } else if (activeIntention == "newOpinion") {
      //
    } else if (activeIntention == "voting") {
      //
    } else {
      console.error("Unknown intension");
    }

    votingIntention;
    agreementIntention;
    newConversationIntention;
    newOpinionIntention;
  }

  function setupUserIntention(intention: PossibleIntentions): string {
    activeIntention = intention;
    if (intention == "newOpinion") {
      return "Your written opinion will be restored after you are logged in";
    } else {
      return "";
    }
  }

  return {
    createVotingIntention,
    createAgreementIntention,
    createNewConversationIntention,
    createNewOpinionIntention,
    resumeUserIntensionAfterLogin,
    setupUserIntention,
  };
});
