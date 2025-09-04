import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface DialogStepLayoutTranslations {
  welcomeTitle: string;
}

export const dialogStepLayoutTranslations: Record<
  SupportedDisplayLanguageCodes,
  DialogStepLayoutTranslations
> = {
  en: {
    welcomeTitle: "Welcome to Agora!",
  },
  ar: {
    welcomeTitle: "مرحباً بك في أغورا!",
  },
  es: {
    welcomeTitle: "¡Bienvenido a Ágora!",
  },
  fr: {
    welcomeTitle: "Bienvenue sur Agora !",
  },
  "zh-Hans": {
    welcomeTitle: "欢迎来到 Agora！",
  },
  "zh-Hant": {
    welcomeTitle: "歡迎來到 Agora！",
  },
  ja: {
    welcomeTitle: "Agora へようこそ！",
  },
};
