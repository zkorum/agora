import type { OrganizationManagementPermissions } from "src/shared/organizationAccess";
import type { AdminOrganizationProperties, Dto } from "src/shared/types/dto";
import type { useBackendAdministratorOrganizationApi } from "src/utils/api/administrator/organization";
import type { ViewerQueryScope } from "src/utils/query/viewerScope";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref } from "vue";
import type { z } from "zod";

import OrganizationPage from "./index.vue";

const mocks = vi.hoisted(() => ({
  options:
    vi.fn<
      ReturnType<
        typeof useBackendAdministratorOrganizationApi
      >["getOrganizationOptions"]
    >(),
  details:
    vi.fn<
      ReturnType<
        typeof useBackendAdministratorOrganizationApi
      >["getOrganizationDetails"]
    >(),
  access: vi.fn(),
  layout: vi.fn(),
  scope: vi.fn(),
}));

vi.mock("src/utils/api/administrator/organization", () => ({
  useBackendAdministratorOrganizationApi: () => ({
    getOrganizationOptions: mocks.options,
    getOrganizationDetails: mocks.details,
  }),
}));
vi.mock("src/utils/api/useManagementAccess", () => ({
  useManagementAccess: mocks.access,
}));
vi.mock("src/utils/query/viewerScope", () => ({
  useViewerQueryScope: mocks.scope,
}));
vi.mock("src/composables/layout/usePageLayout", () => ({
  usePageLayout: mocks.layout,
}));
vi.mock("src/composables/ui/useComponentI18n", () => ({
  useComponentI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("src/components/navigation/header/variants", () => ({
  StandardMenuBar: () => null,
}));
vi.mock("src/components/ui-library/ZKCard.vue", () => ({
  default: () => null,
}));
vi.mock(
  "src/components/administrator/organization/OrganizationCreatePanel.vue",
  () => ({ default: () => null })
);
vi.mock(
  "src/components/administrator/organization/OrganizationManagePanel.vue",
  async () => {
    const { defineComponent, h, ref, watch } = await import("vue");
    return {
      default: defineComponent(
        (props: {
          selectedOrganization:
            | (AdminOrganizationProperties & {
                permissions: OrganizationManagementPermissions;
              })
            | undefined;
        }) => {
          const draft = ref("");
          watch(
            () => props.selectedOrganization,
            (organization) => {
              draft.value = organization?.name ?? "";
            },
            { immediate: true }
          );
          return () =>
            h("section", [
              props.selectedOrganization === undefined
                ? "No selection"
                : `${props.selectedOrganization.slug}:${props.selectedOrganization.permissions.canUpdate}`,
              h("input", {
                value: draft.value,
                onInput: (event: Event) => {
                  if (event.target instanceof HTMLInputElement)
                    draft.value = event.target.value;
                },
              }),
            ]);
        },
        { props: { selectedOrganization: { type: Object, required: true } } }
      ),
    };
  }
);

type ManagementAccess = z.infer<typeof Dto.getManagementAccessResponse>;
const allowed: ManagementAccess = {
  organizations: [],
  permissions: {
    canManageOrganizations: true,
    canCreateOrganizations: false,
    canManageProjects: true,
    canCreateProjects: true,
    canManagePremiumEntitlements: false,
  },
};
const organization = {
  name: "Owner",
  slug: "owner",
  description: "",
  defaultLanguageCode: "en",
  localizations: [],
  canUseDynamicTranslation: false,
  permissions: {
    canUpdate: true,
    canManageMembers: true,
    canCreateProjects: true,
    canDelete: true,
    canConfigureEmailUpdates: true,
  },
} satisfies AdminOrganizationProperties & {
  permissions: OrganizationManagementPermissions;
};
const cleanups: Array<() => void> = [];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.options.mockResolvedValue([
    { name: "Owner", slug: "owner", canUseDynamicTranslation: false },
  ]);
  mocks.details.mockResolvedValue({
    ...organization,
    permissions: { ...organization.permissions },
  });
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function render() {
  const data = ref<ManagementAccess | undefined>(allowed);
  const dataUpdatedAt = ref(1);
  const isActive = ref(true);
  const scope = ref<ViewerQueryScope>({ kind: "viewer", userId: "alice" });
  mocks.access.mockReturnValue({ data, dataUpdatedAt });
  mocks.layout.mockReturnValue({ isActive });
  mocks.scope.mockReturnValue(scope);
  const container = document.createElement("div");
  const header = document.createElement("header");
  header.id = "page-header";
  document.body.append(header, container);
  const app = createApp(OrganizationPage);
  app.component("QTabs", {
    render() {
      return h("nav");
    },
  });
  app.component("QTab", {
    render() {
      return null;
    },
  });
  app.mount(container);
  cleanups.push(() => {
    app.unmount();
    header.remove();
    container.remove();
  });
  return { container, data, dataUpdatedAt, isActive, scope };
}

describe("organization management refresh", () => {
  it("refreshes resource permissions even when navigation access stays allowed", async () => {
    const page = render();
    await vi.waitFor(() =>
      expect(page.container.textContent).toContain("owner:true")
    );
    const input = page.container.querySelector("input");
    if (input === null) throw new Error("Missing organization draft input");
    input.value = "Unsaved organization name";
    input.dispatchEvent(new Event("input"));
    mocks.details.mockResolvedValue({
      ...organization,
      permissions: { ...organization.permissions, canUpdate: false },
    });
    page.dataUpdatedAt.value += 1;
    await vi.waitFor(() =>
      expect(page.container.textContent).toContain("owner:false")
    );
    expect(input.value).toBe("Unsaved organization name");
    page.isActive.value = false;
    await nextTick();
    const calls = mocks.options.mock.calls.length;
    page.isActive.value = true;
    await vi.waitFor(() =>
      expect(mocks.options).toHaveBeenCalledTimes(calls + 1)
    );
  });

  it("does not repopulate another account's options from a pending response", async () => {
    const pending =
      Promise.withResolvers<Awaited<ReturnType<typeof mocks.options>>>();
    mocks.options.mockReturnValueOnce(pending.promise);
    const page = render();
    page.data.value = undefined;
    page.scope.value = { kind: "viewer", userId: "bob" };
    page.dataUpdatedAt.value = 0;
    pending.resolve([
      { name: "Owner", slug: "owner", canUseDynamicTranslation: false },
    ]);
    await pending.promise;
    await nextTick();
    await nextTick();
    expect(mocks.details).not.toHaveBeenCalled();
    expect(page.container.textContent).not.toContain("owner");
  });

  it("discards a pending details response after an account change", async () => {
    const pending =
      Promise.withResolvers<Awaited<ReturnType<typeof mocks.details>>>();
    mocks.details.mockReturnValueOnce(pending.promise);
    const page = render();
    await vi.waitFor(() => expect(mocks.details).toHaveBeenCalledOnce());
    page.data.value = undefined;
    page.scope.value = { kind: "viewer", userId: "bob" };
    page.dataUpdatedAt.value = 0;
    pending.resolve(organization);
    await pending.promise;
    await nextTick();
    await nextTick();
    page.data.value = allowed;
    page.dataUpdatedAt.value = 2;
    mocks.options.mockResolvedValue([]);
    await nextTick();
    await nextTick();
    expect(page.container.textContent).not.toContain("owner");
  });
});
