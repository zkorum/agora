<template>
  <q-btn
    v-bind="props"
    no-caps
    unelevated
    :class="{
      longButton: useExtraPadding,
      shortButton: !useExtraPadding,
    }"
  >
    <slot />
  </q-btn>
</template>

<script setup lang="ts">
import { type QBtnProps } from "quasar";

type ZKBtnProps = Partial<QBtnProps> & {
  useExtraPadding: boolean;
};

const props = defineProps<ZKBtnProps>();
</script>

<style lang="scss" scoped>
.shortButton {
  border-radius: 8px;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.longButton {
  border-radius: 16px;
  padding-left: 1.2rem;
  padding-right: 1.2rem;
  padding-top: 0.6rem;
  padding-bottom: 0.6rem;
}
</style>
