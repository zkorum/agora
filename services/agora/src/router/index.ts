import { route } from "quasar/wrappers";
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from "vue-router";

import routes from "./routes";
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

  const lastNavigatedRouteName = useStorage("last-navigated-route-name", "");

  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === "history"
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: (from) => { // to, from, savedPosition
      /*
      if (to.name == "post-single") {
        if (savedPosition != null) {
          return { left: savedPosition.left, top: savedPosition.top };
        }
      }
      */
      lastNavigatedRouteName.value = from.name?.toString();
      // console.log(lastNavigatedRouteName.value);

      return { left: 0, top: 0 };
    },
    routes,
    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
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
