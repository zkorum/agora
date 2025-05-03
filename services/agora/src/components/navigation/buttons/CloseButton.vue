<template>
  <ZKButton
    button-type="standardButton"
    icon="mdi-close"
    text-color="color-text-strong"
    flat
    @click="buttonClicked()"
  />
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";

const goBackButtonHandler = useGoBackButtonHandler();

async function buttonClicked() {
  await goBackButtonHandler.safeNavigateBack();
}
</script>

<style scoped></style>
