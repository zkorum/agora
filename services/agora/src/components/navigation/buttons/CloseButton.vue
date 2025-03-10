<template>
  <ZKButton
    :use-extra-padding="true"
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
  await goBackButtonHandler.goBack();
}
</script>

<style scoped></style>
