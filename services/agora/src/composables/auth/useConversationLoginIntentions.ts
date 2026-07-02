import type { EventSlug } from "src/shared/types/zod";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import {
  type ConversationRouteContext,
  getConversationRouteContextFromRoute,
} from "src/utils/router/conversationRouteContext";
import { getSingleRouteParam } from "src/utils/router/params";
import { useRoute } from "vue-router";

export function useConversationLoginIntentions() {
  const route = useRoute();

  const {
    createVotingIntention,
    createOpinionAgreementIntention,
    createReportUserContentIntention,
    setActiveUserIntention,
  } = useLoginIntentionStore();

  function isConversationIntentionRoute(): boolean {
    const routeName = String(route.name ?? "");
    if (
      routeName === "/conversation/[postSlugId]" ||
      routeName === "/conversation/[postSlugId]/" ||
      routeName === "/conversation/[postSlugId]/analysis" ||
      routeName === "/conversation/[postSlugId].embed/" ||
      routeName === "/conversation/[postSlugId].embed/analysis" ||
      routeName === "/project/[projectSlug]/conversation/[postSlugId]" ||
      routeName === "/project/[projectSlug]/conversation/[postSlugId]/" ||
      routeName === "/project/[projectSlug]/conversation/[postSlugId]/analysis"
    ) {
      return true;
    }

    return false;
  }

  function getCurrentConversationIntentionTarget():
    | { conversationSlugId: string; routeContext: ConversationRouteContext }
    | undefined {
    if (!isConversationIntentionRoute()) {
      return undefined;
    }

    const postSlugId = getSingleRouteParam(
      "postSlugId" in route.params ? route.params.postSlugId : undefined
    );
    if (postSlugId.length === 0) {
      return undefined;
    }

    return {
      conversationSlugId: postSlugId,
      routeContext: getConversationRouteContextFromRoute({
        name: route.name,
        params: route.params,
      }),
    };
  }

  function setVotingIntention(eventSlug?: EventSlug) {
    const target = getCurrentConversationIntentionTarget();
    if (target === undefined) {
      return;
    }

    createVotingIntention(
      target.conversationSlugId,
      target.routeContext,
      eventSlug
    );
    setActiveUserIntention("voting");
  }

  function setOpinionAgreementIntention(
    opinionSlugId: string,
    eventSlug?: EventSlug
  ) {
    const target = getCurrentConversationIntentionTarget();
    if (target === undefined) {
      return;
    }

    createOpinionAgreementIntention(
      target.conversationSlugId,
      opinionSlugId,
      target.routeContext,
      eventSlug
    );
    setActiveUserIntention("agreement");
  }

  function setReportIntention(opinionSlugId: string, eventSlug?: EventSlug) {
    const target = getCurrentConversationIntentionTarget();
    if (target === undefined) {
      return;
    }

    createReportUserContentIntention(
      target.conversationSlugId,
      opinionSlugId,
      target.routeContext,
      eventSlug
    );
    setActiveUserIntention("reportUserContent");
  }

  return {
    setVotingIntention,
    setOpinionAgreementIntention,
    setReportIntention,
  };
}
