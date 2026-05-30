import type { SupportedDisplayLanguageCodes } from "src/shared/languages";

export interface CheckpointTimelineTestTranslations {
  title: string;
  description: string;
  smallSet: string;
  manySet: string;
  addCheckpoint: string;
  removeCheckpoint: string;
  live: string;
  freezeLatest: string;
  latestIsCurrent: string;
  closedTerminal: string;
  reasonOptions: string;
  checkpointTimeline: string;
  start: string;
  now: string;
  previous: string;
  next: string;
  firstAnalysis: string;
  groupCountAvailable: string;
  defaultChanged: string;
  participantMilestone: string;
  voteMilestone: string;
  conversationClosed: string;
}

const en: CheckpointTimelineTestTranslations = {
  title: "Checkpoint Timeline",
  description:
    "Test the horizontal stepped checkpoint timeline with small and large checkpoint sets, live/frozen state, and different checkpoint reasons.",
  smallSet: "Small set",
  manySet: "Many checkpoints",
  addCheckpoint: "Add checkpoint",
  removeCheckpoint: "Remove checkpoint",
  live: "Live",
  freezeLatest: "Freeze latest",
  latestIsCurrent: "Latest is current",
  closedTerminal: "Closed terminal marker",
  reasonOptions: "Reason options",
  checkpointTimeline: "Checkpoint timeline",
  start: "Start",
  now: "Now",
  previous: "Previous checkpoint",
  next: "Next checkpoint",
  firstAnalysis: "First analysis",
  groupCountAvailable: "Group count available",
  defaultChanged: "Default changed",
  participantMilestone: "Participant milestone",
  voteMilestone: "Vote milestone",
  conversationClosed: "Closed",
};

export const checkpointTimelineTestTranslations: Record<
  SupportedDisplayLanguageCodes,
  CheckpointTimelineTestTranslations
> = {
  en,
  ar: en,
  es: en,
  fa: en,
  fr: en,
  he: en,
  ja: en,
  ky: en,
  ru: en,
  "zh-Hans": en,
  "zh-Hant": en,
};
