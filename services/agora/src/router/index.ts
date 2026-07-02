import { isChunkLoadError, reloadForChunkError } from "src/utils/error/chunkError";
import { useRouterGuard } from "src/utils/router/guard";
import { getSingleRouteParam } from "src/utils/router/params";
import { getConversationSurveyOnboardingPath } from "src/utils/survey/navigation";
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteLocationNormalizedLoaded,
  type RouteRecordRaw,
} from "vue-router";
import { type RouteNamedMap, routes } from "vue-router/auto-routes";
import { z } from "zod";

import { defineRouter } from "#q-app/wrappers";

// Construction uses keyof RouteNamedMap to catch typos at compile time.
// ReadonlySet<string> allows .has(string) without casting route.name.
const conversationTabRouteNames: ReadonlySet<string> = new Set<
  keyof RouteNamedMap
>([
  "/conversation/[postSlugId]/",
  "/conversation/[postSlugId]/analysis",
  "/conversation/[postSlugId].embed/",
  "/conversation/[postSlugId].embed/analysis",
  "/project/[projectSlug]/conversation/[postSlugId]/",
  "/project/[projectSlug]/conversation/[postSlugId]/analysis",
]);

const projectOnboardingRouteAliases = {
  "/conversation/[postSlugId].onboarding":
    "/project/:projectSlug/conversation/:postSlugId/onboarding",
  "/conversation/[postSlugId].onboarding/":
    "/project/:projectSlug/conversation/:postSlugId/onboarding/",
  "/conversation/[postSlugId].onboarding/complete":
    "/project/:projectSlug/conversation/:postSlugId/onboarding/complete",
  "/conversation/[postSlugId].onboarding/question.[questionSlugId]":
    "/project/:projectSlug/conversation/:postSlugId/onboarding/question/:questionSlugId",
  "/conversation/[postSlugId].onboarding/summary":
    "/project/:projectSlug/conversation/:postSlugId/onboarding/summary",
  "/conversation/[postSlugId].onboarding/verify":
    "/project/:projectSlug/conversation/:postSlugId/onboarding/verify",
  "/conversation/[postSlugId].onboarding/verify/email":
    "/project/:projectSlug/conversation/:postSlugId/onboarding/verify/email",
  "/conversation/[postSlugId].onboarding/verify/email-code":
    "/project/:projectSlug/conversation/:postSlugId/onboarding/verify/email-code",
  "/conversation/[postSlugId].onboarding/verify/hard":
    "/project/:projectSlug/conversation/:postSlugId/onboarding/verify/hard",
  "/conversation/[postSlugId].onboarding/verify/identity":
    "/project/:projectSlug/conversation/:postSlugId/onboarding/verify/identity",
  "/conversation/[postSlugId].onboarding/verify/passport":
    "/project/:projectSlug/conversation/:postSlugId/onboarding/verify/passport",
  "/conversation/[postSlugId].onboarding/verify/phone":
    "/project/:projectSlug/conversation/:postSlugId/onboarding/verify/phone",
  "/conversation/[postSlugId].onboarding/verify/phone-code":
    "/project/:projectSlug/conversation/:postSlugId/onboarding/verify/phone-code",
  "/conversation/[postSlugId].onboarding/verify/ticket":
    "/project/:projectSlug/conversation/:postSlugId/onboarding/verify/ticket",
} satisfies Partial<Record<keyof RouteNamedMap, string>>;

function getProjectOnboardingAlias({
  routeName,
}: {
  routeName: unknown;
}): string | undefined {
  if (typeof routeName !== "string") {
    return undefined;
  }

  for (const [name, alias] of Object.entries(projectOnboardingRouteAliases)) {
    if (routeName === name) {
      return alias;
    }
  }

  return undefined;
}

function mergeRouteAliases({
  existingAlias,
  nextAlias,
}: {
  existingAlias: string | string[] | undefined;
  nextAlias: string;
}): string | string[] {
  if (existingAlias === undefined) {
    return nextAlias;
  }

  if (Array.isArray(existingAlias)) {
    return existingAlias.includes(nextAlias)
      ? existingAlias
      : [...existingAlias, nextAlias];
  }

  if (existingAlias === nextAlias) {
    return existingAlias;
  }

  return [existingAlias, nextAlias];
}

function addProjectOnboardingAliases({
  routeRecords,
}: {
  routeRecords: readonly RouteRecordRaw[];
}): void {
  for (const routeRecord of routeRecords) {
    const alias = getProjectOnboardingAlias({ routeName: routeRecord.name });
    if (alias !== undefined) {
      routeRecord.alias = mergeRouteAliases({
        existingAlias: routeRecord.alias,
        nextAlias: alias,
      });
    }

    if (routeRecord.children !== undefined) {
      addProjectOnboardingAliases({ routeRecords: routeRecord.children });
    }
  }
}

function isConversationTabSwitch({
  to,
  from,
}: {
  to: RouteLocationNormalized;
  from: RouteLocationNormalizedLoaded;
}): boolean {
  const toName = to.name;
  const fromName = from.name;

  if (typeof toName !== "string" || typeof fromName !== "string") {
    return false;
  }

  if (
    !conversationTabRouteNames.has(toName) ||
    !conversationTabRouteNames.has(fromName)
  ) {
    return false;
  }

  const toParams = to.params;
  const fromParams = from.params;

  if (!("postSlugId" in toParams) || !("postSlugId" in fromParams)) {
    return false;
  }

  const toProjectSlug = "projectSlug" in toParams ? toParams.projectSlug : undefined;
  const fromProjectSlug = "projectSlug" in fromParams ? fromParams.projectSlug : undefined;

  return (
    toParams.postSlugId === fromParams.postSlugId &&
    toProjectSlug === fromProjectSlug
  );
}

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const { conversationGuard, loggedInGuard } = useRouterGuard();
  addProjectOnboardingAliases({ routeRecords: routes });

  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === "history"
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: (to, from, savedPosition) => {
      if (isConversationTabSwitch({ to, from })) {
        return false;
      }

      if (savedPosition) {
        return { left: 0, top: savedPosition.top };
      }
      // WeChat fallback: replaceState fails in WeChat's WKWebView, so scroll
      // positions are saved to sessionStorage by the embeddedBrowserGuard patch
      try {
        const key = `wechat-scroll:${to.path}`;
        const stored = sessionStorage.getItem(key);
        if (stored) {
          sessionStorage.removeItem(key);
          const scroll = z.object({ top: z.number().optional() }).parse(JSON.parse(stored));
          return { left: 0, top: scroll.top ?? 0 };
        }
      } catch {
        // Ignore parse errors or sessionStorage restrictions
      }
      return { left: 0, top: 0 };
    },
    routes,
    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach((to, from) => {
    // Redirect parent layout routes to their default child route.
    // Without this, navigating to the parent route renders the layout
    // but leaves <router-view> empty (no child component rendered).
    if (to.name === "/conversation/[postSlugId]") {
      return {
        name: "/conversation/[postSlugId]/",
        params: to.params,
        query: to.query,
        hash: to.hash,
      };
    }

    if (to.name === "/conversation/[postSlugId].embed") {
      return {
        name: "/conversation/[postSlugId].embed/",
        params: to.params,
        query: to.query,
        hash: to.hash,
      };
    }

    if (to.name === "/conversation/[postSlugId].onboarding") {
      if ("projectSlug" in to.params) {
        return {
          path: getConversationSurveyOnboardingPath({
            conversationSlugId: getSingleRouteParam(
              "postSlugId" in to.params ? to.params.postSlugId : undefined
            ),
            routeContext: {
              kind: "project",
              projectSlug: getSingleRouteParam(
                "projectSlug" in to.params ? to.params.projectSlug : undefined
              ),
            },
          }),
          query: to.query,
          hash: to.hash,
        };
      }

      return {
        name: "/conversation/[postSlugId].onboarding/",
        params: to.params,
        query: to.query,
        hash: to.hash,
      };
    }

    if (to.name === "/project/[projectSlug]/conversation/[postSlugId]") {
      return {
        name: "/project/[projectSlug]/conversation/[postSlugId]/",
        params: to.params,
        query: to.query,
        hash: to.hash,
      };
    }

    const loggedInTarget = loggedInGuard(to.name);
    if (loggedInTarget === "home") {
      return { name: "/" };
    }

    const target = conversationGuard(to.name, from.name);
    if (target == "home") {
      return { name: "/" };
    }
  });

  Router.onError((error, to) => {
    if (isChunkLoadError(error)) {
      reloadForChunkError({ navigateTo: to.fullPath });
    }
  });

  /*
  // This will update routes at runtime without reloading the page
  if (import.meta.hot) {
    handleHotUpdate(Router);
  }
  */

  return Router;
});
