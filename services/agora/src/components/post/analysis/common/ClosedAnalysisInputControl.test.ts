import type { ClosedAnalysisSelection } from "src/shared/types/dto";
import { expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref } from "vue";
import { createI18n } from "vue-i18n";

import ClosedAnalysisInputControl from "./ClosedAnalysisInputControl.vue";

it("reports the served mode independently and lets the facilitator switch back while pending", async () => {
  const selection: ClosedAnalysisSelection = {
    closeId: 1,
    selectionRevision: 2,
    isSwitchable: true,
    requestedInputMode: "live",
    servedInputMode: "closing",
    status: "pending",
  };
  const state = ref(selection);
  const canSwitch = ref(true);
  const saving = ref(false);
  const saveFailed = ref(false);
  const onSelectMode = vi.fn();
  const app = createApp({
    render: () =>
      h(ClosedAnalysisInputControl, {
        selection: state.value,
        canSwitch: canSwitch.value,
        saving: saving.value,
        saveFailed: saveFailed.value,
        onSelectMode,
      }),
  });
  const target = document.createElement("div");
  app.use(createI18n({ legacy: false, locale: "en", messages: {} }));
  app.mount(target);
  try {
    expect(target.querySelector('[role="status"]')?.textContent).toContain(
      "Updating Live inputs. Still showing Closing inputs."
    );
    target.querySelector("button")?.click();
    expect(onSelectMode).toHaveBeenCalledExactlyOnceWith("closing");
    saving.value = true;
    await nextTick();
    expect(target.querySelector("button")?.disabled).toBe(true);
    target.querySelector("button")?.click();
    expect(onSelectMode).toHaveBeenCalledTimes(1);
    canSwitch.value = false;
    state.value = { ...selection, status: "failed" };
    await nextTick();
    expect(target.querySelector("button")).toBeNull();
    expect(target.querySelector('[role="status"]')?.textContent).toContain(
      "Could not update Live inputs. Still showing Closing inputs."
    );
    state.value = { ...selection, servedInputMode: "live" };
    saveFailed.value = true;
    await nextTick();
    expect(target.querySelector('[role="status"]')?.textContent).toContain(
      "Updating. Showing the last completed result: Live inputs."
    );
    expect(target.querySelector('[role="alert"]')?.textContent).toContain(
      "Could not change inputs."
    );
  } finally {
    app.unmount();
  }
});
