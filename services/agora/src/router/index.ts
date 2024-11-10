import { route } from "quasar/wrappers";
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from "vue-router";

import routes from "./routes";
import { useLastNavigatedRouteName } from "src/utils/nav/lastNavigatedRouteName";
import { useStorage } from "@vueuse/core";

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default route(function (/* { store, ssrContext } */) {

  const { lastNavigatedRouteFullPath, lastNavigatedRouteName } =
    useLastNavigatedRouteName();

  const lastSavedHomeFeedPosition = useStorage("last-saved-home-feed-position", 0);

  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === "history"
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: (to, from) => {
      // to, from, savedPosition
      const fromRouteName = from.name?.toString() ?? "";
      if (fromRouteName != "") {
        lastNavigatedRouteFullPath.value = from.fullPath;
        lastNavigatedRouteName.value = fromRouteName;
      }

      const toRouteName = to.name?.toString() ?? "";
      if (toRouteName == "default-home-feed" && fromRouteName == "single-post") {
        return { left: 0, top: lastSavedHomeFeedPosition.value };
      } else {
        return { left: 0, top: 0 };
      }

    },
    routes,
    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach(async (to, from) => {
    const toRouteName = to.name?.toString() ?? "";
    const fromRouteName = from.name?.toString() ?? "";
    if (toRouteName == "create-post" && fromRouteName == "single-post") {
      Router.go(-1);
    }
  });

  // @see https://stackoverflow.com/questions/69300341/typeerror-failed-to-fetch-dynamically-imported-module-on-vue-vite-vanilla-set
  // @see https://github.com/vitejs/vite/issues/11804#issuecomment-1406182566
  Router.onError((error, to) => {
    if (error.message.includes("Failed to fetch dynamically imported module")) {
      window.location.href = to.fullPath;
    }
  });

  /*
  if (!process.env.DEV) {
    const STARTING_PAGE = "welcome";

    Router.beforeEach(async (to) => {
      if (!useAuthenticationStore().isAuthenticated && to.name !== STARTING_PAGE) {
        return { name: STARTING_PAGE }
      }
    })
  }
  */

  return Router;
});
