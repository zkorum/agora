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
  opinionSlugId: string;
  opinionBody: string;
}

export const useLoginIntentionStore = defineStore("loginIntention", () => {
  type PossibleIntentions =
    | "none"
    | "voting"
    | "agreement"
    | "newConversation"
    | "newOpinion";

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
    opinionSlugId: "",
  };

  function createVotingIntention(conversationSlugId: string) {
    activeIntention = "voting";
    votingIntention = { conversationSlugId: conversationSlugId };
  }

  function createAgreementIntention(
    conversationSlugId: string,
    opinionSlugId: string
  ) {
    activeIntention = "agreement";
    agreementIntention = {
      conversationSlugId: conversationSlugId,
      opinionSlugId: opinionSlugId,
    };
  }

  function createNewConversationIntention(
    conversationSlugId: string,
    conversationDraft: NewConversationDraft
  ) {
    activeIntention = "agreement";
    newConversationIntention = {
      conversationSlugId: conversationSlugId,
      conversationDraft: conversationDraft,
    };
  }

  function createNewOpinionIntention(
    conversationSlugId: string,
    opinionSlugId: string,
    opinionBody: string
  ) {
    activeIntention = "agreement";
    newOpinionIntention = {
      conversationSlugId: conversationSlugId,
      opinionBody: opinionBody,
      opinionSlugId: opinionSlugId,
    };
  }

  function redirectUser() {
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

  return {
    createVotingIntention,
    createAgreementIntention,
    createNewConversationIntention,
    createNewOpinionIntention,
    redirectUser,
  };
});
