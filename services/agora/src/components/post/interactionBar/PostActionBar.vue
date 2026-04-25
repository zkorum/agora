<template>
  <div class="postActionBarContainer">
    <div class="buttonClusterBar" :class="{ buttonClusterBorder: !compactMode }">
      <div class="leftSection">
        <InteractionTab
          v-model="currentTab"
          :compact-mode="props.compactMode"
          :opinion-count="opinionCount"
          :is-loading="isLoading"
          :conversation-slug-id="conversationSlugId"
          :on-same-tab-click="props.onSameTabClick"
          :conversation-type="props.conversationType"
        />
      </div>

      <div class="rightSection">
        <ZKButton
          button-type="compactButton"
          @click.stop.prevent="showVoteBreakdown = true"
        >
          <div class="countContentContainer">
            <ZKIcon color="#7D7A85" name="mdi:vote" size="1rem" />
            <span>{{ formatAmount(voteCount) }}</span>
          </div>
        </ZKButton>

        <ZKButton
          button-type="compactButton"
          @click.stop.prevent="showParticipantBreakdown = true"
        >
          <div class="countContentContainer">
            <ZKIcon color="#7D7A85" name="ph:users-fill" size="1rem" />
            <span>{{ formatAmount(participantCount) }}</span>
          </div>
        </ZKButton>

        <ZKButton
          button-type="compactButton"
          @click.stop.prevent="shareClicked()"
        >
          <div class="shareButtonContentContainer">
            <div>
              <ZKIcon color="#7D7A85" name="mdi:share" size="1rem" />
            </div>
            <div>{{ t("share") }}</div>
          </div>
        </ZKButton>
      </div>

      <!-- Share Actions Dialog -->
      <ZKActionDialog
        v-model="shareActions.dialogState.value.isVisible"
        :actions="shareActions.dialogState.value.actions"
        @action-selected="handleShareActionSelected"
        @dialog-closed="shareActions.closeDialog"
      />
    </div>

    <CountBreakdownDialog
      v-model="showVoteBreakdown"
      :total-count="totalVoteCount"
      :analysis-count="voteCount"
      :total-label="t('totalVotes')"
      :analysis-label="t('usedForAnalysis')"
      :explanation-text="votesExplanation"
    />

    <CountBreakdownDialog
      v-model="showParticipantBreakdown"
      :total-count="totalParticipantCount"
      :analysis-count="participantCount"
      :total-label="t('totalParticipants')"
      :analysis-label="t('usedForAnalysis')"
      :explanation-text="participantsExplanation"
    />

    <slot name="dropdown" />
  </div>
</template>

<script setup lang="ts">
import { copyToClipboard, useQuasar } from "quasar";
import { useShareActions } from "src/composables/share/useShareActions";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ConversationType } from "src/shared/types/zod";
import type { ContentAction } from "src/utils/actions/core/types";
import { formatAmount } from "src/utils/common";
import { useNotify } from "src/utils/ui/notify";
import { useConversationUrl } from "src/utils/url/conversationUrl";
import { computed, ref } from "vue";

import ZKActionDialog from "../../ui-library/ZKActionDialog.vue";
import ZKButton from "../../ui-library/ZKButton.vue";
import ZKIcon from "../../ui-library/ZKIcon.vue";
import CountBreakdownDialog from "./CountBreakdownDialog.vue";
import InteractionTab from "./InteractionTab.vue";
import {
  type PostActionBarTranslations,
  postActionBarTranslations,
} from "./PostActionBar.i18n";

const props = withDefaults(defineProps<{
  compactMode: boolean;
  opinionCount: number;
  participantCount: number;
  voteCount: number;
  totalParticipantCount: number;
  totalVoteCount: number;
  hasSurvey?: boolean;
  isLoading?: boolean;
  conversationSlugId: string;
  conversationTitle: string;
  authorUsername: string;
  onSameTabClick?: () => void;
  conversationType?: ConversationType;
}>(), {
  hasSurvey: false,
  onSameTabClick: undefined,
  conversationType: "polis",
});

const currentTab = defineModel<"comment" | "analysis">({
  required: true,
});

const { t } = useComponentI18n<PostActionBarTranslations>(
  postActionBarTranslations
);

const $q = useQuasar();
const { getConversationUrl } = useConversationUrl();
const shareActions = useShareActions();

const showVoteBreakdown = ref(false);
const showParticipantBreakdown = ref(false);
const notify = useNotify();

const votesExplanation = computed(() => {
  if (props.conversationType === "maxdiff") {
    return t("maxdiffVotesExplanation");
  }

  const explanations = [t("moderatedVotesExplanation")];
  if (props.hasSurvey) {
    explanations.push(t("surveyVotesExplanation"));
  }

  return explanations.join("\n");
});

const participantsExplanation = computed(() => {
  if (props.conversationType === "maxdiff") {
    return t("maxdiffParticipantsExplanation");
  }

  const explanations = [t("moderatedParticipantsExplanation")];
  if (props.hasSurvey) {
    explanations.push(t("surveyParticipantsExplanation"));
  }

  return explanations.join("\n");
});

function shareClicked(): void {
  const sharePostUrl = getConversationUrl(props.conversationSlugId);
  const shareTitle = "Agora - " + props.conversationTitle;

  // Show share actions menu
  shareActions.showShareActions({
    targetType: "post",
    targetId: props.conversationSlugId,
    targetAuthor: props.authorUsername,
    copyLinkCallback: async () => {
      await copyToClipboard(sharePostUrl);
      notify.showCopiedToClipboard();
    },
    openQrCodeCallback: async () => {
      const { default: ShareDialog } = await import("../ShareDialog.vue");
      $q.dialog({
        component: ShareDialog,
        componentProps: {
          url: sharePostUrl,
        },
      });
    },
    showShareVia: true,
    shareUrl: sharePostUrl,
    shareTitle,
  });
}

async function handleShareActionSelected(action: ContentAction): Promise<void> {
  await shareActions.executeAction(action);
}
</script>

<style scoped lang="scss">
.postActionBarContainer {
  display: flex;
  flex-direction: column;
}

.buttonClusterBar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;

  @media (max-width: $breakpoint-xs-max) {
    gap: 0.5rem;
  }
}

.buttonClusterBorder {
  border-bottom-width: 1px;
  border-bottom-style: solid;
  border-bottom-color: $sky-light;
}

.leftSection {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.rightSection {
  display: flex;
  align-items: center;
  margin-left: auto;

  @media (max-width: $breakpoint-xs-max) {
    gap: 0.5rem;
    font-size: 0.8rem;
  }
}

.countContentContainer {
  gap: 0.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7d7a85;
}

.shareButtonContentContainer {
  gap: 0.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7d7a85;
}
</style>
