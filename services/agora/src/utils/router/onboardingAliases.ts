import type { RouteRecordRaw } from "vue-router";
import type { RouteNamedMap } from "vue-router/auto-routes";

import { getConversationSurveyBasePath } from "./conversationRouteContext";

const onboardingSuffixes = {
  "/conversation/[postSlugId].onboarding": "",
  "/conversation/[postSlugId].onboarding/": "/",
  "/conversation/[postSlugId].onboarding/complete": "/complete",
  "/conversation/[postSlugId].onboarding/question.[questionSlugId]":
    "/question/:questionSlugId",
  "/conversation/[postSlugId].onboarding/summary": "/summary",
  "/conversation/[postSlugId].onboarding/verify": "/verify",
  "/conversation/[postSlugId].onboarding/verify/email": "/verify/email",
  "/conversation/[postSlugId].onboarding/verify/email-code":
    "/verify/email-code",
  "/conversation/[postSlugId].onboarding/verify/hard": "/verify/hard",
  "/conversation/[postSlugId].onboarding/verify/identity": "/verify/identity",
  "/conversation/[postSlugId].onboarding/verify/passport": "/verify/passport",
  "/conversation/[postSlugId].onboarding/verify/phone": "/verify/phone",
  "/conversation/[postSlugId].onboarding/verify/phone-code":
    "/verify/phone-code",
} satisfies Partial<Record<keyof RouteNamedMap, string>>;

const suffixByName: ReadonlyMap<string, string> = new Map(
  Object.entries(onboardingSuffixes)
);

const scopedBases = [
  getConversationSurveyBasePath({
    conversationSlugId: ":postSlugId",
    routeContext: { kind: "project", projectSlug: ":projectSlug" },
  }),
  getConversationSurveyBasePath({
    conversationSlugId: ":postSlugId",
    routeContext: { kind: "embed" },
  }),
];

export function withOnboardingAliases(
  routeRecords: readonly RouteRecordRaw[]
): RouteRecordRaw[] {
  return routeRecords.map((record): RouteRecordRaw => {
    const suffix =
      typeof record.name === "string"
        ? suffixByName.get(record.name)
        : undefined;
    const existingAliases =
      record.alias === undefined
        ? []
        : typeof record.alias === "string"
          ? [record.alias]
          : record.alias;
    const alias =
      suffix === undefined
        ? record.alias
        : [
            ...new Set([
              ...existingAliases,
              ...scopedBases.map((base) => `${base}${suffix}`),
            ]),
          ];
    const aliasedRecord = alias === undefined ? record : { ...record, alias };
    if (aliasedRecord.children === undefined) return aliasedRecord;
    return {
      ...aliasedRecord,
      children: withOnboardingAliases(aliasedRecord.children),
    };
  });
}
