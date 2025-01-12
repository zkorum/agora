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
  await authenticationStore.initializeAuthState();
});
</script>

<style lang="scss"></style>
