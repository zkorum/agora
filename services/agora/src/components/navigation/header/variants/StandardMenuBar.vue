<template>
  <DefaultMenuBar :center-content="centerContent">
    <template #left>
      <BackButton :fallback-route="fallbackRoute" />
    </template>
    <template #middle>
      {{ title }}
    </template>
  </DefaultMenuBar>
</template>

<script setup lang="ts">
import { useMenuBarActions } from "src/composables/ui/useMenuBarActions";
import type { RouteLocationRaw } from "vue-router";

import DefaultMenuBar from "../DefaultMenuBar.vue";

interface StandardMenuBarProps {
  title: string;
  centerContent?: boolean;
  fallbackRoute?: RouteLocationRaw;
}

withDefaults(defineProps<StandardMenuBarProps>(), {
  centerContent: true,
  fallbackRoute: undefined,
});

const { BackButton } = useMenuBarActions();
</script>
