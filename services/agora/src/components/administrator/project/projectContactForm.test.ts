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
    expect(state.requiresEmail).toBe(false);
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

  it("accepts an email without requiring a name or affiliation", () => {
    const state = getProjectContactFormState({
      ...emptyContact,
      email: "contact@example.com",
    });
    expect(state.requiresEmail).toBe(true);
    expect(state.validation.success).toBe(true);
  });

  it("requires email for a website-only contact", () => {
    const state = getProjectContactFormState({
      ...emptyContact,
      websiteUrl: "https://example.com/contact",
    });
    expect(state.requiresEmail).toBe(true);
    expect(state.validation.success).toBe(false);
  });

  it("requires email for an affiliated contact", () => {
    const state = getProjectContactFormState({
      ...emptyContact,
      organizationSlug: "agrotoulouse",
    });
    expect(state.requiresEmail).toBe(true);
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
        email: "contact@example.com",
        websiteUrl,
      }).validation.success
    ).toBe(false);
  });

  it("requires a contact when asking and still accepts an email when not asking", () => {
    expect(
      getProjectContactFormState({
        ...emptyContact,
        asksParticipants: true,
      })
    ).toMatchObject({ requiresEmail: true, validation: { success: false } });
    for (const asksParticipants of [true, false]) {
      expect(
        getProjectContactFormState({
          ...emptyContact,
          asksParticipants,
          email: "contact@example.com",
        }).validation
      ).toMatchObject({
        success: true,
        data: { email: "contact@example.com" },
      });
    }
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
