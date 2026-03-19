<template>
  <div>
    <Teleport v-if="isActive" to="#page-header">
      <HomeMenuBar>
        <template #center>
          <div>{{ t("notifications") }}</div>
        </template>
      </HomeMenuBar>
    </Teleport>

    <q-pull-to-refresh @refresh="pullDownTriggered">
      <PageLoadingSpinner v-if="isLoading" />

      <ErrorRetryBlock
        v-else-if="isError"
        :title="t('errorTitle')"
        :retry-label="t('retryButton')"
        @retry="loadInitialData()"
      />

      <q-infinite-scroll
        v-else-if="isAuthInitialized"
        :offset="2000"
        :disable="!hasMore"
        @load="onLoad"
      >
        <div class="widthConstraint">
          <div class="notificaitonListFlexStyle">
            <SpaLink
              v-for="notificationItem in notificationList"
              :key="notificationItem.slugId"
              :to="getRouteFromTarget(notificationItem.routeTarget) ?? {}"
              @click="markNotificationAsRead(notificationItem.slugId)"
            >
              <ZKHoverEffect
                :enable-hover="true"
                background-color="white"
                hover-variant="medium"
              >
                <div
                  class="notificationItemBase"
                  :class="{ unreadNotification: !notificationItem.isRead }"
                >
                  <div class="iconWrapper">
                    <div v-if="!notificationItem.isRead" class="unreadDot"></div>
                    <ZKIcon
                      :name="getIconFromNotificationType(notificationItem.type)"
                      size="1.8rem"
                      color="black"
                    />
                  </div>

                  <div class="notificationRightPortion">
                    <div>
                      <UserAvatar
                        v-if="notificationItem.type === 'new_opinion'"
                        :user-identity="notificationItem.username"
                        :size="32"
                      />
                    </div>
                    <div
                      class="titleStyle"
                      :class="{ unreadTitle: !notificationItem.isRead }"
                    >
                      {{ getTitleFromNotification(notificationItem) }}
                    </div>

                    <div
                      v-if="notificationItem.displayMessage"
                      class="messageStyle"
                    >
                      <ZKHtmlContent
                        :html-body="notificationItem.displayMessage"
                        :compact-mode="false"
                        :enable-links="false"
                      />
                    </div>
                  </div>
                </div>
              </ZKHoverEffect>
            </SpaLink>
          </div>
        </div>

        <div v-if="notificationList.length > 0" class="endOfFeed">
          {{ t("endOfFeed") }}
        </div>

        <div v-if="notificationList.length == 0" class="endOfFeed">
          {{ t("noNotifications") }}
        </div>
      </q-infinite-scroll>
    </q-pull-to-refresh>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import UserAvatar from "src/components/account/UserAvatar.vue";
import { HomeMenuBar } from "src/components/navigation/header/variants";
import ErrorRetryBlock from "src/components/ui/ErrorRetryBlock.vue";
import PageLoadingSpinner from "src/components/ui/PageLoadingSpinner.vue";
import SpaLink from "src/components/ui-library/SpaLink.vue";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { usePageLayout } from "src/composables/layout/usePageLayout";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { NotificationType, RouteTarget } from "src/shared/types/zod";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNotificationStore } from "src/stores/notification";
import { useNotificationApi } from "src/utils/api/notification/notification";
import type { DisplayNotification } from "src/utils/notification/transform";
import { onActivated, ref, watch } from "vue";
import type { RouteLocationRaw } from "vue-router";

import {
  type NotificationTranslations,
  notificationTranslations,
} from "./index.i18n";

defineOptions({ name: "NotificationPage" });

const { isActive } = usePageLayout({});

const notificationStore = useNotificationStore();
const { notificationList, numNewNotifications } =
  storeToRefs(notificationStore);
const authStore = useAuthenticationStore();
const { isAuthInitialized } = storeToRefs(authStore);
const {
  loadNotificationData,
  markNotificationAsRead,
  clearBadgeCount,
  clearNotificationData,
} = notificationStore;

const { markAllNotificationsAsRead } = useNotificationApi();

const hasMore = ref(true);
const isLoading = ref(true);
const isError = ref(false);
const hasLoadedOnce = ref(false);
const { t } = useComponentI18n<NotificationTranslations>(
  notificationTranslations
);

onActivated(() => {
  if (!hasLoadedOnce.value) {
    void loadInitialData();
  } else {
    void silentRefresh();
  }
});

// Watch for new notifications arriving via SSE while on this page
// Guard with isActive to prevent keep-alive watcher from marking notifications
// as read when the user is on a different page
watch(numNewNotifications, (newCount, oldCount) => {
  if (newCount > oldCount && !isLoading.value && isActive.value) {
    clearBadgeCount();
    void markAllNotificationsAsRead();
  }
});

// Reset cached state on logout so stale data isn't shown after re-login
watch(
  () => authStore.isLoggedIn,
  (isLoggedIn) => {
    if (!isLoggedIn) {
      hasLoadedOnce.value = false;
      clearNotificationData();
    }
  }
);

async function loadInitialData() {
  try {
    isLoading.value = true;
    isError.value = false;
    await loadNotificationData(false);
    hasLoadedOnce.value = true;
    clearBadgeCount();
    void markAllNotificationsAsRead();
  } catch (error) {
    console.error("Failed to load notifications:", error);
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
}

async function silentRefresh() {
  try {
    clearBadgeCount();
    await markAllNotificationsAsRead();
  } catch (error) {
    console.error("Failed to refresh notifications:", error);
  }
}

async function onLoad(index: number, done: () => void) {
  hasMore.value = await loadNotificationData(true);
  done();
}

function getIconFromNotificationType(
  notificationType: NotificationType
): string {
  let icon;
  switch (notificationType) {
    case "new_opinion":
      icon = "meteor-icons:comment";
      break;
    case "opinion_vote":
      icon = "icon-park-outline:message-sent";
      break;
    case "export_started":
      icon = "mdi:clock-outline";
      break;
    case "export_completed":
      icon = "mdi:check-circle";
      break;
    case "export_failed":
      icon = "mdi:alert-circle";
      break;
    case "export_cancelled":
      icon = "mdi:cancel";
      break;
    case "import_started":
      icon = "mdi:clock-outline";
      break;
    case "import_completed":
      icon = "mdi:check-circle";
      break;
    case "import_failed":
      icon = "mdi:alert-circle";
      break;
  }
  return icon;
}

function getTitleFromNotification(
  notificationItem: DisplayNotification
): string {
  let title;
  switch (notificationItem.type) {
    case "new_opinion":
      title = t("contributedOpinion").replace(
        "{username}",
        notificationItem.username
      );
      break;
    case "opinion_vote":
      if (notificationItem.isSeed) {
        title =
          notificationItem.numVotes === 1
            ? t("seedOnePersonVoted")
            : t("seedPeopleVoted").replace(
                "{count}",
                notificationItem.numVotes.toString()
              );
      } else {
        title =
          notificationItem.numVotes === 1
            ? t("onePersonVoted")
            : t("peopleVoted").replace(
                "{count}",
                notificationItem.numVotes.toString()
              );
      }
      break;
    case "export_started":
      title = t("exportStarted");
      break;
    case "export_completed":
      title = t("exportCompleted");
      break;
    case "export_failed":
      title = t("exportFailed");
      break;
    case "export_cancelled":
      title = t("exportCancelled");
      break;
    case "import_started":
      title = t("importStarted");
      break;
    case "import_completed":
      title = t("importCompleted");
      break;
    case "import_failed":
      title = t("importFailed");
      break;
  }
  return title;
}

function pullDownTriggered(done: () => void) {
  setTimeout(() => {
    void (async () => {
      await loadNotificationData(false);
      hasMore.value = true;
      done();
    })();
  }, 500);
}

function getRouteFromTarget(
  routeTarget: RouteTarget | undefined
): RouteLocationRaw | undefined {
  if (!routeTarget) {
    return undefined;
  }

  switch (routeTarget.type) {
    case "opinion":
      return {
        name: "/conversation/[postSlugId]/",
        params: { postSlugId: routeTarget.conversationSlugId },
        query: { opinion: routeTarget.opinionSlugId },
      };

    case "export":
      return {
        name: "/conversation/[conversationSlugId]/export.[exportId]",
        params: {
          conversationSlugId: routeTarget.conversationSlugId,
          exportId: routeTarget.exportSlugId,
        },
      };

    case "import":
      // If import completed with conversationSlugId, go directly to conversation
      // Otherwise go to import status page
      if (routeTarget.conversationSlugId) {
        return {
          name: "/conversation/[postSlugId]/",
          params: { postSlugId: routeTarget.conversationSlugId },
        };
      } else {
        return {
          name: "/conversation/import/[importSlugId]",
          params: { importSlugId: routeTarget.importSlugId },
        };
      }
  }
}
</script>

<style lang="scss" scoped>
.notificationLink {
  text-decoration: none;
  color: inherit;
  display: block;
}

.notificationItemBase {
  display: flex;
  gap: 0.5rem;
  padding: $container-padding;
}

.iconWrapper {
  flex-shrink: 0;
  align-self: center;
  position: relative;
}

.unreadNotification {
  background-color: #f0edff;
}

.unreadDot {
  position: absolute;
  top: 0;
  left: -0.3rem;
  width: 0.5rem;
  height: 0.5rem;
  background-color: $primary;
  border-radius: 50%;
}

.unreadTitle {
  font-weight: var(--font-weight-semibold);
}

.notificationRightPortion {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.messageStyle {
  font-weight: var(--font-weight-normal);
  color: #6d6a74;
}

.widthConstraint {
  max-width: 35rem;
  margin: auto;
}

.notificaitonListFlexStyle {
  display: flex;
  flex-direction: column;
  gap: $feed-flex-gap;
}

.endOfFeed {
  max-width: 15rem;
  margin: auto;
  padding: 2rem;
  text-align: center;
}

.titleStyle {
  color: #0a0714;
}

</style>
