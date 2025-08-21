export interface ConversationReviewTranslations {
  posting: string;
  post: string;
  addSeedOpinions: string;
  seedOpinionsDescription: string;
  add: string;
  inputTextPlaceholder: string;
  opinionCannotBeEmpty: string;
  opinionExceedsLimit: string;
  opinionDuplicate: string;
  errorCreatingConversation: string;
  [key: string]: string;
}

export const conversationReviewTranslations: Record<
  string,
  ConversationReviewTranslations
> = {
  en: {
    posting: "Posting...",
    post: "Post",
    addSeedOpinions: "Add Seed Opinions",
    seedOpinionsDescription:
      "It's recommended to seed 8 to 15 opinions across a range of viewpoints. This has a powerful effect on early participation.",
    add: "Add",
    inputTextPlaceholder: "Input text",
    opinionCannotBeEmpty: "Opinion cannot be empty",
    opinionExceedsLimit:
      "Opinion exceeds {limit} character limit ({count}/{limit})",
    opinionDuplicate: "This opinion is a duplicate",
    errorCreatingConversation:
      "Error while trying to create a new conversation",
  },
  es: {
    posting: "Publicando...",
    post: "Publicar",
    addSeedOpinions: "Agregar Opiniones Semilla",
    seedOpinionsDescription:
      "Se recomienda sembrar de 8 a 15 opiniones en una gama de puntos de vista. Esto tiene un efecto poderoso en la participación temprana.",
    add: "Agregar",
    inputTextPlaceholder: "Ingrese texto",
    opinionCannotBeEmpty: "La opinión no puede estar vacía",
    opinionExceedsLimit:
      "La opinión excede el límite de {limit} caracteres ({count}/{limit})",
    opinionDuplicate: "Esta opinión es un duplicado",
    errorCreatingConversation: "Error al intentar crear una nueva conversación",
  },
  fr: {
    posting: "Publication...",
    post: "Publier",
    addSeedOpinions: "Ajouter des Opinions Initiales",
    seedOpinionsDescription:
      "Il est recommandé de semer 8 à 15 opinions à travers une gamme de points de vue. Cela a un effet puissant sur la participation précoce.",
    add: "Ajouter",
    inputTextPlaceholder: "Saisir le texte",
    opinionCannotBeEmpty: "L'opinion ne peut pas être vide",
    opinionExceedsLimit:
      "L'opinion dépasse la limite de {limit} caractères ({count}/{limit})",
    opinionDuplicate: "Cette opinion est un doublon",
    errorCreatingConversation:
      "Erreur lors de la tentative de création d'une nouvelle conversation",
  },
};
