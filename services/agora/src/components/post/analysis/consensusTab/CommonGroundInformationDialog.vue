<template>
  <div>
    <q-dialog v-model="showDialog" position="bottom">
      <ZKBottomDialogContainer :title="title">
        <div class="description">
          {{ description }}
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed } from "vue";

import {
  type CommonGroundInformationDialogTranslations,
  commonGroundInformationDialogTranslations,
} from "./CommonGroundInformationDialog.i18n";

const props = defineProps<{
  direction: "agree" | "disagree";
}>();

const { t } = useComponentI18n<CommonGroundInformationDialogTranslations>(
  commonGroundInformationDialogTranslations
);

const showDialog = defineModel<boolean>({ required: true });

const title = computed(() =>
  props.direction === "agree"
    ? t("agreementsTitle")
    : t("disagreementsTitle")
);

const description = computed(() =>
  props.direction === "agree"
    ? t("agreementsDescription")
    : t("disagreementsDescription")
);
</script>

<style lang="scss" scoped>
.description {
  white-space: pre-line;
}
</style>
