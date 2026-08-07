import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ModerationsTranslations {
  misleading: string;
  antisocial: string;
  illegal: string;
  doxing: string;
  sexual: string;
  spam: string;
  lock: string;
  move: string;
  hide: string;
}

export const moderationsTranslations: Record<
  SupportedDisplayLanguageCodes,
  ModerationsTranslations
> = {
  en: {
    misleading: "Misleading",
    antisocial: "Antisocial",
    illegal: "Illegal",
    doxing: "Doxing",
    sexual: "Sexual",
    spam: "Spam",
    lock: "Lock",
    move: "Move",
    hide: "Hide",
  },
  ar: {
    misleading: "مضلل",
    antisocial: "معادٍ للمجتمع",
    illegal: "غير قانوني",
    doxing: "كشف المعلومات الشخصية",
    sexual: "جنسي",
    spam: "محتوى مزعج",
    lock: "قفل",
    move: "نقل",
    hide: "إخفاء",
  },
  es: {
    misleading: "Engañoso",
    antisocial: "Antisocial",
    illegal: "Ilegal",
    doxing: "Doxing",
    sexual: "Sexual",
    spam: "Spam",
    lock: "Bloquear",
    move: "Mover",
    hide: "Ocultar",
  },
  fa: {
    misleading: "گمراه‌کننده",
    antisocial: "ضداجتماعی",
    illegal: "غیرقانونی",
    doxing: "افشای اطلاعات شخصی",
    sexual: "جنسی",
    spam: "هرزنامه",
    lock: "قفل کردن",
    move: "انتقال",
    hide: "پنهان کردن",
  },
  he: {
    misleading: "מטעה",
    antisocial: "אנטי-חברתי",
    illegal: "בלתי חוקי",
    doxing: "חשיפת מידע אישי",
    sexual: "מיני",
    spam: "ספאם",
    lock: "נעילה",
    move: "העברה",
    hide: "הסתרה",
  },
  fr: {
    misleading: "Trompeur",
    antisocial: "Antisocial",
    illegal: "Illégal",
    doxing: "Doxing",
    sexual: "Sexuel",
    spam: "Spam",
    lock: "Verrouiller",
    move: "Déplacer",
    hide: "Masquer",
  },
  "zh-Hans": {
    misleading: "误导性",
    antisocial: "反社会",
    illegal: "非法",
    doxing: "人肉搜索",
    sexual: "色情",
    spam: "垃圾信息",
    lock: "锁定",
    move: "移动",
    hide: "隐藏",
  },
  "zh-Hant": {
    misleading: "誤導性",
    antisocial: "反社會",
    illegal: "非法",
    doxing: "人肉搜索",
    sexual: "色情",
    spam: "垃圾資訊",
    lock: "鎖定",
    move: "移動",
    hide: "隱藏",
  },
  ja: {
    misleading: "誤解を招く",
    antisocial: "反社会的",
    illegal: "違法",
    doxing: "個人情報晒し",
    sexual: "性的",
    spam: "スパム",
    lock: "ロック",
    move: "移動",
    hide: "非表示",
  },
  ky: {
    misleading: "Адаштыруучу",
    antisocial: "Коомго каршы",
    illegal: "Мыйзамсыз",
    doxing: "Жеке маалыматты ачыктоо",
    sexual: "Жыныстык",
    spam: "Спам",
    lock: "Кулпулоо",
    move: "Жылдыруу",
    hide: "Жашыруу",
  },
  ru: {
    misleading: "Вводящее в заблуждение",
    antisocial: "Антисоциальное",
    illegal: "Незаконное",
    doxing: "Раскрытие личных данных",
    sexual: "Сексуальное",
    spam: "Спам",
    lock: "Заблокировать",
    move: "Переместить",
    hide: "Скрыть",
  },
};
