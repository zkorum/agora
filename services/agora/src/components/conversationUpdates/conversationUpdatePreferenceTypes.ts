import type {
  ConversationEmailUpdatePreferenceGroup,
  ConversationEmailUpdatePreferenceUpdateResponse,
} from "src/shared/types/dto";

export type ProjectEmailUpdatePreferenceGroup = Extract<
  ConversationEmailUpdatePreferenceGroup,
  { kind: "project" }
>;

export type NoProjectEmailUpdatePreferenceGroup = Extract<
  ConversationEmailUpdatePreferenceGroup,
  { kind: "no_project" }
>;

export type ConversationEmailUpdatePreference =
  ConversationEmailUpdatePreferenceGroup["conversations"][number];

export type ConversationEmailUpdatePreferenceResult = Extract<
  ConversationEmailUpdatePreferenceUpdateResponse,
  { success: true }
>["result"];

export type ConversationEmailUpdatePreferenceOverride =
  | {
      kind: "global";
      paused: boolean;
    }
  | {
      kind: "project";
      projectSlug: string;
      state: ProjectEmailUpdatePreferenceGroup["state"];
    }
  | {
      kind: "conversation";
      conversationSlugId: string;
      state: "enabled" | "disabled";
    };

export interface ConversationEmailUpdatePreferenceChange {
  conversationSlugId: string;
  enabled: boolean;
}
