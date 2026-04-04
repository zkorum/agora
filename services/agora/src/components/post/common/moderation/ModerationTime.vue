<template>
  <div>
    <div class="container">
      <div>
        {{ displayedTime }}
      </div>
      <div>
        {{ displayedDate }}
      </div>

      <div v-if="isModerationEdited" class="editedMessage">
        {{ t("edited") }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  localizedDateTimeFormatOptions,
  useLocalizedDateTimeFormatter,
} from "src/composables/ui/useLocalizedDateTime";
import { computed } from "vue";

import {
  type ModerationTimeTranslations,
  moderationTimeTranslations,
} from "./ModerationTime.i18n";

const props = defineProps<{
  createdAt: Date;
  updatedAt: Date;
}>();

const isModerationEdited = computed(
  () => props.createdAt.getTime() !== props.updatedAt.getTime()
);

const displayDate = computed(() =>
  isModerationEdited.value ? props.updatedAt : props.createdAt
);

const { t } = useComponentI18n<ModerationTimeTranslations>(
  moderationTimeTranslations
);

const formatModerationTime = useLocalizedDateTimeFormatter({
  options: localizedDateTimeFormatOptions.time,
});

const formatModerationDate = useLocalizedDateTimeFormatter({
  options: localizedDateTimeFormatOptions.numericDate,
});

const displayedTime = computed(() => formatModerationTime(displayDate.value));
const displayedDate = computed(() => formatModerationDate(displayDate.value));
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
