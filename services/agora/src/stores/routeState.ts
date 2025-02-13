import { defineStore } from "pinia";
import { RouteMap } from "vue-router";
import type { RouteNamedMap } from "vue-router/auto-routes";

export const useRouteStateStore = defineStore("routeState", () => {
  const unreturnableRoutes: (keyof RouteNamedMap)[] = [
    "/conversation/create/",
    "/help/",
    "/settings/",
  ];

  interface GoBackObject {
    routeName?: keyof RouteNamedMap;
    useSpecialRoute: boolean;
  }

  const routingHistoryList: (keyof RouteNamedMap)[] = [];

  async function goBack(): Promise<GoBackObject> {
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

  function storeFromName(name: keyof RouteMap) {
    routingHistoryList.push(name);
  }

  return { goBack, storeFromName };
});
