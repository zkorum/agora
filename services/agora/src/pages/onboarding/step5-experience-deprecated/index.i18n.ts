export interface Step5ExperienceTranslations {
  title: string;
  safeSpaceTitle: string;
  safeSpaceDescription: string;
  braveSpaceTitle: string;
  braveSpaceDescription: string;
  [key: string]: string; // Required for Record<string, string> constraint
}

export const step5ExperienceTranslations: Record<
  string,
  Step5ExperienceTranslations
> = {
  en: {
    title: "Choose how you want to experience Agora",
    safeSpaceTitle: "Safe Space",
    safeSpaceDescription:
      "Content flagged as antisocial (trolling or intolerance) is removed from my feed. If I want to see what was removed, I can check the post's moderation history.",
    braveSpaceTitle: "Brave Space",
    braveSpaceDescription:
      "Content flagged as antisocial is shown to me with a warning.",
  },
  es: {
    title: "Elige cómo quieres experimentar Agora",
    safeSpaceTitle: "Espacio Seguro",
    safeSpaceDescription:
      "El contenido marcado como antisocial (trolling o intolerancia) se elimina de mi feed. Si quiero ver lo que fue eliminado, puedo revisar el historial de moderación de la publicación.",
    braveSpaceTitle: "Espacio Valiente",
    braveSpaceDescription:
      "El contenido marcado como antisocial se me muestra con una advertencia.",
  },
  fr: {
    title: "Choisissez comment vous voulez vivre Agora",
    safeSpaceTitle: "Espace Sûr",
    safeSpaceDescription:
      "Le contenu signalé comme antisocial (trolling ou intolérance) est supprimé de mon flux. Si je veux voir ce qui a été supprimé, je peux consulter l'historique de modération de la publication.",
    braveSpaceTitle: "Espace Courageux",
    braveSpaceDescription:
      "Le contenu signalé comme antisocial m'est montré avec un avertissement.",
  },
};
