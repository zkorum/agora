import {
  type DisplayLanguageMetadata,
  type LanguageMetadata,
  type SupportedDisplayLanguageCodes,
  SupportedSpokenLanguageMetadataList,
  ZodSupportedDisplayLanguageCodes,
} from "src/shared/languages";
import {
  type AdminOrganizationProperties,
  type CreateOrganizationRequest,
  Dto,
  type UpdateOrganizationLocalizationRequest,
} from "src/shared/types/dto";

export interface SelectOption<T extends string> {
  label: string;
  value: T;
}

export interface OrganizationLocalizationFormState {
  displayName: string;
  description: string;
  imagePath: string;
  websiteUrl: string;
  setAsDefault: boolean;
}

export interface OrganizationCreateFormState {
  organizationName: string;
  organizationSlug: string;
  defaultLanguageCode: SupportedDisplayLanguageCodes;
  description: string;
  imagePath: string;
  websiteUrl: string;
}

function isDisplayLanguage(
  language: LanguageMetadata
): language is DisplayLanguageMetadata {
  return language.displaySupported;
}

export const displayLanguageOptions: Array<
  SelectOption<SupportedDisplayLanguageCodes>
> = SupportedSpokenLanguageMetadataList.filter(isDisplayLanguage).map(
  (language) => ({
    label: `${language.name} (${language.code})`,
    value: language.code,
  })
);

export function inputToString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

export function isHttpsUrl(url: string): boolean {
  if (url.trim() === "") {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function normalizeCreateOrganizationForm(
  form: OrganizationCreateFormState
): unknown {
  return {
    defaultLanguageCode: form.defaultLanguageCode,
    description: form.description,
    isFullImagePath: isHttpsUrl(form.imagePath),
    organizationName: form.organizationName,
    organizationSlug: form.organizationSlug,
    ...(form.imagePath.trim() === "" ? {} : { imagePath: form.imagePath }),
    ...(form.websiteUrl.trim() === "" ? {} : { websiteUrl: form.websiteUrl }),
  };
}

export function buildCreateOrganizationRequest(
  form: OrganizationCreateFormState
): CreateOrganizationRequest {
  return Dto.createOrganizationRequest.parse(
    normalizeCreateOrganizationForm(form)
  );
}

export function isCreateOrganizationFormValid(
  form: OrganizationCreateFormState
): boolean {
  return Dto.createOrganizationRequest.safeParse(
    normalizeCreateOrganizationForm(form)
  ).success;
}

export function buildUpdateOrganizationLocalizationRequest({
  organizationSlug,
  languageCode,
  form,
  isDefaultLanguage,
}: {
  organizationSlug: string;
  languageCode: SupportedDisplayLanguageCodes;
  form: OrganizationLocalizationFormState;
  isDefaultLanguage: boolean;
}): UpdateOrganizationLocalizationRequest {
  return Dto.updateOrganizationLocalizationRequest.parse({
    organizationSlug,
    languageCode,
    displayName: form.displayName,
    description: form.description,
    websiteUrl: optionalText(form.websiteUrl),
    imagePath: optionalText(form.imagePath),
    isFullImagePath: isHttpsUrl(form.imagePath),
    setAsDefault: isDefaultLanguage || form.setAsDefault,
  });
}

export function isUpdateOrganizationLocalizationFormValid({
  organizationSlug,
  languageCode,
  form,
  isDefaultLanguage,
}: {
  organizationSlug: string;
  languageCode: SupportedDisplayLanguageCodes;
  form: OrganizationLocalizationFormState;
  isDefaultLanguage: boolean;
}): boolean {
  return Dto.updateOrganizationLocalizationRequest.safeParse({
    organizationSlug,
    languageCode,
    displayName: form.displayName,
    description: form.description,
    websiteUrl: optionalText(form.websiteUrl),
    imagePath: optionalText(form.imagePath),
    isFullImagePath: isHttpsUrl(form.imagePath),
    setAsDefault: isDefaultLanguage || form.setAsDefault,
  }).success;
}

export function parseDisplayLanguage(
  value: unknown
): SupportedDisplayLanguageCodes | undefined {
  const result = ZodSupportedDisplayLanguageCodes.safeParse(value);
  return result.success ? result.data : undefined;
}

export function hasOrganizationLocalization({
  organization,
  languageCode,
}: {
  organization: AdminOrganizationProperties;
  languageCode: SupportedDisplayLanguageCodes;
}): boolean {
  return organization.localizations.some(
    (localization) => localization.languageCode === languageCode
  );
}

export function getOrganizationLocalizationFormState({
  organization,
  languageCode,
}: {
  organization: AdminOrganizationProperties;
  languageCode: SupportedDisplayLanguageCodes;
}): OrganizationLocalizationFormState {
  const selectedLocalization = organization.localizations.find(
    (localization) => localization.languageCode === languageCode
  );
  const defaultLocalization = organization.localizations.find(
    (localization) =>
      localization.languageCode === organization.defaultLanguageCode
  );

  return {
    displayName:
      selectedLocalization?.displayName ??
      defaultLocalization?.displayName ??
      organization.name,
    description:
      selectedLocalization?.description ??
      defaultLocalization?.description ??
      organization.description,
    imagePath:
      selectedLocalization?.imagePath ?? defaultLocalization?.imagePath ?? "",
    websiteUrl:
      selectedLocalization?.websiteUrl ??
      defaultLocalization?.websiteUrl ??
      organization.websiteUrl ??
      "",
    setAsDefault: languageCode === organization.defaultLanguageCode,
  };
}
