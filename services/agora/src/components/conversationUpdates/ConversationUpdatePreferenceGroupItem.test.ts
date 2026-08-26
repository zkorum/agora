import { QExpansionItem } from "quasar";
import type { ConversationEmailUpdatePreferenceGroup } from "src/shared/types/dto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick, ref } from "vue";
import { createI18n } from "vue-i18n";

vi.mock("src/components/ui-library/SpaLink.vue", () => ({
  default: defineComponent({
    props: { to: { type: String, required: true } },
    setup(props, { slots }) {
      return () => h("a", { href: props.to }, slots.default?.());
    },
  }),
}));
vi.mock("src/components/ui-library/ZKSwitch.vue", () => ({
  default: defineComponent(() => () => h("button", { "data-switch": "" })),
}));
vi.mock("src/components/account/DynamicProfileImage.vue", () => ({
  default: defineComponent({
    props: {
      organizationImageUrl: { type: String, default: undefined },
      userIdentity: { type: String, required: true },
    },
    setup(props) {
      return () =>
        h("img", {
          alt: props.userIdentity,
          src: props.organizationImageUrl,
        });
    },
  }),
}));

import ConversationUpdatePreferenceGroupItem from "./ConversationUpdatePreferenceGroupItem.vue";
import type { ProjectEmailUpdatePreferenceGroup } from "./conversationUpdatePreferenceTypes";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("ConversationUpdatePreferenceGroupItem", () => {
  it("shows conversations when its controlled model starts expanded", async () => {
    const container = await mountGroupItem({
      expanded: true,
      group: projectGroup,
    });

    expect(
      container.querySelector(".q-expansion-item--expanded")
    ).not.toBeNull();
    expect(container.textContent).toContain("Conversation One");
    const links = container.querySelectorAll<HTMLAnchorElement>("a");
    expect(links[0]?.getAttribute("href")).toBe("/project/project-one");
    expect(links[0]?.getAttribute("target")).toBeNull();
    expect(links[0]?.querySelector("img")?.getAttribute("src")).toBe(
      "https://images.example/project-owner.png"
    );
    expect(links[1]?.getAttribute("href")).toBe(
      "/project/project-one/conversation/conversation-one"
    );
    expect(links[1]?.getAttribute("target")).toBeNull();
    expect(links[1]?.querySelector("img")?.getAttribute("src")).toBe(
      "https://images.example/project-owner.png"
    );
    expect(links[1]?.classList).toContain("conversation-preference-row__link");
  });

  it("does not show an expansion affordance for an empty project", async () => {
    const container = await mountGroupItem({
      expanded: false,
      group: { ...projectGroup, conversations: [] },
    });

    expect(
      container.querySelector(".q-expansion-item__toggle-icon")
    ).toBeNull();
  });

  it("renders No Project as a foldable group with standalone links", async () => {
    const container = await mountGroupItem({
      expanded: true,
      group: noProjectGroup,
    });

    expect(container.textContent).toContain("No Project");
    expect(container.textContent).toContain("Standalone Conversation");
    const links = container.querySelectorAll<HTMLAnchorElement>("a");
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute("href")).toBe(
      "/conversation/standalone-conversation"
    );
    expect(links[0]?.getAttribute("target")).toBeNull();
    expect(links[0]?.querySelector("img")?.getAttribute("alt")).toBe(
      "standalone-owner"
    );
    expect(
      container.querySelector(".preference-group-item__switch")
    ).toBeNull();
  });
});

const projectGroup = {
  kind: "project",
  projectSlug: "project-one",
  projectTitle: "Project One",
  state: "enabled",
  resolvedEnabled: true,
  availability: "available",
  owner: {
    kind: "organization",
    displayName: "Project Owner",
    imageUrl: "https://images.example/project-owner.png",
  },
  conversations: [
    {
      conversationSlugId: "conversation-one",
      conversationTitle: "Conversation One",
      preferenceKind: "explicit",
      state: "enabled",
      resolvedEnabled: true,
      availability: "available",
    },
  ],
} satisfies ProjectEmailUpdatePreferenceGroup;

const noProjectGroup = {
  kind: "no_project",
  availability: "available",
  conversations: [
    {
      conversationSlugId: "standalone-conversation",
      conversationTitle: "Standalone Conversation",
      preferenceKind: "explicit",
      state: "enabled",
      resolvedEnabled: true,
      availability: "available",
      owner: {
        kind: "user",
        displayName: "standalone-owner",
      },
    },
  ],
} satisfies ConversationEmailUpdatePreferenceGroup;

async function mountGroupItem({
  expanded: initialExpanded,
  group,
}: {
  expanded: boolean;
  group: ConversationEmailUpdatePreferenceGroup;
}): Promise<HTMLElement> {
  const expanded = ref(initialExpanded);
  const root = defineComponent(
    () => () =>
      h(ConversationUpdatePreferenceGroupItem, {
        expanded: expanded.value,
        group,
        conversationPaginationError: undefined,
        controlsDisabled: false,
        isLoadingMoreConversations: false,
        label: group.kind === "project" ? group.projectTitle : "No Project",
        retryLabel: "Try again",
        showMoreLabel: "Show more",
        "onUpdate:expanded": (value: boolean) => {
          expanded.value = value;
        },
      })
  );
  const container = document.createElement("div");
  document.body.append(container);
  const app = createApp(root);
  Object.defineProperty(app.config.globalProperties, "$q", {
    value: {
      dark: { isActive: false },
      iconMapFn: () => undefined,
      iconSet: {
        expansionItem: {
          denseIcon: "keyboard_arrow_down",
          icon: "keyboard_arrow_down",
        },
      },
      lang: {
        label: {
          collapse: () => "Collapse",
          expand: () => "Expand",
        },
        rtl: false,
      },
      platform: { is: {} },
    },
  });
  app.component("QExpansionItem", QExpansionItem);
  app.use(createI18n({ legacy: false, locale: "en", messages: {} }));
  mountedApps.push(app);
  app.mount(container);
  await nextTick();
  return container;
}
