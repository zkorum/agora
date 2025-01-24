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
      hasSettingsButton: true,
      hasCloseButton: false,
      hasLoginButton: false,
    }"
  >
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
        :key="notificationItem.id"
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
  </MainLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import UserAvatar from "src/components/account/UserAvatar.vue";
import ZKHoverEffect from "src/components/ui-library/ZKHoverEffect.vue";
import MainLayout from "src/layouts/MainLayout.vue";
import { useNotificationStore } from "src/stores/notification";
import { useUserStore } from "src/stores/user";
import { useBackendNotificationApi } from "src/utils/api/notification";
import { onMounted } from "vue";

const { notificationList } = storeToRefs(useNotificationStore());
const { loadNotificationData } = useNotificationStore();

const { profileData } = useUserStore();
const { markAllNotificationsAsRead } = useBackendNotificationApi();

onMounted(async () => {
  await markAllNotificationsAsRead();
  await loadNotificationData();
});
</script>

<style lang="scss" scoped>
.topBar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
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

.notificaitonListFlexStyle {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
</style>
