import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, ref } from "vue";

vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("src/components/ui-library/ZKConfirmDialog.vue", () => ({
  default: defineComponent({
    props: {
      modelValue: { type: Boolean, required: true },
      title: { type: String, required: true },
      message: { type: String, required: true },
      confirmText: { type: String, required: true },
      cancelText: { type: String, required: true },
      alternateText: { type: String, required: true },
      persistent: { type: Boolean, required: true },
      variant: { type: String, required: true },
    },
    emits: ["confirm", "cancel", "alternate", "update:modelValue"],
    setup(props, { emit }) {
      return () =>
        props.modelValue
          ? h(
              "div",
              {
                "data-testid": "dialog",
                "data-message": props.message,
                "data-persistent": String(props.persistent),
                "data-variant": props.variant,
              },
              [
                h(
                  "button",
                  { onClick: () => emit("alternate") },
                  props.alternateText
                ),
                h(
                  "button",
                  { onClick: () => emit("cancel") },
                  props.cancelText
                ),
                h(
                  "button",
                  { onClick: () => emit("confirm") },
                  props.confirmText
                ),
              ]
            )
          : null;
    },
  }),
}));

import ConversationUpdatesPartialEmailReachDialog from "./ConversationUpdatesPartialEmailReachDialog.vue";
import type {
  PartialEmailReachAction,
  PartialEmailReachParticipationMode,
} from "./conversationUpdatesPartialEmailReachLogic";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("ConversationUpdatesPartialEmailReachDialog", () => {
  it.each([
    ["account_required", "accountPartialReach"],
    ["guest", "guestPartialReach"],
    ["strong_verification", "strongVerificationPartialReach"],
  ] as const)("shows the %s warning", (mode, expectedMessage) => {
    const { container } = mountDialog(mode, vi.fn());
    const dialog = container.querySelector('[data-testid="dialog"]');

    expect(dialog?.getAttribute("data-message")).toBe(expectedMessage);
    expect(dialog?.getAttribute("data-persistent")).toBe("true");
    expect(dialog?.getAttribute("data-variant")).toBe("warning");
  });

  it.each([
    ["turnUpdatesOff", "turn_updates_off"],
    ["enforceEmailVerificationOnly", "enforce_email_verification"],
    ["keepUpdatesOn", "keep_updates_on"],
  ] satisfies ReadonlyArray<[string, PartialEmailReachAction]>)(
    "emits %s as %s",
    (label, expectedAction) => {
      const onAction = vi.fn();
      const { container } = mountDialog("guest", onAction);
      getButton(container, label).click();

      expect(onAction).toHaveBeenCalledWith(expectedAction);
    }
  );
});

function mountDialog(
  mode: PartialEmailReachParticipationMode,
  onAction: (action: PartialEmailReachAction) => void
): { container: HTMLElement } {
  const container = document.createElement("div");
  document.body.append(container);
  const warningMode = ref<PartialEmailReachParticipationMode | undefined>(mode);
  const root = defineComponent(
    () => () =>
      h(ConversationUpdatesPartialEmailReachDialog, {
        modelValue: warningMode.value,
        "onUpdate:modelValue": (value) => {
          warningMode.value = value;
        },
        onAction,
      })
  );
  const app = createApp(root);
  mountedApps.push(app);
  app.mount(container);
  return { container };
}

function getButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => candidate.textContent === label
  );
  if (button === undefined) {
    throw new Error(`Button not found: ${label}`);
  }
  return button;
}
