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
      <ZKBottomDialogContainer>
        <div class="titleStyle">{{ t("filterTitle") }}</div>

        <div class="optionFlexStyle">
          <ZKGradientButton
            v-for="optionItem in currentOptionList"
            :key="optionItem.name"
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
import { useUserStore } from "src/stores/user";
import type { CommentFilterOptions } from "src/utils/component/opinion";
import { computed, onMounted, ref, watch } from "vue";
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  commentSortingSelectorTranslations,
  type CommentSortingSelectorTranslations,
} from "./CommentSortingSelector.i18n";

const props = defineProps<{
  filterValue: string;
}>();

const emit = defineEmits<{
  (e: "changedAlgorithm", value: CommentFilterOptions): void;
}>();

const { profileData } = storeToRefs(useUserStore());

const showDialog = ref(false);

const { t } = useComponentI18n<CommentSortingSelectorTranslations>(
  commentSortingSelectorTranslations
);

interface OptionItem {
  name: string;
  value: CommentFilterOptions;
}

const baseOptions = computed((): OptionItem[] => [
  { name: t("discover"), value: "discover" },
  { name: t("new"), value: "new" },
  { name: t("moderationHistory"), value: "moderated" },
]);

const extendedOptions = computed((): OptionItem[] =>
  baseOptions.value.concat([{ name: t("hidden"), value: "hidden" }])
);

const currentOptionList = ref<OptionItem[]>([]);

onMounted(() => {
  initializeOptionList();
});

watch(profileData, () => {
  initializeOptionList();
});

const currentFilterAlgorithm = computed(() => {
  for (const optionItem of currentOptionList.value) {
    if (optionItem.value == props.filterValue) {
      return optionItem.name;
    }
  }

  return "UNKNOWN";
});

function initializeOptionList() {
  if (profileData.value.isModerator) {
    currentOptionList.value = extendedOptions.value;
  } else {
    currentOptionList.value = baseOptions.value;
  }
}

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

.optionFlexStyle {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.titleStyle {
  font-weight: var(--font-weight-medium);
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
