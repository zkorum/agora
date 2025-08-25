export interface ZKHtmlContentTranslations {
  postContentPreview: string;
  postContent: string;
}

export const zkHtmlContentTranslations: Record<
  string,
  ZKHtmlContentTranslations
> = {
  en: {
    postContentPreview: "Post content preview",
    postContent: "Post content",
  },
  es: {
    postContentPreview: "Vista previa del contenido",
    postContent: "Contenido de la publicación",
  },
  fr: {
    postContentPreview: "Aperçu du contenu",
    postContent: "Contenu du post",
  },
  "zh-CN": {
    postContentPreview: "帖子内容预览",
    postContent: "帖子内容",
  },
  "zh-TW": {
    postContentPreview: "帖子內容預覽",
    postContent: "帖子內容",
  },
  ja: {
    postContentPreview: "投稿内容プレビュー",
    postContent: "投稿内容",
  },
};
