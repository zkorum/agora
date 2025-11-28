<template>
  <DrawerLayout
    :general-props="{
      addGeneralPadding: false,
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: false,
    }"
  >
    <template #header>
      <HomeMenuBar>
        <template #center>
          <div>{{ t("notifications") }}</div>
        </template>
      </HomeMenuBar>
    </template>

    <q-pull-to-refresh @refresh="pullDownTriggered">
      <div v-if="isLoading" class="loadingContainer">
        <q-spinner color="primary" size="3em" />
      </div>

      <q-infinite-scroll
        v-else-if="isAuthInitialized"
        :offset="2000"
        :disable="!hasMore"
        @load="onLoad"
      >
        <div class="widthConstraint">
          <div class="notificaitonListFlexStyle">
            <div
              v-for="notificationItem in notificationList"
              :key="notificationItem.slugId"
              @click="redirectPage(notificationItem.routeTarget)"
            >
              <ZKHoverEffect
                :enable-hover="true"
                background-color="white"
                hover-background-color="#e2e8f0"
              >
                <div class="notificationItemBase">
                  <ZKIcon
                    :name="getIconFromNotificationType(notificationItem.type)"
                    size="1.8rem"
                    color="black"
                  />

                  <div class="notificationRightPortion">
                    <div>
                      <UserAvatar
                        v-if="notificationItem.type === 'new_opinion'"
                        :user-identity="notificationItem.username"
                        :size="32"
                      />
                    </div>
                    <div class="titleStyle">
                      {{ getTitleFromNotification(notificationItem) }}
                    </div>

                    <div class="messageStyle">
                      <ZKHtmlContent
                        :html-body="notificationItem.message"
                        :compact-mode="false"
                        :enable-links="false"
                      />
                    </div>
                  </div>
                </div>
              </ZKHoverEffect>
            </div>
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
  </DrawerLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import UserAvatar from "src/components/account/UserAvatar.vue";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import ZKHtmlContent from "src/components/ui-library/ZKHtmlContent.vue";
import type {
  NotificationItem,
  NotificationType,
  RouteTarget,
} from "src/shared/types/zod";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useNotificationStore } from "src/stores/notification";
import { useNotificationApi } from "src/utils/api/notification";
import { onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { HomeMenuBar } from "src/components/navigation/header/variants";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import {
  notificationTranslations,
  type NotificationTranslations,
} from "./index.i18n";

const notificationStore = useNotificationStore();
const { notificationList, numNewNotifications } =
  storeToRefs(notificationStore);
const { isAuthInitialized } = storeToRefs(useAuthenticationStore());
const { loadNotificationData, markAllAsReadLocally } = notificationStore;

const { markAllNotificationsAsRead } = useNotificationApi();

const hasMore = ref(true);
const isLoading = ref(true);

const router = useRouter();

const { t } = useComponentI18n<NotificationTranslations>(
  notificationTranslations
);

onMounted(() => {
  void loadInitialData();
});

// Watch for new notifications arriving via SSE while on this page
watch(numNewNotifications, async (newCount, oldCount) => {
  // Only react if count increases (new notifications arrived)
  // and we're not in the initial loading phase
  if (newCount > oldCount && !isLoading.value) {
    await markAllNotificationsAsRead();
    // Update local state to immediately clear the badge
    markAllAsReadLocally();
  }
});

async function loadInitialData() {
  try {
    isLoading.value = true;
    await markAllNotificationsAsRead();
    await loadNotificationData(false);
  } catch (error) {
    console.error("Failed to load notifications:", error);
  } finally {
    isLoading.value = false;
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
    case "export_completed":
      icon = "mdi:check-circle";
      break;
    case "export_failed":
      icon = "mdi:alert-circle";
      break;
    case "export_cancelled":
      icon = "mdi:cancel";
      break;
  }
  return icon;
}

function getTitleFromNotification(notificationItem: NotificationItem): string {
  let title;
  switch (notificationItem.type) {
    case "new_opinion":
      title = t("contributedOpinion").replace(
        "{username}",
        notificationItem.username
      );
      break;
    case "opinion_vote":
      title =
        notificationItem.numVotes === 1
          ? t("onePersonVoted")
          : t("peopleVoted").replace(
              "{count}",
              notificationItem.numVotes.toString()
            );
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

async function redirectPage(routeTarget: RouteTarget): Promise<void> {
  switch (routeTarget.type) {
    case "opinion":
      await router.push({
        name: "/conversation/[postSlugId]",
        params: { postSlugId: routeTarget.conversationSlugId },
        query: { opinion: routeTarget.opinionSlugId },
      });
      break;

    case "export":
      await router.push({
        name: "/conversation/[conversationSlugId]/export.[exportId]",
        params: {
          conversationSlugId: routeTarget.conversationSlugId,
          exportId: routeTarget.exportSlugId,
        },
      });
      break;
  }
}
</script>

<style lang="scss" scoped>
.notificationItemBase {
  display: flex;
  gap: 0.5rem;
  padding: $container-padding;
}

.notificationRightPortion {
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

.loadingContainer {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  padding: 2rem;
}
</style>
