import { describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

import { getRetiredConversationRoutes } from "./retiredConversationRoutes";

describe("retired conversation URLs", () => {
  it.each([
    "/conversation/example/onboarding/verify",
    "/conversation/example/embed/onboarding/verify",
    "/project/project/conversation/example/onboarding/verify",
  ])(
    "redirects %s/ticket before mounting a page and preserves query and history",
    async (target) => {
      const page = { template: "<div />" };
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: "/before", component: page },
          { path: target, component: page },
          ...getRetiredConversationRoutes(),
        ],
      });
      const guardedPaths: string[] = [];
      router.beforeEach((to) => {
        guardedPaths.push(to.path);
      });
      await router.push("/before");
      await router.push(`${target}/ticket?source=shared#answers`);
      expect(router.currentRoute.value.fullPath).toBe(
        `${target}?source=shared#answers`
      );
      expect(router.currentRoute.value.redirectedFrom?.path).toBe(
        `${target}/ticket`
      );
      expect(guardedPaths).toEqual(["/before", target]);
      router.back();
      await vi.waitFor(() =>
        expect(router.currentRoute.value.path).toBe("/before")
      );
    }
  );

  it("accepts a bookmarked URL with a trailing slash", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/conversation/:postSlugId/onboarding/verify",
          component: { template: "<div />" },
        },
        ...getRetiredConversationRoutes(),
      ],
    });
    await router.push("/conversation/example/onboarding/verify/ticket/");
    expect(router.currentRoute.value.path).toBe(
      "/conversation/example/onboarding/verify"
    );
  });
});
