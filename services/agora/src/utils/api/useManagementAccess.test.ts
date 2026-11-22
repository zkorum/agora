import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia, setActivePinia } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, KeepAlive, nextTick, ref } from "vue";

import { useManagementAccess } from "./useManagementAccess";

const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("./client", () => ({ api: { post: mocks.post } }));
vi.mock("./common", () => ({
  useCommonApi: () => ({
    buildEncodedUcan: () => Promise.resolve("test-token"),
    createRawAxiosRequestConfig: ({ signal }: { signal: AbortSignal }) => ({
      signal,
    }),
  }),
}));

const response = {
  data: {
    organizations: [],
    permissions: {
      canManageOrganizations: false,
      canCreateOrganizations: false,
      canManageProjects: true,
      canCreateProjects: false,
      canManagePremiumEntitlements: false,
    },
  },
};
const cleanups: Array<() => void> = [];
beforeEach(() => {
  mocks.post.mockReset();
  mocks.post.mockResolvedValue(response);
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function render() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const auth = useAuthenticationStore();
  auth.setLoginStatus({ isKnown: true, userId: "alice", isLoggedIn: true });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const visible = ref(true);
  const Consumer = defineComponent({
    setup() {
      const access = useManagementAccess();
      return () =>
        h(
          "span",
          access.data.value === undefined
            ? "No access"
            : String(access.data.value.permissions.canManageProjects)
        );
    },
  });
  const app = createApp({
    render: () => h(KeepAlive, () => (visible.value ? h(Consumer) : null)),
  });
  app.use(pinia);
  app.use(VueQueryPlugin, { queryClient });
  const container = document.createElement("div");
  document.body.append(container);
  app.mount(container);
  cleanups.push(() => {
    app.unmount();
    queryClient.clear();
    container.remove();
  });
  return { auth, container, queryClient, visible };
}

describe("management access query", () => {
  it("does not fetch for deactivated pages and refreshes invalidated permissions on reactivation", async () => {
    const page = render();
    await vi.waitFor(() => expect(page.container.textContent).toBe("true"));
    page.visible.value = false;
    await nextTick();
    await page.queryClient.invalidateQueries({
      queryKey: ["managementAccess"],
    });
    expect(mocks.post).toHaveBeenCalledOnce();
    mocks.post.mockResolvedValue({
      data: {
        ...response.data,
        permissions: { ...response.data.permissions, canManageProjects: false },
      },
    });
    page.visible.value = true;
    await vi.waitFor(() => expect(page.container.textContent).toBe("false"));
    expect(mocks.post).toHaveBeenCalledTimes(2);
  });

  it("does not display the previous account's cached permissions during a new request", async () => {
    const page = render();
    await vi.waitFor(() => expect(page.container.textContent).toBe("true"));
    const pending = Promise.withResolvers<typeof response>();
    mocks.post.mockReturnValueOnce(pending.promise);
    page.auth.setLoginStatus({
      isKnown: true,
      userId: "bob",
      isLoggedIn: true,
    });
    await nextTick();
    expect(page.container.textContent).toBe("No access");
    pending.resolve({
      data: {
        ...response.data,
        permissions: { ...response.data.permissions, canManageProjects: false },
      },
    });
    await vi.waitFor(() => expect(page.container.textContent).toBe("false"));
  });
});
