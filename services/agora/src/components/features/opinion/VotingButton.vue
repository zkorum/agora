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
  font-weight: 500;
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
    background-color: #e7e7ff;
    color: #6547ff;

    &.voting-button--selected {
      background-color: #6b4eff;
      color: white;
    }
  }

  // Disagree button styles
  &--disagree {
    background-color: #ffefd7;
    color: #a05e03;

    &.voting-button--selected {
      background-color: #ffb323;
      color: white;
    }
  }

  // Pass button styles
  &--pass {
    background-color: #f6f5f8;
    color: #6d6a74;

    &.voting-button--selected {
      background-color: #434149;
      color: #ffffff;
    }
  }
}

.vote-count-label {
  font-size: 0.875rem;
  font-weight: 500;

  &--agree {
    color: #6547ff;
  }

  &--disagree {
    color: #a05e03;
  }

  &--pass {
    color: #6d6a74;
  }
}
</style>
