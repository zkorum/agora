<template>
  <div class="quasarBtn">
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
  </div>
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
  padding-left: 0.445rem;
  padding-right: 0.445rem;
  padding-top: 0.445rem;
  padding-bottom: 0.445rem;
}

.longButton {
  border-radius: 16px;
  padding-left: 1.2rem;
  padding-right: 1.2rem;
  padding-top: 1.2rem;
  padding-bottom: 1.2rem;
}

.quasarBtn :deep(.q-btn) {
  width: 100%;
  line-height: 0px;
  min-height: 0px;
}
</style>
