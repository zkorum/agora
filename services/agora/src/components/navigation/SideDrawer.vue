<template>
  <div class="container">
    <div
      v-for="settingItem in settingItemList"
      :key="settingItem.name"
      @click="enterRoute(settingItem.route, settingItem.requireAuth)"
    >
      <ZKHoverEffect :enable-hover="true">
        <div class="settingItemStyle">
          <q-icon :name="settingItem.icon" size="1rem" />

          {{ settingItem.name }}
        </div>
      </ZKHoverEffect>
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

const { isAuthenticated } = storeToRefs(useAuthenticationStore());
const { showDrawer } = storeToRefs(useNavigationStore());

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
    showDrawer.value = false;
    await router.push({ name: routeName });
  }
}
</script>

<style lang="scss" scoped>
.container {
  padding: 1rem;
}

.settingItemStyle {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding-left: 1rem;
  padding-right: 1rem;
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
  border-radius: 15px;
}

.settingItemStyle:hover {
  background-color: #f3f4f6;
}
</style>
