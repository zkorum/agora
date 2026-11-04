import { Dto } from "src/shared/types/dto";
import { normalizeEmail } from "src/shared/types/zod-email";

const optionalContactSchema = Dto.createProjectContactRequest.optional();

interface ProjectContactFormInput {
  firstName: string;
  lastName: string;
  roleLabel: string;
  email: string;
  websiteUrl: string;
  imagePath: string;
  isFullImagePath: boolean;
  organizationSlug: string | undefined;
}

function optionalText(value: string): string | undefined {
  return value.trim() || undefined;
}

export function getProjectContactFormState(input: ProjectContactFormInput) {
  const email = normalizeEmail(input.email);
  const contact = {
    firstName: optionalText(input.firstName),
    lastName: optionalText(input.lastName),
    roleLabel: optionalText(input.roleLabel),
    email: email || undefined,
    websiteUrl: optionalText(input.websiteUrl),
    imagePath: optionalText(input.imagePath),
    isFullImagePath: input.isFullImagePath,
    organizationSlug: input.organizationSlug,
  };
  const hasInput = [
    contact.firstName,
    contact.lastName,
    contact.roleLabel,
    contact.email,
    contact.websiteUrl,
    contact.imagePath,
    contact.organizationSlug,
  ].some((value) => value !== undefined);

  return {
    requiresOrganization:
      hasInput &&
      contact.firstName === undefined &&
      contact.lastName === undefined,
    requiresChannel:
      hasInput &&
      contact.email === undefined &&
      contact.websiteUrl === undefined,
    validation: optionalContactSchema.safeParse(hasInput ? contact : undefined),
  };
}
