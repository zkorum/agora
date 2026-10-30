import { Platform, QSelect, Quasar } from "quasar";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick, ref } from "vue";
import { createI18n } from "vue-i18n";

import ZKSelect from "./ZKSelect.vue";

const apps: App[] = [];
const originalPlatform = Platform.is;
afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  Platform.is = originalPlatform;
});

function mountSelect({
  multiple = true,
  mobile = false,
  searchable = true,
}: {
  multiple?: boolean;
  mobile?: boolean;
  searchable?: boolean;
} = {}) {
  Platform.is = { ...originalPlatform, mobile, desktop: !mobile };
  const selected = ref<string | string[] | null>(multiple ? [] : null);
  const onNext = vi.fn();
  const app = createApp(
    defineComponent(
      () => () =>
        h(ZKSelect, {
          modelValue: selected.value,
          options: [
            { label: "Bicycle", value: "bicycle" },
            { label: "Train", value: "train" },
          ],
          label: "Transport",
          multiple,
          searchable,
          "onUpdate:modelValue": (value: string | string[] | null) => {
            selected.value = value;
          },
        })
    )
  );
  app.use(Quasar, { components: { QSelect } });
  app.use(createI18n({ legacy: false, locale: "en", messages: {} }));
  const target = document.createElement("div");
  document.body.append(target);
  app.mount(target);
  apps.push(app);
  const nextButton = document.createElement("button");
  nextButton.textContent = "Next";
  nextButton.dataset.next = "";
  nextButton.addEventListener("click", onNext);
  document.body.append(nextButton);
  return { target, selected, onNext, nextButton };
}

async function openSelect(target: HTMLElement): Promise<HTMLElement> {
  const control = target.querySelector<HTMLElement>(".q-field__control");
  if (control === null) throw new Error("Select control not found");
  target.querySelector<HTMLElement>('[role="combobox"]')?.focus();
  control.click();
  await vi.waitFor(() => {
    expect(document.querySelector(".q-menu")).not.toBeNull();
  });
  const popup = document.querySelector<HTMLElement>(".q-menu");
  if (popup === null) throw new Error("Select popup not found");
  return popup;
}

async function dismissPopup(): Promise<void> {
  const nextButton = document.querySelector<HTMLButtonElement>("[data-next]");
  if (nextButton === null) throw new Error("Next button not found");
  nextButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  nextButton.click();
  await vi.waitFor(() => {
    expect(document.querySelector(".q-menu")).toBeNull();
  });
}

describe("select popup dismissal", () => {
  it.each([false, true])(
    "keeps multiple selections when clicking Next with mobile=%s",
    async (mobile) => {
      const { target, selected, onNext } = mountSelect({ mobile });
      const popup = await openSelect(target);
      await vi.waitFor(() => {
        expect(popup.querySelectorAll('[role="option"]')).toHaveLength(2);
      });
      const option = popup.querySelector<HTMLElement>('[role="option"]');
      if (option === null) throw new Error("Select option not found");
      option.click();
      await vi.waitFor(() => expect(selected.value).toEqual(["bicycle"]));
      expect(document.querySelector(".q-menu")).not.toBeNull();
      expect(popup.textContent).not.toContain("Done");

      await dismissPopup();
      expect(selected.value).toEqual(["bicycle"]);
      expect(onNext).toHaveBeenCalledOnce();

      const reopened = await openSelect(target);
      expect(reopened.textContent).toContain("Bicycle");
      expect(selected.value).toEqual(["bicycle"]);
    }
  );

  it.each([false, true])(
    "allows dismissing an empty search with multiple=%s",
    async (multiple) => {
      const { target, selected } = mountSelect({ multiple });
      const popup = await openSelect(target);
      const input = target.querySelector("input");
      if (input === null) throw new Error("Search input not found");
      input.value = "no matching transport";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await vi.waitFor(() => expect(popup.textContent).toContain("No results"));

      await dismissPopup();
      expect(selected.value).toEqual(multiple ? [] : null);
      const reopened = await openSelect(target);
      await vi.waitFor(() => expect(reopened.textContent).toContain("Bicycle"));
    }
  );

  it("restores the single-select label after dismissing an unsuccessful search", async () => {
    const { target, selected } = mountSelect({ multiple: false });
    selected.value = "bicycle";
    await nextTick();
    const popup = await openSelect(target);
    const input = target.querySelector("input");
    if (input === null) throw new Error("Search input not found");
    input.value = "no matching transport";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.waitFor(() => expect(popup.textContent).toContain("No results"));

    await dismissPopup();
    expect(selected.value).toBe("bicycle");
    expect(target.querySelector("input")?.value).toBe("");
    expect(target.querySelector(".q-field__native")?.textContent).toContain(
      "Bicycle"
    );

    const reopened = await openSelect(target);
    await vi.waitFor(() => expect(reopened.textContent).toContain("Train"));
  });

  it.each([false, true])(
    "automatically dismisses single-select after choosing an option with mobile=%s",
    async (mobile) => {
      const { target, selected } = mountSelect({ multiple: false, mobile });
      const popup = await openSelect(target);
      await vi.waitFor(() =>
        expect(popup.querySelectorAll('[role="option"]')).toHaveLength(2)
      );
      const option = popup.querySelector<HTMLElement>('[role="option"]');
      if (option === null) throw new Error("Select option not found");
      option.click();
      await vi.waitFor(() =>
        expect(document.querySelector(".q-menu")).toBeNull()
      );
      expect(selected.value).toBe("bicycle");

      await openSelect(target);
      await dismissPopup();
      expect(selected.value).toBe("bicycle");
      expect(target.querySelector("input")?.value).toBe("");
      expect(target.querySelector(".q-field__native")?.textContent).toContain(
        "Bicycle"
      );
    }
  );

  it.each([false, true])(
    "allows dismissing non-searchable selects with multiple=%s",
    async (multiple) => {
      const { target, selected } = mountSelect({
        multiple,
        searchable: false,
        mobile: true,
      });
      await openSelect(target);
      await dismissPopup();
      expect(selected.value).toEqual(multiple ? [] : null);
    }
  );

  it("dismisses a mobile multi-select on an outside touch before activating Next", async () => {
    const { target, selected, onNext, nextButton } = mountSelect({
      mobile: true,
    });
    const popup = await openSelect(target);
    await vi.waitFor(() =>
      expect(popup.querySelectorAll('[role="option"]')).toHaveLength(2)
    );
    const option = popup.querySelector<HTMLElement>('[role="option"]');
    if (option === null) throw new Error("Select option not found");
    option.click();
    await vi.waitFor(() => expect(selected.value).toEqual(["bicycle"]));

    const touch = new Event("touchstart", {
      bubbles: true,
      cancelable: true,
    });
    nextButton.dispatchEvent(touch);
    await vi.waitFor(() =>
      expect(document.querySelector(".q-menu")).toBeNull()
    );
    expect(touch.defaultPrevented).toBe(true);
    expect(selected.value).toEqual(["bicycle"]);
    expect(onNext).not.toHaveBeenCalled();

    nextButton.click();
    expect(onNext).toHaveBeenCalledOnce();
  });
});
