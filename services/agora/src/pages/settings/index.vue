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
        <template #middle>{{ t("pageTitle") }}</template>
      </DefaultMenuBar>
    </template>

    <div class="container">
      <div v-if="isGuestOrLoggedIn">
        <SettingsSection :settings-item-list="accountSettings" />
      </div>

      <SettingsSection :settings-item-list="aboutSettings" />

      <div v-if="isGuestOrLoggedIn">
        <SettingsSection :settings-item-list="deleteAccountSettings" />
      </div>

      <div v-if="isLoggedIn">
        <SettingsSection :settings-item-list="logoutSettings" />
      </div>

      <div v-if="isLoggedIn && profileData.isModerator">
        <SettingsSection :settings-item-list="moderatorSettings" />
      </div>

      <div v-if="isDevelopment">
        <SettingsSection :settings-item-list="developmentSettings" />
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
import { useBackendAccountApi } from "src/utils/api/account";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useAuthSetup } from "src/utils/auth/setup";
import type { SettingsInterface } from "src/utils/component/settings/settings";
import { useDialog } from "src/utils/ui/dialog";
import { useNotify } from "src/utils/ui/notify";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { isGuestOrLoggedIn, isLoggedIn } = storeToRefs(useAuthenticationStore());
const { profileData } = storeToRefs(useUserStore());

const { showDeleteAccountDialog } = useDialog();

const { deleteUserAccount } = useBackendAccountApi();
const { showNotifyMessage } = useNotify();
const { logoutRequested } = useAuthSetup();
const { t } = useI18n();

const { updateAuthState } = useBackendAuthApi();

const deleteAccountLabel = computed(() =>
  isLoggedIn.value ? t("deleteAccount") : t("deleteGuestAccount")
);

const isDevelopment = process.env.NODE_ENV === "development";

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
  showDeleteAccountDialog(() => {
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
  });
}
</script>

<i18n lang="yaml">
en:
  pageTitle: "Settings"
  deleteAccount: "Delete Account"
  deleteGuestAccount: "Delete Guest Account"
  profile: "Profile"
  contentPreference: "Content Preference"
  language: "Language"
  privacyPolicy: "Privacy Policy"
  termsOfService: "Terms of Service"
  logOut: "Log Out"
  moderatorOrganization: "Moderator - Organization"
  componentTesting: "🔧 Component Testing"
  accountDeleted: "Account deleted"
  accountDeletionFailed: "Oops! Account deletion failed. Please try again"
es:
  pageTitle: "Configuración"
  deleteAccount: "Eliminar cuenta"
  deleteGuestAccount: "Eliminar cuenta de invitado"
  profile: "Perfil"
  contentPreference: "Preferencia de contenido"
  language: "Idioma"
  privacyPolicy: "Política de privacidad"
  termsOfService: "Términos de servicio"
  logOut: "Cerrar sesión"
  moderatorOrganization: "Moderador - Organización"
  componentTesting: "🔧 Pruebas de componentes"
  accountDeleted: "Cuenta eliminada"
  accountDeletionFailed: "¡Ups! Error al eliminar la cuenta. Inténtalo de nuevo"
fr:
  pageTitle: "Paramètres"
  deleteAccount: "Supprimer le compte"
  deleteGuestAccount: "Supprimer le compte invité"
  profile: "Profil"
  contentPreference: "Préférence de contenu"
  language: "Langue"
  privacyPolicy: "Politique de confidentialité"
  termsOfService: "Conditions d'utilisation"
  logOut: "Se déconnecter"
  moderatorOrganization: "Modérateur - Organisation"
  componentTesting: "🔧 Tests de composants"
  accountDeleted: "Compte supprimé"
  accountDeletionFailed: "Oups ! Échec de la suppression du compte. Veuillez réessayer"
</i18n>

<style scoped lang="scss">
.container {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}
</style>
