<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: true,
      enableFooter: false,
      enableHeader: true,
      reducedWidth: true,
    }"
  >
    <template #header>
      <DefaultMenuBar
        :has-back-button="true"
        :has-close-button="false"
        :has-login-button="false"
        :has-menu-button="false"
        :fixed-height="true"
      >
        <template #middle> Settings </template>
      </DefaultMenuBar>
    </template>

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

      <div v-if="isAuthenticated && profileData.isModerator">
        <SettingsSection :settings-item-list="moderatorSettings" />
      </div>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import SettingsSection from "src/components/settings/SettingsSection.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import { useBackendAuthApi } from "src/utils/api/auth";
import { SettingsInterface } from "src/utils/component/settings/settings";
import { useDialog } from "src/utils/ui/dialog";
import { useNotify } from "src/utils/ui/notify";
import { useRouter } from "vue-router";

const { isAuthenticated } = storeToRefs(useAuthenticationStore());
const { profileData } = storeToRefs(useUserStore());

const { showDeleteAccountDialog } = useDialog();

const { logoutFromServer, logoutDataCleanup, showLogoutMessageAndRedirect } =
  useBackendAuthApi();
const router = useRouter();
const { showNotifyMessage } = useNotify();

async function logoutRequested() {
  try {
    await logoutFromServer();
    await logoutDataCleanup();
    await showLogoutMessageAndRedirect();
  } catch (e) {
    console.error("Unexpected error when logging out", e);
    showNotifyMessage("Oops! Logout failed. Please try again");
  }
}

const accountSettings: SettingsInterface[] = [
  {
    label: "Profile",
    action: async () => {
      await router.push({ name: "/settings/account/profile/" });
    },
    style: "none",
  },
  {
    label: "Content Preference",
    action: async () => {
      await router.push({ name: "/settings/account/content-preference/" });
    },
    style: "none",
  },
];

const aboutSettings: SettingsInterface[] = [
  {
    label: "Privacy Policy",
    action: async () => {
      await router.push({ name: "/legal/privacy/" });
    },
    style: "none",
  },
  {
    label: "Terms of Service",
    action: async () => {
      await router.push({ name: "/legal/terms/" });
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

const moderatorSettings: SettingsInterface[] = [
  {
    label: "Moderator - Organization",
    action: async () => {
      await router.push({
        name: "/settings/account/administrator/organization/",
      });
    },
    style: "none",
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
}
</style>
