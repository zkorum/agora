<template>
  <q-btn
    flat
    round
    dense
    :icon="backIcon"
    size="sm"
    class="zk-bottom-dialog-back-button"
    @click="emit('click')"
  />
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import type { LanguageTextDirection } from "src/shared/languages";
import { computed } from "vue";

const props = defineProps<{
  textDirection?: LanguageTextDirection;
}>();

const emit = defineEmits<{
  click: [];
}>();

const $q = useQuasar();

const resolvedTextDirection = computed<LanguageTextDirection>(() => {
  return props.textDirection ?? ($q.lang.rtl ? "rtl" : "ltr");
});

const backIcon = computed(() =>
  resolvedTextDirection.value === "rtl"
    ? "mdi-chevron-right"
    : "mdi-chevron-left"
);
</script>

<style scoped lang="scss">
.zk-bottom-dialog-back-button {
  color: #6d6a74;
  flex-shrink: 0;

  &:hover,
  &:focus-visible {
    background: #f5f5f7;
  }
}
</style>
