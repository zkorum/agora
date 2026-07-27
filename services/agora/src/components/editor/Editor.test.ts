import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp } from "vue";

vi.mock("quasar", () => ({
  useQuasar: () => ({
    platform: {
      is: {
        mobile: false,
      },
    },
  }),
}));

import Editor from "./Editor.vue";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("Editor", () => {
  it.each([
    { shortcut: "Tab", shiftKey: false },
    { shortcut: "Shift-Tab", shiftKey: true },
  ])(
    "preserves default $shortcut behavior in single-line mode",
    async ({ shiftKey }) => {
      const container = document.createElement("div");
      document.body.append(container);

      const app = createApp(Editor, {
        modelValue: "Conversation title",
        plainText: "Conversation title",
        showToolbar: false,
        placeholder: "Title",
        minHeight: "auto",
        disabled: false,
        singleLine: true,
      });
      mountedApps.push(app);
      app.mount(container);

      const editorElement = await vi.waitUntil(() =>
        container.querySelector(".ProseMirror")
      );
      let keyboardError: ErrorEvent | undefined;
      const captureKeyboardError = (event: ErrorEvent): void => {
        event.preventDefault();
        keyboardError = event;
      };
      window.addEventListener("error", captureKeyboardError);

      const keyboardEvent = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Tab",
        shiftKey,
      });
      try {
        editorElement.dispatchEvent(keyboardEvent);
      } finally {
        window.removeEventListener("error", captureKeyboardError);
      }
      expect(keyboardError).toBeUndefined();
      expect(keyboardEvent.defaultPrevented).toBe(false);
    }
  );
});
