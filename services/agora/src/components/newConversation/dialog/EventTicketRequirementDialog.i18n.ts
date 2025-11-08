import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface EventTicketRequirementDialogTranslations {
  noVerificationTitle: string;
  noVerificationDescription: string;
  requiresEventTicketTitle: string;
  requiresEventTicketDescription: string;
}

export const eventTicketRequirementDialogTranslations: Record<
  SupportedDisplayLanguageCodes,
  EventTicketRequirementDialogTranslations
> = {
  en: {
    noVerificationTitle: "No verification",
    noVerificationDescription:
      "Anyone can participate without event ticket verification",
    requiresEventTicketTitle: "Requires event ticket",
    requiresEventTicketDescription:
      "Only verified event ticket holders can vote and contribute opinions",
  },
  ar: {
    noVerificationTitle: "بدون تحقق",
    noVerificationDescription:
      "يمكن لأي شخص المشاركة بدون التحقق من تذكرة الحدث",
    requiresEventTicketTitle: "يتطلب تذكرة الحدث",
    requiresEventTicketDescription:
      "يمكن فقط لحاملي تذاكر الحدث المتحقق منهم التصويت وإضافة آراء",
  },
  es: {
    noVerificationTitle: "Sin verificación",
    noVerificationDescription:
      "Cualquiera puede participar sin verificación de boleto de evento",
    requiresEventTicketTitle: "Requiere boleto de evento",
    requiresEventTicketDescription:
      "Solo los titulares de boletos de eventos verificados pueden votar y contribuir opiniones",
  },
  fr: {
    noVerificationTitle: "Pas de vérification",
    noVerificationDescription:
      "Tout le monde peut participer sans vérification de billet d'événement",
    requiresEventTicketTitle: "Billet d'événement requis",
    requiresEventTicketDescription:
      "Seuls les détenteurs de billets d'événement vérifiés peuvent voter et contribuer des opinions",
  },
  "zh-Hans": {
    noVerificationTitle: "无需验证",
    noVerificationDescription: "任何人都可以参与，无需活动门票验证",
    requiresEventTicketTitle: "需要活动门票",
    requiresEventTicketDescription:
      "只有经过验证的活动门票持有者才能投票和贡献意见",
  },
  "zh-Hant": {
    noVerificationTitle: "無需驗證",
    noVerificationDescription: "任何人都可以參與，無需活動門票驗證",
    requiresEventTicketTitle: "需要活動門票",
    requiresEventTicketDescription:
      "只有經過驗證的活動門票持有者才能投票和貢獻意見",
  },
  ja: {
    noVerificationTitle: "検証不要",
    noVerificationDescription:
      "イベントチケットの検証なしで誰でも参加できます",
    requiresEventTicketTitle: "イベントチケットが必要",
    requiresEventTicketDescription:
      "検証済みのイベントチケット保有者のみが投票と意見の投稿ができます",
  },
};
