<template>
  <div class="buttonClusterBar" :class="{ buttonClusterBorder: !compactMode }">
    <div class="leftSection">
      <InteractionTab
        v-model="currentTab"
        :compact-mode="props.compactMode"
        :opinion-count="opinionCount"
        :is-loading="isLoading"
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
        @click.stop.prevent="$emit('share')"
      >
        <div class="shareButtonContentContainer">
          <div>
            <ZKIcon color="#7D7A85" name="mdi:share" size="1rem" />
          </div>
          <div>{{ t("share") }}</div>
        </div>
      </ZKButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { formatAmount } from "src/utils/common";

import ZKButton from "../../ui-library/ZKButton.vue";
import ZKIcon from "../../ui-library/ZKIcon.vue";
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
}>();

defineEmits<{
  share: [];
}>();

const currentTab = defineModel<"comment" | "analysis">({
  required: true,
});

const { t } = useComponentI18n<PostActionBarTranslations>(
  postActionBarTranslations
);
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
