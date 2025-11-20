import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface NewConversationControlBarTranslations {
  asLabel: string;
  importFromPolisUrl: string;
  importFromCsv: string;
  newConversation: string;
  private: string;
  public: string;
  requiresLogin: string;
  guestParticipation: string;
  makePublicNever: string;
  makePublic: string;
  removePoll: string;
  addPoll: string;
  noVerification: string;
  devconnect2025: string;
}

export const newConversationControlBarTranslations: Record<
  SupportedDisplayLanguageCodes,
  NewConversationControlBarTranslations
> = {
  en: {
    asLabel: "As {name}",
    importFromPolisUrl: "Import from Polis URL",
    importFromCsv: "Import from CSV",
    newConversation: "New Conversation",
    private: "Private",
    public: "Public",
    requiresLogin: "Requires login",
    guestParticipation: "Guest participation",
    makePublicNever: "Make public: Never",
    makePublic: "Make public: {date}",
    removePoll: "Remove poll",
    addPoll: "Add poll",
    noVerification: "No verification",
    devconnect2025: "Devconnect 2025",
  },
  ar: {
    asLabel: "باسم {name}",
    importFromPolisUrl: "استيراد من رابط بوليس",
    importFromCsv: "استيراد من CSV",
    newConversation: "محادثة جديدة",
    private: "خاص",
    public: "عام",
    requiresLogin: "يتطلب تسجيل الدخول",
    guestParticipation: "مشاركة الضيوف",
    makePublicNever: "جعله عامًا: أبدًا",
    makePublic: "جعله عامًا: {date}",
    removePoll: "إزالة الاستطلاع",
    addPoll: "إضافة استطلاع",
    noVerification: "بدون تحقق",
    devconnect2025: "Devconnect 2025",
  },
  es: {
    asLabel: "Como {name}",
    importFromPolisUrl: "Importar desde URL de Polis",
    importFromCsv: "Importar desde CSV",
    newConversation: "Nueva Conversación",
    private: "Privado",
    public: "Público",
    requiresLogin: "Requiere inicio de sesión",
    guestParticipation: "Participación de invitados",
    makePublicNever: "Hacer público: Nunca",
    makePublic: "Hacer público: {date}",
    removePoll: "Eliminar encuesta",
    addPoll: "Agregar encuesta",
    noVerification: "Sin verificación",
    devconnect2025: "Devconnect 2025",
  },
  fr: {
    asLabel: "En tant que {name}",
    importFromPolisUrl: "Importer depuis URL Polis",
    importFromCsv: "Importer depuis CSV",
    newConversation: "Nouvelle Conversation",
    private: "Privé",
    public: "Public",
    requiresLogin: "Connexion requise",
    guestParticipation: "Participation d'invités",
    makePublicNever: "Rendre public : Jamais",
    makePublic: "Rendre public : {date}",
    removePoll: "Supprimer le sondage",
    addPoll: "Ajouter un sondage",
    noVerification: "Pas de vérification",
    devconnect2025: "Devconnect 2025",
  },
  "zh-Hans": {
    asLabel: "作为 {name}",
    importFromPolisUrl: "从 Polis URL 导入",
    importFromCsv: "从 CSV 导入",
    newConversation: "新对话",
    private: "私密",
    public: "公开",
    requiresLogin: "需要登录",
    guestParticipation: "访客参与",
    makePublicNever: "公开：永不",
    makePublic: "公开：{date}",
    removePoll: "移除投票",
    addPoll: "添加投票",
    noVerification: "无需验证",
    devconnect2025: "Devconnect 2025",
  },
  "zh-Hant": {
    asLabel: "作為 {name}",
    importFromPolisUrl: "從 Polis URL 匯入",
    importFromCsv: "從 CSV 匯入",
    newConversation: "新對話",
    private: "私密",
    public: "公開",
    requiresLogin: "需要登入",
    guestParticipation: "訪客參與",
    makePublicNever: "公開：永不",
    makePublic: "公開：{date}",
    removePoll: "移除投票",
    addPoll: "新增投票",
    noVerification: "無需驗證",
    devconnect2025: "Devconnect 2025",
  },
  ja: {
    asLabel: "{name} として",
    importFromPolisUrl: "Polis URL からインポート",
    importFromCsv: "CSV からインポート",
    newConversation: "新しい会話",
    private: "プライベート",
    public: "パブリック",
    requiresLogin: "ログインが必要",
    guestParticipation: "ゲスト参加",
    makePublicNever: "公開：Never",
    makePublic: "公開：{date}",
    removePoll: "投票を削除",
    addPoll: "投票を追加",
    noVerification: "検証不要",
    devconnect2025: "Devconnect 2025",
  },
};
