<template>
  <div>
    <q-dialog v-model="showDialog" position="bottom">
      <ZKBottomDialogContainer>
        <div class="title">{{ t("title") }}</div>

        <div>
          {{ t("description") }}
        </div>
      </ZKBottomDialogContainer>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import ZKBottomDialogContainer from "src/components/ui-library/ZKBottomDialogContainer.vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type CommonGroundInformationDialogTranslations,
  commonGroundInformationDialogTranslations,
} from "./CommonGroundInformationDialog.i18n";

const { t } = useComponentI18n<CommonGroundInformationDialogTranslations>(
  commonGroundInformationDialogTranslations
);

const showDialog = defineModel<boolean>({ required: true });
</script>

<style lang="scss" scoped>
.title {
  font-size: 1.1rem;
  font-weight: var(--font-weight-medium);
  padding-bottom: 1rem;
}
</style>
