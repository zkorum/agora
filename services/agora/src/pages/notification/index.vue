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
    <div>Notifications</div>

    <div
      v-for="notificationItem in notificationList"
      :key="notificationItem.id"
    >
      <q-icon :name="notificationItem.iconName" />
      <div>
        {{ notificationItem.title }}
      </div>

      <div>
        {{ notificationItem.message }}
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import MainLayout from "src/layouts/MainLayout.vue";
import { useNotificationStore } from "src/stores/notification";
import { onMounted } from "vue";

const { notificationList } = storeToRefs(useNotificationStore());
const { loadNotificationData } = useNotificationStore();

onMounted(async () => {
  await loadNotificationData();
});
</script>

<style lang="scss" scoped></style>
