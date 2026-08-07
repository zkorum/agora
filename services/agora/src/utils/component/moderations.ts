import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type {
  ConversationModerationAction,
  ModerationReason,
  OpinionModerationAction,
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

  const moderationReasonMapping = computed<ModerationReasonOption[]>(() => [
    { label: t("misleading"), value: "misleading" },
    { label: t("antisocial"), value: "antisocial" },
    { label: t("illegal"), value: "illegal" },
    { label: t("doxing"), value: "doxing" },
    { label: t("sexual"), value: "sexual" },
    { label: t("spam"), value: "spam" },
  ]);

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
    moderationReasonMapping,
    moderationActionPostsMapping,
    opinionModerationActionMapping,
  };
}
