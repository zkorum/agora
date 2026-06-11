import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ZKHtmlContentTranslations {
  postContentPreview: string;
  postContent: string;
  readMore: string;
  showLess: string;
}

export const zkHtmlContentTranslations: Record<
  SupportedDisplayLanguageCodes,
  ZKHtmlContentTranslations
> = {
  en: {
    postContentPreview: "Post content preview",
    postContent: "Post content",
    readMore: "Read more",
    showLess: "Show less",
  },
  ar: {
    postContentPreview: "معاينة محتوى المنشور",
    postContent: "محتوى المنشور",
    readMore: "اقرأ المزيد",
    showLess: "عرض أقل",
  },
  es: {
    postContentPreview: "Vista previa del contenido",
    postContent: "Contenido de la publicación",
    readMore: "Leer más",
    showLess: "Mostrar menos",
  },
  fa: {
    postContentPreview: "پیش‌نمایش محتوای پست",
    postContent: "محتوای پست",
    readMore: "بیشتر بخوانید",
    showLess: "نمایش کمتر",
  },
  fr: {
    postContentPreview: "Aperçu du contenu",
    postContent: "Contenu du post",
    readMore: "Lire la suite",
    showLess: "Afficher moins",
  },
  "zh-Hans": {
    postContentPreview: "帖子内容预览",
    postContent: "帖子内容",
    readMore: "阅读更多",
    showLess: "收起",
  },
  "zh-Hant": {
    postContentPreview: "帖子內容預覽",
    postContent: "帖子內容",
    readMore: "閱讀更多",
    showLess: "收起",
  },
  he: {
    postContentPreview: "תצוגה מקדימה של תוכן הפוסט",
    postContent: "תוכן הפוסט",
    readMore: "קראו עוד",
    showLess: "הציגו פחות",
  },
  ja: {
    postContentPreview: "投稿内容プレビュー",
    postContent: "投稿内容",
    readMore: "続きを読む",
    showLess: "表示を減らす",
  },
  ky: {
    postContentPreview: "Жазуу мазмунун алдын ала көрүү",
    postContent: "Жазуу мазмуну",
    readMore: "Кененирээк окуу",
    showLess: "Азыраак көрсөтүү",
  },
  ru: {
    postContentPreview: "Предпросмотр содержимого публикации",
    postContent: "Содержимое публикации",
    readMore: "Читать дальше",
    showLess: "Скрыть",
  },
};
