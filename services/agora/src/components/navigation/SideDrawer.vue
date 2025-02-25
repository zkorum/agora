<template>
  <div>
    <div class="container">
      <div v-if="isAuthenticated" class="usernameBar">
        <UserAvatar
          :key="profileData.userName"
          :user-name="profileData.userName"
          :size="35"
        />
        <div>
          {{ profileData.userName }}
        </div>
      </div>

      <div class="menuListFlex">
        <div
          v-for="settingItem in settingItemList"
          :key="settingItem.name"
          @click="enterRoute(settingItem.route, settingItem.requireAuth)"
        >
          <ZKHoverEffect :enable-hover="true">
            <div class="settingItemStyle">
              <q-icon :name="settingItem.icon" size="1.5rem" />

              {{ settingItem.name }}
            </div>
          </ZKHoverEffect>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouteMap, useRouter } from "vue-router";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";
import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useDialog } from "src/utils/ui/dialog";
import { useNavigationStore } from "src/stores/navigation";
import UserAvatar from "../account/UserAvatar.vue";
import { useUserStore } from "src/stores/user";

const { isAuthenticated } = storeToRefs(useAuthenticationStore());
const { showMobileDrawer } = storeToRefs(useNavigationStore());
const { profileData } = storeToRefs(useUserStore());

const { showLoginConfirmationDialog } = useDialog();

const router = useRouter();

interface SettingItem {
  icon: string;
  name: string;
  route: keyof RouteMap;
  requireAuth: boolean;
}

const settingItemList: SettingItem[] = [
  {
    icon: "mdi-account-circle",
    name: "Profile",
    route: "/user-profile/conversations/",
    requireAuth: true,
  },
  {
    icon: "mdi-cog",
    name: "Settings",
    route: "/settings/",
    requireAuth: false,
  },
];

async function enterRoute(routeName: keyof RouteMap, requireAuth: boolean) {
  if (requireAuth && isAuthenticated.value == false) {
    showLoginConfirmationDialog();
  } else {
    showMobileDrawer.value = false;
    await router.push({ name: routeName });
  }
}
</script>

<style lang="scss" scoped>
.container {
  padding: 1rem;
  width: 20dvw;
}

.settingItemStyle {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding-left: 1rem;
  padding-right: 1rem;
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
  border-radius: 15px;
  font-size: 1rem;
}

.settingItemStyle:hover {
  background-color: #f3f4f6;
}

.usernameBar {
  display: flex;
  gap: 1rem;
  align-items: center;
  font-weight: 500;
  padding-top: 2rem;
  padding-bottom: 2rem;
  padding-left: 1rem;
}

.menuListFlex {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
</style>
