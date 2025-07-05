<template>
  <div>
    <q-page-sticky
      v-if="drawerBehavior == 'mobile' && revealHeader"
      position="bottom-right"
      :offset="[15, 15]"
    >
      <RouterLink :to="{ name: '/conversation/new/create/' }">
        <div class="stickyButton">
          <img :src="newConversationButton" />
        </div>
      </RouterLink>
    </q-page-sticky>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useLayoutHeaderStore } from "src/stores/layout/header";
import { useNavigationStore } from "src/stores/navigation";

const { reveal: revealHeader } = storeToRefs(useLayoutHeaderStore());
revealHeader.value = true;

const newConversationButton =
  process.env.VITE_PUBLIC_DIR + "/images/conversation/newConversationShort.svg";

const { drawerBehavior } = storeToRefs(useNavigationStore());
</script>

<style scoped>
.stickyButton:hover {
  cursor: pointer;
}
</style>
