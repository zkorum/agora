<template>
  <div>
    <div class="flexIcons container">
      <RouterLink to="/">
        <div class="iconStyle">
          <q-icon
            name="mdi-home"
            size="1.6rem"
            :color="route.name === '/' ? 'color-highlight' : 'color-text-weak'"
          />
          <div
            :class="
              'text-' +
              (route.name === '/' ? 'color-highlight' : 'color-text-weak')
            "
          >
            Home
          </div>
        </div>
      </RouterLink>

      <div class="iconStyle" @click="accessProfile()">
        <q-icon
          name="mdi-account-circle"
          size="1.6rem"
          :color="
            route.name === '/user-profile/opinions/' ||
            route.name === '/user-profile/conversations/'
              ? 'color-highlight'
              : 'color-text-weak'
          "
        />
        <div
          :class="
            'text-' +
            (route.name === '/user-profile/opinions/' ||
            route.name === '/user-profile/conversations/'
              ? 'color-highlight'
              : 'color-text-weak')
          "
        >
          Profile
        </div>
      </div>

      <div class="iconStyle" @click="accessNotifications()">
        <q-icon
          name="mdi-bell"
          size="1.6rem"
          :color="
            route.name === '/notification/'
              ? 'color-highlight'
              : 'color-text-weak'
          "
        >
          <q-badge
            v-if="numNewNotifications > 0"
            color="red"
            rounded
            floating
            transparant
          ></q-badge>
        </q-icon>
        <div
          :class="
            'text-' +
            (route.name === '/notification/'
              ? 'color-highlight'
              : 'color-text-weak')
          "
        >
          Dings
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDocumentVisibility } from "@vueuse/core";
import { storeToRefs } from "pinia";
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

async function accessProfile() {
  if (!isAuthenticated.value) {
    dialog.showLoginConfirmationDialog();
  } else {
    await router.push({ name: "/user-profile/opinions/" });
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
  if (documentVisibility.value == "visible") {
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
  padding: 0.3rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.7rem;
  font-weight: bold;
}

.container {
  background-color: white;
}
</style>
