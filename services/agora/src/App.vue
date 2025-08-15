<template>
  <router-view />
  <PostSignupPreferencesDialog
    v-if="showPreferencesDialog"
    @close="closePreferencesDialog"
  />
</template>

<script setup lang="ts">
import PostSignupPreferencesDialog from "./components/onboarding/dialogs/PostSignupPreferencesDialog.vue";
import { useOnboardingPreferencesStore } from "./stores/onboarding/preferences";
import { storeToRefs } from "pinia";
import * as swiperElement from "swiper/element/bundle";
import { onMounted } from "vue";
import { useBackendAuthApi } from "./utils/api/auth";
import { useHtmlNodeCssPatch } from "./utils/css/htmlNodeCssPatch";
import "primeicons/primeicons.css";

swiperElement.register();

const { showPreferencesDialog } = storeToRefs(useOnboardingPreferencesStore());
const { closePreferencesDialog } = useOnboardingPreferencesStore();

const authenticationStore = useBackendAuthApi();

useHtmlNodeCssPatch();

onMounted(async () => {
  try {
    console.log("Initializing authentication state");
    await authenticationStore.initializeAuthState();
  } catch (e) {
    console.error("Error while trying to get logged-in status", e);
    // TODO: create a unified error handling to notify the user _once_ only if the backend is down?
  }
});
</script>

<style lang="scss"></style>
