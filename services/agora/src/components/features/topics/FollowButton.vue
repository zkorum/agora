<template>
  <button
    type="button"
    class="follow-button"
    :class="{
      'follow-button--following': isFollowing,
      'follow-button--not-following': !isFollowing,
    }"
  >
    <div
      class="button-content"
      :class="{ normalText: !isFollowing, gradientText: isFollowing }"
    >
      <span>{{ label }}</span>
      <i
        v-if="icon"
        :class="icon"
        :style="{
          fontSize: '1rem',
          color: isFollowing ? '#6b4eff' : '#6d6a74',
        }"
      />
    </div>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  icon?: string;
  isFollowing: boolean;
}>();
</script>

<style lang="scss" scoped>
.follow-button {
  /* Base button styles */
  font-size: 1rem;
  padding: 0.4rem 1rem;
  border-radius: 10px;
  border: 1px solid;
  background-color: #f1eeff;
  cursor: pointer;
  transition: all 0.2s ease;

  /* Remove default button styles */
  outline: none;
  font-family: inherit;
}

.follow-button--not-following {
  border-color: transparent;
}

.follow-button--not-following:hover {
  background-color: #e4e2f1;
  border-color: transparent;
}

.follow-button--following {
  border-color: #6b4eff;
}

.follow-button--following:hover {
  background-color: #c6c4ff;
  border-color: #6b4eff;
}

.button-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.gradientText {
  background: linear-gradient(
    to bottom,
    #6b4eff,
    #4f92f6
  ); /* Gradient from one color to another */
  background-clip: text; /* Clip the background to fit the text */
  -webkit-background-clip: text;
  color: transparent; /* Make the text color transparent */
  -webkit-text-fill-color: transparent;
}

.normalText {
  color: #6d6a74;
}
</style>
