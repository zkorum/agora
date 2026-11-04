import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

interface StartupErrorMessages {
  title: string;
  description: string;
  reload: string;
}

// Startup failures must remain readable even when the i18n plugin cannot load.
export const startupErrorMessages = {
  en: {
    title: "Unable to start Agora",
    description: "Please check your connection and reload to try again.",
    reload: "Reload",
  },
  ar: {
    title: "تعذّر تشغيل أغورا",
    description: "يرجى التحقق من اتصالك وإعادة تحميل الصفحة للمحاولة مجددًا.",
    reload: "إعادة التحميل",
  },
  es: {
    title: "No se pudo iniciar Agora",
    description:
      "Comprueba tu conexión y recarga la página para volver a intentarlo.",
    reload: "Recargar",
  },
  fa: {
    title: "آگورا راه‌اندازی نشد",
    description:
      "لطفاً اتصال خود را بررسی کنید و برای تلاش دوباره صفحه را بارگیری کنید.",
    reload: "بارگیری مجدد",
  },
  fr: {
    title: "Impossible de démarrer Agora",
    description:
      "Vérifiez votre connexion et rechargez la page pour réessayer.",
    reload: "Recharger",
  },
  he: {
    title: "לא ניתן להפעיל את אגורה",
    description: "יש לבדוק את החיבור ולטעון מחדש את הדף כדי לנסות שוב.",
    reload: "טעינה מחדש",
  },
  ja: {
    title: "Agoraを起動できませんでした",
    description: "接続を確認し、ページを再読み込みしてもう一度お試しください。",
    reload: "再読み込み",
  },
  ky: {
    title: "Agora ишке кирген жок",
    description:
      "Интернет байланышын текшерип, кайра аракет кылуу үчүн баракты жаңыртыңыз.",
    reload: "Жаңыртуу",
  },
  ru: {
    title: "Не удалось запустить Agora",
    description:
      "Проверьте подключение и перезагрузите страницу, чтобы повторить попытку.",
    reload: "Перезагрузить",
  },
  "zh-Hans": {
    title: "无法启动 Agora",
    description: "请检查网络连接并重新加载页面以重试。",
    reload: "重新加载",
  },
  "zh-Hant": {
    title: "無法啟動 Agora",
    description: "請檢查網路連線並重新載入頁面以重試。",
    reload: "重新載入",
  },
} satisfies Record<SupportedDisplayLanguageCodes, StartupErrorMessages>;
