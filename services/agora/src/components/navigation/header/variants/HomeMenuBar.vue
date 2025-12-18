<template>
  <DefaultMenuBar>
    <template #left>
      <MenuButton />
    </template>
    <template #middle>
      <slot name="center" />
    </template>
    <template #right>
      <LoginButton />
    </template>
  </DefaultMenuBar>
</template>

<script setup lang="ts">
import { useMenuBarActions } from "src/composables/ui/useMenuBarActions";

import DefaultMenuBar from "../DefaultMenuBar.vue";

const { MenuButton, LoginButton } = useMenuBarActions();
</script>
