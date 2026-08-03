import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

import { navigateHomeAfterLogout } from "./logoutNavigation";

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "/", component: {} },
      { path: "/settings", name: "settings", component: {} },
    ],
  });
}

describe("navigateHomeAfterLogout", () => {
  it("replaces the current route with home", async () => {
    const router = createTestRouter();
    await router.push("/settings");

    await expect(navigateHomeAfterLogout(router)).resolves.toBeUndefined();

    expect(router.currentRoute.value.path).toBe("/");
  });

  it("treats an already-active home route as success", async () => {
    const router = createTestRouter();
    await router.push("/");

    await expect(navigateHomeAfterLogout(router)).resolves.toBeUndefined();
  });

  it("rejects when a navigation guard aborts leaving the current route", async () => {
    const router = createTestRouter();
    await router.push("/settings");
    router.beforeEach((to) => (to.path === "/" ? false : true));

    await expect(navigateHomeAfterLogout(router)).rejects.toMatchObject({
      from: { path: "/settings" },
      to: { path: "/" },
    });
    expect(router.currentRoute.value.path).toBe("/settings");
  });
});
