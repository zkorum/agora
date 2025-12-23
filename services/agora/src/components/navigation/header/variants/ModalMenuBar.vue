<template>
  <DefaultMenuBar :center-content="true">
    <template #left>
      <CloseButton />
    </template>
    <template #middle>
      {{ title }}
    </template>
  </DefaultMenuBar>
</template>

<script setup lang="ts">
import { useMenuBarActions } from "src/composables/ui/useMenuBarActions";

import DefaultMenuBar from "../DefaultMenuBar.vue";

interface ModalMenuBarProps {
  title: string;
}

defineProps<ModalMenuBarProps>();

const { CloseButton } = useMenuBarActions();
</script>
