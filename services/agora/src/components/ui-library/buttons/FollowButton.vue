<template>
  <Button
    :variant="variant"
    rounded
    :pt="
      isFollowing
        ? {
            root: {
              class: 'generalStyle borderColorOn',
            },
          }
        : {
            root: {
              class: 'generalStyle borderColorOff',
            },
          }
    "
    :class="{ followStyle: !isFollowing, followingStyle: isFollowing }"
  >
    <div :class="{ normalText: !isFollowing, gradientText: isFollowing }">
      {{ label }}
    </div>
  </Button>
</template>

<script setup lang="ts">
import Button from "primevue/button";

defineProps<{
  label: string;
  variant: string;
  icon: string;
  isFollowing: boolean;
}>();
</script>

<style lang="scss" scoped>
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

.generalStyle {
  font-weight: 500;
  font-size: 1rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  padding-left: 1rem;
  padding-right: 1rem;
  border-radius: 10px;
}

.borderColorOn {
  border-color: #6b4eff;
}

.borderColorOff {
  border-color: transparent;
}

.followStyle {
  background-color: #f1eeff;
}

.followStyle:hover {
  background-color: #e4e2f1 !important;
  border-color: transparent !important;
}

.followingStyle {
  background-color: #f1eeff;
}

.followingStyle:hover {
  background-color: #c6c4ff !important;
}
</style>
