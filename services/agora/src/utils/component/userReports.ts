import type { UserReportReason } from "src/shared/types/zod";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  userReportsTranslations,
  type UserReportsTranslations,
} from "./userReports.i18n";

export interface UserReportReasonMapping {
  label: string;
  value: UserReportReason;
  icon: string;
}

export function useUserReports(): UserReportReasonMapping[] {
  const { t } = useComponentI18n<UserReportsTranslations>(
    userReportsTranslations
  );

  return [
    {
      label: t("misleading"),
      value: "misleading",
      icon: "mdi-emoticon-sad-outline",
    },
    {
      label: t("antisocial"),
      value: "antisocial",
      icon: "mdi-robot-angry-outline",
    },
    {
      label: t("illegal"),
      value: "illegal",
      icon: "mdi-close-octagon",
    },
    {
      label: t("doxing"),
      value: "doxing",
      icon: "mdi-lock-alert-outline",
    },
    {
      label: t("sexual"),
      value: "sexual",
      icon: "mdi-shield-alert",
    },
    {
      label: t("spam"),
      value: "spam",
      icon: "mdi-trash-can",
    },
  ];
}

// Static export for backward compatibility (without translations)
export const userReportReasonMapping: UserReportReasonMapping[] = [
  {
    label: "Misleading",
    value: "misleading",
    icon: "mdi-emoticon-sad-outline",
  },
  {
    label: "Antisocial",
    value: "antisocial",
    icon: "mdi-robot-angry-outline",
  },
  {
    label: "Illegal",
    value: "illegal",
    icon: "mdi-close-octagon",
  },
  {
    label: "Doxing",
    value: "doxing",
    icon: "mdi-lock-alert-outline",
  },
  {
    label: "Sexual",
    value: "sexual",
    icon: "mdi-shield-alert",
  },
  {
    label: "Spam",
    value: "spam",
    icon: "mdi-trash-can",
  },
];
