<template>
  <div v-if="isLoggedIn && profileData.dataLoaded" class="embed-account-widget">
    <div class="widget-content">
      <div class="account-info">
        <UserAvatar
          :user-identity="profileData.userName"
          :size="32"
          class="avatar"
        />
        <div>
          <div class="username">{{ profileData.userName }}</div>
        </div>
      </div>

      <div>
        <PrimeButton
          icon="pi pi-sign-out"
          label="Logout"
          text
          rounded
          :loading="isLoggingOut"
          class="logout-btn"
          size="small"
          title="Logout"
          @click.stop="confirmLogout"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useUserStore } from "src/stores/user";
import { useBackendAuthApi } from "src/utils/api/auth";
import UserAvatar from "./UserAvatar.vue";

const authStore = useAuthenticationStore();
const userStore = useUserStore();
const { logoutDataCleanup } = useBackendAuthApi();

const { isLoggedIn } = storeToRefs(authStore);
const { profileData } = storeToRefs(userStore);

const isLoggingOut = ref(false);

async function confirmLogout() {
  try {
    isLoggingOut.value = true;
    await logoutDataCleanup();
  } catch (error) {
    console.error("Logout failed:", error);
  } finally {
    isLoggingOut.value = false;
  }
}
</script>

<style scoped lang="scss">
.embed-account-widget {
  padding: 0.5rem;
}

.widget-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px 12px;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.avatar {
  border-radius: 50%;
  flex-shrink: 0;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.logout-btn {
  color: #666;

  &:hover {
    color: #999;
  }
}
</style>
