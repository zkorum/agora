import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface NewConversationControlBarTranslations {
  asLabel: string;
  importFromPolis: string;
  newConversation: string;
  private: string;
  public: string;
  requiresLogin: string;
  guestParticipation: string;
  makePublicNever: string;
  makePublic: string;
  removePoll: string;
  addPoll: string;
}

export const newConversationControlBarTranslations: Record<
  SupportedDisplayLanguageCodes,
  NewConversationControlBarTranslations
> = {
  en: {
    asLabel: "As {name}",
    importFromPolis: "Import from Polis",
    newConversation: "New Conversation",
    private: "Private",
    public: "Public",
    requiresLogin: "Requires login",
    guestParticipation: "Guest participation",
    makePublicNever: "Make public: Never",
    makePublic: "Make public: {date}",
    removePoll: "Remove poll",
    addPoll: "Add poll",
  },
  ar: {
    asLabel: "باسم {name}",
    importFromPolis: "استيراد من بوليس",
    newConversation: "محادثة جديدة",
    private: "خاص",
    public: "عام",
    requiresLogin: "يتطلب تسجيل الدخول",
    guestParticipation: "مشاركة الضيوف",
    makePublicNever: "جعله عامًا: أبدًا",
    makePublic: "جعله عامًا: {date}",
    removePoll: "إزالة الاستطلاع",
    addPoll: "إضافة استطلاع",
  },
  es: {
    asLabel: "Como {name}",
    importFromPolis: "Importar desde Polis",
    newConversation: "Nueva Conversación",
    private: "Privado",
    public: "Público",
    requiresLogin: "Requiere inicio de sesión",
    guestParticipation: "Participación de invitados",
    makePublicNever: "Hacer público: Nunca",
    makePublic: "Hacer público: {date}",
    removePoll: "Eliminar encuesta",
    addPoll: "Agregar encuesta",
  },
  fr: {
    asLabel: "En tant que {name}",
    importFromPolis: "Importer depuis Polis",
    newConversation: "Nouvelle Conversation",
    private: "Privé",
    public: "Public",
    requiresLogin: "Connexion requise",
    guestParticipation: "Participation d'invités",
    makePublicNever: "Rendre public : Jamais",
    makePublic: "Rendre public : {date}",
    removePoll: "Supprimer le sondage",
    addPoll: "Ajouter un sondage",
  },
  "zh-Hans": {
    asLabel: "作为 {name}",
    importFromPolis: "从 Polis 导入",
    newConversation: "新对话",
    private: "私密",
    public: "公开",
    requiresLogin: "需要登录",
    guestParticipation: "访客参与",
    makePublicNever: "公开：永不",
    makePublic: "公开：{date}",
    removePoll: "移除投票",
    addPoll: "添加投票",
  },
  "zh-Hant": {
    asLabel: "作為 {name}",
    importFromPolis: "從 Polis 匯入",
    newConversation: "新對話",
    private: "私密",
    public: "公開",
    requiresLogin: "需要登入",
    guestParticipation: "訪客參與",
    makePublicNever: "公開：永不",
    makePublic: "公開：{date}",
    removePoll: "移除投票",
    addPoll: "新增投票",
  },
  ja: {
    asLabel: "{name} として",
    importFromPolis: "Polis からインポート",
    newConversation: "新しい会話",
    private: "プライベート",
    public: "パブリック",
    requiresLogin: "ログインが必要",
    guestParticipation: "ゲスト参加",
    makePublicNever: "公開：Never",
    makePublic: "公開：{date}",
    removePoll: "投票を削除",
    addPoll: "投票を追加",
  },
};
