// French translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  // Minimal content to ensure locale is recognized by Vue i18n
  common: {
    loading: "Chargement...",
  },

  // Agora-specific business terminology (global scope)
  agora: {
    agora: "Agora",
    democraticDiscourse: "Discours Démocratique",
    consensusBuilding: "Construction de Consensus",
    platformName: "Agora",
    mission: "Plateforme de Discussion Démocratique",
  },

  conversation: {
    conversation: "Conversation",
    conversations: "Conversations",
    topic: "Sujet",
    topics: "Sujets",
    discussion: "Discussion",
    thread: "Fil",
    newConversation: "Nouvelle Conversation",
    startConversation: "Démarrer une Conversation",
    joinConversation: "Rejoindre la Conversation",
  },

  opinion: {
    opinion: "Opinion",
    opinions: "Opinions",
    viewpoint: "Point de Vue",
    perspective: "Perspective",
    stance: "Position",
    newOpinion: "Nouvelle Opinion",
    shareOpinion: "Partager l'Opinion",
    expressView: "Exprimer un Point de Vue",
  },

  voting: {
    vote: "Vote",
    votes: "Votes",
    agree: "D'accord",
    disagree: "Pas d'accord",
    neutral: "Neutre",
    consensus: "Consensus",
    cluster: "Groupe",
    clustering: "Regroupement",
    agreement: "Accord",
    disagreement: "Désaccord",
  },

  moderation: {
    moderator: "Modérateur",
    moderation: "Modération",
    review: "Examiner",
    communityGuidelines: "Directives de la Communauté",
    reportContent: "Signaler le Contenu",
    inappropriate: "Inapproprié",
    violation: "Violation",
  },

  community: {
    community: "Communauté",
    participant: "Participant",
    member: "Membre",
    contributor: "Contributeur",
    engagement: "Engagement",
    participate: "Participer",
    contribute: "Contribuer",
  },

  anonymity: {
    anonymous: "Anonyme",
    anonymity: "Anonymat",
    privacy: "Confidentialité",
    pseudonymous: "Pseudonyme",
    identity: "Identité",
    disclosure: "Divulgation",
  },
};

export default translations;
