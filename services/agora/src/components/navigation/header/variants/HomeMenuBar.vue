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
import DefaultMenuBar from "../DefaultMenuBar.vue";
import { useMenuBarActions } from "src/composables/useMenuBarActions";

const { MenuButton, LoginButton } = useMenuBarActions();
</script>
