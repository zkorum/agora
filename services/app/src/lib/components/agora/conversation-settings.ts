import { createContext } from "svelte";

import type { ConversationSetup } from "#lib/api/agora/conversation-setup.js";
import type { ConversationViewKind } from "$ui/agora/view-types.js";

import type { AuthoringContent } from "./conversation-authoring.js";
import type { ActivityReview } from "./opinion-moderation.js";

export type ParticipationSettings =
  | { kind: "polis"; allowNewOpinions: boolean; display: "feed" | "deck" }
  | {
      kind: "prioritizing";
      method: "pairwise" | "bws" | "qv" | undefined;
      allowParticipantStatements: boolean;
      allowOpposition: boolean;
    }
  | {
      kind: "gathering";
      gatheringMode: "new" | "amend";
      allowNewResponses: boolean;
      responseVisibility: "everyone" | "facilitators";
    };
export interface ConversationSettings {
  title: string;
  description: string;
  participation: ParticipationSettings;
}
export type SettingsField = "name" | "description";
export type WorkspaceTab = "setup" | "moderation" | "analysis";
export interface ConversationSettingsTarget {
  field: SettingsField | "project";
  opener: HTMLElement | undefined;
}
export function initialConversationSettings({
  kind,
  title,
}: {
  kind: ConversationViewKind;
  title: string;
}): ConversationSettings {
  const participation: ParticipationSettings =
    kind === "polis"
      ? { kind, allowNewOpinions: true, display: "feed" }
      : kind === "gathering"
        ? {
            kind,
            gatheringMode: "new",
            allowNewResponses: true,
            responseVisibility: "everyone",
          }
        : {
            kind,
            method: undefined,
            allowParticipantStatements: false,
            allowOpposition: true,
          };
  return { title, description: "", participation };
}
export function settingsFromSetup(
  setup: ConversationSetup,
): ConversationSettings {
  const participation: ParticipationSettings =
    setup.conversationType === "polis"
      ? {
          kind: "polis",
          display: setup.display,
          allowNewOpinions: setup.allowNewOpinions,
        }
      : setup.conversationType === "gathering"
        ? {
            kind: "gathering",
            gatheringMode: "new",
            allowNewResponses: setup.allowNewResponses,
            responseVisibility: setup.responseVisibility,
          }
        : {
            kind: "prioritizing",
            method:
              setup.prioritizationType === "qv" ? "qv" : setup.comparisonMethod,
            allowOpposition:
              setup.prioritizationType === "qv" && setup.allowOpposition,
            allowParticipantStatements:
              setup.prioritizationType === "comparisons" &&
              setup.allowParticipantStatements,
          };
  return { title: setup.title, description: setup.description, participation };
}
export const [getConversationSettings, setConversationSettings] =
  createContext<{
    readonly applied: ConversationSettings | undefined;
    readonly tab: WorkspaceTab;
    readonly review: ActivityReview | undefined;
    edit: (target: ConversationSettingsTarget) => void;
    apply: (settings: ConversationSettings) => Promise<boolean>;
    readonly content: AuthoringContent | undefined;
    replaceContent: (content: AuthoringContent) => Promise<boolean>;
  }>();
