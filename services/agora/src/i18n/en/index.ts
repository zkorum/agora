// English translations

import type { TranslationSchema } from "../types";

const translations: TranslationSchema = {
  // Minimal content to ensure locale is recognized by Vue i18n
  common: {
    loading: "Loading...",
  },

  // Agora-specific business terminology (global scope)
  agora: {
    agora: "Agora",
    democraticDiscourse: "Democratic Discourse",
    consensusBuilding: "Consensus Building",
    platformName: "Agora",
    mission: "Democratic Discussion Platform",
  },

  conversation: {
    conversation: "Conversation",
    conversations: "Conversations",
    topic: "Topic",
    topics: "Topics",
    discussion: "Discussion",
    thread: "Thread",
    newConversation: "New Conversation",
    startConversation: "Start Conversation",
    joinConversation: "Join Conversation",
  },

  opinion: {
    opinion: "Opinion",
    opinions: "Opinions",
    viewpoint: "Viewpoint",
    perspective: "Perspective",
    stance: "Stance",
    newOpinion: "New Opinion",
    shareOpinion: "Share Opinion",
    expressView: "Express View",
  },

  voting: {
    vote: "Vote",
    votes: "Votes",
    agree: "Agree",
    disagree: "Disagree",
    neutral: "Neutral",
    consensus: "Consensus",
    cluster: "Cluster",
    clustering: "Clustering",
    agreement: "Agreement",
    disagreement: "Disagreement",
  },

  moderation: {
    moderator: "Moderator",
    moderation: "Moderation",
    review: "Review",
    communityGuidelines: "Community Guidelines",
    reportContent: "Report Content",
    inappropriate: "Inappropriate",
    violation: "Violation",
  },

  community: {
    community: "Community",
    participant: "Participant",
    member: "Member",
    contributor: "Contributor",
    engagement: "Engagement",
    participate: "Participate",
    contribute: "Contribute",
  },

  anonymity: {
    anonymous: "Anonymous",
    anonymity: "Anonymity",
    privacy: "Privacy",
    pseudonymous: "Pseudonymous",
    identity: "Identity",
    disclosure: "Disclosure",
  },
};

export default translations;
