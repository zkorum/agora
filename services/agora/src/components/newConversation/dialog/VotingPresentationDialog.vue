<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <ZKDialogOptionsList
        :options="options"
        :selected-value="votingPresentation"
        @option-selected="selectOption"
      />
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDialogOptionsList from "src/components/ui-library/ZKDialogOptionsList.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { PolisVotingPresentation } from "src/shared/types/zod";
import { computed } from "vue";

import {
  type VotingPresentationTranslations,
  votingPresentationTranslations,
} from "./VotingPresentationDialog.i18n";

const showDialog = defineModel<boolean>("showDialog", { required: true });
const votingPresentation = defineModel<PolisVotingPresentation>(
  "votingPresentation",
  { required: true }
);
const { t } = useComponentI18n<VotingPresentationTranslations>(
  votingPresentationTranslations
);

const options = computed(() => [
  { title: t("list"), description: t("listDescription"), value: "list" },
  {
    title: t("oneAtATime"),
    description: t("oneAtATimeDescription"),
    value: "one_at_a_time",
  },
]);

function selectOption(option: { value: string }): void {
  if (option.value === "list" || option.value === "one_at_a_time") {
    votingPresentation.value = option.value;
    showDialog.value = false;
  }
}
</script>
