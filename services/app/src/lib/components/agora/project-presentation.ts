import * as m from "#lib/paraglide/messages.js";
import type { ProjectAttribution } from "$logic/agora/project-attribution.js";
import type {
  CreateProjectInput,
  ProjectLanguageCode,
} from "$logic/agora/project-creation.js";
import {
  getProjectBodyStatus,
  projectBodyCharacterLimit,
} from "$logic/agora/project-rich-text.js";

export function getActiveProjectLocalizationDrafts({
  drafts,
  targetLanguageCodes,
  dynamicTranslationEnabled,
  hasOriginalBody,
}: {
  drafts: readonly CreateProjectInput["contentLocalizations"][number][];
  targetLanguageCodes: readonly ProjectLanguageCode[];
  dynamicTranslationEnabled: boolean;
  hasOriginalBody: boolean;
}) {
  return drafts
    .filter((draft) => targetLanguageCodes.includes(draft.languageCode))
    .map((draft) => {
      const status = getProjectBodyStatus(draft.body);
      const translationRequired =
        !dynamicTranslationEnabled ||
        draft.projectTitle.trim() !== "" ||
        status.html !== "" ||
        status.failure !== undefined;
      return {
        draft,
        status,
        translationRequired,
        bodyMissing:
          translationRequired && hasOriginalBody && status.html === "",
      };
    });
}

export function getProjectBodyEditorFeedback({
  status,
  showRequiredError = false,
}: {
  status: ReturnType<typeof getProjectBodyStatus>;
  showRequiredError?: boolean;
}) {
  return {
    countLabel: m.project_body_count({
      count: status.characterCount,
      limit: projectBodyCharacterLimit,
    }),
    invalidMessage:
      status.failure === "plain_text_too_long"
        ? m.project_body_too_long()
        : status.failure === "html_too_long"
          ? m.project_body_html_too_long()
          : showRequiredError
            ? m.project_create_localization_invalid()
            : undefined,
  };
}

export function projectAttributionRoleLabels() {
  return {
    project_owner: m.project_create_credit_project_owner(),
    partner: m.project_create_credit_partner(),
    sponsor: m.project_create_credit_sponsor(),
  } satisfies Record<ProjectAttribution["role"], string>;
}

export function projectAuthenticationLabels() {
  return {
    guest: m.project_create_guest(),
    account_required: m.project_create_account(),
    email_verification: m.project_create_email(),
    strong_verification: m.project_create_strong(),
  } satisfies Record<CreateProjectInput["authentication"], string>;
}

export function projectEmailUpdatesLabels() {
  return {
    off: m.project_create_email_off(),
    ask: m.project_create_email_ask(),
  } satisfies Record<CreateProjectInput["emailUpdates"], string>;
}

export function projectLanguageLabels() {
  return {
    en: "English",
    fr: "Français",
    es: "Español",
    ar: "العربية",
    fa: "فارسی",
    he: "עברית",
    ja: "日本語",
    "zh-Hans": "简体中文",
    "zh-Hant": "繁體中文",
    ky: "Кыргызча",
    ru: "Русский",
  } satisfies Record<ProjectLanguageCode, string>;
}

export const projectLanguageSearchText = {
  en: "en English",
  fr: "fr French français",
  es: "es Spanish español",
  ar: "ar Arabic",
  fa: "fa Persian Farsi",
  he: "he Hebrew",
  ja: "ja Japanese",
  "zh-Hans": "zh-Hans Chinese simplified",
  "zh-Hant": "zh-Hant Chinese traditional",
  ky: "ky Kyrgyz",
  ru: "ru Russian",
} satisfies Record<ProjectLanguageCode, string>;
