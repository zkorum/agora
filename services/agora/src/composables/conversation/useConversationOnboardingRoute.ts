import { getConversationRouteContextFromRoute } from "src/utils/router/conversationRouteContext";
import { getSingleRouteParam } from "src/utils/router/params";
import { computed } from "vue";
import { useRoute } from "vue-router";

export function useConversationOnboardingRoute() {
  const route = useRoute();

  const conversationSlugId = computed(() =>
    getSingleRouteParam(
      "postSlugId" in route.params ? route.params.postSlugId : undefined
    )
  );
  const routeContext = computed(() =>
    getConversationRouteContextFromRoute({
      name: route.name,
      params: route.params,
    })
  );

  return {
    route,
    routeConversationSlugId: conversationSlugId,
    routeContext,
  };
}
