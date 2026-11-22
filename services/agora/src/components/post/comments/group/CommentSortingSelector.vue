<template>
  <div>
    <ZKDropdownSelectorButton
      :label="currentFilterAlgorithm"
      :accessibility-label="t('filterTitle')"
      button-type="standardButton"
      icon-name="mdi-chevron-down"
      icon-position="end"
      icon-size="1.3rem"
      label-overflow="wrap"
      @click="showDialog = true"
    />

    <q-dialog v-model="showDialog" position="bottom">
      <ZKBottomDialogContainer :title="t('filterTitle')">
        <div class="optionListStyle">
          <div
            v-for="optionItem in currentOptionList"
            :key="optionItem.value"
            class="optionItemStyle"
          >
            <ZKGradientButton
              :label="optionItem.name"
              :label-color="
                effectiveFilter === optionItem.value ? '#FFFFFF' : '#6B4EFF'
              "
              :gradient-background="
                effectiveFilter === optionItem.value
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
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDropdownSelectorButton from "src/components/ui-library/ZKDropdownSelectorButton.vue";
import ZKGradientButton from "src/components/ui-library/ZKGradientButton.vue";
import { useOpinionFilterAccess } from "src/composables/opinion/useOpinionFilterAccess";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { formatAmount } from "src/utils/common";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { computed, ref } from "vue";

import {
  type CommentSortingSelectorTranslations,
  commentSortingSelectorTranslations,
} from "./CommentSortingSelector.i18n";

const props = defineProps<{
  filterValue: CommentFilterOptions;
  moderatedOpinionCount: number;
  hiddenOpinionCount: number;
}>();

const emit = defineEmits<{
  (e: "changedAlgorithm", value: CommentFilterOptions): void;
}>();

const { isFilterAvailable, resolveFilter } = useOpinionFilterAccess();

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

const optionsByFilter = computed(
  () =>
    ({
      discover: {
        name: t("discover"),
        description: t("discoverDescription"),
        value: "discover",
      },
      new: { name: t("new"), description: t("newDescription"), value: "new" },
      moderated: {
        name: moderationHistoryLabel.value,
        description: t("moderationHistoryDescription"),
        value: "moderated",
      },
      my_votes: {
        name: t("myVotes"),
        description: t("myVotesDescription"),
        value: "my_votes",
      },
      my_statements: {
        name: t("myStatements"),
        description: t("myStatementsDescription"),
        value: "my_statements",
      },
      hidden: {
        name: hiddenLabel.value,
        description: t("hiddenDescription"),
        value: "hidden",
      },
    }) satisfies Record<CommentFilterOptions, OptionItem>
);
const currentOptionList = computed(() =>
  Object.values(optionsByFilter.value).filter((option) =>
    isFilterAvailable(option.value)
  )
);
const effectiveFilter = computed(() => resolveFilter(props.filterValue));
const currentFilterAlgorithm = computed(
  () => optionsByFilter.value[effectiveFilter.value].name
);

function selectedAlgorithm(filterValue: CommentFilterOptions) {
  showDialog.value = false;
  emit("changedAlgorithm", filterValue);
}
</script>

<style lang="scss" scoped>
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
  padding-inline-start: 0.5rem;
}
</style>
