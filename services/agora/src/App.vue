<template>
  <router-view />
</template>

<script setup lang="ts">
import * as swiperElement from "swiper/element/bundle";
import { onMounted } from "vue";
import { useBackendAuthApi } from "./utils/api/auth";

swiperElement.register();

const authenticationStore = useBackendAuthApi();

onMounted(async () => {
  try {
    await authenticationStore.initializeAuthState();
  } catch (e) {
    console.error("Error while trying to get logged-in status", e);
    // TODO: create a unified error handling to notify the user _once_ only if the backend is down?
  }
});
</script>

<style lang="scss"></style>
