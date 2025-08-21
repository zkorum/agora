// Spanish translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  // Minimal content to ensure locale is recognized by Vue i18n
  common: {
    loading: "Cargando...",
  },

  // Agora-specific business terminology (global scope)
  agora: {
    agora: "Ágora",
    democraticDiscourse: "Discurso Democrático",
    consensusBuilding: "Construcción de Consenso",
    platformName: "Ágora",
    mission: "Plataforma de Discusión Democrática",
  },

  conversation: {
    conversation: "Conversación",
    conversations: "Conversaciones",
    topic: "Tema",
    topics: "Temas",
    discussion: "Discusión",
    thread: "Hilo",
    newConversation: "Nueva Conversación",
    startConversation: "Iniciar Conversación",
    joinConversation: "Unirse a la Conversación",
  },

  opinion: {
    opinion: "Opinión",
    opinions: "Opiniones",
    viewpoint: "Punto de Vista",
    perspective: "Perspectiva",
    stance: "Postura",
    newOpinion: "Nueva Opinión",
    shareOpinion: "Compartir Opinión",
    expressView: "Expresar Punto de Vista",
  },

  voting: {
    vote: "Voto",
    votes: "Votos",
    agree: "De Acuerdo",
    disagree: "En Desacuerdo",
    neutral: "Neutral",
    consensus: "Consenso",
    cluster: "Grupo",
    clustering: "Agrupación",
    agreement: "Acuerdo",
    disagreement: "Desacuerdo",
  },

  moderation: {
    moderator: "Moderador",
    moderation: "Moderación",
    review: "Revisar",
    communityGuidelines: "Normas de la Comunidad",
    reportContent: "Reportar Contenido",
    inappropriate: "Inapropiado",
    violation: "Violación",
  },

  community: {
    community: "Comunidad",
    participant: "Participante",
    member: "Miembro",
    contributor: "Colaborador",
    engagement: "Participación",
    participate: "Participar",
    contribute: "Contribuir",
  },

  anonymity: {
    anonymous: "Anónimo",
    anonymity: "Anonimato",
    privacy: "Privacidad",
    pseudonymous: "Seudónimo",
    identity: "Identidad",
    disclosure: "Divulgación",
  },
};

export default translations;
