<template>
  <div>
    <q-page-sticky
      v-if="drawerBehavior == 'mobile'"
      position="bottom-right"
      :offset="[15, 15]"
    >
      <div class="stickyButton" @click="requestNewPost()">
        <img :src="newConversationButton" />
      </div>
    </q-page-sticky>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNavigationStore } from "src/stores/navigation";
import { useCreateNewPost } from "src/utils/component/conversation/newPost";

const newConversationButton =
  process.env.VITE_PUBLIC_DIR + "/images/conversation/newConversationShort.svg";

const { drawerBehavior } = storeToRefs(useNavigationStore());
const { requestNewPost } = useCreateNewPost();
</script>

<style scoped>
.stickyButton:hover {
  cursor: pointer;
}
</style>
