import type { UserReportReason } from "src/shared/types/zod";

export const userReportReasonMapping: {
  label: string;
  value: UserReportReason;
  icon: string;
}[] = [
  {
    label: "Misleading",
    value: "misleading",
    icon: "mdi-emoticon-sad-outline",
  },
  { label: "Antisocial", value: "antisocial", icon: "mdi-robot-angry-outline" },
  { label: "Illegal", value: "illegal", icon: "mdi-close-octagon" },
  { label: "Doxing", value: "doxing", icon: "mdi-lock-alert-outline" },
  { label: "Sexual", value: "sexual", icon: "mdi-shield-alert" },
  { label: "Spam", value: "spam", icon: "mdi-trash-can" },
];
