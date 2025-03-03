<template>
  <div>
    <q-separator />
    <div class="flexIcons container">
      <RouterLink to="/">
        <div class="iconStyle">
          <ZKIcon
            name="iconamoon:home-fill"
            size="1.6rem"
            :color="route.name === '/' ? '#6B4EFF' : '#CDCBD3'"
          />
          <div :style="{ color: route.name === '/' ? '#6B4EFF' : '#7D7A85' }">
            Home
          </div>
        </div>
      </RouterLink>

      <div class="iconStyle" @click="accessNotifications()">
        <ZKIcon
          name="ion:notifications"
          size="1.6rem"
          :color="route.name === '/notification/' ? '#6B4EFF' : '#CDCBD3'"
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
          Dings
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDocumentVisibility } from "@vueuse/core";
import { storeToRefs } from "pinia";
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
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
  padding: 0.3rem;
  cursor: pointer;
  display: flex;
  gap: 0.1rem;
  flex-direction: column;
  align-items: center;
  font-size: 0.7rem;
  font-weight: bold;
}

.container {
  background-color: white;
}
</style>
