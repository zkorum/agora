import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useRoute } from "vue-router";
import { useEmbedMode } from "src/utils/ui/embedMode";

export function useConversationLoginIntentions() {
  const route = useRoute();
  const { isEmbeddedMode } = useEmbedMode();

  const {
    createVotingIntention,
    createOpinionAgreementIntention,
    createReportUserContentIntention,
    setActiveUserIntention,
  } = useLoginIntentionStore();

  function setVotingIntention() {
    if (
      route.name === "/conversation/[postSlugId]" ||
      route.name === "/conversation/[postSlugId].embed"
    ) {
      const isEmbedView = isEmbeddedMode();
      const postSlugId = route.params.postSlugId;
      createVotingIntention(postSlugId, isEmbedView);
      setActiveUserIntention("voting");
    }
  }

  function setOpinionAgreementIntention(opinionSlugId: string) {
    if (
      route.name === "/conversation/[postSlugId]" ||
      route.name === "/conversation/[postSlugId].embed"
    ) {
      const isEmbedView = isEmbeddedMode();
      const postSlugId = route.params.postSlugId;
      createOpinionAgreementIntention(postSlugId, opinionSlugId, isEmbedView);
      setActiveUserIntention("agreement");
    }
  }

  function setReportIntention(opinionSlugId: string) {
    if (
      route.name === "/conversation/[postSlugId]" ||
      route.name === "/conversation/[postSlugId].embed"
    ) {
      const isEmbedView = isEmbeddedMode();
      const postSlugId = route.params.postSlugId;
      createReportUserContentIntention(postSlugId, opinionSlugId, isEmbedView);
      setActiveUserIntention("reportUserContent");
    }
  }

  return {
    setVotingIntention,
    setOpinionAgreementIntention,
    setReportIntention,
  };
}
