import { defineStore } from "pinia";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useOnboardingPreferencesStore } from "./onboarding/preferences";
import { onboardingFlowStore } from "./onboarding/flow";

interface VotingIntention {
  enabled: boolean;
  conversationSlugId: string;
  isEmbedView: boolean;
}

interface OpinionAgreementIntention {
  enabled: boolean;
  conversationSlugId: string;
  opinionSlugId: string;
  isEmbedView: boolean;
}

interface NewConversationIntention {
  enabled: boolean;
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
  isEmbedView: boolean;
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

  let completedUserLogin = false;

  let votingIntention: VotingIntention = {
    enabled: false,
    conversationSlugId: "",
    isEmbedView: false,
  };

  let opinionAgreementIntention: OpinionAgreementIntention = {
    enabled: false,
    conversationSlugId: "",
    opinionSlugId: "",
    isEmbedView: false,
  };

  let newConversationIntention: NewConversationIntention = {
    enabled: false,
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
    isEmbedView: false,
  };

  function createVotingIntention(
    conversationSlugId: string,
    isEmbedView: boolean
  ) {
    votingIntention = {
      enabled: true,
      conversationSlugId: conversationSlugId,
      isEmbedView: isEmbedView,
    };
  }

  function createOpinionAgreementIntention(
    conversationSlugId: string,
    opinionSlugId: string,
    isEmbedView: boolean
  ) {
    opinionAgreementIntention = {
      enabled: true,
      conversationSlugId: conversationSlugId,
      opinionSlugId: opinionSlugId,
      isEmbedView: isEmbedView,
    };
  }

  function createNewConversationIntention() {
    newConversationIntention = {
      enabled: true,
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
    opinionSlugId: string,
    isEmbedView: boolean
  ) {
    reportUserContentIntention = {
      enabled: true,
      conversationSlugId: conversationSlugId,
      opinionSlugId: opinionSlugId,
      isEmbedView: isEmbedView,
    };
  }

  function setActiveUserIntention(intention: PossibleIntentions) {
    activeUserIntention.value = intention;
  }

  async function routeUserAfterLogin() {
    completedUserLogin = true;
    const onboardingStore = onboardingFlowStore();
    if (
      onboardingStore.onboardingMode === "SIGNUP" &&
      activeUserIntention.value === "none"
    ) {
      const preferencesStore = useOnboardingPreferencesStore();
      preferencesStore.openPreferencesDialog();
    }

    if (onboardingStore.onboardingMode === "SIGNUP") {
      onboardingStore.onboardingMode = "LOGIN"; // Reset mode
    }

    switch (activeUserIntention.value) {
      case "none":
        await router.push({ name: "/" });
        break;
      case "agreement":
        await router.push({
          name: opinionAgreementIntention.isEmbedView
            ? "/conversation/[postSlugId].embed"
            : "/conversation/[postSlugId]",
          params: { postSlugId: opinionAgreementIntention.conversationSlugId },
          query: { opinion: opinionAgreementIntention.opinionSlugId },
        });
        break;
      case "newConversation":
        await router.push({ name: "/conversation/new/create/" });
        break;
      case "newOpinion":
        await router.push({
          name: "/conversation/[postSlugId]",
          params: { postSlugId: newOpinionIntention.conversationSlugId },
        });
        break;
      case "voting":
        await router.push({
          name: votingIntention.isEmbedView
            ? "/conversation/[postSlugId].embed"
            : "/conversation/[postSlugId]",
          params: { postSlugId: votingIntention.conversationSlugId },
        });
        break;
      case "reportUserContent":
        await router.push({
          name: reportUserContentIntention.isEmbedView
            ? "/conversation/[postSlugId].embed"
            : "/conversation/[postSlugId]",
          params: { postSlugId: reportUserContentIntention.conversationSlugId },
          query: { opinion: reportUserContentIntention.opinionSlugId },
        });
        break;
      default:
        console.error("Unknown intention");
    }
  }

  function composeLoginIntentionDialogMessage(
    intention: PossibleIntentions
  ): string {
    switch (intention) {
      case "none":
        return "";
      case "newOpinion":
        return "Your written opinion draft will be restored when you return.";
      case "newConversation":
        return "Your written conversation draft will be restored when you return.";
      case "agreement":
        return "You will be returned to this opinion when you return.";
      case "reportUserContent":
        return "A user account is required to report user content.";
      case "voting":
        return "You will be returned to this conversation when you return.";
      default:
        return "";
    }
  }

  function showIntentionDialog(show: boolean, intention: PossibleIntentions) {
    if (show && activeUserIntention.value == intention) {
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
      };
      newConversationIntention.enabled = false;
      showIntentionDialog(savedIntention.enabled, "newConversation");
      return savedIntention;
    } else {
      return {
        enabled: false,
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
        isEmbedView: false,
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
        isEmbedView: false,
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
        isEmbedView: false,
      };
    }
  }

  // Getter methods to access current intentions without clearing them
  function getCurrentVotingIntention(): VotingIntention {
    return structuredClone(votingIntention);
  }

  function getCurrentOpinionAgreementIntention(): OpinionAgreementIntention {
    return structuredClone(opinionAgreementIntention);
  }

  function getCurrentReportUserContentIntention(): ReportUserContentIntention {
    return structuredClone(reportUserContentIntention);
  }

  return {
    createVotingIntention,
    createOpinionAgreementIntention,
    createNewConversationIntention,
    createNewOpinionIntention,
    createReportUserContentIntention,
    routeUserAfterLogin,
    composeLoginIntentionDialogMessage,
    clearNewOpinionIntention,
    clearNewConversationIntention,
    clearOpinionAgreementIntention,
    clearVotingIntention,
    clearReportUserContentIntention,
    setActiveUserIntention,
    getCurrentVotingIntention,
    getCurrentOpinionAgreementIntention,
    getCurrentReportUserContentIntention,
  };
});
