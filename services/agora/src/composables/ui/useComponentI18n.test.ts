import { afterEach, describe, expect, it } from "vitest";
import { type App, createApp, defineComponent, h } from "vue";
import { createI18n } from "vue-i18n";

import { useComponentI18n } from "./useComponentI18n";

const mountedApps: App[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) {
    app.unmount();
  }
  document.body.replaceChildren();
});

describe("useComponentI18n", () => {
  it("inserts values literally, including replacement patterns and other placeholders", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const component = defineComponent(() => {
      const { t } = useComponentI18n({
        en: { message: "Before {value} after {suffix}" },
      });
      return () =>
        h("span", t("message", { value: "$&-$`-$' {suffix}", suffix: "done" }));
    });
    const app = createApp(component);
    app.use(createI18n({ legacy: false, locale: "en", messages: {} }));
    mountedApps.push(app);
    app.mount(container);

    expect(container.textContent).toBe("Before $&-$`-$' {suffix} after done");
  });
});
