<template>
  <div class="polis-url-input">
    <label class="input-label">Polis Conversation URL</label>
    <q-input
      v-model="model"
      placeholder="https://pol.is/conversation/..."
      outlined
      :error="!!errorMessage"
      :error-message="errorMessage"
      @update:model-value="validate"
    />
    <div class="help-text">
      Enter the URL of the Polis conversation you want to import
    </div>
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

.help-text {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--q-color-grey-6);
}
</style>
