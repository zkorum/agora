import { defineStore } from "pinia";
import type { EventSlug } from "src/shared/types/zod";
import {
  type ConversationRouteContext,
  getConversationCommentRoute,
  normalConversationRouteContext,
} from "src/utils/router/conversationRouteContext";
import { ref } from "vue";
import { useRouter } from "vue-router";

import { onboardingFlowStore } from "./onboarding/flow";
import { useOnboardingPreferencesStore } from "./onboarding/preferences";

interface VotingIntention {
  readonly enabled: boolean;
  readonly conversationSlugId: string;
  readonly routeContext: ConversationRouteContext;
  readonly eventSlug?: EventSlug;
}

interface OpinionAgreementIntention {
  readonly enabled: boolean;
  readonly conversationSlugId: string;
  readonly opinionSlugId: string;
  readonly routeContext: ConversationRouteContext;
  readonly eventSlug?: EventSlug;
}

interface NewConversationIntention {
  readonly enabled: boolean;
}

interface NewOpinionIntention {
  readonly enabled: boolean;
  readonly conversationSlugId: string;
  readonly opinionBody: string;
  readonly routeContext: ConversationRouteContext;
  readonly eventSlug?: EventSlug;
}

interface ReportUserContentIntention {
  readonly enabled: boolean;
  readonly conversationSlugId: string;
  readonly opinionSlugId: string;
  readonly routeContext: ConversationRouteContext;
  readonly eventSlug?: EventSlug;
}

export type PossibleIntentions =
  | "none"
  | "voting"
  | "agreement"
  | "newConversation"
  | "newOpinion"
  | "reportUserContent"
  | "settings";

export const useLoginIntentionStore = defineStore("loginIntention", () => {
  const router = useRouter();

  // Configured on the 1st dialog's ok callback, cleared on the 2nd dialog's ok callback
  const activeUserIntention = ref<PossibleIntentions>("none");

  let completedUserLogin = false;

  let votingIntention: VotingIntention = {
    enabled: false,
    conversationSlugId: "",
    routeContext: normalConversationRouteContext,
    eventSlug: undefined,
  };

  let opinionAgreementIntention: OpinionAgreementIntention = {
    enabled: false,
    conversationSlugId: "",
    opinionSlugId: "",
    routeContext: normalConversationRouteContext,
    eventSlug: undefined,
  };

  let newConversationIntention: NewConversationIntention = {
    enabled: false,
  };

  let newOpinionIntention: NewOpinionIntention = {
    enabled: false,
    conversationSlugId: "",
    opinionBody: "",
    routeContext: normalConversationRouteContext,
    eventSlug: undefined,
  };

  let reportUserContentIntention: ReportUserContentIntention = {
    enabled: false,
    conversationSlugId: "",
    opinionSlugId: "",
    routeContext: normalConversationRouteContext,
    eventSlug: undefined,
  };

  function createVotingIntention(
    conversationSlugId: string,
    routeContext: ConversationRouteContext,
    eventSlug?: EventSlug
  ) {
    votingIntention = {
      enabled: true,
      conversationSlugId: conversationSlugId,
      routeContext,
      eventSlug: eventSlug,
    };
  }

  function createOpinionAgreementIntention(
    conversationSlugId: string,
    opinionSlugId: string,
    routeContext: ConversationRouteContext,
    eventSlug?: EventSlug
  ) {
    opinionAgreementIntention = {
      enabled: true,
      conversationSlugId: conversationSlugId,
      opinionSlugId: opinionSlugId,
      routeContext,
      eventSlug: eventSlug,
    };
  }

  function createNewConversationIntention() {
    newConversationIntention = {
      enabled: true,
    };
  }

  function createNewOpinionIntention(
    conversationSlugId: string,
    opinionBody: string,
    routeContext: ConversationRouteContext,
    eventSlug?: EventSlug
  ) {
    newOpinionIntention = {
      enabled: true,
      conversationSlugId: conversationSlugId,
      opinionBody: opinionBody,
      routeContext,
      eventSlug: eventSlug,
    };
  }

  function createReportUserContentIntention(
    conversationSlugId: string,
    opinionSlugId: string,
    routeContext: ConversationRouteContext,
    eventSlug?: EventSlug
  ) {
    reportUserContentIntention = {
      enabled: true,
      conversationSlugId: conversationSlugId,
      opinionSlugId: opinionSlugId,
      routeContext,
      eventSlug: eventSlug,
    };
  }

  function setActiveUserIntention(intention: PossibleIntentions) {
    activeUserIntention.value = intention;
  }

  async function routeUserAfterLogin() {
    completedUserLogin = true;
    const onboardingStore = onboardingFlowStore();
    const wasCredentialUpgrade =
      onboardingStore.credentialUpgradeTarget !== null;
    const shouldShowPreferencesDialog =
      onboardingStore.onboardingMode === "SIGNUP" && !wasCredentialUpgrade;

    if (onboardingStore.onboardingMode === "SIGNUP") {
      onboardingStore.onboardingMode = "LOGIN"; // Reset mode
    }
    onboardingStore.credentialUpgradeTarget = null; // Reset credential upgrade

    switch (activeUserIntention.value) {
      case "none":
        await router.replace({ name: "/" });
        break;
      case "agreement":
        await router.replace(
          getConversationCommentRoute({
            conversationSlugId: opinionAgreementIntention.conversationSlugId,
            routeContext: opinionAgreementIntention.routeContext,
            query: { opinion: opinionAgreementIntention.opinionSlugId },
          })
        );
        break;
      case "newConversation":
        await router.replace({ name: "/conversation/new/create/" });
        break;
      case "newOpinion":
        await router.replace(
          getConversationCommentRoute({
            conversationSlugId: newOpinionIntention.conversationSlugId,
            routeContext: newOpinionIntention.routeContext,
          })
        );
        break;
      case "voting":
        await router.replace(
          getConversationCommentRoute({
            conversationSlugId: votingIntention.conversationSlugId,
            routeContext: votingIntention.routeContext,
          })
        );
        break;
      case "reportUserContent":
        await router.replace(
          getConversationCommentRoute({
            conversationSlugId: reportUserContentIntention.conversationSlugId,
            routeContext: reportUserContentIntention.routeContext,
            query: { opinion: reportUserContentIntention.opinionSlugId },
          })
        );
        break;
      case "settings":
        await router.replace({ name: "/settings/" });
        break;
      default:
        console.error("Unknown intention");
    }

    // Reset intention after consuming it
    activeUserIntention.value = "none";

    // Open preferences dialog after routing is complete
    if (shouldShowPreferencesDialog) {
      const preferencesStore = useOnboardingPreferencesStore();
      preferencesStore.openPreferencesDialog();
    }
  }

  function showIntentionDialog(show: boolean, intention: PossibleIntentions) {
    if (show && activeUserIntention.value == intention) {
      completedUserLogin = false;
    }
  }

  function clearNewOpinionIntention(): NewOpinionIntention {
    if (completedUserLogin) {
      const savedIntention = structuredClone(newOpinionIntention);
      newOpinionIntention = { ...newOpinionIntention, enabled: false };
      showIntentionDialog(savedIntention.enabled, "newOpinion");
      return savedIntention;
    } else {
      return {
        enabled: false,
        conversationSlugId: "",
        opinionBody: "",
        routeContext: normalConversationRouteContext,
        eventSlug: undefined,
      };
    }
  }

  function clearNewConversationIntention(): NewConversationIntention {
    if (completedUserLogin) {
      const savedIntention = newConversationIntention;
      newConversationIntention = { ...newConversationIntention, enabled: false };
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
      const savedIntention = structuredClone(opinionAgreementIntention);
      opinionAgreementIntention = {
        ...opinionAgreementIntention,
        enabled: false,
      };
      showIntentionDialog(savedIntention.enabled, "agreement");
      return savedIntention;
    } else {
      return {
        enabled: false,
        conversationSlugId: "",
        opinionSlugId: "",
        routeContext: normalConversationRouteContext,
        eventSlug: undefined,
      };
    }
  }

  function clearVotingIntention(): VotingIntention {
    if (completedUserLogin) {
      const savedIntention = structuredClone(votingIntention);
      votingIntention = { ...votingIntention, enabled: false };
      showIntentionDialog(savedIntention.enabled, "voting");
      return savedIntention;
    } else {
      return {
        enabled: false,
        conversationSlugId: "",
        routeContext: normalConversationRouteContext,
        eventSlug: undefined,
      };
    }
  }

  function clearReportUserContentIntention(): ReportUserContentIntention {
    if (completedUserLogin) {
      const savedIntention = structuredClone(reportUserContentIntention);
      reportUserContentIntention = {
        ...reportUserContentIntention,
        enabled: false,
      };
      showIntentionDialog(savedIntention.enabled, "reportUserContent");
      return savedIntention;
    } else {
      return {
        enabled: false,
        conversationSlugId: "",
        opinionSlugId: "",
        routeContext: normalConversationRouteContext,
        eventSlug: undefined,
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
    activeUserIntention,
    createVotingIntention,
    createOpinionAgreementIntention,
    createNewConversationIntention,
    createNewOpinionIntention,
    createReportUserContentIntention,
    routeUserAfterLogin,
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
