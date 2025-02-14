import { defineStore } from "pinia";
import { RouteMap } from "vue-router";
import type { RouteNamedMap } from "vue-router/auto-routes";

export const useRouteStateStore = defineStore("routeState", () => {
  const unreturnableRoutes: (keyof RouteNamedMap)[] = ["/conversation/create/"];
  interface GoBackObject {
    routeName?: keyof RouteNamedMap;
    useSpecialRoute: boolean;
  }

  const routingHistoryList: (keyof RouteNamedMap)[] = [];

  let ignoreNextRouterInsert = false;

  async function goBack(): Promise<GoBackObject> {
    ignoreNextRouterInsert = true;

    if (routingHistoryList.length == 0) {
      return {
        routeName: "/",
        useSpecialRoute: true,
      };
    }

    const lastRouteName = routingHistoryList.at(-1);
    if (lastRouteName) {
      if (unreturnableRoutes.includes(lastRouteName)) {
        routingHistoryList.pop();
        return await goBack();
      } else {
        routingHistoryList.pop();
        return {
          useSpecialRoute: true,
          routeName: lastRouteName,
        };
      }
    } else {
      console.error("Failed to fetch last route");
      return {
        useSpecialRoute: false,
      };
    }
  }

  function storeFromName(fromName: keyof RouteMap, toName: keyof RouteMap) {
    if (ignoreNextRouterInsert) {
      ignoreNextRouterInsert = false;
      return;
    }

    if (fromName == toName) {
      return;
    }
    /*
    const parentPopoutRoutes: (keyof RouteNamedMap)[] = [
      "/help/",
      "/settings/",
    ];
    if (parentPopoutRoutes.includes(fromName)) {
    }
    */

    routingHistoryList.push(fromName);
    // console.log(routingHistoryList);
  }

  return { goBack, storeFromName };
});
