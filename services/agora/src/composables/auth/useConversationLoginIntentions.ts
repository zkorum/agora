import type { EventSlug } from "src/shared/types/zod";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useEmbedMode } from "src/utils/ui/embedMode";
import { useRoute } from "vue-router";

export function useConversationLoginIntentions() {
  const route = useRoute();
  const { isEmbeddedMode } = useEmbedMode();

  const {
    createVotingIntention,
    createOpinionAgreementIntention,
    createReportUserContentIntention,
    setActiveUserIntention,
  } = useLoginIntentionStore();

  function setVotingIntention(eventSlug?: EventSlug) {
    if (
      route.name === "/conversation/[postSlugId]" ||
      route.name === "/conversation/[postSlugId].embed"
    ) {
      const isEmbedView = isEmbeddedMode();
      const postSlugId = route.params.postSlugId;
      createVotingIntention(postSlugId, isEmbedView, eventSlug);
      setActiveUserIntention("voting");
    }
  }

  function setOpinionAgreementIntention(opinionSlugId: string, eventSlug?: EventSlug) {
    if (
      route.name === "/conversation/[postSlugId]" ||
      route.name === "/conversation/[postSlugId].embed"
    ) {
      const isEmbedView = isEmbeddedMode();
      const postSlugId = route.params.postSlugId;
      createOpinionAgreementIntention(postSlugId, opinionSlugId, isEmbedView, eventSlug);
      setActiveUserIntention("agreement");
    }
  }

  function setReportIntention(opinionSlugId: string, eventSlug?: EventSlug) {
    if (
      route.name === "/conversation/[postSlugId]" ||
      route.name === "/conversation/[postSlugId].embed"
    ) {
      const isEmbedView = isEmbeddedMode();
      const postSlugId = route.params.postSlugId;
      createReportUserContentIntention(postSlugId, opinionSlugId, isEmbedView, eventSlug);
      setActiveUserIntention("reportUserContent");
    }
  }

  return {
    setVotingIntention,
    setOpinionAgreementIntention,
    setReportIntention,
  };
}
