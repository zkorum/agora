import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface Step2SignupOnboardingTranslations {
  pageTitle: string;
  description: string;
  verifyAnonymously: string;
  verifyWithPhone: string;
}

export const step2SignupOnboardingTranslations: Record<
  SupportedDisplayLanguageCodes,
  Step2SignupOnboardingTranslations
> = {
  en: {
    pageTitle: "Agora aims to be exclusively human",
    description:
      "More than half of internet traffic comes from bots. That's why we verify users, so you're debating people, not robots plotting world domination!",
    verifyAnonymously: "Verify anonymously",
    verifyWithPhone: "Verify with my phone number",
  },
  ar: {
    pageTitle: "تهدف أجورا إلى أن تكون للبشر حصرياً",
    description:
      "أكثر من نصف حركة المرور على الإنترنت تأتي من الروبوتات. لهذا السبب نتحقق من المستخدمين، لتضمن أن المناقشات تتم مع أشخاص حقيقيين، وليس روبوتات تخطط للسيطرة على العالم!",
    verifyAnonymously: "التحقق بشكل مجهول",
    verifyWithPhone: "التحقق برقم هاتفي",
  },
  es: {
    pageTitle: "Agora aspira a ser exclusivamente humana",
    description:
      "Más de la mitad del tráfico de internet proviene de bots. Por eso verificamos su identidad, ¡para que debata con personas y no con robots tramando dominar el mundo!",
    verifyAnonymously: "Verificar anónimamente",
    verifyWithPhone: "Verificar con mi número de teléfono",
  },
  fr: {
    pageTitle: "Agora vise à être exclusivement humaine",
    description:
      "Plus de la moitié du trafic internet provient de bots. C'est pourquoi nous vérifions l'identité des utilisateurs, pour que vous débattiez avec des personnes, pas avec des robots complotant la domination mondiale !",
    verifyAnonymously: "Vérifier anonymement",
    verifyWithPhone: "Vérifier avec mon numéro de téléphone",
  },
  "zh-Hans": {
    pageTitle: "Agora 旨在成为纯粹的人类",
    description:
      "超过一半的互联网流量来自机器人。这就是为什么我们要验证用户，这样你就是在和人辩论，而不是和机器人密谋世界霸权！",
    verifyAnonymously: "匿名验证",
    verifyWithPhone: "使用手机号验证",
  },
  "zh-Hant": {
    pageTitle: "Agora 旨在成為純粹的人類",
    description:
      "超過一半的互聯網流量來自機器人。這就是為什麼我們要驗證用戶，這樣你就是在和人辯論，而不是和機器人密謀世界霸權！",
    verifyAnonymously: "匿名驗證",
    verifyWithPhone: "使用手機號驗證",
  },
  ja: {
    pageTitle: "Agoraは人間のみを対象とすることを目指す",
    description:
      "インターネットトラフィックの半分以上はボットによるものです。だからこそユーザー認証を実施し、世界征服を企むロボットではなく、人間同士が議論できるようにしているのです！",
    verifyAnonymously: "匿名検証",
    verifyWithPhone: "携帯電話で検証",
  },
};
