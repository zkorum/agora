<template>
  <div class="zkLoadMore">
    <ZKLiveRegion
      :message="isLoading ? loadingLabel : ''"
      politeness="polite"
    />
    <template v-if="isLoading">
      <q-spinner-dots color="primary" size="1.5rem" />
    </template>
    <template v-else-if="errorMessage !== undefined">
      <span class="errorMessage" role="status">{{ errorMessage }}</span>
      <ZKButton
        button-type="compactButton"
        color="primary"
        flat
        :label="retryLabel"
        @click="$emit('action')"
      />
    </template>
    <ZKButton
      v-else
      button-type="compactButton"
      color="primary"
      flat
      :label="loadMoreLabel"
      @click="$emit('action')"
    />
  </div>
</template>

<script setup lang="ts">
import ZKButton from "./ZKButton.vue";
import ZKLiveRegion from "./ZKLiveRegion.vue";

defineProps<{
  errorMessage: string | undefined;
  isLoading: boolean;
  loadingLabel: string;
  loadMoreLabel: string;
  retryLabel: string;
}>();

defineEmits<{
  action: [];
}>();
</script>

<style scoped lang="scss">
.zkLoadMore {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.5rem;

  .errorMessage {
    color: $negative;
    text-align: center;
  }
}
</style>
