<template>
  <div class="quasarBtn" :class="{ squareBtn: buttonType == 'icon' }">
    <q-btn
      v-bind="props"
      no-caps
      unelevated
      :class="{
        extraButtonPadding: buttonType == 'largeButton',
        lessButtonPadding: buttonType == 'standardButton',
        iconButtonPadding: buttonType == 'icon',
        compactButtonPadding: buttonType == 'compactButton',
      }"
    >
      <slot />
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { type QBtnProps } from "quasar";

type ZKBtnProps = Partial<QBtnProps> & {
  buttonType: "icon" | "standardButton" | "largeButton" | "compactButton";
};

const props = defineProps<ZKBtnProps>();
</script>

<style lang="scss" scoped>
.iconButtonPadding {
  border-radius: 8px;
  padding-left: 0.445rem;
  padding-right: 0.445rem;
  padding-top: 0.445rem;
  padding-bottom: 0.445rem;
}

.lessButtonPadding {
  border-radius: 16px;
  padding-left: 0.8rem;
  padding-right: 0.8rem;
  padding-top: 0.6rem;
  padding-bottom: 0.6rem;
}

.compactButtonPadding {
  border-radius: 16px;
  padding-left: 0;
  padding-right: 0;
  padding-top: 0.6rem;
  padding-bottom: 0.6rem;

  // Add horizontal padding on tablet and up
  @media (min-width: 600px) {
    padding-left: 0.8rem;
    padding-right: 0.8rem;
  }
}

.extraButtonPadding {
  border-radius: 16px;
  padding-left: 1.2rem;
  padding-right: 1.2rem;
  padding-top: 1.2rem;
  padding-bottom: 1.2rem;
}

.squareBtn :deep(.q-btn) {
  aspect-ratio: 1 / 1;
}

.quasarBtn :deep(.q-focus-helper) {
  visibility: hidden;
}

.quasarBtn :deep(.q-btn) {
  width: 100%;
  height: 100%;
  line-height: 0px;
  min-height: 0px;
}

.quasarBtn :deep(.q-btn:hover) {
  background-color: rgb(233, 235, 236);
}

.quasarBtn :deep(.col) {
  flex: none;
  margin: auto;
}
</style>
