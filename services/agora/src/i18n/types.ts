// Central type definition for all translation files
// This ensures all language files maintain the same structure

export interface TranslationSchema {
  // Existing minimal content to ensure locale is recognized by Vue i18n
  common: {
    loading: string;
  };

  // Agora-specific business terminology (global scope)
  agora: {
    agora: string;
    democraticDiscourse: string;
    consensusBuilding: string;
    platformName: string;
    mission: string;
  };

  conversation: {
    conversation: string;
    conversations: string;
    topic: string;
    topics: string;
    discussion: string;
    thread: string;
    newConversation: string;
    startConversation: string;
    joinConversation: string;
  };

  opinion: {
    opinion: string;
    opinions: string;
    viewpoint: string;
    perspective: string;
    stance: string;
    newOpinion: string;
    shareOpinion: string;
    expressView: string;
  };

  voting: {
    vote: string;
    votes: string;
    agree: string;
    disagree: string;
    neutral: string;
    consensus: string;
    cluster: string;
    clustering: string;
    agreement: string;
    disagreement: string;
  };

  moderation: {
    moderator: string;
    moderation: string;
    review: string;
    communityGuidelines: string;
    reportContent: string;
    inappropriate: string;
    violation: string;
  };

  community: {
    community: string;
    participant: string;
    member: string;
    contributor: string;
    engagement: string;
    participate: string;
    contribute: string;
  };

  anonymity: {
    anonymous: string;
    anonymity: string;
    privacy: string;
    pseudonymous: string;
    identity: string;
    disclosure: string;
  };

  // Index signature to satisfy vue-i18n's LocaleMessage requirements
  [key: string]: string | Record<string, unknown>;
}
