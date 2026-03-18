<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar :title="t('pageTitle')" :center-content="true" />
  </Teleport>

  <div>
    <div class="container">
      <div v-if="isGuestOrLoggedIn">
        <ListSection :settings-item-list="credentialSettings" />
      </div>

      <div v-if="isGuestOrLoggedIn">
        <ListSection :settings-item-list="accountSettings" />
      </div>

      <ListSection :settings-item-list="aboutSettings" />

      <div v-if="roadmapSettings.length > 0">
        <ListSection :settings-item-list="roadmapSettings" />
      </div>

      <div v-if="isGuestOrLoggedIn">
        <ListSection :settings-item-list="deleteAccountSettings" />
      </div>

      <div v-if="isLoggedIn">
        <ListSection :settings-item-list="logoutSettings" />
      </div>

      <div v-if="isLoggedIn && profileData.isSiteOrgAdmin">
        <ListSection :settings-item-list="moderatorSettings" />
      </div>

      <div v-if="isDevelopment">
        <ListSection :settings-item-list="developmentSettings" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ListSection from "src/components/ui-library/ListSection.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useFeaturedBannerVisibility } from "src/composables/useFeaturedBannerVisibility";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useUserStore } from "src/stores/user";
import { useBackendAccountApi } from "src/utils/api/account";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useAuthSetup } from "src/utils/auth/setup";
import type { SettingsInterface } from "src/utils/component/settings/settings";
import { processEnv } from "src/utils/processEnv";
import { useDialog } from "src/utils/ui/dialog";
import { useNotify } from "src/utils/ui/notify";
import { computed } from "vue";
import { useRouter } from "vue-router";

import { type SettingsTranslations,settingsTranslations } from "./index.i18n";

const { isActive } = usePageLayout({ enableFooter: false, reducedWidth: true, addBottomPadding: true });

const authStore = useAuthenticationStore();
const { isGuestOrLoggedIn, isLoggedIn, credentials } = storeToRefs(authStore);
const { profileData } = storeToRefs(useUserStore());

const { showDeleteAccountDialog } = useDialog();

const { deleteUserAccount } = useBackendAccountApi();
const { showNotifyMessage } = useNotify();
const { logoutRequested } = useAuthSetup();
const { t } = useComponentI18n<SettingsTranslations>(settingsTranslations);

const { updateAuthState } = useBackendAuthApi();

const router = useRouter();
const { setActiveUserIntention } = useLoginIntentionStore();
const flowStore = onboardingFlowStore();

function navigateToVerify(route: Parameters<typeof router.push>[0]) {
  setActiveUserIntention("settings");
  flowStore.onboardingMode = "LOGIN";
  void router.replace(route);
}

const deleteAccountLabel = computed(() =>
  isLoggedIn.value ? t("deleteAccount") : t("deleteGuestAccount")
);

const isDevelopment = process.env.DEV;

const credentialSettings = computed<SettingsInterface[]>(() => {
  const creds = credentials.value;
  const items: SettingsInterface[] = [
    {
      type: "action",
      label: t("verificationStatus"),
      value: creds.rarimo !== null ? t("idVerified") : t("notVerified"),
      action: () => {
        if (creds.rarimo !== null) {
          void router.push({ name: "/settings/verification-status/" });
        } else {
          navigateToVerify({ name: "/verify/passport/" });
        }
      },
    },
    {
      type: "action",
      label: t("phoneNumber"),
      value:
        creds.phone !== null
          ? `+${creds.phone.countryCallingCode} ******${String(creds.phone.lastTwoDigits).padStart(2, "0")}`
          : t("clickToAdd"),
      action: () => {
        if (creds.phone === null) {
          navigateToVerify({ name: "/verify/phone/" });
        }
      },
    },
    {
      type: "action",
      label: t("emailAddress"),
      value: creds.email ?? t("clickToAdd"),
      action: () => {
        if (creds.email === null) {
          navigateToVerify({ name: "/verify/email/" });
        }
      },
    },
  ];

  return items;
});

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

const featuredSlug = processEnv.VITE_FEATURED_CONVERSATION_SLUG;
const { hasCompletedRanking } = useFeaturedBannerVisibility();

const roadmapSettings = computed<SettingsInterface[]>(() => {
  if (!featuredSlug) return [];
  return [
    {
      type: "action",
      label: t("roadmap"),
      action: () => {
        if (hasCompletedRanking.value) {
          void router.push({
            name: "/conversation/[postSlugId]/analysis",
            params: { postSlugId: featuredSlug },
          });
        } else {
          void router.push({
            name: "/conversation/[postSlugId]/",
            params: { postSlugId: featuredSlug },
          });
        }
      },
      style: "none",
    },
  ];
});

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
