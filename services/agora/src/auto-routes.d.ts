import type { RouteRecordRaw, Router } from "vue-router";

declare module "vue-router/auto-routes" {
  export const routes: RouteRecordRaw[];

  export function handleHotUpdate(
    router: Router,
    hotUpdateCallback?: (newRoutes: RouteRecordRaw[]) => void,
  ): void;
}
