import { defineStore } from "pinia";
import { RouteMap, RouteMapGeneric } from "vue-router";
import type { RouteNamedMap } from "vue-router/auto-routes";

export const useRouteStateStore = defineStore("routeState", () => {
  const unreturnableRoutes: (keyof RouteNamedMap)[] = ["/conversation/create/"];
  type GoBackObject =
    | {
        routeItem: RouteItem;
        useSpecialRoute: true;
      }
    | {
        useSpecialRoute: false;
      };

  interface RouteItem {
    name: keyof RouteNamedMap;
    params: RouteMapGeneric[keyof RouteMap]["params"];
  }

  const routingHistoryList: RouteItem[] = [];

  let ignoreNextRouterInsert = false;

  async function goBack(): Promise<GoBackObject> {
    ignoreNextRouterInsert = true;

    if (routingHistoryList.length == 0) {
      return {
        routeItem: {
          name: "/",
          params: {},
        },
        useSpecialRoute: true,
      };
    }

    const lastRouteItem = routingHistoryList.at(-1);
    if (lastRouteItem) {
      if (unreturnableRoutes.includes(lastRouteItem.name)) {
        routingHistoryList.pop();
        return await goBack();
      } else {
        routingHistoryList.pop();
        return {
          useSpecialRoute: true,
          routeItem: {
            name: lastRouteItem.name,
            params: lastRouteItem.params,
          },
        };
      }
    } else {
      console.error("Failed to fetch last route");
      return {
        useSpecialRoute: false,
      };
    }
  }

  function storeFromName(
    fromName: keyof RouteMap,
    fromParams: RouteMapGeneric[keyof RouteMap]["params"],
    toName: keyof RouteMap
  ) {
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

    routingHistoryList.push({ name: fromName, params: fromParams });
    // console.log(routingHistoryList);
  }

  return { goBack, storeFromName };
});
