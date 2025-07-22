<template>
  <div class="polis-url-input">
    <label class="input-label">Import conversation from a Polis URL:</label>
    <q-input
      v-model="model"
      placeholder="https://pol.is/xxxx"
      outlined
      :error="!!errorMessage"
      :error-message="errorMessage"
      @update:model-value="validate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { isValidPolisUrl } from "src/shared/utils/polis";

const model = defineModel<string>({ required: true });

const errorMessage = ref("");

function validate(value: string) {
  if (isValidPolisUrl(value)) {
    errorMessage.value = "";
  } else {
    errorMessage.value = "Please enter a valid Polis URL.";
  }
}
</script>

<style scoped lang="scss">
.polis-url-input {
  margin-bottom: 1rem;
}

.input-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}
</style>
