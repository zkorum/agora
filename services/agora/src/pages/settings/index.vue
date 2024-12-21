<template>
  <div>
    <div class="container">
      <div v-if="isAuthenticated">
        <SettingsSection :settings-item-list="accountSettings" />
      </div>

      <SettingsSection :settings-item-list="aboutSettings" />

      <div v-if="isAuthenticated">
        <SettingsSection :settings-item-list="deleteAccountSettings" />
      </div>

      <div v-if="isAuthenticated">
        <SettingsSection :settings-item-list="logoutSettings" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import SettingsSection from "src/components/settings/SettingsSection.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { usePostStore } from "src/stores/post";
import { useUserStore } from "src/stores/user";
import { useBackendAuthApi } from "src/utils/api/auth";
import { type SettingsInterface } from "src/utils/component/settings/settings";
import { getWebCryptoStore } from "src/utils/crypto/store";
import { useDialog } from "src/utils/ui/dialog";
import { useRouter } from "vue-router";

const { isAuthenticated } = storeToRefs(useAuthenticationStore());
const { clearProfileData } = useUserStore();

const { showDeleteAccountDialog } = useDialog();
const { loadPostData } = usePostStore();

const backendAuth = useBackendAuthApi();
const router = useRouter();

async function logoutCleanup() {
  const cryptoStore = await getWebCryptoStore();
  cryptoStore.keystore.clearStore();

  isAuthenticated.value = false;

  await loadPostData(false);
  clearProfileData();

  router.push({ name: "default-home-feed" });
}

async function logoutRequested() {
  await backendAuth.logout();
  logoutCleanup();
}

const accountSettings: SettingsInterface[] = [
  {
    icon: "mdi-account",
    label: "Profile",
    action: () => {
      router.push({ name: "settings-account-profile" });
    },
    style: "none",
  },
];

const aboutSettings: SettingsInterface[] = [
  {
    icon: "mdi-key",
    label: "Privacy Policy",
    action: () => {
      router.push({ name: "privacy" });
    },
    style: "none",
  },
  {
    icon: "mdi-file-document",
    label: "Terms of Service",
    action: () => {
      router.push({ name: "terms" });
    },
    style: "none",
  },
];

const logoutSettings: SettingsInterface[] = [
  {
    icon: "mdi-logout",
    label: "Log Out",
    action: logoutRequested,
    style: "warning",
  },
];

const deleteAccountSettings: SettingsInterface[] = [
  {
    icon: "mdi-delete",
    label: "Delete Account",
    action: processDeleteAccount,
    style: "negative",
  },
];

function processDeleteAccount() {
  showDeleteAccountDialog(logoutCleanup);
}
</script>

<style scoped lang="scss">
.container {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  padding-top: 2rem;
}
</style>
