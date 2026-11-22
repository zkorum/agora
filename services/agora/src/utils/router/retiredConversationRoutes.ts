import type { RouteRecordRaw } from "vue-router";

import {
  type ConversationRouteContext,
  getConversationSurveyBasePath,
} from "./conversationRouteContext";

export function getRetiredConversationRoutes(): RouteRecordRaw[] {
  const contexts = [
    { kind: "normal" },
    { kind: "embed" },
    { kind: "project", projectSlug: ":projectSlug" },
  ] satisfies ConversationRouteContext[];

  return contexts.map((routeContext) => ({
    path: `${getConversationSurveyBasePath({ conversationSlugId: ":postSlugId", routeContext })}/verify/ticket`,
    // Resolve before mounting onboarding; the retired URL never gets a history entry.
    redirect: (to) => ({
      path: to.path.replace(/\/ticket\/?$/, ""),
      query: to.query,
      hash: to.hash,
    }),
  }));
}
