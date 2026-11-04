<template>
  <App v-if="startupComplete" />
  <StartupError v-else />
</template>

<script setup lang="ts">
import { getCurrentInstance } from "vue";

import App from "./App.vue";
// Keep the coordinator in the initial module graph, not a skippable boot chunk.
import { hasStartupCompleted } from "./boot/startup";
import StartupError from "./components/startup/StartupError.vue";

const startupComplete = hasStartupCompleted(
  getCurrentInstance()?.appContext.app
);
</script>
