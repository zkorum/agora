import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type App,
  createApp,
  defineComponent,
  type FunctionalComponent,
  h,
  nextTick,
  ref,
} from "vue";

import ProjectDocumentFilePicker from "./ProjectDocumentFilePicker.vue";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("ProjectDocumentFilePicker", () => {
  it("clears the uploader queue after an upload finishes", async () => {
    const selectedFile = new File(["report"], "report.pdf", {
      type: "application/pdf",
    });
    const modelValue = ref<File | null>(selectedFile);
    const disable = ref(true);
    const reset = vi.fn();
    const uploaderFiles = [selectedFile];
    const UploaderStub = defineComponent({
      props: {
        disable: { type: Boolean, required: true },
      },
      setup(props, { expose, slots }) {
        expose({
          files: uploaderFiles,
          reset: () => {
            if (!props.disable) {
              uploaderFiles.splice(0);
              reset();
            }
          },
        });
        return () => h("div", [slots.header?.(), slots.list?.()]);
      },
    });
    const TestRoot = {
      setup() {
        return () =>
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
          });
      },
    };
    const passthrough: FunctionalComponent = (_, { slots }) =>
      h("div", slots.default?.());
    const container = document.createElement("div");
    document.body.append(container);
    const app = createApp(TestRoot);
    app.component("QUploader", UploaderStub);
    app.component("QUploaderAddTrigger", passthrough);
    app.component("QItem", passthrough);
    app.component("QItemSection", passthrough);
    app.component("QItemLabel", passthrough);
    app.component("QIcon", passthrough);
    app.component("QBtn", passthrough);
    mountedApps.push(app);
    app.mount(container);
    await nextTick();

    modelValue.value = null;
    await nextTick();
    expect(reset).not.toHaveBeenCalled();

    disable.value = false;
    await nextTick();
    expect(reset).toHaveBeenCalledOnce();
    expect(uploaderFiles).toHaveLength(0);
  });
});
