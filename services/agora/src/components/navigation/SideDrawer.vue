<template>
  <div>
    <div class="container">
      <div>
        <div v-if="drawerBehavior == 'desktop'" class="logoDiv">
          <img :src="drawerIconLogo1" class="logoStyle1" />
          <img :src="drawerIconLogo2" class="logoStyle2" />
        </div>

        <div v-if="isGuestOrLoggedIn" class="usernameBar">
          <UserAvatar
            :key="profileData.userName"
            :user-identity="profileData.userName"
            :size="35"
          />
          <DisplayUsername
            :username="profileData.userName"
            :show-is-guest="isGuest"
          />
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
                <div class="iconItem">
                  <ZKStyledIcon
                    :svg-string="
                      settingItem.matchRouteList.includes(route.name)
                        ? settingItem.svgStringFilled
                        : settingItem.svgStringStandard
                    "
                  />

                  <NewNotificationIndicator
                    v-if="settingItem.name == 'Dings'"
                  />
                </div>

                <div class="itemName">
                  {{ settingItem.name }}
                </div>
              </div>
            </ZKHoverEffect>
          </div>
        </div>
      </div>

      <div>
        <RouterLink :to="{ name: '/conversation/new/create/' }">
          <div
            v-if="drawerBehavior == 'desktop'"
            class="bottomSection startConversationButton"
          >
            <img :src="newConversationButton" />
          </div>
        </RouterLink>
      </div>
    </div>

    <PreLoginIntentionDialog
      v-model="showLoginDialog"
      :ok-callback="() => {}"
      :active-intention="'none'"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNavigationStore } from "src/stores/navigation";
import { useUserStore } from "src/stores/user";
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { RouteRecordName } from "vue-router";
import UserAvatar from "../account/UserAvatar.vue";
import PreLoginIntentionDialog from "../authentication/intention/PreLoginIntentionDialog.vue";
import NewNotificationIndicator from "../notification/NewNotificationIndicator.vue";
import ZKHoverEffect from "../ui-library/ZKHoverEffect.vue";
import ZKStyledIcon from "../ui-library/ZKStyledIcon.vue";
import DisplayUsername from "../features/user/DisplayUsername.vue";

const newConversationButton =
  process.env.VITE_PUBLIC_DIR + "/images/conversation/newConversationLong.svg";

const { isGuestOrLoggedIn, isGuest } = storeToRefs(useAuthenticationStore());
const { profileData } = storeToRefs(useUserStore());
const { drawerBehavior, showMobileDrawer } = storeToRefs(useNavigationStore());

const drawerIconLogo1 =
  process.env.VITE_PUBLIC_DIR + "/images/icons/agora-wings.svg";
const drawerIconLogo2 =
  process.env.VITE_PUBLIC_DIR + "/images/icons/agora-text.svg";

const router = useRouter();
const route = useRoute();

const showLoginDialog = ref(false);

interface SettingItem {
  name: string;
  route: RouteRecordName;
  matchRouteList: RouteRecordName[];
  requireAuth: boolean;
  svgStringStandard: string;
  svgStringFilled: string;
}

const settingItemList = ref<SettingItem[]>([]);
initializeMenu();

watch(drawerBehavior, () => {
  initializeMenu();
});

function initializeMenu() {
  if (drawerBehavior.value == "desktop") {
    settingItemList.value.push({
      name: "Home",
      route: "/",
      matchRouteList: ["/"],
      requireAuth: false,
      svgStringStandard:
        '<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path fill-rule="evenodd" clip-rule="evenodd" d="M11.7071 1.01447C11.5196 0.826995 11.2652 0.72168 11.0001 0.72168C10.7349 0.72168 10.4806 0.826995 10.2931 1.01447L3.29308 8.01447L1.29308 10.0145C1.19757 10.1067 1.12139 10.2171 1.06898 10.3391C1.01657 10.4611 0.988985 10.5923 0.987831 10.7251C0.986677 10.8578 1.01198 10.9895 1.06226 11.1124C1.11254 11.2353 1.18679 11.347 1.28069 11.4409C1.37458 11.5348 1.48623 11.609 1.60913 11.6593C1.73202 11.7096 1.8637 11.7349 1.99648 11.7337C2.12926 11.7326 2.26048 11.705 2.38249 11.6526C2.50449 11.6002 2.61483 11.524 2.70708 11.4285L3.00008 11.1355V17.7215C3.00008 18.5171 3.31615 19.2802 3.87876 19.8428C4.44137 20.4054 5.20443 20.7215 6.00008 20.7215H16.0001C16.7957 20.7215 17.5588 20.4054 18.1214 19.8428C18.684 19.2802 19.0001 18.5171 19.0001 17.7215V11.1355L19.2931 11.4285C19.4817 11.6106 19.7343 11.7114 19.9965 11.7091C20.2587 11.7069 20.5095 11.6017 20.6949 11.4163C20.8803 11.2309 20.9855 10.9801 20.9878 10.7179C20.99 10.4557 20.8892 10.2031 20.7071 10.0145L11.7071 1.01447Z" fill="#CDCBD3"/>\n</svg>\n',
      svgStringFilled:
        '<svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path fill-rule="evenodd" clip-rule="evenodd" d="M11.707 0.292786C11.5195 0.105315 11.2652 0 11 0C10.7349 0 10.4805 0.105315 10.293 0.292786L3.29302 7.29279L1.29302 9.29279C1.19751 9.38503 1.12133 9.49538 1.06892 9.61738C1.01651 9.73939 0.988924 9.87061 0.98777 10.0034C0.986616 10.1362 1.01192 10.2678 1.0622 10.3907C1.11248 10.5136 1.18673 10.6253 1.28063 10.7192C1.37452 10.8131 1.48617 10.8873 1.60907 10.9376C1.73196 10.9879 1.86364 11.0132 1.99642 11.012C2.1292 11.0109 2.26042 10.9833 2.38242 10.9309C2.50443 10.8785 2.61477 10.8023 2.70702 10.7068L3.00002 10.4138V16.9998C3.00002 17.7954 3.31609 18.5585 3.8787 19.1211C4.44131 19.6837 5.20437 19.9998 6.00002 19.9998H16C16.7957 19.9998 17.5587 19.6837 18.1213 19.1211C18.684 18.5585 19 17.7954 19 16.9998V10.4138L19.293 10.7068C19.4816 10.8889 19.7342 10.9897 19.9964 10.9875C20.2586 10.9852 20.5094 10.88 20.6948 10.6946C20.8802 10.5092 20.9854 10.2584 20.9877 9.99619C20.99 9.73399 20.8892 9.48139 20.707 9.29279L11.707 0.292786Z" fill="url(#paint0_linear_19123_7433)"/>\n<defs>\n<linearGradient id="paint0_linear_19123_7433" x1="9.27519" y1="11.4582" x2="22.2025" y2="17.4337" gradientUnits="userSpaceOnUse">\n<stop stop-color="#6B4EFF"/>\n<stop offset="1" stop-color="#4F92F6"/>\n</linearGradient>\n</defs>\n</svg>\n',
    });

    settingItemList.value.push({
      name: "Explore",
      route: "/topics/",
      matchRouteList: ["/topics/"],
      requireAuth: false,
      svgStringStandard:
        '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M20.0002 20.0002L15.6572 15.6572M15.6572 15.6572C16.4001 14.9143 16.9894 14.0324 17.3914 13.0618C17.7935 12.0911 18.0004 11.0508 18.0004 10.0002C18.0004 8.9496 17.7935 7.90929 17.3914 6.93866C16.9894 5.96803 16.4001 5.08609 15.6572 4.34321C14.9143 3.60032 14.0324 3.01103 13.0618 2.60898C12.0911 2.20693 11.0508 2 10.0002 2C8.9496 2 7.90929 2.20693 6.93866 2.60898C5.96803 3.01103 5.08609 3.60032 4.34321 4.34321C2.84288 5.84354 2 7.87842 2 10.0002C2 12.122 2.84288 14.1569 4.34321 15.6572C5.84354 17.1575 7.87842 18.0004 10.0002 18.0004C12.122 18.0004 14.1569 17.1575 15.6572 15.6572Z" stroke="url(#paint0_linear_2_3)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>\n<defs>\n<linearGradient id="paint0_linear_2_3" x1="9.4588" y1="12.3126" x2="21.0936" y2="17.6905" gradientUnits="userSpaceOnUse">\n<stop stop-color="#CDCBD3"/>\n<stop offset="1" stop-color="#CDCBD3"/>\n</linearGradient>\n</defs>\n</svg>\n',
      svgStringFilled:
        '<svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M21 21.7219L16.657 17.3789M16.657 17.3789C17.3999 16.636 17.9892 15.7541 18.3912 14.7834C18.7933 13.8128 19.0002 12.7725 19.0002 11.7219C19.0002 10.6713 18.7933 9.63097 18.3913 8.66034C17.9892 7.68971 17.3999 6.80777 16.657 6.06489C15.9141 5.322 15.0322 4.73271 14.0616 4.33066C13.0909 3.92861 12.0506 3.72168 11 3.72168C9.94942 3.72168 8.90911 3.92861 7.93848 4.33066C6.96785 4.73271 6.08591 5.322 5.34302 6.06489C3.84269 7.56522 2.99982 9.6001 2.99982 11.7219C2.99982 13.8437 3.84269 15.8786 5.34302 17.3789C6.84335 18.8792 8.87824 19.7221 11 19.7221C13.1218 19.7221 15.1567 18.8792 16.657 17.3789Z" stroke="url(#paint0_linear_19123_653)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>\n<defs>\n<linearGradient id="paint0_linear_19123_653" x1="10.4586" y1="14.0343" x2="22.0934" y2="19.4122" gradientUnits="userSpaceOnUse">\n<stop stop-color="#6B4EFF"/>\n<stop offset="1" stop-color="#4F92F6"/>\n</linearGradient>\n</defs>\n</svg>\n',
    });

    settingItemList.value.push({
      name: "Dings",
      route: "/notification/",
      matchRouteList: ["/notification/"],
      requireAuth: true,
      svgStringStandard:
        '<svg width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M17.6286 14.7206C17.5508 14.6268 17.4744 14.5331 17.3994 14.4426C16.3682 13.1953 15.7443 12.4425 15.7443 8.91137C15.7443 7.08324 15.3069 5.58324 14.4449 4.45824C13.8093 3.62715 12.95 2.99668 11.8175 2.53074C11.803 2.52264 11.79 2.512 11.7791 2.49934C11.3718 1.13527 10.2571 0.22168 8.99989 0.22168C7.74271 0.22168 6.62849 1.13527 6.22114 2.49793C6.21029 2.51015 6.19746 2.52045 6.18318 2.5284C3.54036 3.61637 2.25599 5.70371 2.25599 8.90996C2.25599 12.4425 1.63302 13.1953 0.600833 14.4412C0.525833 14.5317 0.449427 14.6236 0.371614 14.7192C0.170614 14.9616 0.0432647 15.2565 0.00463614 15.569C-0.0339924 15.8815 0.0177171 16.1986 0.153645 16.4826C0.442864 17.092 1.05927 17.4703 1.76286 17.4703H16.2421C16.9424 17.4703 17.5546 17.0925 17.8447 16.4859C17.9813 16.2018 18.0335 15.8845 17.9952 15.5716C17.9569 15.2587 17.8297 14.9634 17.6286 14.7206ZM8.99989 21.2217C9.67725 21.2211 10.3418 21.0373 10.9232 20.6896C11.5045 20.3419 11.9809 19.8434 12.3018 19.2468C12.3169 19.2182 12.3244 19.1862 12.3234 19.1539C12.3225 19.1216 12.3133 19.09 12.2966 19.0623C12.2799 19.0347 12.2563 19.0118 12.2281 18.9959C12.2 18.98 12.1682 18.9716 12.1358 18.9717H5.86489C5.83252 18.9716 5.80066 18.9798 5.77243 18.9957C5.7442 19.0115 5.72055 19.0344 5.7038 19.0621C5.68704 19.0899 5.67774 19.1214 5.67681 19.1538C5.67588 19.1862 5.68335 19.2182 5.69849 19.2468C6.01936 19.8433 6.49567 20.3418 7.0769 20.6895C7.65813 21.0371 8.32261 21.221 8.99989 21.2217Z" fill="#CDCBD3"/>\n</svg>\n',
      svgStringFilled:
        '<svg width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M5.86533 19.2656H12.1358C12.1655 19.2656 12.195 19.2735 12.2208 19.2881C12.2465 19.3026 12.268 19.3234 12.2833 19.3486C12.2986 19.374 12.3069 19.403 12.3077 19.4326L12.3038 19.4766L12.2882 19.5176C12.0085 20.0374 11.61 20.4823 11.127 20.8174L10.9151 20.9541C10.3363 21.3003 9.67459 21.4838 9.00009 21.4844L8.74814 21.4756C8.24532 21.4412 7.75473 21.3051 7.30576 21.0762L7.08505 20.9541C6.57846 20.6511 6.15174 20.2332 5.83896 19.7354L5.71201 19.5176C5.70519 19.5046 5.70067 19.4907 5.69736 19.4766L5.69247 19.4326C5.6929 19.4177 5.69511 19.4029 5.69931 19.3887L5.71689 19.3486C5.72457 19.3359 5.73463 19.3247 5.74521 19.3145L5.78036 19.2881C5.79335 19.2808 5.80708 19.2752 5.82138 19.2715L5.86533 19.2656ZM9.00009 0.515625C10.2488 0.515676 11.3568 1.42332 11.7628 2.78125V2.78223L11.7677 2.78809C11.7795 2.80188 11.7938 2.81336 11.8097 2.82227L11.8175 2.80859L11.8097 2.82324H11.8116C12.8007 3.23017 13.5807 3.76255 14.1847 4.44434L14.4327 4.74609C15.292 5.86761 15.7286 7.36391 15.7286 9.18945C15.7286 10.9557 15.8852 12.0294 16.171 12.8174C16.3853 13.4082 16.6721 13.8384 17.0196 14.2793L17.3878 14.7305L17.6163 15.0088C17.7905 15.2192 17.9088 15.4695 17.961 15.7363L17.9796 15.8516C18.0128 16.1228 17.977 16.3974 17.877 16.6504L17.8311 16.7578C17.5437 17.3586 16.9368 17.7334 16.2423 17.7334H1.76279C1.10851 17.7333 0.531338 17.4029 0.225677 16.8643L0.16806 16.7539C0.0503509 16.5079 -0.00406164 16.237 0.00985718 15.9658L0.0205994 15.8496C0.0540897 15.5787 0.154459 15.3207 0.312592 15.0996L0.383881 15.0078L0.613373 14.7295C1.12931 14.1067 1.5444 13.6047 1.83017 12.8164C2.11579 12.0284 2.27156 10.9551 2.27158 9.18848C2.27158 7.58739 2.59274 6.26645 3.24228 5.21094C3.85121 4.22162 4.74971 3.46394 5.94638 2.92578L6.18954 2.82129L6.19052 2.82031C6.20615 2.81161 6.22058 2.80044 6.23251 2.78711L6.23447 2.78809L6.23642 2.78027C6.64226 1.42331 7.75112 0.515625 9.00009 0.515625Z" fill="url(#paint0_linear_21149_1381)" stroke="url(#paint1_linear_21149_1381)" stroke-width="0.03125"/>\n<defs>\n<linearGradient id="paint0_linear_21149_1381" x1="7.45729" y1="12.5313" x2="19.6694" y2="17.3737" gradientUnits="userSpaceOnUse">\n<stop stop-color="#6B4EFF"/>\n<stop offset="1" stop-color="#4F92F6"/>\n</linearGradient>\n<linearGradient id="paint1_linear_21149_1381" x1="7.45729" y1="12.5313" x2="19.6694" y2="17.3737" gradientUnits="userSpaceOnUse">\n<stop stop-color="#6B4EFF"/>\n<stop offset="1" stop-color="#4F92F6"/>\n</linearGradient>\n</defs>\n</svg>\n',
    });
  }

  settingItemList.value.push({
    name: "Profile",
    route: "/user-profile/conversations/",
    matchRouteList: ["/user-profile/conversations/"],
    requireAuth: true,
    svgStringStandard:
      '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M19.0618 17.4189C20.1388 16.123 20.888 14.5867 21.2458 12.9401C21.6035 11.2934 21.5595 9.58476 21.1173 7.95873C20.6751 6.3327 19.8477 4.83709 18.7052 3.59843C17.5628 2.35976 16.1388 1.41449 14.5537 0.842558C12.9686 0.27063 11.2691 0.0888787 9.59897 0.312679C7.92881 0.536479 6.33711 1.15925 4.95854 2.1283C3.57996 3.09735 2.45506 4.38418 1.67899 5.87992C0.902928 7.37567 0.498528 9.03633 0.500004 10.7214C0.500635 13.171 1.36387 15.5422 2.93825 17.4189L2.92325 17.4317C2.97575 17.4947 3.03575 17.5487 3.08975 17.6109C3.15725 17.6882 3.23 17.7609 3.29975 17.8359C3.50875 18.0644 3.72625 18.2819 3.95225 18.4884C4.02225 18.5504 4.09225 18.6109 4.16225 18.6699C4.40225 18.8774 4.64975 19.0729 4.90475 19.2564C4.93775 19.2789 4.96775 19.3082 5.00075 19.3314V19.3224C6.75729 20.5586 8.85281 21.2221 11.0008 21.2221C13.1487 21.2221 15.2442 20.5586 17.0008 19.3224V19.3314C17.0338 19.3082 17.063 19.2789 17.0968 19.2564C17.3518 19.0724 17.5993 18.8769 17.8393 18.6699C17.9093 18.6104 17.9793 18.5499 18.0493 18.4884C18.2748 18.2819 18.4923 18.0644 18.7018 17.8359C18.7715 17.7609 18.8435 17.6882 18.9118 17.6109C18.965 17.5487 19.0258 17.4947 19.0783 17.4309L19.0618 17.4189ZM11 4.72142C11.6675 4.72142 12.32 4.91936 12.8751 5.29021C13.4301 5.66106 13.8627 6.18816 14.1181 6.80486C14.3735 7.42156 14.4404 8.10016 14.3102 8.75485C14.1799 9.40953 13.8585 10.0109 13.3865 10.4829C12.9145 10.9549 12.3131 11.2763 11.6584 11.4066C11.0037 11.5368 10.3251 11.47 9.70845 11.2145C9.09175 10.9591 8.56464 10.5265 8.19379 9.97147C7.82294 9.41645 7.625 8.76393 7.625 8.09642C7.625 7.20131 7.98058 6.34287 8.61352 5.70993C9.24645 5.077 10.1049 4.72142 11 4.72142ZM5.00525 17.4189C5.01826 16.4341 5.41846 15.4941 6.11927 14.8021C6.82008 14.1102 7.76514 13.7219 8.75 13.7214H13.25C14.2349 13.7219 15.1799 14.1102 15.8807 14.8021C16.5815 15.4941 16.9817 16.4341 16.9948 17.4189C15.3499 18.9012 13.2142 19.7215 11 19.7215C8.78581 19.7215 6.65012 18.9012 5.00525 17.4189Z" fill="#CDCBD3"/>\n</svg>\n',
    svgStringFilled:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M20.0618 18.6975C21.1388 17.4016 21.888 15.8653 22.2458 14.2186C22.6035 12.5719 22.5595 10.8633 22.1173 9.2373C21.6751 7.61126 20.8477 6.11565 19.7052 4.87699C18.5628 3.63833 17.1388 2.69305 15.5537 2.12112C13.9686 1.54919 12.2691 1.36744 10.599 1.59124C8.92881 1.81504 7.33711 2.43781 5.95854 3.40686C4.57996 4.37591 3.45506 5.66274 2.67899 7.15849C1.90293 8.65423 1.49853 10.3149 1.5 12C1.50063 14.4496 2.36387 16.8208 3.93825 18.6975L3.92325 18.7102C3.97575 18.7732 4.03575 18.8272 4.08975 18.8895C4.15725 18.9667 4.23 19.0395 4.29975 19.1145C4.50875 19.343 4.72625 19.5605 4.95225 19.767C5.02225 19.829 5.09225 19.8895 5.16225 19.9485C5.40225 20.156 5.64975 20.3515 5.90475 20.535C5.93775 20.5575 5.96775 20.5867 6.00075 20.61V20.601C7.75729 21.8372 9.85281 22.5007 12.0008 22.5007C14.1487 22.5007 16.2442 21.8372 18.0008 20.601V20.61C18.0338 20.5867 18.063 20.5575 18.0968 20.535C18.3518 20.351 18.5993 20.1555 18.8393 19.9485C18.9093 19.889 18.9793 19.8285 19.0493 19.767C19.2748 19.5605 19.4923 19.343 19.7018 19.1145C19.7715 19.0395 19.8435 18.9667 19.9118 18.8895C19.965 18.8272 20.0258 18.7732 20.0783 18.7095L20.0618 18.6975ZM12 5.99998C12.6675 5.99998 13.32 6.19792 13.8751 6.56877C14.4301 6.93962 14.8627 7.46673 15.1181 8.08343C15.3735 8.70013 15.4404 9.37873 15.3102 10.0334C15.1799 10.6881 14.8585 11.2895 14.3865 11.7615C13.9145 12.2335 13.3131 12.5549 12.6584 12.6851C12.0037 12.8154 11.3251 12.7485 10.7084 12.4931C10.0917 12.2376 9.56464 11.805 9.19379 11.25C8.82294 10.695 8.625 10.0425 8.625 9.37498C8.625 8.47988 8.98058 7.62143 9.61352 6.9885C10.2465 6.35556 11.1049 5.99998 12 5.99998ZM6.00525 18.6975C6.01826 17.7127 6.41846 16.7727 7.11927 16.0807C7.82008 15.3887 8.76514 15.0005 9.75 15H14.25C15.2349 15.0005 16.1799 15.3887 16.8807 16.0807C17.5815 16.7727 17.9817 17.7127 17.9948 18.6975C16.3499 20.1797 14.2142 21 12 21C9.78581 21 7.65012 20.1797 6.00525 18.6975Z" fill="url(#paint0_linear_17538_63856)"/>\n<defs>\n<linearGradient id="paint0_linear_17538_63856" x1="10.1956" y1="13.5309" x2="23.7636" y2="19.7972" gradientUnits="userSpaceOnUse">\n<stop stop-color="#6B4EFF"/>\n<stop offset="1" stop-color="#4F92F6"/>\n</linearGradient>\n</defs>\n</svg>\n',
  });

  settingItemList.value.push({
    name: "Settings",
    route: "/settings/",
    matchRouteList: ["/settings/"],
    requireAuth: false,
    svgStringStandard:
      '<svg width="20" height="21" viewBox="0 0 20 21" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M17.4999 10.7217C17.4999 10.4917 17.4899 10.2717 17.4699 10.0417L19.3299 8.63168C19.7299 8.33168 19.8399 7.77168 19.5899 7.33168L17.7199 4.10168C17.6 3.88986 17.4061 3.72982 17.1753 3.6523C16.9446 3.57478 16.6934 3.58524 16.4699 3.68168L14.3199 4.59168C13.9499 4.33168 13.5599 4.10168 13.1499 3.91168L12.8599 1.60168C12.7999 1.10168 12.3699 0.72168 11.8699 0.72168H8.13991C7.62991 0.72168 7.19991 1.10168 7.13991 1.60168L6.84991 3.91168C6.43991 4.10168 6.04991 4.33168 5.67991 4.59168L3.52991 3.68168C3.06991 3.48168 2.52991 3.66168 2.27991 4.10168L0.409909 7.34168C0.159909 7.78168 0.269909 8.33168 0.669909 8.64168L2.52991 10.0517C2.48821 10.5007 2.48821 10.9526 2.52991 11.4017L0.669909 12.8117C0.269909 13.1117 0.159909 13.6717 0.409909 14.1117L2.27991 17.3417C2.52991 17.7817 3.06991 17.9617 3.52991 17.7617L5.67991 16.8517C6.04991 17.1117 6.43991 17.3417 6.84991 17.5317L7.13991 19.8417C7.19991 20.3417 7.62991 20.7217 8.12991 20.7217H11.8599C12.3599 20.7217 12.7899 20.3417 12.8499 19.8417L13.1399 17.5317C13.5499 17.3417 13.9399 17.1117 14.3099 16.8517L16.4599 17.7617C16.9199 17.9617 17.4599 17.7817 17.7099 17.3417L19.5799 14.1117C19.8299 13.6717 19.7199 13.1217 19.3199 12.8117L17.4599 11.4017C17.4899 11.1717 17.4999 10.9517 17.4999 10.7217ZM10.0399 14.2217C8.10991 14.2217 6.53991 12.6517 6.53991 10.7217C6.53991 8.79168 8.10991 7.22168 10.0399 7.22168C11.9699 7.22168 13.5399 8.79168 13.5399 10.7217C13.5399 12.6517 11.9699 14.2217 10.0399 14.2217Z" fill="#CDCBD3"/>\n</svg>\n',
    svgStringFilled:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M19.5 12C19.5 11.77 19.49 11.55 19.47 11.32L21.33 9.91C21.73 9.61 21.84 9.05 21.59 8.61L19.72 5.38C19.6001 5.16818 19.4062 5.00814 19.1755 4.93062C18.9447 4.8531 18.6935 4.86356 18.47 4.96L16.32 5.87C15.95 5.61 15.56 5.38 15.15 5.19L14.86 2.88C14.8 2.38 14.37 2 13.87 2H10.14C9.63003 2 9.20003 2.38 9.14003 2.88L8.85003 5.19C8.44003 5.38 8.05003 5.61 7.68003 5.87L5.53003 4.96C5.07003 4.76 4.53003 4.94 4.28003 5.38L2.41003 8.62C2.16003 9.06 2.27003 9.61 2.67003 9.92L4.53003 11.33C4.48833 11.779 4.48833 12.231 4.53003 12.68L2.67003 14.09C2.27003 14.39 2.16003 14.95 2.41003 15.39L4.28003 18.62C4.53003 19.06 5.07003 19.24 5.53003 19.04L7.68003 18.13C8.05003 18.39 8.44003 18.62 8.85003 18.81L9.14003 21.12C9.20003 21.62 9.63003 22 10.13 22H13.86C14.36 22 14.79 21.62 14.85 21.12L15.14 18.81C15.55 18.62 15.94 18.39 16.31 18.13L18.46 19.04C18.92 19.24 19.46 19.06 19.71 18.62L21.58 15.39C21.83 14.95 21.72 14.4 21.32 14.09L19.46 12.68C19.49 12.45 19.5 12.23 19.5 12ZM12.04 15.5C10.11 15.5 8.54003 13.93 8.54003 12C8.54003 10.07 10.11 8.5 12.04 8.5C13.97 8.5 15.54 10.07 15.54 12C15.54 13.93 13.97 15.5 12.04 15.5Z" fill="url(#paint0_linear_17538_63862)"/>\n<defs>\n<linearGradient id="paint0_linear_17538_63862" x1="10.3349" y1="13.4583" x2="23.0265" y2="19.1624" gradientUnits="userSpaceOnUse">\n<stop stop-color="#6B4EFF"/>\n<stop offset="1" stop-color="#4F92F6"/>\n</linearGradient>\n</defs>\n</svg>\n',
  });
}

async function enterRoute(routeName: RouteRecordName, requireAuth: boolean) {
  if (requireAuth && isGuestOrLoggedIn.value === false) {
    showLoginDialog.value = true;
  } else {
    if (drawerBehavior.value == "mobile") {
      showMobileDrawer.value = false;
    }

    if (routeName == "/user-profile/conversations/") {
      await router.push({ name: "/user-profile/conversations/" });
    } else if (routeName == "/notification/") {
      await router.push({ name: "/notification/" });
    } else if (routeName == "/settings/") {
      await router.push({ name: "/settings/" });
    } else if (routeName == "/") {
      await router.push({ name: "/" });
    } else if (routeName == "/topics/") {
      await router.push({ name: "/topics/" });
    } else {
      console.error(
        "Unknown route name when entering route in side bar: " +
          String(routeName)
      );
      console.error(
        "Unknown route name when entering route in side bar: " +
          String(routeName)
      );
    }
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
  height: 3.5rem;
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
  padding-bottom: 1.5rem;
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

.iconItem {
  position: relative;
  width: 2rem;
  display: flex;
  justify-content: center;
}

.itemName {
  padding-bottom: 0.2rem;
}
</style>
