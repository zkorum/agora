<template>
  <ZKIconButton
    :icon="icon"
    :disabled="disabled"
    @click="handleClick"
  />
</template>

<script setup lang="ts">
import ZKIconButton from "src/components/ui-library/ZKIconButton.vue";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";
import type { RouteLocationRaw } from "vue-router";

interface Props {
  icon: string;
  disabled?: boolean;
  fallbackRoute?: RouteLocationRaw;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  fallbackRoute: undefined,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const goBackButtonHandler = useGoBackButtonHandler();

async function handleClick(event: MouseEvent) {
  if (props.disabled) return;

  // Emit click event for custom handlers
  emit("click", event);

  // If a custom handler prevented default, stop here
  if (event.defaultPrevented) return;

  // Prevent router-link's default navigation (we handle it via JS go-back)
  event.preventDefault();

  await goBackButtonHandler.safeNavigateBack(props.fallbackRoute);
}
</script>
