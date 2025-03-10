<template>
  <q-btn
    v-bind="props"
    no-caps
    unelevated
    :class="{
      longButton: !(props.icon && !props.label),
      shortButton: props.icon && !props.label,
    }"
  >
    <slot />
  </q-btn>
</template>

<script setup lang="ts">
import { type QBtnProps } from "quasar";

const props = defineProps<QBtnProps>();
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
  padding-left: 0.4rem;
  padding-right: 0.4rem;
  padding-top: 0.6rem;
  padding-bottom: 0.6rem;
}
</style>
