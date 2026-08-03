<template>
  <Teleport v-if="isActive" to="#page-header">
    <StandardMenuBar :title="t('pageTitle')" :center-content="true" />
  </Teleport>

  <main class="sessions-page">
    <p class="description">{{ t("description") }}</p>
    <div v-if="logoutFailure === 'local-cleanup'" class="state-message">
      <p>{{ t("localCleanupFailed") }}</p>
      <q-btn
        color="primary"
        :label="t('retryLocalCleanup')"
        :loading="isLoggingOutAll"
        @click="clearThisDeviceOnly"
      />
    </div>
    <div v-else-if="logoutFailure === 'navigation'" class="state-message">
      <p>{{ t("navigationFailed") }}</p>
      <q-btn
        color="primary"
        :label="t('retryNavigation')"
        :loading="isLoggingOutAll"
        @click="retryNavigation"
      />
    </div>
    <div v-else-if="isLoading" class="state-message">
      <q-spinner size="2rem" />
    </div>
    <div
      v-else-if="loadFailed || currentSession === undefined"
      class="state-message"
    >
      <p>{{ t("loadFailed") }}</p>
      <q-btn color="primary" :label="t('retry')" @click="loadSessions" />
    </div>
    <template v-else>
      <AuthSessionList
        :current-session="currentSession"
        :other-sessions="otherSessions"
        :busy-did-write="busyDidWrite"
        :current-label="t('currentSession')"
        :other-label="t('otherSession')"
        :started-label="t('started')"
        :expires-label="t('expires')"
        :revoke-label="t('revoke')"
        @revoke="requestSessionRevocation"
      />
      <q-btn
        class="logout-all"
        outline
        color="negative"
        :label="t('logoutAll')"
        :loading="isLoggingOutAll"
        :disable="busyDidWrite !== undefined"
        @click="showLogoutAllDialog = true"
      />
    </template>
  </main>

  <ZKConfirmDialog
    v-model="showRevokeDialog"
    :title="t('revokeTitle')"
    :message="t('revokeMessage')"
    :confirm-text="t('confirm')"
    :cancel-text="t('cancel')"
    variant="destructive"
    @confirm="confirmSessionRevocation"
  />
  <ZKConfirmDialog
    v-model="showLogoutAllDialog"
    :title="t('logoutAllTitle')"
    :message="t('logoutAllMessage')"
    :confirm-text="t('confirm')"
    :cancel-text="t('cancel')"
    variant="destructive"
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
import { StandardMenuBar } from "src/components/navigation/header/variants";
import AuthSessionList from "src/components/settings/AuthSessionList.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { AuthSession } from "src/shared/types/dto-auth";
import { useLoginIntentionStore } from "src/stores/loginIntention";
import { useBackendAuthApi } from "src/utils/api/auth";
import { resetLocalAuthState } from "src/utils/auth/localAuthState";
import {
  type LogoutFlowResult,
  runLogoutFlow,
} from "src/utils/auth/logoutFlow";
import { navigateHomeAfterLogout } from "src/utils/auth/logoutNavigation";
import { useNotify } from "src/utils/ui/notify";
import { onActivated, ref } from "vue";
import { useRouter } from "vue-router";

import {
  type SessionSettingsTranslations,
  sessionSettingsTranslations,
} from "./index.i18n";

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
const { showNotifyMessage } = useNotify();
const { setActiveUserIntention } = useLoginIntentionStore();
const router = useRouter();

const currentSession = ref<AuthSession>();
const otherSessions = ref<AuthSession[]>([]);
const isLoading = ref(true);
const loadFailed = ref(false);
const busyDidWrite = ref<string>();
const didWriteToRevoke = ref<string>();
const showRevokeDialog = ref(false);
const showLogoutAllDialog = ref(false);
const showLocalOnlyDialog = ref(false);
const isLoggingOutAll = ref(false);
const logoutFailure = ref<"local-cleanup" | "navigation">();

onActivated(loadSessions);

async function loadSessions(): Promise<void> {
  const hasCachedSessions = currentSession.value !== undefined;
  if (!hasCachedSessions) {
    isLoading.value = true;
    loadFailed.value = false;
  }
  try {
    const result = await listAuthSessions();
    currentSession.value = result.currentSession;
    otherSessions.value = result.otherSessions;
  } catch (error) {
    console.error("Failed to load sessions", error);
    if (!hasCachedSessions) {
      loadFailed.value = true;
    }
  } finally {
    isLoading.value = false;
  }
}

function requestSessionRevocation(didWrite: string): void {
  didWriteToRevoke.value = didWrite;
  showRevokeDialog.value = true;
}

async function confirmSessionRevocation(): Promise<void> {
  const didWrite = didWriteToRevoke.value;
  if (didWrite === undefined) return;
  busyDidWrite.value = didWrite;
  try {
    const result = await revokeAuthSession(didWrite);
    if (result.revoked) {
      otherSessions.value = otherSessions.value.filter(
        (session) => session.didWrite !== didWrite
      );
    } else {
      await loadSessions();
    }
  } catch (error) {
    console.error("Failed to revoke session", error);
    showNotifyMessage(t("revokeFailed"));
  } finally {
    busyDidWrite.value = undefined;
    didWriteToRevoke.value = undefined;
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

.logout-all {
  align-self: stretch;
}
</style>
