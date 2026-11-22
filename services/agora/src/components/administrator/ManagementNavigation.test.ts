import type { Dto } from "src/shared/types/dto";
import type { SettingsInterface } from "src/utils/component/settings/settings";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref } from "vue";
import type { z } from "zod";

import ManagementNavigation from "./ManagementNavigation.vue";

vi.mock("src/components/ui-library/ListSection.vue", async () => {
  const { defineComponent, h } = await import("vue");
  return {
    default: defineComponent(
      (props: { settingsItemList: SettingsInterface[] }) => () =>
        h(
          "nav",
          props.settingsItemList.map((item) => h("span", item.label))
        ),
      { props: { settingsItemList: { type: Array, required: true } } }
    ),
  };
});

type Permissions = z.infer<
  typeof Dto.getManagementAccessResponse
>["permissions"];
const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function render() {
  const permissions = ref<Permissions>();
  const container = document.createElement("div");
  document.body.append(container);
  const app = createApp({
    render: () =>
      h(ManagementNavigation, {
        permissions: permissions.value,
        organizationLabel: "Organizations",
        projectLabel: "Projects",
        teamEntitlementsLabel: "Team entitlements",
      }),
  });
  app.mount(container);
  cleanups.push(() => {
    app.unmount();
    container.remove();
  });
  return { permissions, container };
}

describe("management navigation", () => {
  it("shows no privileged links before permission data arrives", () => {
    expect(render().container.textContent).toBe("");
  });
  it("uses server permissions, including when they change while mounted", async () => {
    const { permissions, container } = render();
    permissions.value = {
      canManageOrganizations: false,
      canManageProjects: true,
      canCreateProjects: true,
      canCreateOrganizations: false,
      canManagePremiumEntitlements: false,
    };
    await nextTick();
    expect(container.textContent).toBe("Projects");
    permissions.value = {
      canManageOrganizations: false,
      canManageProjects: false,
      canCreateProjects: false,
      canCreateOrganizations: false,
      canManagePremiumEntitlements: false,
    };
    await nextTick();
    expect(container.textContent).toBe("");
  });
  it("does not equate organization administration with Agora-team tools", async () => {
    const { permissions, container } = render();
    permissions.value = {
      canManageOrganizations: true,
      canManageProjects: true,
      canCreateProjects: true,
      canCreateOrganizations: false,
      canManagePremiumEntitlements: false,
    };
    await nextTick();
    expect(container.textContent).toBe("OrganizationsProjects");
  });
  it("keeps organization creation reachable without membership-management access", async () => {
    const { permissions, container } = render();
    permissions.value = {
      canManageOrganizations: false,
      canManageProjects: false,
      canCreateProjects: false,
      canCreateOrganizations: true,
      canManagePremiumEntitlements: false,
    };
    await nextTick();
    expect(container.textContent).toBe("Organizations");
  });
});
