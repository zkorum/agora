<template>
  <DefaultMenuBar :center-content="centerContent">
    <template #left>
      <BackButton v-if="showBack" />
      <MenuButton v-if="showMenu" />
    </template>
    <template #middle>
      {{ entityName || title }}
    </template>
    <template #right>
      <slot name="actions" />
    </template>
  </DefaultMenuBar>
</template>

<script setup lang="ts">
import { useMenuBarActions } from "src/composables/ui/useMenuBarActions";

import DefaultMenuBar from "../DefaultMenuBar.vue";

interface EntityMenuBarProps {
  title?: string;
  entityName?: string;
  showBack?: boolean;
  showMenu?: boolean;
  centerContent?: boolean;
}

withDefaults(defineProps<EntityMenuBarProps>(), {
  title: "",
  entityName: "",
  showBack: true,
  showMenu: false,
  centerContent: false,
});

const { BackButton, MenuButton } = useMenuBarActions();
</script>
