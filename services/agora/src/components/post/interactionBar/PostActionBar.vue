<template>
  <div class="buttonClusterBar" :class="{ buttonClusterBorder: !compactMode }">
    <div class="leftSection">
      <InteractionTab
        v-model="currentTab"
        :compact-mode="props.compactMode"
        :opinion-count="opinionCount"
        :is-loading="isLoading"
        :conversation-slug-id="conversationSlugId"
      />
    </div>

    <div class="rightSection">
      <div class="voteCountContainer">
        <ZKIcon color="#7D7A85" name="mdi:vote" size="1rem" />
        <span>{{ formatAmount(voteCount) }}</span>
      </div>

      <div class="participantCountContainer">
        <ZKIcon color="#7D7A85" name="ph:users-fill" size="1rem" />
        <span>{{ formatAmount(participantCount) }}</span>
      </div>
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
</template>

<script setup lang="ts">
import { copyToClipboard, useQuasar } from "quasar";
import { useShareActions } from "src/composables/share/useShareActions";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ContentAction } from "src/utils/actions/core/types";
import { formatAmount } from "src/utils/common";
import { useWebShare } from "src/utils/share/WebShare";
import { useNotify } from "src/utils/ui/notify";
import { useConversationUrl } from "src/utils/url/conversationUrl";

import ZKActionDialog from "../../ui-library/ZKActionDialog.vue";
import ZKButton from "../../ui-library/ZKButton.vue";
import ZKIcon from "../../ui-library/ZKIcon.vue";
import ShareDialog from "../ShareDialog.vue";
import InteractionTab from "./InteractionTab.vue";
import {
  type PostActionBarTranslations,
  postActionBarTranslations,
} from "./PostActionBar.i18n";

const props = defineProps<{
  compactMode: boolean;
  opinionCount: number;
  participantCount: number;
  voteCount: number;
  isLoading?: boolean;
  conversationSlugId: string;
  conversationTitle: string;
  authorUsername: string;
}>();

const currentTab = defineModel<"comment" | "analysis">({
  required: true,
});

const { t } = useComponentI18n<PostActionBarTranslations>(
  postActionBarTranslations
);

const webShare = useWebShare();
const $q = useQuasar();
const { getConversationUrl } = useConversationUrl();
const shareActions = useShareActions();
const notify = useNotify();

function shareClicked(): void {
  const sharePostUrl = getConversationUrl(props.conversationSlugId);
  const shareTitle = "Agora - " + props.conversationTitle;

  // Check if Web Share API is available
  const isWebShareAvailable =
    typeof navigator !== "undefined" && navigator.share !== undefined;

  // Show share actions menu
  shareActions.showShareActions({
    targetType: "post",
    targetId: props.conversationSlugId,
    targetAuthor: props.authorUsername,
    copyLinkCallback: async () => {
      await copyToClipboard(sharePostUrl);
      notify.showNotifyMessage(t("copiedToClipboard"));
    },
    openQrCodeCallback: () => {
      $q.dialog({
        component: ShareDialog,
        componentProps: {
          url: sharePostUrl,
          title: shareTitle,
        },
      });
    },
    shareViaCallback: async () => {
      await webShare.share(shareTitle, sharePostUrl);
    },
    isWebShareAvailable,
  });
}

async function handleShareActionSelected(action: ContentAction): Promise<void> {
  await shareActions.executeAction(action);
}
</script>

<style scoped lang="scss">
.buttonClusterBar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
}

.buttonClusterBorder {
  border-bottom-width: 1px;
  border-bottom-style: solid;
  border-bottom-color: #e2e1e7;
}

.leftSection {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.rightSection {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.participantCountContainer {
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
.voteCountContainer {
  gap: 0.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7d7a85;
}
</style>
