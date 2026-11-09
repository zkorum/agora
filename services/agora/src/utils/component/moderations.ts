import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  type ConversationModerationAction,
  type ModerationReason,
  type OpinionModerationAction,
  zodModerationReason,
} from "src/shared/types/zod";
import { computed } from "vue";

import {
  type ModerationsTranslations,
  moderationsTranslations,
} from "./moderations.i18n";

interface ModerationReasonOption {
  label: string;
  value: ModerationReason;
}

interface ConversationModerationActionOption {
  label: string;
  value: ConversationModerationAction;
}

interface OpinionModerationActionOption {
  label: string;
  value: OpinionModerationAction;
}

export function useModerationMappings() {
  const { t } = useComponentI18n<ModerationsTranslations>(
    moderationsTranslations
  );

  const getModerationReasonLabel = (reason: ModerationReason): string =>
    t(reason);

  const moderationReasonMapping = computed<ModerationReasonOption[]>(() =>
    zodModerationReason.options.map((value) => ({
      label: getModerationReasonLabel(value),
      value,
    }))
  );

  const moderationActionPostsMapping = computed<
    ConversationModerationActionOption[]
  >(() => [{ label: t("lock"), value: "lock" }]);

  const opinionModerationActionMapping = computed<
    OpinionModerationActionOption[]
  >(() => [
    { label: t("move"), value: "move" },
    { label: t("hide"), value: "hide" },
  ]);

  return {
    getModerationReasonLabel,
    moderationReasonMapping,
    moderationActionPostsMapping,
    opinionModerationActionMapping,
  };
}
