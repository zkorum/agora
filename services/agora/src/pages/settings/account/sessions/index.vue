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
    <PageLoadingSpinner v-else-if="sessionsState.status === 'loading'" />
    <div v-else-if="sessionsState.status === 'error'" class="state-message">
      <p>{{ t("loadFailed") }}</p>
      <q-btn color="primary" :label="t('retry')" @click="loadSessions" />
    </div>
    <template v-else>
      <AuthSessionList
        :current-session="sessionsState.currentSession"
        :other-sessions="sessionsState.otherSessions"
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
    :message="revokeMessage"
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
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import ZKConfirmDialog from "src/components/ui-library/ZKConfirmDialog.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import { useLocalizedDateTimeFormatter } from "src/composables/ui/useLocalizedDateTime";
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
import { computed, onMounted, ref } from "vue";
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
const formatDateTime = useLocalizedDateTimeFormatter();
const { setActiveUserIntention } = useLoginIntentionStore();
const router = useRouter();

type SessionsState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "loaded";
      currentSession: AuthSession;
      otherSessions: AuthSession[];
    };

const sessionsState = ref<SessionsState>({ status: "loading" });
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
const isLoggingOutAll = ref(false);
const logoutFailure = ref<"local-cleanup" | "navigation">();
const revokeMessage = computed(() => {
  const session = sessionToRevoke.value;
  return session === undefined
    ? ""
    : t("revokeMessage", { startedAt: formatDateTime(session.startedAt) });
});

onMounted(() => {
  void loadSessions();
});

async function loadSessions(): Promise<void> {
  const hasCachedSessions = sessionsState.value.status === "loaded";
  if (!hasCachedSessions) {
    sessionsState.value = { status: "loading" };
  }
  try {
    const result = await listAuthSessions();
    sessionsState.value = {
      status: "loaded",
      currentSession: result.currentSession,
      otherSessions: result.otherSessions,
    };
  } catch (error) {
    console.error("Failed to load sessions", error);
    if (!hasCachedSessions) {
      sessionsState.value = { status: "error" };
    }
  }
}

function requestSessionRevocation(session: AuthSession): void {
  sessionToRevoke.value = session;
}

async function confirmSessionRevocation(): Promise<void> {
  const session = sessionToRevoke.value;
  if (session === undefined) return;
  const didWrite = session.didWrite;
  busyDidWrite.value = didWrite;
  try {
    const result = await revokeAuthSession(didWrite);
    if (result.revoked && sessionsState.value.status === "loaded") {
      sessionsState.value = {
        ...sessionsState.value,
        otherSessions: sessionsState.value.otherSessions.filter(
          (otherSession) => otherSession.didWrite !== didWrite
        ),
      };
    } else {
      await loadSessions();
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

.logout-all {
  align-self: stretch;
}
</style>
