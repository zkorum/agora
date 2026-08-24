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

async function mountEditor({
  modelValue,
  singleLine,
  placeholder = "Write here",
  submitOnShiftEnter = false,
  onSubmit = undefined,
}: {
  modelValue: string;
  singleLine: boolean;
  placeholder?: string;
  submitOnShiftEnter?: boolean;
  onSubmit?: () => void;
}): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.append(container);

  const app = createApp(Editor, {
    modelValue,
    plainText: "",
    showToolbar: false,
    placeholder,
    minHeight: "auto",
    disabled: false,
    singleLine,
    submitOnShiftEnter,
    onSubmit,
  });
  mountedApps.push(app);
  app.mount(container);

  return vi.waitUntil(() => {
    const editorElement = container.querySelector(".ProseMirror");
    return editorElement instanceof HTMLElement ? editorElement : undefined;
  });
}

function selectText({
  editorElement,
  text,
  atEnd,
}: {
  editorElement: HTMLElement;
  text: string;
  atEnd: boolean;
}): void {
  const paragraph = Array.from(editorElement.querySelectorAll("p")).find(
    (element) => element.textContent === text
  );
  const textNode = paragraph?.firstChild;
  const selection = window.getSelection();
  if (!(textNode instanceof Text) || selection === null) {
    throw new Error(`Unable to select editor text: ${text}`);
  }

  const range = document.createRange();
  range.setStart(textNode, atEnd ? textNode.length : 1);
  range.collapse(true);
  editorElement.focus();
  selection.removeAllRanges();
  selection.addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
  // ProseMirror only requests unavailable layout geometry from jsdom while focused.
  editorElement.blur();
}

function pressTab({
  editorElement,
  shiftKey,
}: {
  editorElement: HTMLElement;
  shiftKey: boolean;
}): KeyboardEvent {
  const keyboardEvent = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: "Tab",
    shiftKey,
  });
  editorElement.dispatchEvent(keyboardEvent);
  return keyboardEvent;
}

function pressEnter({
  editorElement,
  shiftKey,
  altKey = false,
  ctrlKey = false,
  metaKey = false,
  isComposing = false,
  repeat = false,
}: {
  editorElement: HTMLElement;
  shiftKey: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  isComposing?: boolean;
  repeat?: boolean;
}): KeyboardEvent {
  const keyboardEvent = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: "Enter",
    shiftKey,
    altKey,
    ctrlKey,
    metaKey,
    isComposing,
    repeat,
  });
  editorElement.dispatchEvent(keyboardEvent);
  return keyboardEvent;
}

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("Editor", () => {
  it("preserves line breaks in a multiline placeholder", async () => {
    const placeholder =
      "Share an update:\n• Share results\n• Explain changes\n\nRemember the whole group.";
    const editorElement = await mountEditor({
      modelValue: "",
      singleLine: false,
      placeholder,
    });

    expect(editorElement.querySelector("p")?.dataset.placeholder).toBe(
      placeholder
    );
  });

  it.each([
    { shortcut: "Tab", shiftKey: false },
    { shortcut: "Shift-Tab", shiftKey: true },
  ])(
    "preserves default $shortcut behavior in single-line mode",
    async ({ shiftKey }) => {
      const editorElement = await mountEditor({
        modelValue: "Conversation title",
        singleLine: true,
      });
      let keyboardError: ErrorEvent | undefined;
      const captureKeyboardError = (event: ErrorEvent): void => {
        event.preventDefault();
        keyboardError = event;
      };
      window.addEventListener("error", captureKeyboardError);

      let keyboardEvent: KeyboardEvent;
      try {
        keyboardEvent = pressTab({ editorElement, shiftKey });
      } finally {
        window.removeEventListener("error", captureKeyboardError);
      }
      expect(keyboardError).toBeUndefined();
      expect(keyboardEvent.defaultPrevented).toBe(false);
    }
  );

  it("indents a bullet item with Tab without adding an empty paragraph", async () => {
    const editorElement = await mountEditor({
      modelValue: "<ul><li><p>Parent</p></li><li><p>Child</p></li></ul>",
      singleLine: false,
    });
    selectText({ editorElement, text: "Child", atEnd: false });

    const keyboardEvent = pressTab({ editorElement, shiftKey: false });

    expect(keyboardEvent.defaultPrevented).toBe(true);
    expect(editorElement.innerHTML).toBe(
      "<ul><li><p>Parent</p><ul><li><p>Child</p></li></ul></li></ul>"
    );
  });

  it("outdents a bullet item with Shift-Tab without adding an empty paragraph", async () => {
    const editorElement = await mountEditor({
      modelValue:
        "<ul><li><p>Parent</p><ul><li><p>Child</p></li></ul></li></ul>",
      singleLine: false,
    });
    selectText({ editorElement, text: "Child", atEnd: false });

    const keyboardEvent = pressTab({ editorElement, shiftKey: true });

    expect(keyboardEvent.defaultPrevented).toBe(true);
    expect(editorElement.innerHTML).toBe(
      "<ul><li><p>Parent</p></li><li><p>Child</p></li></ul>"
    );
  });

  it("creates a sub-bullet with Tab at the end of a first bullet", async () => {
    const editorElement = await mountEditor({
      modelValue: "<ul><li><p>Parent</p></li></ul>",
      singleLine: false,
    });
    selectText({ editorElement, text: "Parent", atEnd: true });

    const keyboardEvent = pressTab({ editorElement, shiftKey: false });

    expect(keyboardEvent.defaultPrevented).toBe(true);
    expect(editorElement.querySelectorAll("ul")).toHaveLength(2);
    expect(editorElement.querySelector("ul ul p")?.textContent).toBe("");
  });

  it("inserts a visible tab outside a list", async () => {
    const editorElement = await mountEditor({
      modelValue: "<p>Paragraph</p>",
      singleLine: false,
    });
    selectText({ editorElement, text: "Paragraph", atEnd: false });

    const keyboardEvent = pressTab({ editorElement, shiftKey: false });

    expect(keyboardEvent.defaultPrevented).toBe(true);
    expect(editorElement.querySelector("p")?.textContent).toBe("P\taragraph");
  });

  it("uses Enter for a new bullet when Shift-Enter submission is enabled", async () => {
    const onSubmit = vi.fn();
    const editorElement = await mountEditor({
      modelValue: "<ul><li><p>Statement</p></li></ul>",
      singleLine: false,
      submitOnShiftEnter: true,
      onSubmit,
    });
    selectText({ editorElement, text: "Statement", atEnd: true });

    const keyboardEvent = pressEnter({ editorElement, shiftKey: false });

    expect(keyboardEvent.defaultPrevented).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(editorElement.querySelectorAll("li")).toHaveLength(2);
  });

  it("submits with Shift-Enter without changing the editor", async () => {
    const onSubmit = vi.fn();
    const editorElement = await mountEditor({
      modelValue: "<p>Statement</p>",
      singleLine: false,
      submitOnShiftEnter: true,
      onSubmit,
    });
    selectText({ editorElement, text: "Statement", atEnd: true });

    const keyboardEvent = pressEnter({ editorElement, shiftKey: true });

    expect(keyboardEvent.defaultPrevented).toBe(true);
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(editorElement.innerHTML).toBe("<p>Statement</p>");
  });

  it.each([
    { name: "Alt", altKey: true },
    { name: "Control", ctrlKey: true },
    { name: "Meta", metaKey: true },
    { name: "IME composition", isComposing: true },
    { name: "key repeat", repeat: true },
  ])("does not submit for Shift-Enter with $name", async (keyboardOptions) => {
    const onSubmit = vi.fn();
    const editorElement = await mountEditor({
      modelValue: "<p>Statement</p>",
      singleLine: false,
      submitOnShiftEnter: true,
      onSubmit,
    });
    selectText({ editorElement, text: "Statement", atEnd: true });

    pressEnter({
      editorElement,
      shiftKey: true,
      ...keyboardOptions,
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
