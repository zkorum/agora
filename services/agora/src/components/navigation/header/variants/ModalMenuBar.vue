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
import DefaultMenuBar from "../DefaultMenuBar.vue";
import { useMenuBarActions } from "src/composables/useMenuBarActions";

interface ModalMenuBarProps {
  title: string;
}

defineProps<ModalMenuBarProps>();

const { CloseButton } = useMenuBarActions();
</script>
