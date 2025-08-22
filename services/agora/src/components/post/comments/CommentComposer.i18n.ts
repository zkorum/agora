export interface CommentComposerTranslations {
  placeholder: string;
  postButton: string;
  conversationLockedError: string;
  createOpinionError: string;
  [key: string]: string;
}

export const commentComposerTranslations: Record<
  string,
  CommentComposerTranslations
> = {
  en: {
    placeholder: "Add your own opinion",
    postButton: "Post",
    conversationLockedError:
      "Cannot create opinion because the conversation is locked",
    createOpinionError: "Error while trying to create a new opinion",
  },
  es: {
    placeholder: "Añade tu propia opinión",
    postButton: "Publicar",
    conversationLockedError:
      "No se puede crear una opinión porque la conversación está bloqueada",
    createOpinionError: "Error al intentar crear una nueva opinión",
  },
  fr: {
    placeholder: "Ajoutez votre propre opinion",
    postButton: "Publier",
    conversationLockedError:
      "Impossible de créer une opinion car la conversation est verrouillée",
    createOpinionError:
      "Erreur lors de la tentative de création d'une nouvelle opinion",
  },
};
