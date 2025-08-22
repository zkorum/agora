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
};
