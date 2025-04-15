<template>
  <div>
    <q-page-sticky
      v-if="drawerBehavior == 'mobile'"
      position="bottom-right"
      :offset="[15, 15]"
    >
      <RouterLink :to="{ name: '/conversation/create/' }">
        <div class="stickyButton">
          <img :src="newConversationButton" />
        </div>
      </RouterLink>
    </q-page-sticky>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNavigationStore } from "src/stores/navigation";

const newConversationButton =
  process.env.VITE_PUBLIC_DIR + "/images/conversation/newConversationShort.svg";

const { drawerBehavior } = storeToRefs(useNavigationStore());
</script>

<style scoped>
.stickyButton:hover {
  cursor: pointer;
}
</style>
