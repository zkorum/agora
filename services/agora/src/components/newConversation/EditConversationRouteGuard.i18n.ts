import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

interface Texts {
  message: string;
  cancel: string;
  discard: string;
}
export const editConversationRouteGuardTranslations: Record<
  SupportedDisplayLanguageCodes,
  Texts
> = {
  en: {
    message: "Discard your unsaved conversation changes?",
    cancel: "Keep editing",
    discard: "Discard changes",
  },
  de: {
    message: "Möchten Sie Ihre ungespeicherten Änderungen an der Diskussion verwerfen?",
    cancel: "Bearbeitung beibehalten",
    discard: "Änderungen verwerfen",
  },
  hi: {
    message: "क्या आप अपनी सहेजी न गई चर्चा में बदलाव छोड़ना चाहते हैं?",
    cancel: "संपादित करना जारी रखें",
    discard: "बदलाव छोड़ें",
  },
  fr: {
    message:
      "Abandonner les modifications non enregistrées de la conversation ?",
    cancel: "Continuer à modifier",
    discard: "Abandonner les modifications",
  },
  es: {
    message: "¿Descartar los cambios sin guardar de la conversación?",
    cancel: "Seguir editando",
    discard: "Descartar cambios",
  },
  ar: {
    message: "هل تريد تجاهل تغييرات المحادثة غير المحفوظة؟",
    cancel: "متابعة التعديل",
    discard: "تجاهل التغييرات",
  },
  fa: {
    message: "تغییرات ذخیره‌نشده گفتگو کنار گذاشته شوند؟",
    cancel: "ادامه ویرایش",
    discard: "کنار گذاشتن تغییرات",
  },
  he: {
    message: "לבטל את השינויים שלא נשמרו בשיחה?",
    cancel: "המשך עריכה",
    discard: "ביטול שינויים",
  },
  "zh-Hans": {
    message: "放弃未保存的对话更改？",
    cancel: "继续编辑",
    discard: "放弃更改",
  },
  "zh-Hant": {
    message: "捨棄未儲存的對話變更？",
    cancel: "繼續編輯",
    discard: "捨棄變更",
  },
  ja: {
    message: "保存されていない会話の変更を破棄しますか？",
    cancel: "編集を続ける",
    discard: "変更を破棄",
  },
  ky: {
    message: "Сүйлөшүүнүн сакталбаган өзгөртүүлөрүн жокко чыгарасызбы?",
    cancel: "Түзөтүүнү улантуу",
    discard: "Өзгөртүүлөрдү жокко чыгаруу",
  },
  ru: {
    message: "Отменить несохранённые изменения обсуждения?",
    cancel: "Продолжить редактирование",
    discard: "Отменить изменения",
  },
};
