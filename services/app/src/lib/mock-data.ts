import type { QvAllocationRow } from "$logic/agora/qv-allocation.js";
import type {
  AuthorView,
  ConversationView,
  OpinionVoteBreakdown,
  ProjectView,
} from "$ui/agora/view-types.js";
import type { IconName } from "$ui/shared/view-types.js";

export const navigation: {
  id: string;
  label: string;
  icon: IconName;
  group: string;
}[] = [
  { id: "projects", label: "Projects", icon: "folder", group: "Facilitate" },
  { id: "history", label: "History", icon: "history", group: "Participate" },
  { id: "explore", label: "Explore", icon: "explore", group: "Participate" },
  {
    id: "notifications",
    label: "Notifications",
    icon: "bell",
    group: "Updates",
  },
];

export const projects: ProjectView[] = [
  {
    id: "riverside",
    title: "A Greener Riverside",
    description:
      "A community-led plan for greener streets, safer journeys and welcoming public spaces. Explore how residents’ proposals become shared priorities, then return as practical plans shaped by the community.",
    organization: "Civic Tomorrow Collective",
    cover: "coral",
    conversationCount: "3",
    participantCount: "32",
  },
  {
    id: "youth",
    title: "Youth Services Summit 2026 (in partnership with Agora)",
    description:
      "Young people and local organisations working together on the future of youth services.",
    organization: "Civic Tomorrow Collective & 1 other…",
    cover: "gradient",
    conversationCount: "7",
    participantCount: "32",
  },
];

export const conversations: ConversationView[] = [
  {
    id: "ideas",
    title: "Share your idea for a greener Riverside",
    description:
      "What practical change would make Riverside greener, healthier or more enjoyable for everyone?",
    kind: "gathering",
    status: "closed",
    contentCount: "12",
    voteCount: "814",
    participantCount: "32",
  },
  {
    id: "polis",
    title: "Where do we agree on better journeys?",
    description:
      "Explore ideas from the first round. Agree, disagree or pass on each statement, and add a perspective we’ve missed.",
    kind: "polis",
    status: "open",
    contentCount: "5",
    voteCount: "1,024",
    participantCount: "128",
  },
  {
    id: "prioritizing",
    title: "Which improvements should come first?",
    description: "Help decide which community ideas to take forward.",
    kind: "prioritizing",
    status: "draft",
    contentCount: "8",
    voteCount: "0",
    participantCount: "0",
  },
];

export const author: AuthorView = {
  name: "silver_thyme",
  initials: "ST",
  detail: "2 minutes ago",
};
const propositionTexts = [
  "We should make it safer and easier to walk and cycle around Riverside instead of relying on cars for short journeys.",
  "We need more public transport options to reduce traffic congestion and pollution in the city.",
  "Investing in renewable energy sources is crucial for sustainable development and environmental protection.",
];

export const opinionTexts = [...propositionTexts];
export const prioritizationItemTexts = [...propositionTexts];

export const opinionVoteBreakdown: OpinionVoteBreakdown[] = [
  { choice: "disagree", label: "Disagree", count: "32", percentage: 25 },
  { choice: "pass", label: "Unsure", count: "16", percentage: 12.5 },
  { choice: "agree", label: "Agree", count: "80", percentage: 62.5 },
];

export const qvAllocations: QvAllocationRow[] = [
  {
    id: "trees",
    title: "Plant shade trees along everyday walking routes.",
    description:
      "Select three streets through a shared survey and an open invitation for residents to identify difficult summer journeys.",
    votes: 7,
  },
  {
    id: "crossings",
    title: "Make crossings safer near schools.",
    description:
      "Create step-free routes and safer places to cross for children and people with reduced mobility.",
    votes: 0,
  },
  {
    id: "parking",
    title: "Keep the current amount of on-street parking.",
    description:
      "Retain convenient vehicle access to local shops and services.",
    votes: -4,
  },
];
