<template>
  <button
    type="button"
    class="analysis-playback-button"
    :class="{ 'analysis-playback-button--play': !props.isPlaying }"
    :disabled="props.disabled"
    :aria-label="buttonLabel"
    :title="buttonLabel"
    @click="emit('click')"
  >
    <q-icon :name="buttonIcon" size="1.3rem" />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  isPlaying: boolean;
  disabled: boolean;
  pauseLabel: string;
  playLabel: string;
}>();

const emit = defineEmits<{
  click: [];
}>();

const buttonIcon = computed(() =>
  props.isPlaying ? "mdi-pause-circle-outline" : "mdi-play-circle-outline"
);
const buttonLabel = computed(() =>
  props.isPlaying ? props.pauseLabel : props.playLabel
);
</script>

<style scoped lang="scss">
.analysis-playback-button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border: 1px solid #d8d6de;
  border-radius: 8px;
  background: white;
  color: #6d6a74;
  cursor: pointer;

  &:not(:disabled):hover,
  &:not(:disabled):focus-visible {
    background: #f5f5f7;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.analysis-playback-button--play {
  border-color: #24966d;
  color: #137a55;

  &:not(:disabled):hover,
  &:not(:disabled):focus-visible {
    background: #edf8f4;
  }
}
</style>
