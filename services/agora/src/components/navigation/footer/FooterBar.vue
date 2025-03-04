<template>
  <div>
    <q-separator />
    <div class="flexIcons container">
      <div class="iconStyle" @click="accessHomeFeed()">
        <ZKStyledIcon
          path="M11.707 0.293C11.5194 0.105529 11.2651 0.000213623 11 0.000213623C10.7348 0.000213623 10.4805 0.105529 10.293 0.293L3.29296 7.293L1.29296 9.293C1.19745 9.38525 1.12127 9.49559 1.06886 9.6176C1.01645 9.7396 0.988862 9.87082 0.987709 10.0036C0.986555 10.1364 1.01186 10.2681 1.06214 10.391C1.11242 10.5139 1.18667 10.6255 1.28056 10.7194C1.37446 10.8133 1.48611 10.8875 1.60901 10.9378C1.7319 10.9881 1.86358 11.0134 1.99636 11.0123C2.12914 11.0111 2.26036 10.9835 2.38236 10.9311C2.50437 10.8787 2.61471 10.8025 2.70696 10.707L2.99996 10.414V17C2.99996 17.7956 3.31603 18.5587 3.87864 19.1213C4.44125 19.6839 5.20431 20 5.99996 20H16C16.7956 20 17.5587 19.6839 18.1213 19.1213C18.6839 18.5587 19 17.7956 19 17V10.414L19.293 10.707C19.4816 10.8892 19.7342 10.99 19.9964 10.9877C20.2586 10.9854 20.5094 10.8802 20.6948 10.6948C20.8802 10.5094 20.9854 10.2586 20.9876 9.9964C20.9899 9.7342 20.8891 9.4816 20.707 9.293L11.707 0.293Z"
          :fill="route.name === '/'"
          :width="21"
          :height="20"
        />
        <div :style="{ color: route.name === '/' ? '#6B4EFF' : '#7D7A85' }">
          <ZKStyledText text="Home" :add-gradient="route.name === '/'" />
        </div>
      </div>

      <div class="iconStyle" @click="accessNotifications()">
        <ZKStyledIcon
          path="M17.6288 14.9989C17.551 14.9052 17.4745 14.8114 17.3995 14.7209C16.3683 13.4736 15.7444 12.7208 15.7444 9.18969C15.7444 7.36156 15.307 5.86156 14.445 4.73656C13.8094 3.90547 12.9502 3.275 11.8177 2.80906C11.8031 2.80096 11.7901 2.79032 11.7792 2.77766C11.3719 1.41359 10.2572 0.5 9.00002 0.5C7.74283 0.5 6.62861 1.41359 6.22127 2.77625C6.21041 2.78847 6.19758 2.79877 6.1833 2.80672C3.54049 3.89469 2.25611 5.98203 2.25611 9.18828C2.25611 12.7208 1.63314 13.4736 0.600955 14.7195C0.525955 14.81 0.449549 14.9019 0.371736 14.9975C0.170737 15.2399 0.0433868 15.5348 0.00475821 15.8473C-0.0338704 16.1598 0.0178392 16.4769 0.153767 16.7609C0.442986 17.3703 1.05939 17.7486 1.76299 17.7486H16.2422C16.9425 17.7486 17.5547 17.3708 17.8449 16.7642C17.9814 16.4801 18.0336 16.1628 17.9953 15.8499C17.957 15.537 17.8298 15.2417 17.6288 14.9989ZM9.00002 21.5C9.67738 21.4995 10.342 21.3156 10.9233 20.9679C11.5046 20.6202 11.981 20.1217 12.3019 19.5252C12.317 19.4966 12.3245 19.4646 12.3236 19.4322C12.3227 19.3999 12.3134 19.3684 12.2967 19.3407C12.28 19.313 12.2564 19.2901 12.2283 19.2742C12.2001 19.2583 12.1683 19.25 12.136 19.25H5.86502C5.83264 19.2499 5.80078 19.2582 5.77255 19.274C5.74432 19.2899 5.72067 19.3128 5.70392 19.3405C5.68716 19.3682 5.67787 19.3997 5.67694 19.4321C5.67601 19.4645 5.68347 19.4965 5.69861 19.5252C6.01949 20.1216 6.49579 20.6201 7.07702 20.9678C7.65825 21.3155 8.32274 21.4994 9.00002 21.5Z"
          :fill="route.name === '/notification/'"
          :width="18"
          :height="22"
        />
        <q-badge
          v-if="numNewNotifications > 0"
          color="red"
          rounded
          floating
          transparant
        ></q-badge>
        <div
          :style="{
            color: route.name === '/notification/' ? '#6B4EFF' : '#7D7A85',
          }"
        >
          <ZKStyledText
            text="Dings"
            :add-gradient="route.name === '/notification/'"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDocumentVisibility } from "@vueuse/core";
import { storeToRefs } from "pinia";
import ZKStyledIcon from "src/components/ui-library/ZKStyledIcon.vue";
import ZKStyledText from "src/components/ui-library/ZKStyledText.vue";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNotificationStore } from "src/stores/notification";
import { useDialog } from "src/utils/ui/dialog";
import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const { isAuthenticated } = storeToRefs(useAuthenticationStore());
const { numNewNotifications } = storeToRefs(useNotificationStore());

const documentVisibility = useDocumentVisibility();

const { loadNotificationData } = useNotificationStore();

const dialog = useDialog();

const route = useRoute();
const router = useRouter();

async function accessHomeFeed() {
  if (route.name == "/") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    await router.push({ name: "/" });
  }
}

async function accessNotifications() {
  if (!isAuthenticated.value) {
    dialog.showLoginConfirmationDialog();
  } else {
    await router.push({ name: "/notification/" });
  }
}

watch(documentVisibility, async () => {
  if (isAuthenticated.value && documentVisibility.value == "visible") {
    await loadNotificationData(false);
  }
});
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
</style>
