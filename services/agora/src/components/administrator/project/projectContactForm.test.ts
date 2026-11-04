import { describe, expect, it } from "vitest";

import { getProjectContactFormState } from "./projectContactForm";

const emptyContact = {
  firstName: "",
  lastName: "",
  roleLabel: "",
  email: "",
  websiteUrl: "",
  imagePath: "",
  isFullImagePath: true,
  organizationSlug: undefined,
};

describe("project contact form", () => {
  it("treats an empty or whitespace-only form as an absent contact", () => {
    const state = getProjectContactFormState({
      ...emptyContact,
      firstName: " \t\n",
      roleLabel: "\u00a0\ufeff",
    });
    expect(state.validation).toEqual({ success: true, data: undefined });
    expect(state.requiresChannel).toBe(false);
    expect(state.requiresOrganization).toBe(false);
  });

  it("passes the parsed organization-only contact to the save request", () => {
    const state = getProjectContactFormState({
      ...emptyContact,
      organizationSlug: "agrotoulouse",
      email: " Contact@EXAMPLE.com ",
    });
    expect(state.validation.success).toBe(true);
    if (!state.validation.success) throw new Error("Expected a valid contact");
    expect(state.validation.data).toMatchObject({
      organizationSlug: "agrotoulouse",
      email: "contact@example.com",
      firstName: undefined,
    });
  });

  it("requires an identity when only a contact channel is entered", () => {
    const state = getProjectContactFormState({
      ...emptyContact,
      email: "contact@example.com",
    });
    expect(state.requiresOrganization).toBe(true);
    expect(state.validation.success).toBe(false);
  });

  it("requires a channel for a named organization", () => {
    const state = getProjectContactFormState({
      ...emptyContact,
      organizationSlug: "agrotoulouse",
    });
    expect(state.requiresChannel).toBe(true);
    expect(state.validation.success).toBe(false);
  });

  it.each([
    "javascript:alert(1)",
    "http://example.com",
    "https://user:password@example.com",
  ])("rejects unsafe contact URLs (%s)", (websiteUrl) => {
    expect(
      getProjectContactFormState({
        ...emptyContact,
        organizationSlug: "agrotoulouse",
        websiteUrl,
      }).validation.success
    ).toBe(false);
  });

  it("checks the API's name limits even for values inserted programmatically", () => {
    expect(
      getProjectContactFormState({
        ...emptyContact,
        firstName: "A".repeat(1000),
        email: "contact@example.com",
      }).validation.success
    ).toBe(false);
  });
});
