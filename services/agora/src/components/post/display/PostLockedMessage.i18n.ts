export interface PostLockedMessageTranslations {
  lockedMessage: string;
  editButton: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const postLockedMessageTranslations: Record<
  string,
  PostLockedMessageTranslations
> = {
  en: {
    lockedMessage: 'Post locked as "{reason}". New opinions cannot be posted.',
    editButton: "Edit",
  },
  es: {
    lockedMessage:
      'Publicación bloqueada como "{reason}". No se pueden publicar nuevas opiniones.',
    editButton: "Editar",
  },
  fr: {
    lockedMessage:
      'Publication verrouillée en tant que "{reason}". De nouvelles opinions ne peuvent pas être publiées.',
    editButton: "Modifier",
  },
};
