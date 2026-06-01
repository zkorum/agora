import type { LocationQueryValue } from "vue-router";

type ReturnToQueryValue = LocationQueryValue | LocationQueryValue[];

interface GetConversationEditReturnPathParams {
  conversationSlugId: string;
  returnTo: ReturnToQueryValue;
}

function getDefaultConversationPath(conversationSlugId: string): string {
  return `/conversation/${encodeURIComponent(conversationSlugId)}/`;
}

function getDecodedPathSegment(segment: string | undefined): string | null {
  if (segment === undefined || segment.length === 0) {
    return null;
  }

  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function getConversationEditReturnPath({
  conversationSlugId,
  returnTo,
}: GetConversationEditReturnPathParams): string {
  if (typeof returnTo !== "string") {
    return getDefaultConversationPath(conversationSlugId);
  }

  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return getDefaultConversationPath(conversationSlugId);
  }

  const returnUrl = new URL(returnTo, "https://agora.local");
  const pathSegments = returnUrl.pathname.split("/");

  if (pathSegments[1] !== "conversation") {
    return getDefaultConversationPath(conversationSlugId);
  }

  const routeSlugSegment = getDecodedPathSegment(pathSegments[2]);
  const isSameConversation =
    routeSlugSegment === conversationSlugId ||
    routeSlugSegment === `${conversationSlugId}.embed`;

  if (!isSameConversation) {
    return getDefaultConversationPath(conversationSlugId);
  }

  if (pathSegments[3] === "edit") {
    return getDefaultConversationPath(conversationSlugId);
  }

  return `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
}
