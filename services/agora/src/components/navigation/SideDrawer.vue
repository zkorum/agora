<template>
  <div>
    <div class="container">
      <div>
        <div v-if="drawerBehavior == 'desktop'" class="logoDiv">
          <img :src="drawerIconLogo1" class="logoStyle1" />
          <img :src="drawerIconLogo2" class="logoStyle2" />
        </div>

        <div
          v-if="isAuthenticated"
          class="usernameBar"
          @click="enterRoute('/user-profile/conversations/', true)"
        >
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

      <div>
        <div
          v-if="drawerBehavior == 'desktop'"
          class="bottomSection startConversationButton"
          @click="requestNewPost()"
        >
          <img :src="newConversationButton" />
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
import UserAvatar from "../account/UserAvatar.vue";
import { useUserStore } from "src/stores/user";
import { useNavigationStore } from "src/stores/navigation";
import { ref, watch } from "vue";
import { useCreateNewPost } from "src/utils/component/conversation/newPost";

const { requestNewPost } = useCreateNewPost();

const newConversationButton =
  process.env.VITE_PUBLIC_DIR + "/images/conversation/newConversationLong.svg";

const { isAuthenticated } = storeToRefs(useAuthenticationStore());
const { profileData } = storeToRefs(useUserStore());
const { drawerBehavior, showMobileDrawer } = storeToRefs(useNavigationStore());

const drawerIconLogo1 =
  process.env.VITE_PUBLIC_DIR + "/images/icons/agora-wings.svg";
const drawerIconLogo2 =
  process.env.VITE_PUBLIC_DIR + "/images/icons/agora-text.svg";

const { showLoginConfirmationDialog } = useDialog();

const router = useRouter();

interface SettingItem {
  icon: string;
  name: string;
  route: keyof RouteMap;
  requireAuth: boolean;
}

const settingItemList = ref<SettingItem[]>([]);
initializeMenu();

watch(drawerBehavior, () => {
  initializeMenu();
});

function initializeMenu() {
  settingItemList.value.push({
    icon: "mdi-account-circle",
    name: "Profile",
    route: "/user-profile/conversations/",
    requireAuth: true,
  });

  if (drawerBehavior.value == "desktop") {
    settingItemList.value.push({
      icon: "mdi-home",
      name: "Home",
      route: "/",
      requireAuth: false,
    });

    settingItemList.value.push({
      icon: "mdi-bell",
      name: "Dings",
      route: "/notification/",
      requireAuth: true,
    });
  }

  settingItemList.value.push({
    icon: "mdi-cog",
    name: "Settings",
    route: "/settings/",
    requireAuth: false,
  });
}

async function enterRoute(routeName: keyof RouteMap, requireAuth: boolean) {
  if (requireAuth && isAuthenticated.value == false) {
    showLoginConfirmationDialog();
  } else {
    if (drawerBehavior.value == "mobile") {
      showMobileDrawer.value = false;
    }

    await router.push({ name: routeName });
  }
}
</script>

<style lang="scss" scoped>
.container {
  height: 100dvh;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
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
  padding-bottom: 1rem;
  padding-left: 1rem;
}

.usernameBar:hover {
  cursor: pointer;
}

.menuListFlex {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.logoDiv {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.logoStyle1 {
  max-width: 2rem;
}

.logoStyle2 {
  max-width: 7rem;
}

.bottomSection {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.startConversationButton:hover {
  cursor: pointer;
}
</style>
