import type { OrganizationProperties } from "src/shared/types/zod";
import { describe, expect, it } from "vitest";

import { resolveSelectedOrganizationSlug } from "./conversationDraft.utils";

const organizationList = [
  {
    name: "Agora Foundation",
    slug: "agora-foundation",
    description: "",
  },
  {
    name: "Civic Lab",
    slug: "civic-lab",
    description: "",
  },
] satisfies OrganizationProperties[];

describe("resolveSelectedOrganizationSlug", () => {
  it("returns a current organization slug unchanged", () => {
    expect(
      resolveSelectedOrganizationSlug({
        organizationIdentifier: "agora-foundation",
        organizationList,
      })
    ).toBe("agora-foundation");
  });

  it("resolves a unique legacy organization display name", () => {
    expect(
      resolveSelectedOrganizationSlug({
        organizationIdentifier: "Agora Foundation",
        organizationList,
      })
    ).toBe("agora-foundation");
  });

  it("rejects an organization that is not in the user's organization list", () => {
    expect(
      resolveSelectedOrganizationSlug({
        organizationIdentifier: "unknown-organization",
        organizationList,
      })
    ).toBeUndefined();
  });

  it("rejects an ambiguous legacy display name", () => {
    const organizationsWithDuplicateNames = [
      ...organizationList,
      {
        name: "Agora Foundation",
        slug: "another-agora-foundation",
        description: "",
      },
    ] satisfies OrganizationProperties[];

    expect(
      resolveSelectedOrganizationSlug({
        organizationIdentifier: "Agora Foundation",
        organizationList: organizationsWithDuplicateNames,
      })
    ).toBeUndefined();
  });

  it("prioritizes an exact slug over a matching legacy display name", () => {
    const organizationsWithSlugNameCollision = [
      ...organizationList,
      {
        name: "agora-foundation",
        slug: "different-organization",
        description: "",
      },
    ] satisfies OrganizationProperties[];

    expect(
      resolveSelectedOrganizationSlug({
        organizationIdentifier: "agora-foundation",
        organizationList: organizationsWithSlugNameCollision,
      })
    ).toBe("agora-foundation");
  });
});
