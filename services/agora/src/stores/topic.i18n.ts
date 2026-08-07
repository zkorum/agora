import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface TopicStoreTranslations {
  failedToFollowTopic: string;
  failedToUnfollowTopic: string;
  followedTopicsLoadError: string;
  topicsLoadError: string;
}

export const topicStoreTranslations: Record<
  SupportedDisplayLanguageCodes,
  TopicStoreTranslations
> = {
  en: {
    failedToFollowTopic: "Failed to follow topic",
    failedToUnfollowTopic: "Failed to unfollow topic",
    followedTopicsLoadError: "Error while trying to load followed topics",
    topicsLoadError: "Error while trying to load topics",
  },
  ar: {
    failedToFollowTopic: "فشل متابعة الموضوع",
    failedToUnfollowTopic: "فشل إلغاء متابعة الموضوع",
    followedTopicsLoadError: "حدث خطأ أثناء محاولة تحميل المواضيع المتابَعة",
    topicsLoadError: "حدث خطأ أثناء محاولة تحميل المواضيع",
  },
  es: {
    failedToFollowTopic: "No se pudo seguir el tema",
    failedToUnfollowTopic: "No se pudo dejar de seguir el tema",
    followedTopicsLoadError: "Error al intentar cargar los temas seguidos",
    topicsLoadError: "Error al intentar cargar los temas",
  },
  fa: {
    failedToFollowTopic: "دنبال کردن موضوع ناموفق بود",
    failedToUnfollowTopic: "لغو دنبال کردن موضوع ناموفق بود",
    followedTopicsLoadError: "هنگام بارگیری موضوعات دنبال‌شده خطایی رخ داد",
    topicsLoadError: "هنگام بارگیری موضوعات خطایی رخ داد",
  },
  fr: {
    failedToFollowTopic: "Échec du suivi du sujet",
    failedToUnfollowTopic: "Échec de l’arrêt du suivi du sujet",
    followedTopicsLoadError: "Erreur lors du chargement des sujets suivis",
    topicsLoadError: "Erreur lors du chargement des sujets",
  },
  he: {
    failedToFollowTopic: "מעקב אחרי הנושא נכשל",
    failedToUnfollowTopic: "ביטול המעקב אחרי הנושא נכשל",
    followedTopicsLoadError: "אירעה שגיאה בניסיון לטעון את הנושאים שבמעקב",
    topicsLoadError: "אירעה שגיאה בניסיון לטעון את הנושאים",
  },
  ja: {
    failedToFollowTopic: "トピックをフォローできませんでした",
    failedToUnfollowTopic: "トピックのフォローを解除できませんでした",
    followedTopicsLoadError:
      "フォロー中のトピックの読み込み中にエラーが発生しました",
    topicsLoadError: "トピックの読み込み中にエラーが発生しました",
  },
  ky: {
    failedToFollowTopic: "Теманы ээрчүү ишке ашкан жок",
    failedToUnfollowTopic: "Теманы ээрчүүнү токтотуу ишке ашкан жок",
    followedTopicsLoadError: "Ээрчилген темаларды жүктөө аракетинде ката кетти",
    topicsLoadError: "Темаларды жүктөө аракетинде ката кетти",
  },
  ru: {
    failedToFollowTopic: "Не удалось подписаться на тему",
    failedToUnfollowTopic: "Не удалось отписаться от темы",
    followedTopicsLoadError: "Ошибка при загрузке отслеживаемых тем",
    topicsLoadError: "Ошибка при загрузке тем",
  },
  "zh-Hans": {
    failedToFollowTopic: "关注主题失败",
    failedToUnfollowTopic: "取消关注主题失败",
    followedTopicsLoadError: "加载已关注主题时出错",
    topicsLoadError: "加载主题时出错",
  },
  "zh-Hant": {
    failedToFollowTopic: "追蹤主題失敗",
    failedToUnfollowTopic: "取消追蹤主題失敗",
    followedTopicsLoadError: "載入已追蹤主題時發生錯誤",
    topicsLoadError: "載入主題時發生錯誤",
  },
};
