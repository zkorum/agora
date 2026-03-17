<template>
  <div class="voting-button-container">
    <button
      :class="[
        'voting-button',
        `voting-button--${voteType}`,
        { 'voting-button--selected': isSelected },
      ]"
      :disabled="disabled"
      :aria-label="setAriaLabel"
      @click="$emit('click')"
    >
      {{ label }}
    </button>

    <div
      v-if="showVoteCount"
      :class="['vote-count-label', `vote-count-label--${voteType}`]"
    >
      {{ voteCount }} • {{ percentage }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  voteType: "agree" | "disagree" | "pass";
  label: string;
  isSelected: boolean;
  disabled: boolean;
  setAriaLabel: string;
  voteCount: number;
  percentage: string;
  showVoteCount: boolean;
}

defineProps<Props>();

defineEmits<{
  click: [];
}>();
</script>

<style lang="scss" scoped>
.voting-button-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  width: 100%;
}

.voting-button {
  width: 100%;
  height: 2.5rem;
  border: none;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  // Agree button styles
  &--agree {
    background: linear-gradient(114.81deg, #f1eeff 46.45%, #e8f1ff 100.1%);
    color: $sentiment-positive;

    &.voting-button--selected {
      background: linear-gradient(114.81deg, $sentiment-positive 46.45%, $sentiment-positive-end 100.1%);
      color: #ffffff;
    }
  }

  // Disagree button styles
  &--disagree {
    background: linear-gradient(93.21deg, #ffefd7 4.56%, #fff9d7 97.67%);
    color: $sentiment-negative-text;

    &.voting-button--selected {
      background: linear-gradient(107.6deg, $sentiment-negative 31.49%, $sentiment-negative-end 100.22%);
      color: #ffffff;
    }
  }

  // Pass button styles
  &--pass {
    background: #f6f5f8;
    color: #6d6a74;

    &.voting-button--selected {
      background: #434149;
      color: #ffffff;
    }
  }
}

.vote-count-label {
  font-size: 0.875rem;
  font-weight: var(--font-weight-medium);

  &--agree {
    color: $sentiment-positive;
  }

  &--disagree {
    color: $sentiment-negative-text;
  }

  &--pass {
    color: #6d6a74;
  }
}
</style>
