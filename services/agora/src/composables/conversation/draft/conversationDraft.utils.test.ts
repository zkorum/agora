import type { OrganizationProperties } from "src/shared/types/zod";
import { describe, expect, it, vi } from "vitest";

import {
  resolveDraftPublicationIdentityAtBoundary,
  resolveSelectedOrganizationSlug,
} from "./conversationDraft.utils";

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

describe("resolveDraftPublicationIdentityAtBoundary", () => {
  const legacyOrganizationPostAs = {
    postAsOrganization: true,
    organizationName: "Agora Foundation",
  };

  it("resolves a legacy organization for publication from the direct seed route", async () => {
    const loadProfile = vi.fn(() => Promise.resolve());

    await expect(
      resolveDraftPublicationIdentityAtBoundary({
        postAs: legacyOrganizationPostAs,
        getProfile: () => ({ dataLoaded: true, organizationList }),
        loadProfile,
      })
    ).resolves.toEqual({
      status: "resolved",
      organizationSlug: "agora-foundation",
    });
    expect(loadProfile).not.toHaveBeenCalled();
  });

  it("waits for a delayed profile before resolving the organization", async () => {
    let profile: {
      dataLoaded: boolean;
      organizationList: readonly OrganizationProperties[];
    } = { dataLoaded: false, organizationList: [] };

    await expect(
      resolveDraftPublicationIdentityAtBoundary({
        postAs: legacyOrganizationPostAs,
        getProfile: () => profile,
        loadProfile: () => {
          profile = { dataLoaded: true, organizationList };
          return Promise.resolve();
        },
      })
    ).resolves.toEqual({
      status: "resolved",
      organizationSlug: "agora-foundation",
    });
  });

  it("does not resolve or switch identity when profile loading fails", async () => {
    await expect(
      resolveDraftPublicationIdentityAtBoundary({
        postAs: legacyOrganizationPostAs,
        getProfile: () => ({ dataLoaded: false, organizationList: [] }),
        loadProfile: () => Promise.resolve(),
      })
    ).resolves.toEqual({ status: "profile_pending" });
  });

  it("rejects a loaded profile that cannot resolve the legacy identity", async () => {
    await expect(
      resolveDraftPublicationIdentityAtBoundary({
        postAs: legacyOrganizationPostAs,
        getProfile: () => ({ dataLoaded: true, organizationList: [] }),
        loadProfile: () => Promise.resolve(),
      })
    ).resolves.toEqual({ status: "organization_unavailable" });
  });
});
