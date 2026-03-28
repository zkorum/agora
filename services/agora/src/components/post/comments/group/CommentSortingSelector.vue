<template>
  <div>
    <ZKButton button-type="standardButton" @click="showDialog = true">
      <div class="buttonGrid gradientFont">
        <div class="buttonItem">{{ currentFilterAlgorithm }}</div>

        <div class="buttonItem">
          <q-icon
            name="mdi-chevron-down"
            size="1.3rem"
            class="iconStyle gradientFont"
          />
        </div>
      </div>
    </ZKButton>

    <q-dialog v-model="showDialog" position="bottom">
      <ZKBottomDialogContainer :title="t('filterTitle')">
        <div class="optionListStyle">
          <div
            v-for="optionItem in currentOptionList"
            :key="optionItem.name"
            class="optionItemStyle"
          >
            <ZKGradientButton
              :label="optionItem.name"
              :label-color="
                currentFilterAlgorithm == optionItem.name ? '#FFFFFF' : '#6B4EFF'
              "
              :gradient-background="
                currentFilterAlgorithm == optionItem.name
                  ? 'linear-gradient(114.81deg, #6B4EFF 76.45%, #4F92F6 100.1%)'
                  : 'linear-gradient(114.81deg, #e7e4f7 76.45%, #E8F1FF 100.1%)'
              "
              @click="selectedAlgorithm(optionItem.value)"
            />
            <div class="optionDescriptionStyle">
              {{ optionItem.description }}
            </div>
          </div>
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKGradientButton from "src/components/ui-library/ZKGradientButton.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import { formatAmount } from "src/utils/common";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { computed, ref } from "vue";

import {
  type CommentSortingSelectorTranslations,
  commentSortingSelectorTranslations,
} from "./CommentSortingSelector.i18n";

const props = defineProps<{
  filterValue: string;
  moderatedOpinionCount: number;
  hiddenOpinionCount: number;
}>();

const emit = defineEmits<{
  (e: "changedAlgorithm", value: CommentFilterOptions): void;
}>();

const { profileData } = storeToRefs(useUserStore());
const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

const showDialog = ref(false);

const { t } = useComponentI18n<CommentSortingSelectorTranslations>(
  commentSortingSelectorTranslations
);

interface OptionItem {
  name: string;
  description: string;
  value: CommentFilterOptions;
}

const moderationHistoryLabel = computed(() => {
  const base = t("moderationHistory");
  return props.moderatedOpinionCount > 0
    ? `${base} (${formatAmount(props.moderatedOpinionCount)})`
    : base;
});

const hiddenLabel = computed(() => {
  const base = t("hidden");
  return props.hiddenOpinionCount > 0
    ? `${base} (${formatAmount(props.hiddenOpinionCount)})`
    : base;
});

const baseOptions = computed((): OptionItem[] => {
  const options: OptionItem[] = [
    { name: t("discover"), description: t("discoverDescription"), value: "discover" },
    { name: t("new"), description: t("newDescription"), value: "new" },
    { name: moderationHistoryLabel.value, description: t("moderationHistoryDescription"), value: "moderated" },
  ];

  // Add "My Votes" option only for logged in users
  if (isGuestOrLoggedIn.value) {
    options.push({ name: t("myVotes"), description: t("myVotesDescription"), value: "my_votes" });
  }

  return options;
});

const extendedOptions = computed((): OptionItem[] =>
  baseOptions.value.concat([{ name: hiddenLabel.value, description: t("hiddenDescription"), value: "hidden" }])
);

const currentOptionList = computed((): OptionItem[] => {
  if (profileData.value.isSiteModerator) {
    return extendedOptions.value;
  } else {
    return baseOptions.value;
  }
});

const currentFilterAlgorithm = computed(() => {
  for (const optionItem of currentOptionList.value) {
    if (optionItem.value == props.filterValue) {
      return optionItem.name;
    }
  }

  return "UNKNOWN";
});

function selectedAlgorithm(filterValue: CommentFilterOptions) {
  showDialog.value = false;
  emit("changedAlgorithm", filterValue);
}
</script>

<style lang="scss" scoped>
.gradientFont {
  background-image: $gradient-hero;
  color: transparent;
  background-clip: text;
}

.iconStyle {
  padding-bottom: 0rem;
  padding-left: 0.2rem;
}

.optionListStyle {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.optionItemStyle {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.optionDescriptionStyle {
  font-size: 0.8rem;
  line-height: 1.3;
  min-height: calc(2 * 0.8rem * 1.3);
  color: $color-text-weak;
  padding-left: 0.5rem;
}

.buttonGrid {
  display: grid;
  grid-template-columns: auto auto;
  grid-template-rows: 1fr;
  gap: 0px 0px;
  grid-template-areas: ". .";
}

.buttonItem {
  font-weight: var(--font-weight-medium);
  display: flex;
  align-items: center;
  line-height: normal;
}
</style>
