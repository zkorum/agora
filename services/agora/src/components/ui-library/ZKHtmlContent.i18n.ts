import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface ZKHtmlContentTranslations {
  postContentPreview: string;
  postContent: string;
}

export const zkHtmlContentTranslations: Record<
  SupportedDisplayLanguageCodes,
  ZKHtmlContentTranslations
> = {
  en: {
    postContentPreview: "Post content preview",
    postContent: "Post content",
  },
  ar: {
    postContentPreview: "معاينة محتوى المنشور",
    postContent: "محتوى المنشور",
  },
  es: {
    postContentPreview: "Vista previa del contenido",
    postContent: "Contenido de la publicación",
  },
  fa: { postContentPreview: "پیش‌نمایش محتوای پست", postContent: "محتوای پست" },
  fr: {
    postContentPreview: "Aperçu du contenu",
    postContent: "Contenu du post",
  },
  "zh-Hans": {
    postContentPreview: "帖子内容预览",
    postContent: "帖子内容",
  },
  "zh-Hant": {
    postContentPreview: "帖子內容預覽",
    postContent: "帖子內容",
  },
  he: { postContentPreview: "תצוגה מקדימה של תוכן הפוסט", postContent: "תוכן הפוסט" },
  ja: {
    postContentPreview: "投稿内容プレビュー",
    postContent: "投稿内容",
  },
  ky: {
    postContentPreview: "Жазуу мазмунун алдын ала көрүү",
    postContent: "Жазуу мазмуну",
  },
  ru: {
    postContentPreview: "Предпросмотр содержимого публикации",
    postContent: "Содержимое публикации",
  },
};
