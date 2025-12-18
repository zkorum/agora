<template>
  <ZKIconButton
    :icon="icon"
    :disabled="disabled"
    v-bind="$attrs"
    @click="handleClick"
  />
</template>

<script setup lang="ts">
import ZKIconButton from "src/components/ui-library/ZKIconButton.vue";
import { useGoBackButtonHandler } from "src/utils/nav/goBackButton";

interface Props {
  icon: string;
  disabled?: boolean;
}

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const goBackButtonHandler = useGoBackButtonHandler();

async function handleClick(event: MouseEvent) {
  if (props.disabled) return;

  // Emit click event for custom handlers
  emit("click", event);

  // If no custom handler prevented default, use navigation handler
  if (!event.defaultPrevented) {
    await goBackButtonHandler.safeNavigateBack();
  }
}
</script>
