export interface NewConversationRouteGuardTranslations {
  saveConversationDraft: string;
  draftWillBeHere: string;
  [key: string]: string;
}

export const newConversationRouteGuardTranslations: Record<
  string,
  NewConversationRouteGuardTranslations
> = {
  en: {
    saveConversationDraft: "Save conversation as draft?",
    draftWillBeHere: "Your drafted conversation will be here when you return.",
  },
  es: {
    saveConversationDraft: "¿Guardar conversación como borrador?",
    draftWillBeHere: "Tu borrador de conversación estará aquí cuando regreses.",
  },
  fr: {
    saveConversationDraft: "Sauvegarder la conversation comme brouillon ?",
    draftWillBeHere: "Votre brouillon de conversation sera ici à votre retour.",
  },
};
