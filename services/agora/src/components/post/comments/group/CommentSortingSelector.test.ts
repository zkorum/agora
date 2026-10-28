import { createPinia, defineStore } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";

vi.mock("src/stores/user", () => ({
  useUserStore: defineStore("test-user", {
    state: () => ({ profileData: { isSiteModerator: false } }),
  }),
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("src/components/ui-library/ZKDropdownSelectorButton.vue", () => ({
  default: defineComponent(
    (props: { label: string }) => () => h("button", props.label),
    { props: { label: { type: String, required: true } } }
  ),
}));
vi.mock("src/components/ui-library/ZKBottomDialogContainer.vue", () => ({
  default: defineComponent(
    (_, { slots }) =>
      () =>
        h("div", slots.default?.())
  ),
}));
vi.mock("src/components/ui-library/ZKGradientButton.vue", () => ({
  default: defineComponent(
    (props: { label: string; labelColor: string }) => () =>
      h(
        "button",
        {
          "data-filter-option": props.label,
          "aria-pressed": props.labelColor === "#FFFFFF",
        },
        props.label
      ),
    {
      props: {
        label: { type: String, required: true },
        labelColor: { type: String, required: true },
      },
    }
  ),
}));

import CommentSortingSelector from "./CommentSortingSelector.vue";

let app: ReturnType<typeof createApp> | undefined;
afterEach(() => {
  app?.unmount();
  document.body.replaceChildren();
});

function mountSelector(filter: CommentFilterOptions) {
  const pinia = createPinia();
  const container = document.createElement("div");
  document.body.append(container);
  app = createApp(CommentSortingSelector, {
    filterValue: filter,
    moderatedOpinionCount: 0,
    hiddenOpinionCount: 0,
  });
  app.use(pinia);
  app.component(
    "QDialog",
    defineComponent(
      (_, { slots }) =>
        () =>
          h("div", slots.default?.())
    )
  );
  app.mount(container);
  return {
    label: () => container.querySelector("button")?.textContent,
    auth: useAuthenticationStore(pinia),
    user: useUserStore(pinia),
    container,
  };
}

describe("statement filter availability", () => {
  it.each([
    "my_statements",
    "my_votes",
    "hidden",
  ] satisfies CommentFilterOptions[])(
    "shows Discover for an anonymous %s link",
    (filter) => {
      const { label, container } = mountSelector(filter);
      expect(label()).toBe("discover");
      expect(
        container
          .querySelector('[data-filter-option="discover"]')
          ?.getAttribute("aria-pressed")
      ).toBe("true");
      expect(
        container.querySelector('[data-filter-option="myStatements"]')
      ).toBeNull();
      expect(
        container.querySelector('[data-filter-option="myVotes"]')
      ).toBeNull();
      expect(
        container.querySelector('[data-filter-option="hidden"]')
      ).toBeNull();
    }
  );

  it.each([
    { filter: "my_statements", expectedLabel: "myStatements" },
    { filter: "my_votes", expectedLabel: "myVotes" },
  ] satisfies Array<{ filter: CommentFilterOptions; expectedLabel: string }>)(
    "updates $filter as guest, login, and logout access changes",
    async ({ filter, expectedLabel }) => {
      const { label, auth } = mountSelector(filter);
      auth.setLoginStatus({ isKnown: true, userId: "viewer" });
      await nextTick();
      expect(label()).toBe(expectedLabel);

      auth.setLoginStatus({ isRegistered: true, isLoggedIn: true });
      await nextTick();
      expect(label()).toBe(expectedLabel);

      // A registered device still has a user ID after its login expires.
      auth.setLoginStatus({ isLoggedIn: false });
      await nextTick();
      expect(auth.userId).toBe("viewer");
      expect(label()).toBe("discover");
    }
  );

  it("requires an active moderator session for hidden statements", async () => {
    const { label, auth, user } = mountSelector("hidden");
    auth.setLoginStatus({ isKnown: true, userId: "viewer" });
    await nextTick();
    expect(label()).toBe("discover");

    user.profileData.isSiteModerator = true;
    await nextTick();
    expect(label()).toBe("discover");

    auth.setLoginStatus({ isRegistered: true, isLoggedIn: true });
    await nextTick();
    expect(label()).toBe("hidden");

    auth.setLoginStatus({ isKnown: false });
    await nextTick();
    expect(label()).toBe("discover");
  });

  it.each(["discover", "new", "moderated"] satisfies CommentFilterOptions[])(
    "keeps the public %s filter available anonymously",
    (filter) => {
      const { label } = mountSelector(filter);
      expect(label()).toBe(
        filter === "moderated" ? "moderationHistory" : filter
      );
    }
  );
});
