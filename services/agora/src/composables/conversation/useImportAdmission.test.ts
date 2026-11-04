import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import type { GetActiveImportResponse } from "src/shared/types/dto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type App, createApp, defineComponent, h, nextTick, ref } from "vue";

import { useImportAdmission } from "./useImportAdmission";

vi.mock("src/utils/api/post/post", () => ({
  useBackendPostApi: () => ({
    getActiveImport: () =>
      Promise.resolve({
        hasActiveImport: true,
        importSlugId: "import01",
        createdAt: new Date(),
      }),
  }),
}));

let app: App | undefined;
let client: QueryClient | undefined;
afterEach(() => {
  app?.unmount();
  client?.clear();
  document.body.replaceChildren();
});

describe("import admission", () => {
  it("unblocks ordinary creation despite cached active-import query data", async () => {
    client = new QueryClient();
    const activeImport: GetActiveImportResponse = {
      hasActiveImport: true,
      importSlugId: "import01",
      createdAt: new Date(),
    };
    client.setQueryData(["activeImport"], activeImport);
    const importType = ref<"csv-import" | "polis-url" | null>("csv-import");
    const isLoggedIn = ref(true);
    const host = document.createElement("div");
    document.body.append(host);
    app = createApp(
      defineComponent({
        setup() {
          const { activeImportQuery, hasActiveImport } = useImportAdmission({
            isLoggedIn,
            importType,
          });
          return () =>
            h("button", {
              disabled: hasActiveImport.value,
              "data-polling": activeImportQuery.isEnabled.value,
            });
        },
      })
    );
    app.use(VueQueryPlugin, { queryClient: client });
    app.mount(host);

    const button = host.querySelector("button");
    expect(button?.disabled).toBe(true);
    expect(button?.dataset.polling).toBe("true");

    importType.value = null;
    await nextTick();
    expect(client.getQueryData(["activeImport"])).toMatchObject({
      hasActiveImport: true,
      importSlugId: "import01",
    });
    expect(button?.disabled).toBe(false);
    expect(button?.dataset.polling).toBe("false");

    importType.value = "polis-url";
    await nextTick();
    expect(button?.disabled).toBe(true);
    expect(button?.dataset.polling).toBe("true");

    isLoggedIn.value = false;
    await nextTick();
    expect(button?.disabled).toBe(false);
    expect(button?.dataset.polling).toBe("false");
    isLoggedIn.value = true;
    await nextTick();

    await vi.waitFor(() =>
      expect(client?.isFetching({ queryKey: ["activeImport"] })).toBe(0)
    );
    client.setQueryData<GetActiveImportResponse>(["activeImport"], {
      hasActiveImport: false,
    });
    await vi.waitFor(() => expect(button?.disabled).toBe(false));
  });
});
