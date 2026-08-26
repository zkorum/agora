import type * as QuasarModule from "quasar";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick, ref } from "vue";
import { createI18n } from "vue-i18n";

vi.mock("quasar", async (importOriginal) => {
  const quasar = await importOriginal<typeof QuasarModule>();
  return {
    ...quasar,
    ClosePopup: {},
    useQuasar: () => ({
      lang: { rtl: false, label: { close: "Close" } },
    }),
  };
});

import ConversationUpdateScopeFields from "./ConversationUpdateScopeFields.vue";
import {
  CONVERSATION_UPDATE_NO_PROJECT_SCOPE_ID,
  type ConversationUpdateConversationSummary,
  type ConversationUpdateScopeSummary,
} from "./conversationUpdateTypes";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("ConversationUpdateScopeFields selection flow", () => {
  it("clears a project selection and chooses exactly one No Project conversation", async () => {
    const selectedScopeId = ref("project-one");
    const selectedConversationIds = ref<readonly string[]>([
      "projconv01",
      "projconv02",
    ]);
    const container = document.createElement("div");
    document.body.append(container);
    const root = defineComponent(
      () => () =>
        h(ConversationUpdateScopeFields, {
          scopes,
          updatesDisabledConversationIds: [],
          disabled: false,
          selectedScopeId: selectedScopeId.value,
          selectedConversationIds: selectedConversationIds.value,
          "onUpdate:selectedScopeId": (value: string) => {
            selectedScopeId.value = value;
          },
          "onUpdate:selectedConversationIds": (value: readonly string[]) => {
            selectedConversationIds.value = value;
          },
        })
    );
    const app = createApp(root);
    app.use(createI18n({ legacy: false, locale: "en", messages: {} }));
    registerQuasarStubs(app);
    mountedApps.push(app);
    app.mount(container);

    const projectTrigger = getSelectTriggers(container)[0];
    expect(projectTrigger?.getAttribute("role")).toBeNull();
    expect(projectTrigger?.textContent).toContain("Project");
    expect(projectTrigger?.textContent).toContain("*");
    expect(projectTrigger?.textContent).toContain("Required.");

    projectTrigger?.click();
    await nextTick();
    getOption(container, "No Project").click();
    await nextTick();

    expect(selectedScopeId.value).toBe(CONVERSATION_UPDATE_NO_PROJECT_SCOPE_ID);
    expect(selectedConversationIds.value).toEqual([]);

    getSelectTriggers(container)[1]?.click();
    await nextTick();
    getOption(container, "Standalone conversation two").click();
    await nextTick();

    expect(selectedConversationIds.value).toEqual(["standtwo02"]);
    expect(getSelectTriggers(container)[1]?.textContent).toContain(
      "Standalone conversation two"
    );
  });
});

const scopes: readonly ConversationUpdateScopeSummary[] = [
  {
    id: "project-one",
    kind: "project",
    label: "Project One",
    href: "/project/project-one",
    contactEmail: "project@example.com",
    eligibleParticipantCap: 2,
    conversations: [
      conversation({
        id: "projconv01",
        title: "Project conversation one",
      }),
      conversation({
        id: "projconv02",
        title: "Project conversation two",
      }),
    ],
  },
  {
    id: CONVERSATION_UPDATE_NO_PROJECT_SCOPE_ID,
    kind: "no-project",
    label: "No Project",
    href: undefined,
    contactEmail: "standalone@example.com",
    eligibleParticipantCap: 2,
    conversations: [
      conversation({
        id: "standone01",
        title: "Standalone conversation one",
      }),
      conversation({
        id: "standtwo02",
        title: "Standalone conversation two",
      }),
    ],
  },
];

function conversation({
  id,
  title,
}: {
  id: string;
  title: string;
}): ConversationUpdateConversationSummary {
  return {
    id,
    title,
    href: `/conversation/${id}`,
    eligibleParticipantCount: 1,
    participationMode: "account_required" as const,
    ownerIds: [],
  };
}

function registerQuasarStubs(app: App): void {
  app.component(
    "QDialog",
    defineComponent({
      props: { modelValue: { type: Boolean, required: true } },
      setup(props, { slots }) {
        return () => (props.modelValue ? h("div", slots.default?.()) : null);
      },
    })
  );
  app.component(
    "QItem",
    defineComponent({
      inheritAttrs: false,
      props: { disable: { type: Boolean, default: false } },
      setup(props, { attrs, slots }) {
        return () =>
          h(
            "button",
            { ...attrs, type: "button", disabled: props.disable },
            slots.default?.()
          );
      },
    })
  );
  for (const name of ["QList", "QItemSection", "QItemLabel"] as const) {
    app.component(
      name,
      defineComponent(
        (_props, { slots }) =>
          () =>
            h("div", slots.default?.())
      )
    );
  }
  app.component(
    "QInput",
    defineComponent(() => () => h("input"))
  );
  app.component(
    "QBtn",
    defineComponent(() => () => h("button"))
  );
  app.component(
    "QIcon",
    defineComponent(() => () => null)
  );
}

function getSelectTriggers(container: HTMLElement): HTMLButtonElement[] {
  return [
    ...container.querySelectorAll<HTMLButtonElement>(".zk-drawer-select"),
  ];
}

function getOption(container: HTMLElement, label: string): HTMLButtonElement {
  const option = [
    ...container.querySelectorAll<HTMLButtonElement>(
      ".zk-drawer-select__option"
    ),
  ].find((candidate) => candidate.textContent?.includes(label));
  if (option === undefined) {
    throw new Error(`Option not found: ${label}`);
  }
  return option;
}
