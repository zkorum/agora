<template>
  <div>
    <div class="flexIcons container">
      <RouterLink
        v-for="iconItem in bottomIconList"
        :key="iconItem.name"
        v-slot="{ navigate }"
        :to="iconItem.route"
        custom
      >
        <div
          class="iconStyle navigation-link"
          @click="handleNavigationClick($event, iconItem, navigate)"
        >
          <div class="iconDiv">
            <NewNotificationIndicator
              v-if="iconItem.route === '/notification/'"
            />
            <ZKStyledIcon
              :svg-string="
                route.name === iconItem.route
                  ? iconItem.filled
                  : iconItem.standard
              "
            />
          </div>

          <div
            :style="{
              color: route.name === iconItem.route ? '#6B4EFF' : '#7D7A85',
            }"
          >
            <ZKStyledText
              :text="iconItem.name"
              :add-gradient="route.name === iconItem.route"
            />
          </div>
        </div>
      </RouterLink>
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
import PreLoginIntentionDialog from "src/components/authentication/intention/PreLoginIntentionDialog.vue";
import NewNotificationIndicator from "src/components/notification/NewNotificationIndicator.vue";
import ZKStyledIcon from "src/components/ui-library/ZKStyledIcon.vue";
import ZKStyledText from "src/components/ui-library/ZKStyledText.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { ref } from "vue";
import type { RouteNamedMap } from "vue-router/auto-routes";
import { useRoute } from "vue-router";

const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());

interface BottomIcon {
  name: string;
  standard: string;
  filled: string;
  route: keyof RouteNamedMap;
  requireAuth: boolean;
}

const homeIconStandard =
  '<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path fill-rule="evenodd" clip-rule="evenodd" d="M11.7071 1.01447C11.5196 0.826995 11.2652 0.72168 11.0001 0.72168C10.7349 0.72168 10.4806 0.826995 10.2931 1.01447L3.29308 8.01447L1.29308 10.0145C1.19757 10.1067 1.12139 10.2171 1.06898 10.3391C1.01657 10.4611 0.988985 10.5923 0.987831 10.7251C0.986677 10.8578 1.01198 10.9895 1.06226 11.1124C1.11254 11.2353 1.18679 11.347 1.28069 11.4409C1.37458 11.5348 1.48623 11.609 1.60913 11.6593C1.73202 11.7096 1.8637 11.7349 1.99648 11.7337C2.12926 11.7326 2.26048 11.705 2.38249 11.6526C2.50449 11.6002 2.61483 11.524 2.70708 11.4285L3.00008 11.1355V17.7215C3.00008 18.5171 3.31615 19.2802 3.87876 19.8428C4.44137 20.4054 5.20443 20.7215 6.00008 20.7215H16.0001C16.7957 20.7215 17.5588 20.4054 18.1214 19.8428C18.684 19.2802 19.0001 18.5171 19.0001 17.7215V11.1355L19.2931 11.4285C19.4817 11.6106 19.7343 11.7114 19.9965 11.7091C20.2587 11.7069 20.5095 11.6017 20.6949 11.4163C20.8803 11.2309 20.9855 10.9801 20.9878 10.7179C20.99 10.4557 20.8892 10.2031 20.7071 10.0145L11.7071 1.01447Z" fill="#CDCBD3"/>\n</svg>\n';
const homeIconFilled =
  '<svg width="21" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path fill-rule="evenodd" clip-rule="evenodd" d="M11.707 0.292786C11.5195 0.105315 11.2652 0 11 0C10.7349 0 10.4805 0.105315 10.293 0.292786L3.29302 7.29279L1.29302 9.29279C1.19751 9.38503 1.12133 9.49538 1.06892 9.61738C1.01651 9.73939 0.988924 9.87061 0.98777 10.0034C0.986616 10.1362 1.01192 10.2678 1.0622 10.3907C1.11248 10.5136 1.18673 10.6253 1.28063 10.7192C1.37452 10.8131 1.48617 10.8873 1.60907 10.9376C1.73196 10.9879 1.86364 11.0132 1.99642 11.012C2.1292 11.0109 2.26042 10.9833 2.38242 10.9309C2.50443 10.8785 2.61477 10.8023 2.70702 10.7068L3.00002 10.4138V16.9998C3.00002 17.7954 3.31609 18.5585 3.8787 19.1211C4.44131 19.6837 5.20437 19.9998 6.00002 19.9998H16C16.7957 19.9998 17.5587 19.6837 18.1213 19.1211C18.684 18.5585 19 17.7954 19 16.9998V10.4138L19.293 10.7068C19.4816 10.8889 19.7342 10.9897 19.9964 10.9875C20.2586 10.9852 20.5094 10.88 20.6948 10.6946C20.8802 10.5092 20.9854 10.2584 20.9877 9.99619C20.99 9.73399 20.8892 9.48139 20.707 9.29279L11.707 0.292786Z" fill="url(#paint0_linear_19123_7433)"/>\n<defs>\n<linearGradient id="paint0_linear_19123_7433" x1="9.27519" y1="11.4582" x2="22.2025" y2="17.4337" gradientUnits="userSpaceOnUse">\n<stop stop-color="#6B4EFF"/>\n<stop offset="1" stop-color="#4F92F6"/>\n</linearGradient>\n</defs>\n</svg>\n';
const notificationIconStandard =
  '<svg width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M17.6286 14.7206C17.5508 14.6268 17.4744 14.5331 17.3994 14.4426C16.3682 13.1953 15.7443 12.4425 15.7443 8.91137C15.7443 7.08324 15.3069 5.58324 14.4449 4.45824C13.8093 3.62715 12.95 2.99668 11.8175 2.53074C11.803 2.52264 11.79 2.512 11.7791 2.49934C11.3718 1.13527 10.2571 0.22168 8.99989 0.22168C7.74271 0.22168 6.62849 1.13527 6.22114 2.49793C6.21029 2.51015 6.19746 2.52045 6.18318 2.5284C3.54036 3.61637 2.25599 5.70371 2.25599 8.90996C2.25599 12.4425 1.63302 13.1953 0.600833 14.4412C0.525833 14.5317 0.449427 14.6236 0.371614 14.7192C0.170614 14.9616 0.0432647 15.2565 0.00463614 15.569C-0.0339924 15.8815 0.0177171 16.1986 0.153645 16.4826C0.442864 17.092 1.05927 17.4703 1.76286 17.4703H16.2421C16.9424 17.4703 17.5546 17.0925 17.8447 16.4859C17.9813 16.2018 18.0335 15.8845 17.9952 15.5716C17.9569 15.2587 17.8297 14.9634 17.6286 14.7206ZM8.99989 21.2217C9.67725 21.2211 10.3418 21.0373 10.9232 20.6896C11.5045 20.3419 11.9809 19.8434 12.3018 19.2468C12.3169 19.2182 12.3244 19.1862 12.3234 19.1539C12.3225 19.1216 12.3133 19.09 12.2966 19.0623C12.2799 19.0347 12.2563 19.0118 12.2281 18.9959C12.2 18.98 12.1682 18.9716 12.1358 18.9717H5.86489C5.83252 18.9716 5.80066 18.9798 5.77243 18.9957C5.7442 19.0115 5.72055 19.0344 5.7038 19.0621C5.68704 19.0899 5.67774 19.1214 5.67681 19.1538C5.67588 19.1862 5.68335 19.2182 5.69849 19.2468C6.01936 19.8433 6.49567 20.3418 7.0769 20.6895C7.65813 21.0371 8.32261 21.221 8.99989 21.2217Z" fill="#CDCBD3"/>\n</svg>\n';
const notificationIconFilled =
  '<svg width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M5.86533 19.2656H12.1358C12.1655 19.2656 12.195 19.2735 12.2208 19.2881C12.2465 19.3026 12.268 19.3234 12.2833 19.3486C12.2986 19.374 12.3069 19.403 12.3077 19.4326L12.3038 19.4766L12.2882 19.5176C12.0085 20.0374 11.61 20.4823 11.127 20.8174L10.9151 20.9541C10.3363 21.3003 9.67459 21.4838 9.00009 21.4844L8.74814 21.4756C8.24532 21.4412 7.75473 21.3051 7.30576 21.0762L7.08505 20.9541C6.57846 20.6511 6.15174 20.2332 5.83896 19.7354L5.71201 19.5176C5.70519 19.5046 5.70067 19.4907 5.69736 19.4766L5.69247 19.4326C5.6929 19.4177 5.69511 19.4029 5.69931 19.3887L5.71689 19.3486C5.72457 19.3359 5.73463 19.3247 5.74521 19.3145L5.78036 19.2881C5.79335 19.2808 5.80708 19.2752 5.82138 19.2715L5.86533 19.2656ZM9.00009 0.515625C10.2488 0.515676 11.3568 1.42332 11.7628 2.78125V2.78223L11.7677 2.78809C11.7795 2.80188 11.7938 2.81336 11.8097 2.82227L11.8175 2.80859L11.8097 2.82324H11.8116C12.8007 3.23017 13.5807 3.76255 14.1847 4.44434L14.4327 4.74609C15.292 5.86761 15.7286 7.36391 15.7286 9.18945C15.7286 10.9557 15.8852 12.0294 16.171 12.8174C16.3853 13.4082 16.6721 13.8384 17.0196 14.2793L17.3878 14.7305L17.6163 15.0088C17.7905 15.2192 17.9088 15.4695 17.961 15.7363L17.9796 15.8516C18.0128 16.1228 17.977 16.3974 17.877 16.6504L17.8311 16.7578C17.5437 17.3586 16.9368 17.7334 16.2423 17.7334H1.76279C1.10851 17.7333 0.531338 17.4029 0.225677 16.8643L0.16806 16.7539C0.0503509 16.5079 -0.00406164 16.237 0.00985718 15.9658L0.0205994 15.8496C0.0540897 15.5787 0.154459 15.3207 0.312592 15.0996L0.383881 15.0078L0.613373 14.7295C1.12931 14.1067 1.5444 13.6047 1.83017 12.8164C2.11579 12.0284 2.27156 10.9551 2.27158 9.18848C2.27158 7.58739 2.59274 6.26645 3.24228 5.21094C3.85121 4.22162 4.74971 3.46394 5.94638 2.92578L6.18954 2.82129L6.19052 2.82031C6.20615 2.81161 6.22058 2.80044 6.23251 2.78711L6.23447 2.78809L6.23642 2.78027C6.64226 1.42331 7.75112 0.515625 9.00009 0.515625Z" fill="url(#paint0_linear_21149_1381)" stroke="url(#paint1_linear_21149_1381)" stroke-width="0.03125"/>\n<defs>\n<linearGradient id="paint0_linear_21149_1381" x1="7.45729" y1="12.5313" x2="19.6694" y2="17.3737" gradientUnits="userSpaceOnUse">\n<stop stop-color="#6B4EFF"/>\n<stop offset="1" stop-color="#4F92F6"/>\n</linearGradient>\n<linearGradient id="paint1_linear_21149_1381" x1="7.45729" y1="12.5313" x2="19.6694" y2="17.3737" gradientUnits="userSpaceOnUse">\n<stop stop-color="#6B4EFF"/>\n<stop offset="1" stop-color="#4F92F6"/>\n</linearGradient>\n</defs>\n</svg>\n';
const exploreIconStandard =
  '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M20.0002 20.0002L15.6572 15.6572M15.6572 15.6572C16.4001 14.9143 16.9894 14.0324 17.3914 13.0618C17.7935 12.0911 18.0004 11.0508 18.0004 10.0002C18.0004 8.9496 17.7935 7.90929 17.3914 6.93866C16.9894 5.96803 16.4001 5.08609 15.6572 4.34321C14.9143 3.60032 14.0324 3.01103 13.0618 2.60898C12.0911 2.20693 11.0508 2 10.0002 2C8.9496 2 7.90929 2.20693 6.93866 2.60898C5.96803 3.01103 5.08609 3.60032 4.34321 4.34321C2.84288 5.84354 2 7.87842 2 10.0002C2 12.122 2.84288 14.1569 4.34321 15.6572C5.84354 17.1575 7.87842 18.0004 10.0002 18.0004C12.122 18.0004 14.1569 17.1575 15.6572 15.6572Z" stroke="url(#paint0_linear_2_3)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>\n<defs>\n<linearGradient id="paint0_linear_2_3" x1="9.4588" y1="12.3126" x2="21.0936" y2="17.6905" gradientUnits="userSpaceOnUse">\n<stop stop-color="#CDCBD3"/>\n<stop offset="1" stop-color="#CDCBD3"/>\n</linearGradient>\n</defs>\n</svg>\n';
const exploreIconFilled =
  '<svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M21 21.7219L16.657 17.3789M16.657 17.3789C17.3999 16.636 17.9892 15.7541 18.3912 14.7834C18.7933 13.8128 19.0002 12.7725 19.0002 11.7219C19.0002 10.6713 18.7933 9.63097 18.3913 8.66034C17.9892 7.68971 17.3999 6.80777 16.657 6.06489C15.9141 5.322 15.0322 4.73271 14.0616 4.33066C13.0909 3.92861 12.0506 3.72168 11 3.72168C9.94942 3.72168 8.90911 3.92861 7.93848 4.33066C6.96785 4.73271 6.08591 5.322 5.34302 6.06489C3.84269 7.56522 2.99982 9.6001 2.99982 11.7219C2.99982 13.8437 3.84269 15.8786 5.34302 17.3789C6.84335 18.8792 8.87824 19.7221 11 19.7221C13.1218 19.7221 15.1567 18.8792 16.657 17.3789Z" stroke="url(#paint0_linear_19123_653)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>\n<defs>\n<linearGradient id="paint0_linear_19123_653" x1="10.4586" y1="14.0343" x2="22.0934" y2="19.4122" gradientUnits="userSpaceOnUse">\n<stop stop-color="#6B4EFF"/>\n<stop offset="1" stop-color="#4F92F6"/>\n</linearGradient>\n</defs>\n</svg>\n';

const bottomIconList: BottomIcon[] = [
  {
    name: "Home",
    standard: homeIconStandard,
    filled: homeIconFilled,
    route: "/",
    requireAuth: false,
  },
  {
    name: "Explore",
    standard: exploreIconStandard,
    filled: exploreIconFilled,
    route: "/topics/",
    requireAuth: false,
  },
  {
    name: "Dings",
    standard: notificationIconStandard,
    filled: notificationIconFilled,
    route: "/notification/",
    requireAuth: true,
  },
];

const route = useRoute();
const showLoginDialog = ref(false);

function handleNavigationClick(
  event: Event,
  iconItem: BottomIcon,
  navigate: () => void
) {
  if (iconItem.requireAuth && isGuestOrLoggedIn.value === false) {
    showLoginDialog.value = true;
  } else if (route.name === iconItem.route) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    navigate();
  }
}
</script>

<style scoped lang="scss">
.flexIcons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
}

.iconStyle {
  padding: 0.6rem;
  cursor: pointer;
  display: flex;
  gap: 0.2rem;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  font-weight: bold;
}

.container {
  background-color: white;
}

.iconDiv {
  position: relative;
  width: 2rem;
  display: flex;
  justify-content: center;
}

.navigation-link {
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}
</style>
