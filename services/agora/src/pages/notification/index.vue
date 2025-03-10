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
      <DefaultMenuBar
        :has-back-button="false"
        :has-close-button="false"
        :has-login-button="false"
        :has-menu-button="true"
        :fixed-height="true"
      >
        <template #middle>
          <div>Notifications</div>
        </template>
      </DefaultMenuBar>
    </template>

    <q-pull-to-refresh @refresh="pullDownTriggered">
      <q-infinite-scroll :offset="2000" :disable="!hasMore" @load="onLoad">
        <div class="widthConstraint">
          <div class="notificaitonListFlexStyle">
            <div
              v-for="notificationItem in notificationList"
              :key="notificationItem.slugId"
              @click="redirectPage(notificationItem.routeTarget)"
            >
              <ZKHoverEffect :enable-hover="true">
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
                        :user-name="notificationItem.username"
                        :size="32"
                      />
                    </div>
                    <div class="titleStyle">
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
      </q-infinite-scroll>
    </q-pull-to-refresh>
  </DrawerLayout>
</template>

<script setup lang="ts">
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
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import DefaultMenuBar from "src/components/navigation/header/DefaultMenuBar.vue";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";

const { notificationList } = storeToRefs(useNotificationStore());
const { loadNotificationData } = useNotificationStore();

const { markAllNotificationsAsRead } = useBackendNotificationApi();

const hasMore = ref(true);

const router = useRouter();

onMounted(async () => {
  await markAllNotificationsAsRead();
  await loadNotificationData(false);
});

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

async function pullDownTriggered(done: () => void) {
  setTimeout(async () => {
    await loadNotificationData(false);
    hasMore.value = true;
    done();
  }, 500);
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
  padding: $container-padding;
  background-color: white;
}

.notificationItemBase:hover {
  background-color: $mouse-hover-color;
}

.notificationRightPortion {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.messageStyle {
  font-weight: 400;
  color: #6d6a74;
}

.widthConstraint {
  max-width: 35rem;
  margin: auto;
}

.notificaitonListFlexStyle {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
