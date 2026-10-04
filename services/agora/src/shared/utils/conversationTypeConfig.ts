/** **** WARNING: GENERATED FROM SHARED DIRECTORY, DO NOT MODIFY THIS FILE DIRECTLY! **** **/
import type { ConversationTypeConfig } from "../types/zod.js";

export function projectConversationTypeConfig(
    config: Readonly<ConversationTypeConfig>,
): ConversationTypeConfig {
    return config.conversationType === "polis"
        ? {
              conversationType: "polis",
              votingPresentation: config.votingPresentation,
          }
        : { conversationType: "ranking", rankingMode: config.rankingMode };
}
