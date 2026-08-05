<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar :title="t('pageTitle')" :center-content="true" />
  </Teleport>

  <main class="sessions-page">
    <p class="description">{{ t("description") }}</p>
    <div v-if="logoutFailure === 'local-cleanup'" class="state-message">
      <p>{{ t("localCleanupFailed") }}</p>
      <PrimeButton
        :label="t('retryLocalCleanup')"
        :loading="isLoggingOutAll"
        @click="clearThisDeviceOnly"
      />
    </div>
    <div v-else-if="logoutFailure === 'navigation'" class="state-message">
      <p>{{ t("navigationFailed") }}</p>
      <PrimeButton
        :label="t('retryNavigation')"
        :loading="isLoggingOutAll"
        @click="retryNavigation"
      />
    </div>
    <template v-else-if="sessions !== undefined">
      <AuthSessionList
        :current-session="sessions.currentSession"
        :other-sessions="sessions.otherSessions"
        :busy-did-write="busyDidWrite"
        :current-session-busy="isLoggingOutCurrent"
        :actions-disabled="sessionActionsDisabled"
        :current-label="t('currentSession')"
        :other-label="t('otherSession')"
        :started-label="t('started')"
        :expires-label="t('expires')"
        :logout-current-label="t('logoutCurrent')"
        :revoke-label="t('revoke')"
        @logout-current="logoutCurrentSession"
        @revoke="requestSessionRevocation"
      />
      <PrimeButton
        class="logout-all"
        severity="warn"
        :label="t('logoutAll')"
        :loading="isLoggingOutAll"
        :disabled="busyDidWrite !== undefined"
        @click="showLogoutAllDialog = true"
      />
    </template>
    <div v-else-if="sessionsQuery.isError.value" class="state-message">
      <p>{{ t("loadFailed") }}</p>
      <PrimeButton
        :label="t('retry')"
        :loading="sessionsQuery.isFetching.value"
        @click="refreshSessions"
      />
    </div>
    <PageLoadingSpinner v-else />
  </main>

  <ZKConfirmDialog
    v-model="showRevokeDialog"
    :title="t('revokeTitle')"
    :message="revokeMessage"
    :confirm-text="t('confirm')"
    :cancel-text="t('cancel')"
    variant="warning"
    @confirm="confirmSessionRevocation"
  />
  <ZKConfirmDialog
    v-model="showLogoutAllDialog"
    :title="t('logoutAllTitle')"
    :message="t('logoutAllMessage')"
    :confirm-text="t('confirm')"
    :cancel-text="t('cancel')"
    variant="warning"
    @confirm="logoutAllSessions"
  />
  <ZKConfirmDialog
    v-model="showLocalOnlyDialog"
    :title="t('localOnlyTitle')"
    :message="t('localOnlyMessage')"
    :confirm-text="t('clearLocalData')"
    :cancel-text="t('retry')"
    variant="destructive"
    @confirm="clearThisDeviceOnly"
    @cancel="logoutAllSessions"
  />
</template>

<script setup lang="ts">
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import Button from "primevue/button";
import { StandardMenuBar } from "src/components/navigation/header/variants";
import AuthSessionList from "src/components/settings/AuthSessionList.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  localizedDateTimeFormatOptions,
  useLocalizedDateTimeFormatter,
} from "src/composables/ui/useLocalizedDateTime";
import type { AuthSession } from "src/shared/types/dto-auth";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useBackendAuthApi } from "src/utils/api/auth";
import { resetLocalAuthState } from "src/utils/auth/localAuthState";
import {
  type LogoutFlowResult,
  runLogoutFlow,
} from "src/utils/auth/logoutFlow";
import { navigateHomeAfterLogout } from "src/utils/auth/logoutNavigation";
import { useAuthSetup } from "src/utils/auth/setup";
import { useNotify } from "src/utils/ui/notify";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import {
  type SessionSettingsTranslations,
  sessionSettingsTranslations,
} from "./index.i18n";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

const authSessionsQueryKey = ["authSessions"] as const;

const { isActive } = usePageLayout({
  enableFooter: false,
  reducedWidth: true,
  addBottomPadding: true,
});
const { t } = useComponentI18n<SessionSettingsTranslations>(
  sessionSettingsTranslations
);
const { listAuthSessions, revokeAuthSession, logoutAllAuthSessions } =
  useBackendAuthApi();
type AuthSessionsResponse = Awaited<ReturnType<typeof listAuthSessions>>;
const queryClient = useQueryClient();
const sessionsQuery = useQuery({
  queryKey: authSessionsQueryKey,
  queryFn: listAuthSessions,
  staleTime: 0,
  retry: false,
});
const sessions = computed(() => sessionsQuery.data.value);
const { showNotifyMessage } = useNotify();
const formatDateTime = useLocalizedDateTimeFormatter({
  options: localizedDateTimeFormatOptions.dateTimeWithTimeZone,
});
const { setActiveUserIntention } = useLoginIntentionStore();
const { logoutRequested } = useAuthSetup();
const router = useRouter();

const busyDidWrite = ref<string>();
const sessionToRevoke = ref<AuthSession>();
const showRevokeDialog = computed({
  get: () => sessionToRevoke.value !== undefined,
  set: (isOpen: boolean) => {
    if (!isOpen) {
      sessionToRevoke.value = undefined;
    }
  },
});
const showLogoutAllDialog = ref(false);
const showLocalOnlyDialog = ref(false);
const isLoggingOutCurrent = ref(false);
const isLoggingOutAll = ref(false);
const logoutFailure = ref<"local-cleanup" | "navigation">();
const sessionActionsDisabled = computed(
  () =>
    busyDidWrite.value !== undefined ||
    isLoggingOutCurrent.value ||
    isLoggingOutAll.value
);
const revokeMessage = computed(() => {
  const session = sessionToRevoke.value;
  return session === undefined
    ? ""
    : t("revokeMessage", { startedAt: formatDateTime(session.startedAt) });
});

function refreshSessions(): void {
  void sessionsQuery.refetch();
}

function requestSessionRevocation(session: AuthSession): void {
  sessionToRevoke.value = session;
}

async function logoutCurrentSession(): Promise<void> {
  isLoggingOutCurrent.value = true;
  try {
    await logoutRequested(true);
  } finally {
    isLoggingOutCurrent.value = false;
  }
}

async function confirmSessionRevocation(): Promise<void> {
  const session = sessionToRevoke.value;
  if (session === undefined) return;
  const didWrite = session.didWrite;
  busyDidWrite.value = didWrite;
  try {
    const result = await revokeAuthSession(didWrite);
    if (result.revoked) {
      queryClient.setQueryData<AuthSessionsResponse>(
        authSessionsQueryKey,
        (cachedSessions) =>
          cachedSessions === undefined
            ? undefined
            : {
                ...cachedSessions,
                otherSessions: cachedSessions.otherSessions.filter(
                  (otherSession) => otherSession.didWrite !== didWrite
                ),
              }
      );
    } else {
      await sessionsQuery.refetch();
    }
  } catch (error) {
    console.error("Failed to revoke session", error);
    showNotifyMessage(t("revokeFailed"));
  } finally {
    busyDidWrite.value = undefined;
  }
}

async function logoutAllSessions(): Promise<void> {
  isLoggingOutAll.value = true;
  const result = await runLogoutFlow({
    revokeFromServer: logoutAllAuthSessions,
    clearLocalState: resetLocalState,
    clearActiveUserIntention,
    navigate: navigateHome,
  });
  isLoggingOutAll.value = false;

  if (result.status === "server-revocation-failed") {
    console.error("Failed to revoke all server sessions", result.error);
    showNotifyMessage(t("logoutAllFailed"));
    showLocalOnlyDialog.value = true;
    return;
  }

  handleLocalLogoutResult(result);
}

async function clearThisDeviceOnly(): Promise<void> {
  isLoggingOutAll.value = true;
  const result = await runLogoutFlow({
    clearLocalState: resetLocalState,
    clearActiveUserIntention,
    navigate: navigateHome,
  });
  isLoggingOutAll.value = false;
  handleLocalLogoutResult(result);
}

function handleLocalLogoutResult(result: LogoutFlowResult): void {
  if (result.status === "local-cleanup-failed") {
    console.error("Failed to clear local authentication state", result.error);
    logoutFailure.value = "local-cleanup";
    return;
  }

  if (result.status === "navigation-failed") {
    console.error("Failed to navigate after logout", result.error);
    logoutFailure.value = "navigation";
  }
}

async function retryNavigation(): Promise<void> {
  isLoggingOutAll.value = true;
  try {
    await navigateHome();
    logoutFailure.value = undefined;
  } catch (error) {
    console.error("Failed to navigate after logout", error);
    logoutFailure.value = "navigation";
  } finally {
    isLoggingOutAll.value = false;
  }
}

function resetLocalState(): Promise<void> {
  return resetLocalAuthState({ shouldClearLanguagePreferences: true });
}

function clearActiveUserIntention(): void {
  setActiveUserIntention("none");
}

async function navigateHome(): Promise<void> {
  await navigateHomeAfterLogout(router);
}
</script>

<style scoped lang="scss">
.sessions-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem 0.5rem 2rem;
}

.description,
.state-message {
  color: $color-text-weak;
}

.state-message {
  display: grid;
  justify-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
}

.sessions-page .logout-all.p-button.p-button-warn {
  align-self: stretch;
  color: white;
  background-color: $warning;
  border-color: $warning;

  &:not(:disabled):hover {
    color: white;
    background-color: $warning;
    border-color: $warning;
    filter: brightness(0.96);
  }
}
</style>
