<template>
  <div>
    <q-dialog v-model="showDialog" position="bottom">
      <ZKBottomDialogContainer>
        <div class="header">
          <div class="title">{{ t("title") }}</div>
          <ZKButton
            button-type="icon"
            aria-label="Close"
            @click="showDialog = false"
          >
            <ZKIcon color="#6d6a74" name="mdi-close" size="1.2rem" />
          </ZKButton>
        </div>

        <div class="guidelines-content">
          <div class="guideline">
            <div class="guideline-title">{{ t("singleIdeaTitle") }}</div>
            <div class="guideline-description">
              {{ t("singleIdeaDescription") }}
            </div>
            <ul class="examples-list">
              <li class="example-good">
                ✅ {{ t("singleIdeaExampleGood") }}
              </li>
              <li class="example-bad">❌ {{ t("singleIdeaExampleBad") }}</li>
            </ul>
          </div>

          <div class="guideline">
            <div class="guideline-title">{{ t("easyVoteTitle") }}</div>
            <div class="guideline-description">
              {{ t("easyVoteDescription") }}
            </div>
            <ul class="examples-list">
              <li class="example-good">✅ {{ t("easyVoteExampleGood") }}</li>
              <li class="example-bad">❌ {{ t("easyVoteExampleBad") }}</li>
            </ul>
          </div>

          <div class="guideline">
            <div class="guideline-title">{{ t("keepBriefTitle") }}</div>
            <div class="guideline-description">
              {{ t("keepBriefDescription") }}
            </div>
            <ul class="examples-list">
              <li class="example-good">✅ {{ t("keepBriefExampleGood") }}</li>
              <li class="example-bad">❌ {{ t("keepBriefExampleBad") }}</li>
            </ul>
          </div>

          <div class="guideline">
            <div class="guideline-title">{{ t("beClearTitle") }}</div>
            <div class="guideline-description">
              {{ t("beClearDescription") }}
            </div>
            <ul class="examples-list">
              <li class="example-good">✅ {{ t("beClearExampleGood") }}</li>
              <li class="example-bad">❌ {{ t("beClearExampleBad") }}</li>
            </ul>
          </div>

          <div class="guideline">
            <div class="guideline-title">{{ t("dontCombineTitle") }}</div>
            <div class="guideline-description">
              {{ t("dontCombineDescription") }}
            </div>
            <ul class="examples-list">
              <li class="example-bad">❌ {{ t("dontCombineExampleBad") }}</li>
              <li class="example-good">
                ✅ {{ t("dontCombineExampleGood1") }}
              </li>
              <li class="example-good">
                ✅ {{ t("dontCombineExampleGood2") }}
              </li>
            </ul>
          </div>
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type OpinionWritingGuidelinesDialogTranslations,
  opinionWritingGuidelinesDialogTranslations,
} from "./OpinionWritingGuidelinesDialog.i18n";

const { t } = useComponentI18n<OpinionWritingGuidelinesDialogTranslations>(
  opinionWritingGuidelinesDialogTranslations
);

const showDialog = defineModel<boolean>({ required: true });
</script>

<style lang="scss" scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  flex-shrink: 0;
}

.title {
  font-size: 1.1rem;
  font-weight: var(--font-weight-medium);
}

.guidelines-content {
  max-height: 60vh;
  max-height: 60dvh;
  overflow-y: auto;
}

.guideline {
  margin-bottom: 1.25rem;
  padding-left: 0.5rem;
}

.guideline-title {
  font-weight: var(--font-weight-medium);
  margin-bottom: 0.25rem;
  color: var(--color-text-primary);
}

.guideline-description {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;
}

.examples-list {
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
  list-style-type: disc;
}

.example-good,
.example-bad {
  font-size: 0.85rem;
  line-height: 1.5;
  font-style: italic;
  color: #6b7280;
  margin-bottom: 0.25rem;
}
</style>
