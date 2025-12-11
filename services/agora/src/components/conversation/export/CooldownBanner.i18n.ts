import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CooldownBannerTranslations {
  cooldownSeconds: string;
  cooldownMinutes: string;
  cooldownEnded: string;
  viewLast: string;
}

export const cooldownBannerTranslations: Record<
  SupportedDisplayLanguageCodes,
  CooldownBannerTranslations
> = {
  en: {
    cooldownSeconds: "Next export in {seconds}s",
    cooldownMinutes: "Next export in {minutes}m",
    cooldownEnded: "Cooldown ended. You can now request a new export.",
    viewLast: "View Last Export",
  },
  ar: {
    cooldownSeconds: "يرجى الانتظار {seconds} ثانية قبل طلب تصدير آخر.",
    cooldownMinutes: "يرجى الانتظار {minutes} دقيقة قبل طلب تصدير آخر.",
    cooldownEnded: "انتهت فترة الانتظار. يمكنك الآن طلب تصدير جديد.",
    viewLast: "عرض آخر تصدير",
  },
  es: {
    cooldownSeconds:
      "Espere {seconds} segundos antes de solicitar otra exportación.",
    cooldownMinutes:
      "Espere {minutes} minutos antes de solicitar otra exportación.",
    cooldownEnded:
      "Período de espera finalizado. Ahora puede solicitar una nueva exportación.",
    viewLast: "Ver Última Exportación",
  },
  fr: {
    cooldownSeconds:
      "Veuillez attendre {seconds} secondes avant de demander une autre exportation.",
    cooldownMinutes:
      "Veuillez attendre {minutes} minutes avant de demander une autre exportation.",
    cooldownEnded:
      "Période d'attente terminée. Vous pouvez maintenant demander une nouvelle exportation.",
    viewLast: "Voir la Dernière Exportation",
  },
  "zh-Hans": {
    cooldownSeconds: "请等待 {seconds} 秒后再请求导出。",
    cooldownMinutes: "请等待 {minutes} 分钟后再请求导出。",
    cooldownEnded: "冷却结束。您现在可以请求新的导出。",
    viewLast: "查看上次导出",
  },
  "zh-Hant": {
    cooldownSeconds: "請等待 {seconds} 秒後再請求匯出。",
    cooldownMinutes: "請等待 {minutes} 分鐘後再請求匯出。",
    cooldownEnded: "冷卻結束。您現在可以請求新的匯出。",
    viewLast: "查看上次匯出",
  },
  ja: {
    cooldownSeconds:
      "別のエクスポートをリクエストする前に{seconds}秒お待ちください。",
    cooldownMinutes:
      "別のエクスポートをリクエストする前に{minutes}分お待ちください。",
    cooldownEnded:
      "クールダウンが終了しました。新しいエクスポートをリクエストできます。",
    viewLast: "前回のエクスポートを表示",
  },
};
