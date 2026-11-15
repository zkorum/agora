<template>
  <q-dialog v-model="showDialog" position="bottom">
    <ZKBottomDialogContainer>
      <q-btn
        v-if="choosingPrioritization"
        flat
        :icon="$q.lang.rtl ? 'mdi-chevron-right' : 'mdi-chevron-left'"
        :label="qvT('chooseMethod')"
        @click="choosingPrioritization = false"
      />
      <ZKDialogOptionsList
        :options="
          choosingPrioritization ? prioritizationOptions : postTypeOptions
        "
        :selected-value="
          choosingPrioritization ? selectedMethod : selectedValue
        "
        @option-selected="handleOptionSelected"
      />
    </ZKBottomDialogContainer>
  </q-dialog>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import ZKDialogOptionsList from "src/components/ui-library/ZKDialogOptionsList.vue";
import type { ConversationImportSettings } from "src/composables/conversation/draft";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ConversationTypeConfig } from "src/shared/types/zod";
import { computed, ref, watch } from "vue";

import { qvStatementsTranslations } from "../QvStatements.i18n";
import {
  type PostTypeDialogTranslations,
  postTypeDialogTranslations,
} from "./PostTypeDialog.i18n";

interface ModeChangeConfig {
  importType: "polis-url" | "csv-import" | null;
  conversationTypeConfig: ConversationTypeConfig;
}

const props = defineProps<{
  isPrioritizingAllowed: boolean;
  isImportAllowed: boolean;
}>();

const emit = defineEmits<{
  modeChangeRequested: [config: ModeChangeConfig];
}>();

const { t } = useComponentI18n<PostTypeDialogTranslations>(
  postTypeDialogTranslations
);

const showDialog = defineModel<boolean>({ required: true });
const choosingPrioritization = ref(false);
const { t: qvT } = useComponentI18n(qvStatementsTranslations);
watch(showDialog, (visible) => {
  if (visible)
    choosingPrioritization.value =
      conversationTypeConfig.value.conversationType === "prioritizing";
});
const prioritizationOptions = computed(() => [
  { title: qvT("bws"), description: qvT("bwsDescription"), value: "bws" },
  {
    title: qvT("pairwise"),
    description: qvT("pairwiseDescription"),
    value: "pairwise",
  },
  { title: qvT("qv"), description: qvT("qvDescription"), value: "qv" },
]);
const selectedMethod = computed(() =>
  conversationTypeConfig.value.conversationType === "prioritizing"
    ? conversationTypeConfig.value.prioritizationType === "qv"
      ? "qv"
      : conversationTypeConfig.value.comparisonMethod
    : ""
);
const importSettings = defineModel<ConversationImportSettings>(
  "importSettings",
  { required: true }
);
const conversationTypeConfig = defineModel<ConversationTypeConfig>(
  "conversationTypeConfig",
  {
    required: true,
  }
);

const postTypeOptions = computed(() => {
  const options = [
    {
      title: t("newConversation"),
      description: t("newConversationDescription"),
      value: "regular",
    },
    {
      title: t("newPrioritization"),
      description: qvT("chooseMethod"),
      value: "prioritizing",
    },
    {
      title: t("importFromPolis"),
      description: t("importFromPolisDescription"),
      value: "polis-url",
    },
    {
      title: t("importFromCsv"),
      description: t("importFromCsvDescription"),
      value: "csv-import",
    },
  ];
  return options.filter((option) => {
    if (option.value === "prioritizing") {
      return props.isPrioritizingAllowed;
    }

    if (option.value === "polis-url" || option.value === "csv-import") {
      return props.isImportAllowed;
    }

    return true;
  });
});

const selectedValue = computed(() => {
  if (importSettings.value.importType === "polis-url") return "polis-url";
  if (importSettings.value.importType === "csv-import") return "csv-import";
  return conversationTypeConfig.value.conversationType === "prioritizing"
    ? "prioritizing"
    : "regular";
});

const configMap: Record<string, ModeChangeConfig> = {
  regular: {
    importType: null,
    conversationTypeConfig: {
      conversationType: "polis",
      votingPresentation: "list",
    },
  },
  bws: {
    importType: null,
    conversationTypeConfig: {
      conversationType: "prioritizing",
      prioritizationType: "comparisons",
      comparisonMethod: "bws",
    },
  },
  pairwise: {
    importType: null,
    conversationTypeConfig: {
      conversationType: "prioritizing",
      prioritizationType: "comparisons",
      comparisonMethod: "pairwise",
    },
  },
  qv: {
    importType: null,
    conversationTypeConfig: {
      conversationType: "prioritizing",
      prioritizationType: "qv",
      creditPricing: "quadratic",
      allowOpposition: true,
    },
  },
  "polis-url": {
    importType: "polis-url",
    conversationTypeConfig: {
      conversationType: "polis",
      votingPresentation: "list",
    },
  },
  "csv-import": {
    importType: "csv-import",
    conversationTypeConfig: {
      conversationType: "polis",
      votingPresentation: "list",
    },
  },
};

function handleOptionSelected(option: {
  title: string;
  description: string;
  value: string;
}): void {
  if (option.value === "prioritizing") {
    choosingPrioritization.value = true;
    return;
  }
  const nextConfig = configMap[option.value];
  if (nextConfig === undefined) return;
  showDialog.value = false;
  emit(
    "modeChangeRequested",
    (option.value === "regular" &&
      conversationTypeConfig.value.conversationType === "polis") ||
      option.value === selectedMethod.value
      ? { ...nextConfig, conversationTypeConfig: conversationTypeConfig.value }
      : nextConfig
  );
}
</script>
