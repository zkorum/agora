<template>
  <div
    class="group-selector"
    :class="{ 'group-selector--compact': props.variant === 'compact' }"
  >
    <q-btn
      class="group-selector-button"
      flat
      round
      dense
      :size="buttonSize"
      :icon="chevronBack"
      @click="emit('previous')"
    />
    <span class="group-name">{{ currentModeName }}</span>
    <q-btn
      class="group-selector-button"
      flat
      round
      dense
      :size="buttonSize"
      :icon="chevronForward"
      @click="emit('next')"
    />
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { computed } from "vue";

import {
  type OpinionGroupCommentsTranslations,
  opinionGroupCommentsTranslations,
} from "./OpinionGroupComments.i18n";
import type { OpinionGroupDisplayMode } from "./opinionGroupDisplayMode";

const props = defineProps<{
  displayMode: OpinionGroupDisplayMode;
  variant: "regular" | "compact";
}>();

const emit = defineEmits<{
  previous: [];
  next: [];
}>();

const $q = useQuasar();
const { t } = useComponentI18n<OpinionGroupCommentsTranslations>(
  opinionGroupCommentsTranslations
);

const chevronForward = computed(() =>
  $q.lang.rtl ? "mdi-chevron-left" : "mdi-chevron-right"
);
const chevronBack = computed(() =>
  $q.lang.rtl ? "mdi-chevron-right" : "mdi-chevron-left"
);
const buttonSize = computed(() => (props.variant === "compact" ? "xs" : "sm"));

const currentModeName = computed(() => {
  if (props.displayMode === "current") return t("thisGroup");
  if (props.displayMode === "all_others") return t("allOthers");
  return t("allOtherGroups");
});
</script>

<style lang="scss" scoped>
.group-selector {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 0.125rem;
  min-width: 0;
  white-space: normal;
}

.group-selector--compact {
  gap: 0;
}

.group-selector-button {
  min-width: 1.5rem;
  min-height: 1.5rem;
}

.group-selector--compact .group-selector-button {
  min-width: 1.15rem;
  min-height: 1.15rem;
}

.group-name {
  font-size: 0.85rem;
  font-weight: var(--font-weight-medium);
  line-height: 1.2;
  overflow-wrap: anywhere;
  text-align: center;
}

.group-selector--compact .group-name {
  overflow: hidden;
  text-overflow: ellipsis;
  overflow-wrap: normal;
  white-space: nowrap;
  font-size: 0.8rem;
  line-height: 1.1;
}
</style>
