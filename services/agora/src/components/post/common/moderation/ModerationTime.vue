<template>
  <div>
    <div class="container">
      <div>
        {{ displayDateString("h:mm A") }}
      </div>
      <div>
        {{ displayDateString("YYYY-MM-DD") }}
      </div>

      <div v-if="isModerationEdited" class="editedMessage">
        {{ t("edited") }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDateFormat } from "@vueuse/core";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import {
  type ModerationTimeTranslations,
  moderationTimeTranslations,
} from "./ModerationTime.i18n";

const props = defineProps<{
  createdAt: Date;
  updatedAt: Date;
}>();

const isModerationEdited =
  props.createdAt.getTime() === props.updatedAt.getTime() ? false : true;
const displayDate = isModerationEdited ? props.updatedAt : props.createdAt;

const { t } = useComponentI18n<ModerationTimeTranslations>(
  moderationTimeTranslations
);

function displayDateString(format: string) {
  return useDateFormat(displayDate, format);
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: end;
}

.editedMessage {
  font-size: 0.8rem;
}
</style>
