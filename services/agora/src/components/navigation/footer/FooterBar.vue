<template>
  <div>
    <q-separator />
    <div class="flexIcons container">
      <div class="iconStyle" @click="accessHomeFeed()">
        <ZKStyledIcon
          path="M11.707 0.293031C11.5194 0.105559 11.2651 0.000244141 11 0.000244141C10.7348 0.000244141 10.4805 0.105559 10.293 0.293031L3.29296 7.29303L1.29296 9.29303C1.19745 9.38528 1.12127 9.49562 1.06886 9.61763C1.01645 9.73963 0.988862 9.87085 0.987709 10.0036C0.986555 10.1364 1.01186 10.2681 1.06214 10.391C1.11242 10.5139 1.18667 10.6255 1.28056 10.7194C1.37446 10.8133 1.48611 10.8876 1.60901 10.9379C1.7319 10.9881 1.86358 11.0134 1.99636 11.0123C2.12914 11.0111 2.26036 10.9835 2.38236 10.9311C2.50437 10.8787 2.61471 10.8025 2.70696 10.707L2.99996 10.414V17C2.99996 17.7957 3.31603 18.5587 3.87864 19.1214C4.44125 19.684 5.20431 20 5.99996 20H16C16.7956 20 17.5587 19.684 18.1213 19.1214C18.6839 18.5587 19 17.7957 19 17V10.414L19.293 10.707C19.4816 10.8892 19.7342 10.99 19.9964 10.9877C20.2586 10.9854 20.5094 10.8803 20.6948 10.6948C20.8802 10.5094 20.9854 10.2586 20.9876 9.99643C20.9899 9.73423 20.8891 9.48163 20.707 9.29303L11.707 0.293031Z"
          :fill="route.name === '/'"
        />
        <div :style="{ color: route.name === '/' ? '#6B4EFF' : '#7D7A85' }">
          <ZKStyledText text="Home" :add-gradient="route.name === '/'" />
        </div>
      </div>

      <div class="iconStyle" @click="accessNotifications()">
        <ZKStyledIcon
          path="M17.3875 14.7309L17.3875 14.7309L17.6167 15.0089C17.6167 15.0089 17.6167 15.0089 17.6167 15.0089C17.8158 15.2494 17.9418 15.5419 17.9797 15.8518C18.0177 16.1617 17.966 16.476 17.8307 16.7575L17.8307 16.7575C17.5433 17.3584 16.9367 17.733 16.2422 17.733H1.76296C1.06506 17.733 0.454344 17.3579 0.167853 16.7542L0.167831 16.7542C0.0331917 16.4728 -0.0180277 16.1588 0.0202347 15.8492C0.058497 15.5397 0.184639 15.2476 0.383734 15.0075L0.383825 15.0074C0.451988 14.9236 0.519069 14.8427 0.585123 14.7631C0.59442 14.7519 0.603697 14.7407 0.612953 14.7295L0.600924 14.7195L0.612957 14.7295C1.12897 14.1066 1.54446 13.6051 1.83026 12.8167C2.11594 12.0287 2.27171 10.9552 2.27171 9.18828C2.27171 7.5872 2.59239 6.26685 3.24193 5.21133C3.89138 4.15596 4.87036 3.3641 6.18922 2.82117L6.18926 2.82127L6.19087 2.82037C6.20668 2.81157 6.2209 2.80016 6.23292 2.78663L6.23412 2.7877L6.23621 2.78073C6.64193 1.4235 7.75087 0.515625 8.99999 0.515625C10.2491 0.515625 11.3585 1.4235 11.7642 2.78213L11.7628 2.78255L11.7673 2.78782C11.7794 2.80189 11.7939 2.81371 11.81 2.82272L11.81 2.82281L11.8117 2.82351C12.9421 3.28858 13.7989 3.9175 14.4326 4.74605L14.4326 4.74607C15.292 5.86763 15.7287 7.36399 15.7287 9.18969C15.7287 10.9559 15.8847 12.029 16.1705 12.817C16.456 13.6043 16.8708 14.1059 17.3853 14.7282L17.3875 14.7309ZM5.86493 19.2656H5.86499H12.1359C12.1656 19.2656 12.1947 19.2732 12.2206 19.2878C12.2464 19.3024 12.268 19.3234 12.2833 19.3487C12.2986 19.3741 12.3071 19.403 12.3079 19.4327C12.3088 19.4623 12.3019 19.4916 12.2881 19.5178C11.9685 20.1118 11.4941 20.6082 10.9152 20.9545C10.3363 21.3007 9.67451 21.4838 8.99997 21.4844C8.32554 21.4837 7.66382 21.3006 7.08501 20.9544C6.5062 20.6081 6.03188 20.1117 5.71234 19.5178L5.69858 19.5252L5.71239 19.5179C5.69852 19.4916 5.69167 19.4622 5.69252 19.4326C5.69338 19.4029 5.7019 19.374 5.71726 19.3486C5.73262 19.3232 5.75429 19.3022 5.78017 19.2876C5.80605 19.2731 5.83525 19.2655 5.86493 19.2656Z"
          :fill="route.name === '/notification/'"
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
