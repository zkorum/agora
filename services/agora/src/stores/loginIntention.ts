import { defineStore } from "pinia";
import { NewConversationDraft } from "src/utils/component/conversation/newPostDrafts";
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

interface ReportUserContentIntention {
  enabled: boolean;
  conversationSlugId: string;
  opinionSlugId: string;
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

  // Configured on the 1st dialog's ok callback, cleared on the 2nd dialog's ok callback
  const activeUserIntention = ref<PossibleIntentions>("none");

  const showPostLoginIntentionDialog = ref(false);
  let completedUserLogin = false;

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
    conversationDraft: {
      enablePolling: false,
      pollingOptionList: ["", ""],
      postBody: "",
      postTitle: "",
    },
  };

  let newOpinionIntention: NewOpinionIntention = {
    enabled: false,
    conversationSlugId: "",
    opinionBody: "",
  };

  let reportUserContentIntention: ReportUserContentIntention = {
    enabled: false,
    conversationSlugId: "",
    opinionSlugId: "",
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

  function createReportUserContentIntention(
    conversationSlugId: string,
    opinionSlugId: string
  ) {
    reportUserContentIntention = {
      enabled: true,
      conversationSlugId: conversationSlugId,
      opinionSlugId: opinionSlugId,
    };
  }

  function setActiveUserIntention(intention: PossibleIntentions) {
    activeUserIntention.value = intention;
  }

  async function routeUserAfterLogin() {
    completedUserLogin = true;

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
        await router.push({
          name: "/conversation/[postSlugId]",
          params: { postSlugId: votingIntention.conversationSlugId },
        });
        break;
      case "reportUserContent":
        await router.push({
          name: "/conversation/[postSlugId]",
          params: { postSlugId: reportUserContentIntention.conversationSlugId },
          query: { opinion: reportUserContentIntention.opinionSlugId },
        });
        break;
      default:
        console.error("Unknown intention");
    }
  }

  function composePostLoginDialogMessage(
    intention: PossibleIntentions
  ): string {
    switch (intention) {
      case "newOpinion":
        return "Your opinion draft had been restored.";
      case "newConversation":
        return "Your conversation draft had been restored.";
      case "agreement":
        return "You had been returned to the opinion that you wanted to cast agreement on.";
      case "voting":
        return "You had been returned to the conversation that you wanted to cast vote on.";
      case "reportUserContent":
        return `You had been returned to the ${reportUserContentIntention.opinionSlugId == "" ? "conversation" : "opinion"} that you wanted to report.`;
      default:
        return "";
    }
  }

  function composeLoginIntentionDialogMessage(
    intention: PossibleIntentions
  ): string {
    switch (intention) {
      case "newOpinion":
        return "Your opinion draft will be restored after you are logged in";
      case "newConversation":
        return "Your conversation draft will be restored after you are logged in";
      case "agreement":
        return "You will be returned to this opinion after you are logged in";
      case "reportUserContent":
        return "A user account is required to report user content";
      case "voting":
        return "You will be returned to this conversation after you are logged in";
      default:
        return "";
    }
  }

  function showIntentionDialog(show: boolean, intention: PossibleIntentions) {
    if (show && activeUserIntention.value == intention) {
      showPostLoginIntentionDialog.value = true;
      completedUserLogin = false;
    }
  }

  function clearNewOpinionIntention(): NewOpinionIntention {
    if (completedUserLogin) {
      const savedIntention: NewOpinionIntention =
        structuredClone(newOpinionIntention);
      newOpinionIntention.enabled = false;
      showIntentionDialog(savedIntention.enabled, "newOpinion");
      return savedIntention;
    } else {
      return {
        enabled: false,
        conversationSlugId: "",
        opinionBody: "",
      };
    }
  }

  function clearNewConversationIntention(): NewConversationIntention {
    if (completedUserLogin) {
      const savedIntention: NewConversationIntention = {
        enabled: newConversationIntention.enabled,
        conversationDraft: {
          enablePolling:
            newConversationIntention.conversationDraft.enablePolling,
          pollingOptionList:
            newConversationIntention.conversationDraft.pollingOptionList,
          postBody: newConversationIntention.conversationDraft.postBody,
          postTitle: newConversationIntention.conversationDraft.postTitle,
        },
      };
      newConversationIntention.enabled = false;
      showIntentionDialog(savedIntention.enabled, "newConversation");
      return savedIntention;
    } else {
      return {
        enabled: false,
        conversationDraft: {
          enablePolling: false,
          pollingOptionList: ["", ""],
          postBody: "",
          postTitle: "",
        },
      };
    }
  }

  function clearOpinionAgreementIntention(): OpinionAgreementIntention {
    if (completedUserLogin) {
      const savedIntention: OpinionAgreementIntention = structuredClone(
        opinionAgreementIntention
      );
      opinionAgreementIntention.enabled = false;
      showIntentionDialog(savedIntention.enabled, "agreement");
      return savedIntention;
    } else {
      return {
        enabled: false,
        conversationSlugId: "",
        opinionSlugId: "",
      };
    }
  }

  function clearVotingIntention(): VotingIntention {
    if (completedUserLogin) {
      const savedIntention: VotingIntention = structuredClone(votingIntention);
      votingIntention.enabled = false;
      showIntentionDialog(savedIntention.enabled, "voting");
      return savedIntention;
    } else {
      return {
        enabled: false,
        conversationSlugId: "",
      };
    }
  }

  function clearReportUserContentIntention(): ReportUserContentIntention {
    if (completedUserLogin) {
      const savedIntention: ReportUserContentIntention = structuredClone(
        reportUserContentIntention
      );
      reportUserContentIntention.enabled = false;
      showIntentionDialog(savedIntention.enabled, "reportUserContent");
      return savedIntention;
    } else {
      return {
        enabled: false,
        conversationSlugId: "",
        opinionSlugId: "",
      };
    }
  }

  return {
    createVotingIntention,
    createOpinionAgreementIntention,
    createNewConversationIntention,
    createNewOpinionIntention,
    createReportUserContentIntention,
    routeUserAfterLogin,
    composeLoginIntentionDialogMessage,
    composePostLoginDialogMessage,
    clearNewOpinionIntention,
    clearNewConversationIntention,
    clearOpinionAgreementIntention,
    clearVotingIntention,
    clearReportUserContentIntention,
    setActiveUserIntention,
    showPostLoginIntentionDialog,
    activeUserIntention,
  };
});
