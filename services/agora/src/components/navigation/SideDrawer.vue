<template>
  <div>
    <div class="container">
      <div>
        <div v-if="drawerBehavior == 'desktop'" class="logoDiv">
          <img :src="drawerIconLogo1" class="logoStyle1" />
          <img :src="drawerIconLogo2" class="logoStyle2" />
        </div>

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
              <div
                class="settingItemStyle"
                :class="{
                  activeRoute: settingItem.matchRouteList.includes(route.name),
                }"
              >
                <div>
                  <ZKStyledIcon
                    :fill="settingItem.matchRouteList.includes(route.name)"
                    :path="settingItem.svgPath"
                    :width="settingItem.width"
                    :height="settingItem.height"
                  />
                </div>

                <div>
                  {{ settingItem.name }}
                </div>
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
import { RouteMap, useRoute, useRouter } from "vue-router";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";
import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useDialog } from "src/utils/ui/dialog";
import UserAvatar from "../account/UserAvatar.vue";
import { useUserStore } from "src/stores/user";
import { useNavigationStore } from "src/stores/navigation";
import { ref, watch } from "vue";
import { useCreateNewPost } from "src/utils/component/conversation/newPost";
import ZKStyledIcon from "../ui-library/ZKStyledIcon.vue";

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
const route = useRoute();

interface SettingItem {
  icon: string;
  name: string;
  route: keyof RouteMap;
  matchRouteList: (keyof RouteMap)[];
  requireAuth: boolean;
  svgPath: string;
  width: number;
  height: number;
}

const settingItemList = ref<SettingItem[]>([]);
initializeMenu();

watch(drawerBehavior, () => {
  initializeMenu();
});

function initializeMenu() {
  if (drawerBehavior.value == "desktop") {
    settingItemList.value.push({
      icon: "iconamoon:home-fill",
      name: "Home",
      route: "/",
      matchRouteList: ["/"],
      requireAuth: false,
      svgPath:
        "M11.707 0.293C11.5194 0.105529 11.2651 0.000213623 11 0.000213623C10.7348 0.000213623 10.4805 0.105529 10.293 0.293L3.29296 7.293L1.29296 9.293C1.19745 9.38525 1.12127 9.49559 1.06886 9.6176C1.01645 9.7396 0.988862 9.87082 0.987709 10.0036C0.986555 10.1364 1.01186 10.2681 1.06214 10.391C1.11242 10.5139 1.18667 10.6255 1.28056 10.7194C1.37446 10.8133 1.48611 10.8875 1.60901 10.9378C1.7319 10.9881 1.86358 11.0134 1.99636 11.0123C2.12914 11.0111 2.26036 10.9835 2.38236 10.9311C2.50437 10.8787 2.61471 10.8025 2.70696 10.707L2.99996 10.414V17C2.99996 17.7956 3.31603 18.5587 3.87864 19.1213C4.44125 19.6839 5.20431 20 5.99996 20H16C16.7956 20 17.5587 19.6839 18.1213 19.1213C18.6839 18.5587 19 17.7956 19 17V10.414L19.293 10.707C19.4816 10.8892 19.7342 10.99 19.9964 10.9877C20.2586 10.9854 20.5094 10.8802 20.6948 10.6948C20.8802 10.5094 20.9854 10.2586 20.9876 9.9964C20.9899 9.7342 20.8891 9.4816 20.707 9.293L11.707 0.293Z",
      width: 21,
      height: 20,
    });

    settingItemList.value.push({
      icon: "carbon:user-avatar-filled",
      name: "Profile",
      route: "/user-profile/conversations/",
      matchRouteList: [
        "/user-profile/conversations/",
        "/user-profile/opinions/",
      ],
      requireAuth: true,
      svgPath:
        "M20.0618 18.6975C21.1388 17.4016 21.888 15.8653 22.2458 14.2186C22.6035 12.572 22.5595 10.8634 22.1173 9.23733C21.6751 7.61129 20.8477 6.11568 19.7052 4.87702C18.5628 3.63836 17.1388 2.69308 15.5537 2.12115C13.9686 1.54923 12.2691 1.36747 10.599 1.59127C8.92881 1.81507 7.33711 2.43784 5.95854 3.40689C4.57996 4.37594 3.45506 5.66277 2.67899 7.15852C1.90293 8.65426 1.49853 10.3149 1.5 12C1.50063 14.4496 2.36387 16.8208 3.93825 18.6975L3.92325 18.7103C3.97575 18.7733 4.03575 18.8273 4.08975 18.8895C4.15725 18.9668 4.23 19.0395 4.29975 19.1145C4.50875 19.343 4.72625 19.5605 4.95225 19.767C5.02225 19.829 5.09225 19.8895 5.16225 19.9485C5.40225 20.156 5.64975 20.3515 5.90475 20.535C5.93775 20.5575 5.96775 20.5868 6.00075 20.61V20.601C7.75729 21.8372 9.85281 22.5007 12.0008 22.5007C14.1487 22.5007 16.2442 21.8372 18.0008 20.601V20.61C18.0338 20.5868 18.063 20.5575 18.0968 20.535C18.3518 20.351 18.5993 20.1555 18.8393 19.9485C18.9093 19.889 18.9793 19.8285 19.0493 19.767C19.2748 19.5605 19.4923 19.343 19.7018 19.1145C19.7715 19.0395 19.8435 18.9668 19.9118 18.8895C19.965 18.8273 20.0258 18.7733 20.0783 18.7095L20.0618 18.6975ZM12 6.00001C12.6675 6.00001 13.32 6.19795 13.8751 6.5688C14.4301 6.93965 14.8627 7.46676 15.1181 8.08346C15.3735 8.70016 15.4404 9.37876 15.3102 10.0334C15.1799 10.6881 14.8585 11.2895 14.3865 11.7615C13.9145 12.2335 13.3131 12.5549 12.6584 12.6852C12.0037 12.8154 11.3251 12.7486 10.7084 12.4931C10.0917 12.2377 9.56464 11.8051 9.19379 11.2501C8.82294 10.695 8.625 10.0425 8.625 9.37501C8.625 8.47991 8.98058 7.62146 9.61352 6.98853C10.2465 6.35559 11.1049 6.00001 12 6.00001ZM6.00525 18.6975C6.01826 17.7127 6.41846 16.7727 7.11927 16.0807C7.82008 15.3888 8.76514 15.0005 9.75 15H14.25C15.2349 15.0005 16.1799 15.3888 16.8807 16.0807C17.5815 16.7727 17.9817 17.7127 17.9948 18.6975C16.3499 20.1798 14.2142 21.0001 12 21.0001C9.78581 21.0001 7.65012 20.1798 6.00525 18.6975Z",
      width: 24,
      height: 24,
    });

    settingItemList.value.push({
      icon: "ion:notifications",
      name: "Dings",
      route: "/notification/",
      matchRouteList: ["/notification/"],
      requireAuth: true,
      svgPath:
        "M17.6288 14.9989C17.551 14.9052 17.4745 14.8114 17.3995 14.7209C16.3683 13.4736 15.7444 12.7208 15.7444 9.18969C15.7444 7.36156 15.307 5.86156 14.445 4.73656C13.8094 3.90547 12.9502 3.275 11.8177 2.80906C11.8031 2.80096 11.7901 2.79032 11.7792 2.77766C11.3719 1.41359 10.2572 0.5 9.00002 0.5C7.74283 0.5 6.62861 1.41359 6.22127 2.77625C6.21041 2.78847 6.19758 2.79877 6.1833 2.80672C3.54049 3.89469 2.25611 5.98203 2.25611 9.18828C2.25611 12.7208 1.63314 13.4736 0.600955 14.7195C0.525955 14.81 0.449549 14.9019 0.371736 14.9975C0.170737 15.2399 0.0433868 15.5348 0.00475821 15.8473C-0.0338704 16.1598 0.0178392 16.4769 0.153767 16.7609C0.442986 17.3703 1.05939 17.7486 1.76299 17.7486H16.2422C16.9425 17.7486 17.5547 17.3708 17.8449 16.7642C17.9814 16.4801 18.0336 16.1628 17.9953 15.8499C17.957 15.537 17.8298 15.2417 17.6288 14.9989ZM9.00002 21.5C9.67738 21.4995 10.342 21.3156 10.9233 20.9679C11.5046 20.6202 11.981 20.1217 12.3019 19.5252C12.317 19.4966 12.3245 19.4646 12.3236 19.4322C12.3227 19.3999 12.3134 19.3684 12.2967 19.3407C12.28 19.313 12.2564 19.2901 12.2283 19.2742C12.2001 19.2583 12.1683 19.25 12.136 19.25H5.86502C5.83264 19.2499 5.80078 19.2582 5.77255 19.274C5.74432 19.2899 5.72067 19.3128 5.70392 19.3405C5.68716 19.3682 5.67787 19.3997 5.67694 19.4321C5.67601 19.4645 5.68347 19.4965 5.69861 19.5252C6.01949 20.1216 6.49579 20.6201 7.07702 20.9678C7.65825 21.3155 8.32274 21.4994 9.00002 21.5Z",
      width: 18,
      height: 22,
    });
  } else {
    settingItemList.value.push({
      icon: "carbon:user-avatar-filled",
      name: "Profile",
      route: "/user-profile/conversations/",
      matchRouteList: ["/user-profile/conversations/"],
      requireAuth: true,
      svgPath:
        "M20.0618 18.6975C21.1388 17.4016 21.888 15.8653 22.2458 14.2186C22.6035 12.572 22.5595 10.8634 22.1173 9.23733C21.6751 7.61129 20.8477 6.11568 19.7052 4.87702C18.5628 3.63836 17.1388 2.69308 15.5537 2.12115C13.9686 1.54923 12.2691 1.36747 10.599 1.59127C8.92881 1.81507 7.33711 2.43784 5.95854 3.40689C4.57996 4.37594 3.45506 5.66277 2.67899 7.15852C1.90293 8.65426 1.49853 10.3149 1.5 12C1.50063 14.4496 2.36387 16.8208 3.93825 18.6975L3.92325 18.7103C3.97575 18.7733 4.03575 18.8273 4.08975 18.8895C4.15725 18.9668 4.23 19.0395 4.29975 19.1145C4.50875 19.343 4.72625 19.5605 4.95225 19.767C5.02225 19.829 5.09225 19.8895 5.16225 19.9485C5.40225 20.156 5.64975 20.3515 5.90475 20.535C5.93775 20.5575 5.96775 20.5868 6.00075 20.61V20.601C7.75729 21.8372 9.85281 22.5007 12.0008 22.5007C14.1487 22.5007 16.2442 21.8372 18.0008 20.601V20.61C18.0338 20.5868 18.063 20.5575 18.0968 20.535C18.3518 20.351 18.5993 20.1555 18.8393 19.9485C18.9093 19.889 18.9793 19.8285 19.0493 19.767C19.2748 19.5605 19.4923 19.343 19.7018 19.1145C19.7715 19.0395 19.8435 18.9668 19.9118 18.8895C19.965 18.8273 20.0258 18.7733 20.0783 18.7095L20.0618 18.6975ZM12 6.00001C12.6675 6.00001 13.32 6.19795 13.8751 6.5688C14.4301 6.93965 14.8627 7.46676 15.1181 8.08346C15.3735 8.70016 15.4404 9.37876 15.3102 10.0334C15.1799 10.6881 14.8585 11.2895 14.3865 11.7615C13.9145 12.2335 13.3131 12.5549 12.6584 12.6852C12.0037 12.8154 11.3251 12.7486 10.7084 12.4931C10.0917 12.2377 9.56464 11.8051 9.19379 11.2501C8.82294 10.695 8.625 10.0425 8.625 9.37501C8.625 8.47991 8.98058 7.62146 9.61352 6.98853C10.2465 6.35559 11.1049 6.00001 12 6.00001ZM6.00525 18.6975C6.01826 17.7127 6.41846 16.7727 7.11927 16.0807C7.82008 15.3888 8.76514 15.0005 9.75 15H14.25C15.2349 15.0005 16.1799 15.3888 16.8807 16.0807C17.5815 16.7727 17.9817 17.7127 17.9948 18.6975C16.3499 20.1798 14.2142 21.0001 12 21.0001C9.78581 21.0001 7.65012 20.1798 6.00525 18.6975Z",
      width: 24,
      height: 24,
    });
  }

  settingItemList.value.push({
    icon: "ic:round-settings",
    name: "Settings",
    route: "/settings/",
    matchRouteList: ["/settings/"],
    requireAuth: false,
    svgPath:
      "M17.5 10C17.5 9.77 17.49 9.55 17.47 9.32L19.33 7.91C19.73 7.61 19.84 7.05 19.59 6.61L17.72 3.38C17.6001 3.16818 17.4062 3.00814 17.1755 2.93062C16.9447 2.8531 16.6935 2.86356 16.47 2.96L14.32 3.87C13.95 3.61 13.56 3.38 13.15 3.19L12.86 0.88C12.8 0.38 12.37 0 11.87 0H8.14003C7.63003 0 7.20003 0.38 7.14003 0.88L6.85003 3.19C6.44003 3.38 6.05003 3.61 5.68003 3.87L3.53003 2.96C3.07003 2.76 2.53003 2.94 2.28003 3.38L0.410031 6.62C0.160031 7.06 0.270031 7.61 0.670031 7.92L2.53003 9.33C2.48833 9.77903 2.48833 10.231 2.53003 10.68L0.670031 12.09C0.270031 12.39 0.160031 12.95 0.410031 13.39L2.28003 16.62C2.53003 17.06 3.07003 17.24 3.53003 17.04L5.68003 16.13C6.05003 16.39 6.44003 16.62 6.85003 16.81L7.14003 19.12C7.20003 19.62 7.63003 20 8.13003 20H11.86C12.36 20 12.79 19.62 12.85 19.12L13.14 16.81C13.55 16.62 13.94 16.39 14.31 16.13L16.46 17.04C16.92 17.24 17.46 17.06 17.71 16.62L19.58 13.39C19.83 12.95 19.72 12.4 19.32 12.09L17.46 10.68C17.49 10.45 17.5 10.23 17.5 10ZM10.04 13.5C8.11003 13.5 6.54003 11.93 6.54003 10C6.54003 8.07 8.11003 6.5 10.04 6.5C11.97 6.5 13.54 8.07 13.54 10C13.54 11.93 11.97 13.5 10.04 13.5Z",
    width: 20,
    height: 20,
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

.activeRoute {
  font-weight: 600;
  color: $primary;
}
</style>
