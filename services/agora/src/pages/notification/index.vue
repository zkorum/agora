<template>
  <DrawerLayout
    :general-props="{
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: false,
    }"
    :menu-bar-props="{
      hasMenuButton: true,
      hasBackButton: false,
      hasCloseButton: false,
      hasLoginButton: false,
    }"
  >
    <template #header>
      <DefaultMenuBar
        :has-back-button="false"
        :has-close-button="false"
        :has-login-button="false"
        :has-menu-button="true"
      >
        <template #middle>
          <div>Notifications</div>
        </template>
      </DefaultMenuBar>
    </template>

    <div ref="el" class="containerBase">
      <div class="widthConstraint">
        <div class="notificaitonListFlexStyle">
          <div
            v-for="notificationItem in notificationList"
            :key="notificationItem.slugId"
            @click="redirectPage(notificationItem.routeTarget)"
          >
            <ZKHoverEffect :enable-hover="true">
              <div class="notificationItemBase">
                <q-icon
                  :name="getIconFromNotificationType(notificationItem.type)"
                  size="1.8rem"
                />
                <div class="notificationRightPortion">
                  <div>
                    <UserAvatar
                      v-if="notificationItem.type === 'new_opinion'"
                      :user-name="notificationItem.username"
                      :size="30"
                    />
                  </div>
                  <div>
                    {{ getTitleFromNotification(notificationItem) }}
                  </div>

                  <div class="messageStyle">
                    {{ notificationItem.message }}
                  </div>
                </div>
              </div>
            </ZKHoverEffect>
          </div>
        </div>
      </div>

      <div v-if="notificationList.length > 0" class="endOfFeed">
        End of notification feed
      </div>

      <div v-if="notificationList.length == 0" class="endOfFeed">
        You have no notifications
      </div>
    </div>

    <q-inner-loading :showing="loadingVisible">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>
  </DrawerLayout>
</template>

<script setup lang="ts">
import { useInfiniteScroll } from "@vueuse/core";
import { storeToRefs } from "pinia";
import UserAvatar from "src/components/account/UserAvatar.vue";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import {
  NotificationItem,
  NotificationType,
  RouteTarget,
} from "src/shared/types/zod";
import DrawerLayout from "src/layouts/DrawerLayout.vue";
import { useNotificationStore } from "src/stores/notification";
import { useBackendNotificationApi } from "src/utils/api/notification";
import { usePullDownToRefresh } from "src/utils/ui/pullDownToRefresh";
import { onMounted, useTemplateRef } from "vue";
import { useRouter } from "vue-router";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";

const { notificationList } = storeToRefs(useNotificationStore());
const { loadNotificationData } = useNotificationStore();

const { markAllNotificationsAsRead } = useBackendNotificationApi();

const el = useTemplateRef<HTMLElement>("el");

const { loadingVisible } = usePullDownToRefresh(refreshData, el);

let canLoadMore = true;

const router = useRouter();

useInfiniteScroll(
  el,
  async () => {
    // load more
    canLoadMore = await loadNotificationData(true);
  },
  {
    distance: 1000,
    canLoadMore: () => {
      return canLoadMore;
    },
  }
);

onMounted(async () => {
  await markAllNotificationsAsRead();
  await loadNotificationData(false);
});

function getIconFromNotificationType(
  notificationType: NotificationType
): string {
  let icon;
  switch (notificationType) {
    case "new_opinion":
      icon = "mdi-chat-outline";
      break;
    case "opinion_vote":
      icon = "mdi-checkbox-marked-circle-outline";
      break;
  }
  return icon;
}

function getTitleFromNotification(notificationItem: NotificationItem): string {
  let title;
  switch (notificationItem.type) {
    case "new_opinion":
      title = `${notificationItem.username} contributed an opinion to your conversation:`;
      break;
    case "opinion_vote":
      title =
        notificationItem.numVotes === 1
          ? "1 person voted on your opinion:"
          : `${notificationItem.numVotes} people voted on your opinion:`;
      break;
  }
  return title;
}

async function refreshData() {
  await loadNotificationData(false);
}

async function redirectPage(routeTarget: RouteTarget) {
  await router.push({
    name: "/conversation/[postSlugId]",
    params: { postSlugId: routeTarget.conversationSlugId },
    query: { opinionSlugId: routeTarget.opinionSlugId },
  });
}
</script>

<style lang="scss" scoped>
.notificationItemBase {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: white;
}

.notificationItemBase:hover {
  background-color: $mouse-hover-color;
}

.notificationRightPortion {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.messageStyle {
  font-weight: 400;
  font-size: 12px;
  color: $lightweight-text-color;
}

.containerBase {
  margin: auto;
  height: calc(100dvh - 7rem);
  overflow-y: scroll;
  overscroll-behavior: none;
}

.widthConstraint {
  max-width: 35rem;
  margin: auto;
}

.notificaitonListFlexStyle {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.endOfFeed {
  max-width: 15rem;
  margin: auto;
  padding: 2rem;
  text-align: center;
}
</style>
