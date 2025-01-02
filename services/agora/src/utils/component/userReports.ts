import type { UserReportReason } from "src/shared/types/zod";

export const userReportReasonMapping: {
  label: string;
  value: UserReportReason;
}[] = [
  { label: "Misleading", value: "misleading" },
  { label: "Antisocial", value: "antisocial" },
  { label: "Illegal", value: "illegal" },
  { label: "Doxing", value: "doxing" },
  { label: "Sexual", value: "sexual" },
  { label: "Spam", value: "spam" },
];
