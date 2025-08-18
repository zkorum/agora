<template>
  <div>
    <q-page-sticky
      v-if="drawerBehavior == 'mobile' && revealHeader"
      position="bottom-right"
      :offset="[15, 15]"
    >
      <RouterLink :to="{ name: '/conversation/new/create/' }">
        <StartConversationButtonCompact />
      </RouterLink>
    </q-page-sticky>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useLayoutHeaderStore } from "src/stores/layout/header";
import { useNavigationStore } from "src/stores/navigation";
import StartConversationButtonCompact from "../ui-library/StartConversationButtonCompact.vue";

const { reveal: revealHeader } = storeToRefs(useLayoutHeaderStore());
revealHeader.value = true;

const { drawerBehavior } = storeToRefs(useNavigationStore());
</script>
