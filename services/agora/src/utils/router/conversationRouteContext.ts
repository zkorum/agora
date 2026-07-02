import type { LocationQueryRaw, RouteLocationRaw, RouteRecordName } from "vue-router";

export interface NormalConversationRouteContext {
  kind: "normal";
}

export interface EmbedConversationRouteContext {
  kind: "embed";
}

export interface ProjectConversationRouteContext {
  kind: "project";
  projectSlug: string;
}

export type ConversationRouteContext =
  | NormalConversationRouteContext
  | EmbedConversationRouteContext
  | ProjectConversationRouteContext;

export const normalConversationRouteContext: NormalConversationRouteContext = {
  kind: "normal",
};

export function isConversationRoutePath(path: string): boolean {
  return (
    path.startsWith("/conversation/") ||
    /^\/project\/[^/]+\/conversation\//.test(path)
  );
}

export function isConversationOnboardingRoutePath(path: string): boolean {
  return isConversationRoutePath(path) && path.includes("/onboarding");
}

export function isConversationRouteName(name: unknown): boolean {
  if (typeof name !== "string") {
    return false;
  }

  return (
    name.startsWith("/conversation/[postSlugId]") ||
    name.startsWith("/project/[projectSlug]/conversation/[postSlugId]")
  );
}

export function isProjectRouteName(name: unknown): boolean {
  if (typeof name !== "string") {
    return false;
  }

  return (
    name === "/project/[projectSlug]" ||
    name.startsWith("/project/[projectSlug]/conversation/[postSlugId]")
  );
}

export function getConversationRouteContextFromRoute({
  name,
  params,
}: {
  name: RouteRecordName | null | undefined;
  params: Record<string, unknown>;
}): ConversationRouteContext {
  const projectSlugParam = params.projectSlug;
  if (typeof projectSlugParam === "string") {
    const projectSlug = projectSlugParam;
    if (projectSlug.length > 0) {
      return { kind: "project", projectSlug };
    }
  }

  if (Array.isArray(projectSlugParam)) {
    const projectSlug = projectSlugParam[0];
    if (typeof projectSlug === "string" && projectSlug.length > 0) {
      return { kind: "project", projectSlug };
    }
  }

  if (typeof name === "string" && name.includes(".embed")) {
    return { kind: "embed" };
  }

  return normalConversationRouteContext;
}

export function getConversationPath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  switch (routeContext.kind) {
    case "project":
      return `/project/${routeContext.projectSlug}/conversation/${conversationSlugId}/`;
    case "embed":
      return `/conversation/${conversationSlugId}/embed`;
    case "normal":
      return `/conversation/${conversationSlugId}/`;
  }
}

export function getConversationAnalysisPath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  switch (routeContext.kind) {
    case "project":
      return `/project/${routeContext.projectSlug}/conversation/${conversationSlugId}/analysis`;
    case "embed":
      return `/conversation/${conversationSlugId}/embed/analysis`;
    case "normal":
      return `/conversation/${conversationSlugId}/analysis`;
  }
}

export function getConversationReportPath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  if (routeContext.kind === "project") {
    return `/project/${routeContext.projectSlug}/conversation/${conversationSlugId}/report`;
  }

  return `/conversation/${conversationSlugId}/report`;
}

export function getConversationSurveyBasePath({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  const conversationPath = getConversationPath({ conversationSlugId, routeContext });
  const normalizedConversationPath = conversationPath.endsWith("/")
    ? conversationPath.slice(0, -1)
    : conversationPath;
  return `${normalizedConversationPath}/onboarding`;
}

export function getConversationShareUrl({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  return new URL(
    getConversationPath({ conversationSlugId, routeContext }),
    window.location.origin
  ).href;
}

export function getOpinionShareUrl({
  conversationSlugId,
  opinionSlugId,
  routeContext = normalConversationRouteContext,
}: {
  conversationSlugId: string;
  opinionSlugId: string;
  routeContext?: ConversationRouteContext;
}): string {
  const url = new URL(
    getConversationPath({ conversationSlugId, routeContext }),
    window.location.origin
  );
  url.searchParams.set("opinion", opinionSlugId);
  return url.href;
}

export function getConversationAnalysisRouteName({
  routeContext = normalConversationRouteContext,
}: {
  routeContext?: ConversationRouteContext;
}): string {
  switch (routeContext.kind) {
    case "project":
      return "/project/[projectSlug]/conversation/[postSlugId]/analysis";
    case "embed":
      return "/conversation/[postSlugId].embed/analysis";
    case "normal":
      return "/conversation/[postSlugId]/analysis";
  }
}

export function getConversationCommentRoute({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
  query,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
  query?: LocationQueryRaw;
}): RouteLocationRaw {
  return {
    path: getConversationPath({ conversationSlugId, routeContext }),
    query,
  };
}

export function getConversationAnalysisRoute({
  conversationSlugId,
  routeContext = normalConversationRouteContext,
  query,
}: {
  conversationSlugId: string;
  routeContext?: ConversationRouteContext;
  query?: LocationQueryRaw;
}): RouteLocationRaw {
  return {
    path: getConversationAnalysisPath({ conversationSlugId, routeContext }),
    query,
  };
}
