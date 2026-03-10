import { isChunkLoadError, reloadForChunkError } from "src/utils/error/chunkError";
import { useRouterGuard } from "src/utils/router/guard";
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteLocationNormalizedLoaded,
} from "vue-router";
import { routes } from "vue-router/auto-routes";
import { z } from "zod";

import { defineRouter } from "#q-app/wrappers";

const conversationTabRouteNames: ReadonlySet<string> = new Set([
  "/conversation/[postSlugId]/",
  "/conversation/[postSlugId]/analysis",
  "/conversation/[postSlugId].embed/",
  "/conversation/[postSlugId].embed/analysis",
]);

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

  return toParams.postSlugId === fromParams.postSlugId;
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
  const { conversationGuard } = useRouterGuard();

  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === "history"
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: (to, from, savedPosition) => {
      if (isConversationTabSwitch({ to, from })) {
        if (savedPosition) {
          return { left: 0, top: savedPosition.top };
        }
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

    const target = conversationGuard(to.name, from.name);
    if (target == "home") {
      return { name: "/" };
    }
  });

  // Auto-reload when a stale chunk fails to load after deployment.
  // Uses shared utility — the inline script in index.html and the
  // chunkErrorRecovery boot file handle non-router chunk failures.
  Router.onError((error, to) => {
    if (isChunkLoadError(error)) {
      // Navigate to the target path so the URL stays correct after reload
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
