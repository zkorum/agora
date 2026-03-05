<template>
  <NavigationButton
    icon="ci:chevron-left"
    aria-label="Go back"
    :fallback-route="fallbackRoute"
  />
</template>

<script setup lang="ts">
import NavigationButton from "src/components/navigation/NavigationButton.vue";
import type { RouteLocationRaw } from "vue-router";

interface Props {
  fallbackRoute?: RouteLocationRaw;
}

withDefaults(defineProps<Props>(), {
  fallbackRoute: () => ({ name: "/" }),
});
</script>
