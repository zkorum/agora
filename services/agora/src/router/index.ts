import { useRouterGuard } from "src/utils/router/guard";
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from "vue-router";
import { routes } from "vue-router/auto-routes";
import { z } from "zod";

import { defineRouter } from "#q-app/wrappers";

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
    scrollBehavior: (to, _from, savedPosition) => {
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

    const target = conversationGuard(to.name, from.name);
    if (target == "home") {
      return { name: "/" };
    }
  });

  // Auto-reload when a stale chunk fails to load after deployment.
  // @see https://stackoverflow.com/questions/69300341/typeerror-failed-to-fetch-dynamically-imported-module-on-vue-vite-vanilla-set
  // @see https://github.com/vitejs/vite/issues/11804#issuecomment-1406182566
  Router.onError((error, to) => {
    if (
      error.message.includes("Failed to fetch dynamically imported module") ||
      error.message.includes("Loading chunk") ||
      error.message.includes("Loading CSS chunk")
    ) {
      const reloadKey = "chunk-reload";
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (lastReload && now - Number(lastReload) < 10000) {
        console.error(
          "[Router] Chunk load failed after reload, giving up",
          error
        );
        return;
      }
      sessionStorage.setItem(reloadKey, String(now));
      window.location.href = to.fullPath;
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
