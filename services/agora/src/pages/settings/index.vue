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
      <StandardMenuBar :title="t('pageTitle')" :center-content="true" />
    </template>

    <div class="container">
      <div v-if="isGuestOrLoggedIn">
        <ListSection :settings-item-list="accountSettings" />
      </div>

      <ListSection :settings-item-list="aboutSettings" />

      <div v-if="isGuestOrLoggedIn">
        <ListSection :settings-item-list="deleteAccountSettings" />
      </div>

      <div v-if="isLoggedIn">
        <ListSection :settings-item-list="logoutSettings" />
      </div>

      <div v-if="isLoggedIn && profileData.isModerator">
        <ListSection :settings-item-list="moderatorSettings" />
      </div>

      <div v-if="isDevelopment">
        <ListSection :settings-item-list="developmentSettings" />
      </div>
    </div>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ListSection from "src/components/ui-library/ListSection.vue";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import { useBackendAccountApi } from "src/utils/api/account";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useAuthSetup } from "src/utils/auth/setup";
import type { SettingsInterface } from "src/utils/component/settings/settings";
import { useDialog } from "src/utils/ui/dialog";
import { useNotify } from "src/utils/ui/notify";
import { computed } from "vue";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { settingsTranslations, type SettingsTranslations } from "./index.i18n";

const authStore = useAuthenticationStore();
const { isGuestOrLoggedIn, isLoggedIn } = storeToRefs(authStore);
const { profileData } = storeToRefs(useUserStore());

const { showDeleteAccountDialog } = useDialog();

const { deleteUserAccount } = useBackendAccountApi();
const { showNotifyMessage } = useNotify();
const { logoutRequested } = useAuthSetup();
const { t } = useComponentI18n<SettingsTranslations>(settingsTranslations);

const { updateAuthState } = useBackendAuthApi();

const deleteAccountLabel = computed(() =>
  isLoggedIn.value ? t("deleteAccount") : t("deleteGuestAccount")
);

const isDevelopment = process.env.DEV;

const accountSettings: SettingsInterface[] = [
  {
    type: "navigation",
    label: t("profile"),
    to: "/settings/account/profile/",
    style: "none",
  },
  {
    type: "navigation",
    label: t("contentPreference"),
    to: "/settings/account/content-preference/",
    style: "none",
  },
];

const aboutSettings: SettingsInterface[] = [
  {
    type: "navigation",
    label: t("language"),
    to: "/settings/languages/",
    style: "none",
  },
  {
    type: "navigation",
    label: t("privacyPolicy"),
    to: "/legal/privacy/",
    style: "none",
  },
  {
    type: "navigation",
    label: t("termsOfService"),
    to: "/legal/terms/",
    style: "none",
  },
  {
    type: "navigation",
    label: t("communityGuidelines"),
    to: "/legal/guidelines/",
    style: "none",
  },
];

const logoutSettings: SettingsInterface[] = [
  {
    type: "action",
    label: t("logOut"),
    action: () => {
      void logoutRequested(true);
    },
    style: "warning",
  },
];

const moderatorSettings: SettingsInterface[] = [
  {
    type: "navigation",
    label: t("moderatorOrganization"),
    to: "/settings/account/administrator/organization/",
    style: "none",
  },
];

const developmentSettings: SettingsInterface[] = [
  {
    type: "navigation",
    label: t("componentTesting"),
    to: "/dev/component-testing",
    style: "none",
  },
];

const deleteAccountSettings: SettingsInterface[] = [
  {
    type: "action",
    label: deleteAccountLabel.value,
    action: processDeleteAccount,
    style: "negative",
  },
];

function processDeleteAccount() {
  const message = isLoggedIn.value
    ? t("deleteAccountDialogMessage")
    : t("deleteGuestAccountDialogMessage");

  showDeleteAccountDialog({
    title: t("deleteAccountDialogTitle"),
    message,
    placeholder: t("deleteAccountDialogPlaceholder"),
    errorMessage: t("deleteAccountDialogError"),
    callbackSuccess: () => {
      void (async () => {
        try {
          await deleteUserAccount();
          await updateAuthState({ partialLoginStatus: { isKnown: false } });
          showNotifyMessage(t("accountDeleted"));
        } catch (e) {
          console.error("Failed to delete user account", e);
          showNotifyMessage(t("accountDeletionFailed"));
        }
      })();
    },
  });
}
</script>

<style scoped lang="scss">
.container {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
</style>
