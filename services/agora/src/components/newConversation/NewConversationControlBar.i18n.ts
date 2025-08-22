export interface NewConversationControlBarTranslations {
  asLabel: string;
  importFromPolis: string;
  newConversation: string;
  private: string;
  public: string;
  requiresLogin: string;
  guestParticipation: string;
  makePublicNever: string;
  makePublic: string;
  removePoll: string;
  addPoll: string;
}

export const newConversationControlBarTranslations: Record<
  string,
  NewConversationControlBarTranslations
> = {
  en: {
    asLabel: "As {name}",
    importFromPolis: "Import from Polis",
    newConversation: "New Conversation",
    private: "Private",
    public: "Public",
    requiresLogin: "Requires login",
    guestParticipation: "Guest participation",
    makePublicNever: "Make public: Never",
    makePublic: "Make public: {date}",
    removePoll: "Remove poll",
    addPoll: "Add poll",
  },
  es: {
    asLabel: "Como {name}",
    importFromPolis: "Importar desde Polis",
    newConversation: "Nueva Conversación",
    private: "Privado",
    public: "Público",
    requiresLogin: "Requiere inicio de sesión",
    guestParticipation: "Participación de invitados",
    makePublicNever: "Hacer público: Nunca",
    makePublic: "Hacer público: {date}",
    removePoll: "Eliminar encuesta",
    addPoll: "Agregar encuesta",
  },
  fr: {
    asLabel: "En tant que {name}",
    importFromPolis: "Importer depuis Polis",
    newConversation: "Nouvelle Conversation",
    private: "Privé",
    public: "Public",
    requiresLogin: "Connexion requise",
    guestParticipation: "Participation d'invités",
    makePublicNever: "Rendre public : Jamais",
    makePublic: "Rendre public : {date}",
    removePoll: "Supprimer le sondage",
    addPoll: "Ajouter un sondage",
  },
};
