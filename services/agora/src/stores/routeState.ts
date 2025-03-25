import { defineStore } from "pinia";
import { LocationQuery, RouteMap, RouteMapGeneric } from "vue-router";
import type { RouteNamedMap } from "vue-router/auto-routes";

export const useRouteStateStore = defineStore("routeState", () => {
  const returnToHomeRoutes: (keyof RouteNamedMap)[] = [
    "/onboarding/step3-phone-2/",
    "/onboarding/step3-passport/",
    "/onboarding/step4-username/",
  ];
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
    query: LocationQuery;
  }

  const routingHistoryList: RouteItem[] = [];

  let ignoreNextRouterInsert = false;

  function goBack(): GoBackObject {
    ignoreNextRouterInsert = true;

    if (routingHistoryList.length == 0) {
      return {
        routeItem: {
          name: "/",
          params: {},
          query: {},
        },
        useSpecialRoute: true,
      };
    }

    const lastRouteItem = routingHistoryList.at(-1);
    if (lastRouteItem) {
      if (unreturnableRoutes.includes(lastRouteItem.name)) {
        routingHistoryList.pop();
        return goBack();
      } else if (returnToHomeRoutes.includes(lastRouteItem.name)) {
        return {
          useSpecialRoute: true,
          routeItem: {
            name: "/",
            params: {},
            query: {},
          },
        };
      } else {
        routingHistoryList.pop();
        return {
          useSpecialRoute: true,
          routeItem: {
            name: lastRouteItem.name,
            params: lastRouteItem.params,
            query: lastRouteItem.query,
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
    fromQuery: LocationQuery,
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

    routingHistoryList.push({
      name: fromName,
      params: fromParams,
      query: fromQuery,
    });
    // console.log(routingHistoryList);
  }

  return { goBack, storeFromName };
});
