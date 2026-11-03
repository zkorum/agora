import { getBrandInitials } from "src/shared/branding/emailBranding";

import type { ProjectContact } from "./projectPageTypes";

export function getProjectContactPresentation(contact: ProjectContact) {
  const displayName =
    contact.firstName !== undefined
      ? [contact.firstName, contact.lastName]
          .filter((part): part is string => part !== undefined)
          .join(" ")
      : contact.lastName !== undefined
        ? contact.lastName
        : contact.affiliationName;
  const hasPersonName =
    contact.firstName !== undefined || contact.lastName !== undefined;
  const subtitle = [
    contact.roleLabel,
    hasPersonName ? contact.affiliationName : undefined,
  ]
    .filter((part): part is string => part !== undefined)
    .join(" · ");

  return { displayName, subtitle, initials: getBrandInitials(displayName) };
}
