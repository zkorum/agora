import { describe, expect, it } from "vitest";

import {
  isCreateOrganizationFormValid,
  type OrganizationCreateFormState,
} from "./organizationAdminForm";

function createForm(websiteUrl: string): OrganizationCreateFormState {
  return {
    organizationName: "Example Organization",
    organizationSlug: "example-organization",
    defaultLanguageCode: "en",
    description: "",
    imagePath: "",
    websiteUrl,
  };
}

describe("organization admin website URL validation", () => {
  it("accepts an empty optional website URL", () => {
    expect(isCreateOrganizationFormValid(createForm(""))).toBe(true);
  });

  it("accepts an HTTPS website URL", () => {
    expect(
      isCreateOrganizationFormValid(createForm("https://example.com"))
    ).toBe(true);
  });

  it("rejects an HTTP website URL", () => {
    expect(
      isCreateOrganizationFormValid(createForm("http://example.com"))
    ).toBe(false);
  });
});
