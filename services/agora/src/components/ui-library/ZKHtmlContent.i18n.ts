export interface ZKHtmlContentTranslations {
  postContentPreview: string;
  postContent: string;
  [key: string]: string; // Required for Record<string, string> constraint
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
