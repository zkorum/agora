<template>
  <MainLayout
    :general-props="{
      addBottomPadding: false,
      enableHeader: true,
      enableFooter: true,
      reducedWidth: false,
    }"
    :menu-bar-props="{
      hasBackButton: false,
      hasCloseButton: false,
      hasLoginButton: false,
    }"
  >
    <div ref="el" class="containerBase">
      <div class="widthConstraint">
        <div class="topBar">
          <div>
            <UserAvatar :user-name="profileData.userName" :size="40" />
          </div>
          <div class="title">Notifications</div>
          <div :style="{ width: '4rem' }"></div>
        </div>

        <div class="notificaitonListFlexStyle">
          <div
            v-for="notificationItem in notificationList"
            :key="notificationItem.slugId"
            @click="redirectPage(notificationItem.routeTarget)"
          >
            <ZKHoverEffect :enable-hover="true">
              <div class="notificationItemBase">
                <q-icon :name="notificationItem.iconName" size="1.8rem" />
                <div class="notificationRightPortion">
                  <div>
                    <UserAvatar
                      v-if="notificationItem.username"
                      :user-name="notificationItem.username"
                      :size="30"
                    />
                  </div>
                  <div>
                    {{ notificationItem.title }}
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
  </MainLayout>
</template>

<script setup lang="ts">
import { useInfiniteScroll } from "@vueuse/core";
import { storeToRefs } from "pinia";
import UserAvatar from "src/components/account/UserAvatar.vue";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import MainLayout from "src/layouts/MainLayout.vue";
import { RouteTarget } from "src/shared/types/zod";
import { useNotificationStore } from "src/stores/notification";
import { useUserStore } from "src/stores/user";
import { useBackendNotificationApi } from "src/utils/api/notification";
import { usePullDownToRefresh } from "src/utils/ui/pullDownToRefresh";
import { onMounted, useTemplateRef } from "vue";
import { useRouter } from "vue-router";

const { notificationList } = storeToRefs(useNotificationStore());
const { loadNotificationData } = useNotificationStore();

const { profileData } = useUserStore();
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

async function refreshData() {
  await loadNotificationData(false);
}

async function redirectPage(routeTarget: RouteTarget) {
  if (routeTarget.target == "opinion") {
    await router.push({
      name: "/conversation/[postSlugId]",
      params: { postSlugId: routeTarget.conversationSlugId },
      query: { opinionSlugId: routeTarget.opinionSlugId },
    });
  }
}
</script>

<style lang="scss" scoped>
.topBar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
}

.title {
  font-weight: 500;
  font-size: 1rem;
}

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
