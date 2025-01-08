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
import { useBackendAuthApi } from "src/utils/api/auth";
import { type SettingsInterface } from "src/utils/component/settings/settings";
import { useDialog } from "src/utils/ui/dialog";
import { useNotify } from "src/utils/ui/notify";
import { useRouter } from "vue-router";

const { isAuthenticated } = storeToRefs(useAuthenticationStore());

const { showDeleteAccountDialog } = useDialog();

const { logoutFromServer, logoutDataCleanup, showLogoutMessageAndRedirect } =
  useBackendAuthApi();
const router = useRouter();
const { showNotifyMessage } = useNotify();

async function logoutRequested() {
  try {
    await logoutFromServer();
    await logoutDataCleanup();
    showLogoutMessageAndRedirect();
  } catch (e) {
    console.error("Unexpected error when logging out", e);
    showNotifyMessage("Oops! Logout failed. Please try again");
  }
}

const accountSettings: SettingsInterface[] = [
  {
    label: "Profile",
    action: () => {
      router.push({ name: "/settings/account/profile/" });
    },
    style: "none",
  },
  {
    label: "Muted Users",
    action: () => {
      router.push({ name: "/settings/account/muted-users/" });
    },
    style: "none",
  },
];

const aboutSettings: SettingsInterface[] = [
  {
    label: "Privacy Policy",
    action: () => {
      router.push({ name: "/legal/privacy/" });
    },
    style: "none",
  },
  {
    label: "Terms of Service",
    action: () => {
      router.push({ name: "/legal/terms/" });
    },
    style: "none",
  },
];

const logoutSettings: SettingsInterface[] = [
  {
    label: "Log Out",
    action: logoutRequested,
    style: "warning",
  },
];

const deleteAccountSettings: SettingsInterface[] = [
  {
    label: "Delete Account",
    action: processDeleteAccount,
    style: "negative",
  },
];

function processDeleteAccount() {
  showDeleteAccountDialog(logoutDataCleanup);
}
</script>

<style scoped lang="scss">
.container {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  padding-top: 2rem;
}
</style>
