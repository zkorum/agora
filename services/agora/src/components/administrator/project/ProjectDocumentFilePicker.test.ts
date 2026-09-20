import type * as QuasarModule from "quasar";
import {
  QBtn,
  QIcon,
  QItem,
  QItemLabel,
  QItemSection,
  Quasar,
  QUploader,
  QUploaderAddTrigger,
} from "quasar";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, h, nextTick, ref } from "vue";

import ProjectDocumentFilePicker from "./ProjectDocumentFilePicker.vue";

// Exercise browser drag/drop behavior rather than Quasar's Node/SSR entry point.
vi.mock("quasar", async () =>
  await vi.importActual<typeof QuasarModule>("quasar/dist/quasar.client.js")
);

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount();
  document.body.replaceChildren();
});

function mountPicker() {
  const modelValue = ref<File | null>(null);
  const disable = ref(false);
  const container = document.createElement("div");
  document.body.append(container);
  const app = createApp({
    setup: () => () =>
      h(ProjectDocumentFilePicker, {
        modelValue: modelValue.value,
        label: "Participant file",
        description: "Available to project participants",
        dropLabel: "Choose file",
        removeLabel: "Remove file",
        accept: ".pdf",
        maxFileSize: 1_000,
        disable: disable.value,
        "onUpdate:modelValue": (file: File | null) => {
          modelValue.value = file;
        },
      }),
  });
  app.use(Quasar, {
    components: {
      QBtn,
      QIcon,
      QItem,
      QItemLabel,
      QItemSection,
      QUploader,
      QUploaderAddTrigger,
    },
  });
  mountedApps.push(app);
  app.mount(container);
  return { container, modelValue, disable };
}

function selectFile(container: HTMLElement): File {
  const input = container.querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement))
    throw new Error("Missing file input");
  const file = new File(["report"], "report.pdf", {
    type: "application/pdf",
  });
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return file;
}

function removeButton(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector(
    '[aria-label="Remove file: report.pdf"]'
  );
  if (!(button instanceof HTMLButtonElement))
    throw new Error("Missing remove button");
  return button;
}

describe("ProjectDocumentFilePicker", () => {
  it("removes a pending file after selection with an active drag overlay and allows reselecting it", async () => {
    const { container, modelValue } = mountPicker();
    container.querySelector(".q-uploader")?.dispatchEvent(
      new Event("dragover", { bubbles: true, cancelable: true })
    );
    await nextTick();
    expect(container.querySelector(".q-uploader__dnd")).not.toBeNull();

    const file = selectFile(container);
    await nextTick();
    expect(modelValue.value).toBe(file);
    expect(container.querySelector(".q-uploader__dnd")).toBeNull();
    removeButton(container).click();
    await nextTick();
    expect(modelValue.value).toBeNull();

    const replacement = selectFile(container);
    await nextTick();
    expect(modelValue.value).toBe(replacement);
    expect(removeButton(container).disabled).toBe(false);
  });

  it("disables removal during upload and accepts another file after the draft resets", async () => {
    const { container, modelValue, disable } = mountPicker();
    selectFile(container);
    disable.value = true;
    await nextTick();
    expect(removeButton(container).disabled).toBe(true);
    removeButton(container).click();
    expect(modelValue.value).not.toBeNull();

    modelValue.value = null;
    await nextTick();
    disable.value = false;
    await nextTick();
    const file = selectFile(container);
    await nextTick();
    expect(modelValue.value).toBe(file);
  });
});
