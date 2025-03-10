<template>
  <ZKButton
    text-color="color-text-strong"
    flat
    :use-extra-padding="true"
    @click="buttonClicked()"
  >
    <ZKIcon name="ci:chevron-left" size="1.2rem" color="7D7A85" />
  </ZKButton>
</template>

<script setup lang="ts">
import ZKButton from "src/components/ui-library/ZKButton.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";

const goBackButtonHandler = useGoBackButtonHandler();

async function buttonClicked() {
  await goBackButtonHandler.goBack();
}
</script>

<style scoped></style>
