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

      <ManagementNavigation
        v-if="isLoggedIn"
        :permissions="managementAccess.data.value?.permissions"
        :organization-label="t('moderatorOrganization')"
        :project-label="t('moderatorProject')"
        :team-entitlements-label="t('moderatorPremiumEntitlements')"
      />

      <div v-if="isDevelopment">
        <ListSection :settings-item-list="developmentSettings" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import ManagementNavigation from "src/components/administrator/ManagementNavigation.vue";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import ListSection from "src/components/ui-library/ListSection.vue";
import { accountRecoveryTranslations } from "src/components/verification/AccountRecovery.i18n";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useFeaturedBannerVisibility } from "src/composables/useFeaturedBannerVisibility";
import { useAuthenticationStore } from "src/stores/authentication";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { onboardingFlowStore } from "src/stores/onboarding/flow";
import { useBackendAccountApi } from "src/utils/api/account";
import { useBackendAuthApi } from "src/utils/api/auth";
import { useManagementAccess } from "src/utils/api/useManagementAccess";
import { preserveGuestRecoveryKey } from "src/utils/auth/guestRecoveryKey";
import { usePhoneAuthAvailability } from "src/utils/auth/phoneAuthMode";
import { useAuthSetup } from "src/utils/auth/setup";
import type { SettingsInterface } from "src/utils/component/settings/settings";
import {
  type SecurityAddEmailTranslations,
  securityAddEmailTranslations,
} from "src/utils/notification/securityAddEmail.i18n";
import { processEnv } from "src/utils/processEnv";
import { useDialog } from "src/utils/ui/dialog";
import { useNotify } from "src/utils/ui/notify";
import { computed } from "vue";
import { useRouter } from "vue-router";

import { type SettingsTranslations, settingsTranslations } from "./index.i18n";

const { isActive } = usePageLayout({
  enableFooter: false,
  reducedWidth: true,
  addBottomPadding: true,
});

const authStore = useAuthenticationStore();
const { isGuestOrLoggedIn, isLoggedIn, credentials } = storeToRefs(authStore);

const { showDeleteAccountDialog } = useDialog();

const { deleteUserAccount } = useBackendAccountApi();
const { showNotifyMessage } = useNotify();
const { logoutRequested } = useAuthSetup();
const { t } = useComponentI18n<SettingsTranslations>(settingsTranslations);
const { t: tRecovery } = useComponentI18n(accountRecoveryTranslations);
const { t: tSecurity } = useComponentI18n<SecurityAddEmailTranslations>(
  securityAddEmailTranslations
);

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
const phoneAuthPurpose = computed(() =>
  isLoggedIn.value ? "credential" : "login"
);
const phoneAuthAvailability = usePhoneAuthAvailability(phoneAuthPurpose);

const credentialSettings = computed<SettingsInterface[]>(() => {
  const creds = credentials.value;
  const phoneSettings: SettingsInterface[] =
    creds.phone !== null || phoneAuthAvailability.value.available
      ? [
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
        ]
      : [];
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
    ...phoneSettings,
    {
      type: "action",
      label: t("emailAddress"),
      value:
        creds.email ??
        (isLoggedIn.value ? tSecurity("addNow") : t("clickToAdd")),
      style: isLoggedIn.value && creds.email === null ? "security" : "none",
      action: () => {
        if (creds.email === null) {
          navigateToVerify({ name: "/verify/email/" });
        }
      },
    },
  ];

  return items;
});

const accountSettings = computed<SettingsInterface[]>(() => {
  const emailUpdatesSettings: SettingsInterface[] =
    credentials.value.email === null
      ? []
      : [
          {
            type: "navigation",
            label: t("emailUpdates"),
            to: "/settings/account/email-updates/",
            style: "none",
          },
        ];
  return [
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
    ...emailUpdatesSettings,
  ];
});

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

const logoutSettings = computed<SettingsInterface[]>(() => [
  {
    type: "navigation",
    label: t("sessions"),
    to: "/settings/account/sessions/",
    style: "none",
  },
  {
    type: "action",
    label: t("logOut"),
    action: () => {
      void logoutRequested(true);
    },
    style: "warning",
  },
]);

const managementAccess = useManagementAccess();

const developmentSettings: SettingsInterface[] = [
  {
    type: "navigation",
    label: t("componentTesting"),
    to: "/dev/component-testing",
    style: "none",
  },
];

const deleteAccountSettings = computed<SettingsInterface[]>(() => [
  {
    type: "navigation",
    label: tRecovery("manageContent"),
    to: "/user-profile/opinions/",
    style: "none",
  },
  {
    type: "action",
    label: deleteAccountLabel.value,
    action: processDeleteAccount,
    style: "negative",
  },
]);

function processDeleteAccount() {
  const message = isLoggedIn.value
    ? tRecovery("deleteMessage")
    : tRecovery("guestDeleteMessage");

  showDeleteAccountDialog({
    title: t("deleteAccountDialogTitle"),
    message: `${message} ${tRecovery("historicalContentNotice")}`,
    placeholder: t("deleteAccountDialogPlaceholder"),
    errorMessage: t("deleteAccountDialogError"),
    callbackSuccess: () => {
      void (async () => {
        try {
          if (!isLoggedIn.value) await preserveGuestRecoveryKey();
          const result = await deleteUserAccount();
          if (!result.success) {
            showNotifyMessage(t("accountDeletionNeedsAdministrator"));
            return;
          }
          await updateAuthState({ partialLoginStatus: { isKnown: false } });
          showNotifyMessage(t("accountDeleted"));
          await router.push({ name: "/welcome/" });
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
