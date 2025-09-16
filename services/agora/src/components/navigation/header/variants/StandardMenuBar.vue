<template>
  <DefaultMenuBar :center-content="centerContent">
    <template #left>
      <BackButton />
    </template>
    <template #middle>
      {{ title }}
    </template>
  </DefaultMenuBar>
</template>

<script setup lang="ts">
import DefaultMenuBar from "../DefaultMenuBar.vue";
import { useMenuBarActions } from "src/composables/useMenuBarActions";

interface StandardMenuBarProps {
  title: string;
  centerContent?: boolean;
}

withDefaults(defineProps<StandardMenuBarProps>(), {
  centerContent: true,
});

const { BackButton } = useMenuBarActions();
</script>
